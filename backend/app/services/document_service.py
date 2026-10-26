"""Document lifecycle: upload, lookup, extraction, de-identification, deletion.

Routes stay thin and call these functions. Derived data (entities, relations,
observations) is cleared whenever the text they were computed from changes, so stored
offsets can never point into stale text.
"""
import logging
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppError
from app.models import Document, Entity, Observation, Relation, User
from app.services.deidentification_service import Deidentifier, DeidentificationResult
from app.services.extraction_service import ExtractionResult, extract_text
from app.services.preprocessing_service import preprocessing_service
from app.utils.pagination import paginate
from app.utils.file_utils import (delete_file_quietly, resolve_stored_path, sanitize_filename,
                                  save_upload)
from app.utils.validators import validate_extension

logger = logging.getLogger("app.documents")


def _log(message: str, doc: Document, **extra) -> None:
    logger.info(message, extra={"document_id": str(doc.id), **extra})


# ----------------------------------------------------------------- upload / lookup
def create_document(db: Session, user: User, upload: UploadFile) -> Document:
    filename = sanitize_filename(upload.filename)
    ext = validate_extension(filename)
    owner_dir = settings.upload_path / str(user.id)
    stored_name, size = save_upload(upload, owner_dir, ext, settings.max_upload_bytes)

    doc = Document(owner_id=user.id, filename=filename, file_type=ext, file_size=size,
                   original_path=f"{user.id}/{stored_name}", processing_status="uploaded")
    db.add(doc)
    try:
        db.commit()
    except Exception:
        db.rollback()
        delete_file_quietly(owner_dir / stored_name)   # don't leave orphan files behind
        raise
    _log("document uploaded", doc, stage="upload")
    return doc


def get_document(db: Session, document_id: uuid.UUID, user: User) -> Document:
    """Owner (or admin) access only. Other users get 404 so existence is not leaked."""
    doc = db.get(Document, document_id)
    if doc is None or (doc.owner_id != user.id and user.role != "admin"):
        raise AppError(404, "DOCUMENT_NOT_FOUND", "Document not found.")
    return doc


def list_documents(db: Session, user: User, *, page: int, page_size: int,
                   status: str | None = None, file_type: str | None = None
                   ) -> tuple[list[Document], int]:
    stmt = select(Document)
    if user.role != "admin":
        stmt = stmt.where(Document.owner_id == user.id)
    if status:
        stmt = stmt.where(Document.processing_status == status)
    if file_type:
        stmt = stmt.where(Document.file_type == file_type)
    return paginate(db, stmt.order_by(Document.created_at.desc(), Document.id), page, page_size)


def counts_for(db: Session, doc: Document) -> tuple[int, int]:
    entities = db.scalar(select(func.count()).select_from(Entity)
                         .where(Entity.document_id == doc.id)) or 0
    relations = db.scalar(select(func.count()).select_from(Relation)
                          .where(Relation.document_id == doc.id)) or 0
    return entities, relations


def _ensure_not_processing(doc: Document) -> None:
    if doc.processing_status == "processing":
        raise AppError(409, "DOCUMENT_BUSY", "The document is currently being processed.")


def clear_derived_data(db: Session, doc: Document) -> None:
    """Delete entities/relations/observations that depend on the current text."""
    db.execute(delete(Relation).where(Relation.document_id == doc.id))
    db.execute(delete(Entity).where(Entity.document_id == doc.id))
    db.execute(delete(Observation).where(Observation.document_id == doc.id))


# ----------------------------------------------------------------- extraction
def extract_document(db: Session, doc: Document) -> ExtractionResult:
    _ensure_not_processing(doc)
    path = resolve_stored_path(settings.upload_path, doc.original_path)
    try:
        result = extract_text(path, doc.file_type)
    except AppError as exc:
        # Record the failure (generic message only) and re-raise for the client.
        db.rollback()
        doc.processing_status = "failed"
        doc.error_message = exc.message[:500]
        db.commit()
        logger.warning("extraction failed", extra={"document_id": str(doc.id), "stage": exc.code})
        raise

    clear_derived_data(db, doc)
    doc.extracted_text = result.text
    doc.deidentified_text = None
    doc.processing_status = "extracted"
    doc.error_message = None
    db.commit()
    _log("text extracted", doc, stage="extract", count=result.character_count)
    return result


def ensure_extracted(db: Session, doc: Document) -> str:
    """Return the raw extracted text, extracting first if it has not been done yet."""
    if not doc.extracted_text:
        extract_document(db, doc)
    assert doc.extracted_text is not None
    return doc.extracted_text


# ----------------------------------------------------------------- de-identification
def deidentify_document(db: Session, doc: Document, deidentifier: Deidentifier
                        ) -> tuple[str, DeidentificationResult]:
    _ensure_not_processing(doc)
    original = ensure_extracted(db, doc)
    result = deidentifier.deidentify(preprocessing_service.preprocess(original))

    clear_derived_data(db, doc)   # offsets refer to deidentified_text, which just changed
    doc.deidentified_text = result.text
    doc.processing_status = "deidentified"
    doc.error_message = None
    db.commit()
    _log("document de-identified", doc, stage="deidentify", count=result.total)
    return original, result


# ----------------------------------------------------------------- deletion
def delete_document(db: Session, doc: Document) -> None:
    _ensure_not_processing(doc)
    path: Path = resolve_stored_path(settings.upload_path, doc.original_path)
    doc_id = str(doc.id)
    db.delete(doc)          # entities/relations/observations go with it (ON DELETE CASCADE)
    db.commit()
    if not delete_file_quietly(path):
        logger.warning("stored file could not be removed", extra={"document_id": doc_id})
    logger.info("document deleted", extra={"document_id": doc_id, "stage": "delete"})
