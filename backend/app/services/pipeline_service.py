"""Module 10 - the complete NLP pipeline for one document.

  1 load document            (route)            6 relation extraction
  2 extract text if needed   (document_service) 7 confidence (attached to every row)
  3 preprocess               (document_service) 8 save entities  \\ one transaction,
  4 de-identify              (document_service) 9 save relations  / replaces old results
  5 clinical NER                               10 status -> completed | failed

Only the de-identified text is ever sent to the NLP models, and entity offsets point into
that stored text. A pseudonymous Patient is attached to the document (see patient_service)
and every Test-has_value->LabValue relation becomes a structured Observation, which is what
the analytics module (association rules, clustering, cohorts) operates on.
"""
import logging
import time
import uuid
from dataclasses import dataclass
from collections import Counter

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import Document, Entity, Observation, Relation
from app.services import patient_service
from app.utils.lab_value_parser import parse_lab_value
from app.nlp.clinical_ner import ClinicalNERModel
from app.nlp.relation_extraction import EntityMention, RelationExtractionModel
from app.services import document_service
from app.services.deidentification_service import Deidentifier
from app.services.ner_service import run_ner

logger = logging.getLogger("app.pipeline")


@dataclass
class PipelineResult:
    entities: list[Entity]
    relations: list[Relation]
    duration_ms: float
    ner_model: str
    relation_model: str

    @property
    def entities_by_type(self) -> dict[str, int]:
        return dict(Counter(e.entity_type for e in self.entities))

    @property
    def relations_by_type(self) -> dict[str, int]:
        return dict(Counter(r.relation_type for r in self.relations))


def _claim(db: Session, doc: Document) -> None:
    """Atomically switch the document to 'processing'; a concurrent run gets 409."""
    result = db.execute(
        update(Document)
        .where(Document.id == doc.id, Document.processing_status != "processing")
        .values(processing_status="processing", error_message=None))
    if result.rowcount == 0:
        db.rollback()
        raise AppError(409, "DOCUMENT_BUSY", "The document is currently being processed.")
    db.commit()
    db.refresh(doc)


def _mark_failed(db: Session, doc_id: uuid.UUID, message: str) -> None:
    db.rollback()
    doc = db.get(Document, doc_id)
    if doc is not None:
        doc.processing_status = "failed"
        doc.error_message = message[:500]
        db.commit()


def _derive_observations(db: Session, doc: Document, entity_rows: list[Entity],
                         extracted) -> list[Observation]:
    """Build Observation rows from every Test -has_value-> LabValue relation.

    This is the bridge between free-text NLP output and the structured records that the
    analytics module (association rules, clustering, cohorts) needs. A pseudonymous
    Patient is attached to the document on first use (see patient_service).
    """
    value_rels = [r for r in extracted if r.relation_type == "has_value"]
    if not value_rels:
        return []
    patient = patient_service.get_or_create_patient_for_document(db, doc)

    observations: list[Observation] = []
    for rel in value_rels:
        test = entity_rows[rel.subject_index]
        lab_value = entity_rows[rel.object_index]
        value, unit = parse_lab_value(lab_value.entity_text)
        observations.append(Observation(
            id=uuid.uuid4(), patient_id=patient.id, document_id=doc.id,
            observation_type=test.entity_text[:100], value=value, unit=unit,
            value_text=None if value is not None else lab_value.entity_text[:200]))
    return observations


def process_document(db: Session, doc: Document, ner: ClinicalNERModel,
                     relation_model: RelationExtractionModel,
                     deidentifier: Deidentifier) -> PipelineResult:
    started = time.perf_counter()
    doc_id = doc.id
    log = {"document_id": str(doc_id), "stage": "process"}

    # Steps 2-4. Skipped when a current de-identified text already exists.
    if doc.deidentified_text is None:
        document_service.deidentify_document(db, doc, deidentifier)
    _claim(db, doc)
    logger.info("processing started", extra=log)

    try:
        text = doc.deidentified_text or ""
        found = run_ner(ner, text)                                              # step 5
        entity_rows = [Entity(id=uuid.uuid4(), document_id=doc_id, entity_text=e.text,
                              entity_type=e.entity_type, start_position=e.start,
                              end_position=e.end, confidence=e.confidence,
                              model_name=ner.name) for e in found]

        mentions = [EntityMention(i, r.entity_text, r.entity_type, r.start_position,
                                  r.end_position, r.confidence) for i, r in enumerate(entity_rows)]
        extracted = relation_model.extract_relations(text, mentions)            # step 6
        relation_rows = [Relation(id=uuid.uuid4(), document_id=doc_id,
                                  subject_entity_id=entity_rows[x.subject_index].id,
                                  object_entity_id=entity_rows[x.object_index].id,
                                  relation_type=x.relation_type, confidence=x.confidence)
                         for x in extracted]

        # Steps 8-10: replace old results and finish in ONE transaction.
        document_service.clear_derived_data(db, doc)
        db.add_all(entity_rows)
        db.flush()
        db.add_all(relation_rows)

        observation_rows = _derive_observations(db, doc, entity_rows, extracted)     # step 10
        db.add_all(observation_rows)
        doc.processing_status = "completed"
        doc.error_message = None
        db.commit()
    except AppError as exc:
        logger.warning("processing failed (%s)", exc.code, extra=log)
        _mark_failed(db, doc_id, exc.message)
        raise
    except Exception as exc:
        logger.error("processing failed (%s)", type(exc).__name__, extra=log, exc_info=True)
        _mark_failed(db, doc_id, "Processing failed unexpectedly.")
        raise AppError(500, "PROCESSING_FAILED", "Processing failed unexpectedly.") from exc

    duration = round((time.perf_counter() - started) * 1000, 1)
    logger.info("processing completed", extra={**log, "count": len(entity_rows)})
    return PipelineResult(entity_rows, relation_rows, duration, ner.name, relation_model.name)
