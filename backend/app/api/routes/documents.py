import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ErrorResponse, Page
from app.nlp.clinical_ner import ClinicalNERModel
from app.nlp.relation_extraction import RelationExtractionModel
from app.schemas.document import (DeidentificationResponse, DocumentDetail, DocumentStatus,
                                  DocumentStatusResponse, DocumentSummary, DocumentUploadResponse,
                                  ExtractionMetadata, ExtractionResponse, FileType,
                                  ProcessingResponse, ProcessingStatistics)
from app.schemas.entity import EntityRead
from app.schemas.relation import RelationRead
from app.services import pipeline_service
from app.services.ner_service import get_ner_model
from app.services.relation_extraction_service import get_relation_model
from app.services import document_service as svc
from app.services.deidentification_service import Deidentifier, get_deidentifier

router = APIRouter(prefix="/api/documents", tags=["Documents"])

_errors = {401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}}


@router.post(
    "/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF, DOCX or TXT document",
    description="Validates extension, real file content and size, then stores the file under a "
                "random server-side name. Server paths are never returned.",
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse},
               413: {"model": ErrorResponse}, 415: {"model": ErrorResponse}})
def upload_document(file: Annotated[UploadFile, File(description="PDF, DOCX or TXT file")],
                    db: DbSession, user: CurrentUser) -> DocumentUploadResponse:
    doc = svc.create_document(db, user, file)
    return DocumentUploadResponse(document_id=doc.id, filename=doc.filename,
                                  status=doc.processing_status)


@router.get("", response_model=Page[DocumentSummary], summary="List your documents",
            responses={401: {"model": ErrorResponse}})
def list_documents(db: DbSession, user: CurrentUser,
                   page: Annotated[int, Query(ge=1)] = 1,
                   page_size: Annotated[int, Query(ge=1, le=100)] = 20,
                   status: DocumentStatus | None = None,
                   file_type: FileType | None = None) -> Page[DocumentSummary]:
    rows, total = svc.list_documents(db, user, page=page, page_size=page_size,
                                     status=status, file_type=file_type)
    return Page[DocumentSummary](items=[DocumentSummary.model_validate(r) for r in rows],
                                 total=total, page=page, page_size=page_size)


@router.get("/{document_id}", response_model=DocumentDetail, summary="Document details",
            responses=_errors)
def get_document(document_id: uuid.UUID, db: DbSession, user: CurrentUser,
                 include_text: Annotated[bool, Query(description="Include stored text")] = False
                 ) -> DocumentDetail:
    doc = svc.get_document(db, document_id, user)
    entities, relations = svc.counts_for(db, doc)
    detail = DocumentDetail.model_validate(doc)
    detail.entity_count, detail.relation_count = entities, relations
    if include_text:
        detail.extracted_text, detail.deidentified_text = doc.extracted_text, doc.deidentified_text
    return detail


@router.get("/{document_id}/status", response_model=DocumentStatusResponse,
            summary="Processing status", responses=_errors)
def get_status(document_id: uuid.UUID, db: DbSession, user: CurrentUser) -> DocumentStatusResponse:
    doc = svc.get_document(db, document_id, user)
    return DocumentStatusResponse(document_id=doc.id, status=doc.processing_status,
                                  error_message=doc.error_message, updated_at=doc.updated_at)


@router.post("/{document_id}/extract", response_model=ExtractionResponse,
             summary="Extract raw text from the stored file",
             description="PDF via PyMuPDF, DOCX via python-docx (tables included), TXT with "
                         "encoding detection. Re-running replaces earlier text and clears "
                         "entities derived from it.",
             responses={**_errors, 409: {"model": ErrorResponse}, 422: {"model": ErrorResponse}})
def extract_document(document_id: uuid.UUID, db: DbSession, user: CurrentUser) -> ExtractionResponse:
    doc = svc.get_document(db, document_id, user)
    result = svc.extract_document(db, doc)
    return ExtractionResponse(
        document_id=doc.id, status=doc.processing_status, text=result.text,
        metadata=ExtractionMetadata(
            file_type=doc.file_type, character_count=result.character_count,
            word_count=result.word_count, page_count=result.page_count,
            paragraph_count=result.paragraph_count, table_count=result.table_count,
            encoding=result.encoding))


@router.post("/{document_id}/deidentify", response_model=DeidentificationResponse,
             summary="Preprocess and de-identify the document text",
             description="Extracts first if needed, normalises the text, replaces names, phones, "
                         "e-mails, dates, addresses and identifiers with placeholders, and stores "
                         "the de-identified text used by later NLP stages.",
             responses={**_errors, 409: {"model": ErrorResponse}, 422: {"model": ErrorResponse}})
def deidentify_document(document_id: uuid.UUID, db: DbSession, user: CurrentUser,
                        deidentifier: Annotated[Deidentifier, Depends(get_deidentifier)]
                        ) -> DeidentificationResponse:
    doc = svc.get_document(db, document_id, user)
    original, result = svc.deidentify_document(db, doc, deidentifier)
    return DeidentificationResponse(
        document_id=doc.id, status=doc.processing_status, original_text=original,
        deidentified_text=result.text, identifiers_detected=result.total,
        identifiers_by_type=result.counts)


@router.post("/{document_id}/process", response_model=ProcessingResponse,
             summary="Run the full NLP pipeline",
             description=("Extract (if needed) -> preprocess -> de-identify -> clinical NER -> relation "
                          "extraction -> save. Only the de-identified text reaches the NLP models. "
                          "Results replace any earlier ones for this document, atomically. The first "
                          "call may take a while because the NER model is loaded (and downloaded on "
                          "the very first run)."),
             responses={**_errors, 409: {"model": ErrorResponse}, 422: {"model": ErrorResponse},
                        500: {"model": ErrorResponse}, 503: {"model": ErrorResponse}})
def process_document(document_id: uuid.UUID, db: DbSession, user: CurrentUser,
                     ner: Annotated[ClinicalNERModel, Depends(get_ner_model)],
                     relation_model: Annotated[RelationExtractionModel, Depends(get_relation_model)],
                     deidentifier: Annotated[Deidentifier, Depends(get_deidentifier)]
                     ) -> ProcessingResponse:
    doc = svc.get_document(db, document_id, user)
    result = pipeline_service.process_document(db, doc, ner, relation_model, deidentifier)

    entities = [EntityRead.model_validate(e) for e in result.entities]
    by_id = {e.id: e for e in entities}
    relations = [RelationRead(id=r.id, document_id=r.document_id, relation_type=r.relation_type,
                              confidence=r.confidence, subject_entity=by_id[r.subject_entity_id],
                              object_entity=by_id[r.object_entity_id]) for r in result.relations]
    return ProcessingResponse(
        document_id=doc.id, status=doc.processing_status, entities=entities, relations=relations,
        statistics=ProcessingStatistics(
            entity_count=len(entities), relation_count=len(relations),
            entities_by_type=result.entities_by_type, relations_by_type=result.relations_by_type,
            duration_ms=result.duration_ms, ner_model=result.ner_model,
            relation_model=result.relation_model))


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete a document, its file and all derived data",
               responses={**_errors, 409: {"model": ErrorResponse}})
def delete_document(document_id: uuid.UUID, db: DbSession, user: CurrentUser) -> Response:
    doc = svc.get_document(db, document_id, user)
    svc.delete_document(db, doc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
