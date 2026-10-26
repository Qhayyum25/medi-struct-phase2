import uuid
from datetime import datetime
from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from app.schemas.entity import EntityRead
from app.schemas.relation import RelationRead

DocumentStatus = Literal["uploaded", "extracted", "deidentified", "processing", "completed", "failed"]
FileType = Literal["pdf", "docx", "txt"]


class DocumentUploadResponse(BaseModel):
    document_id: uuid.UUID
    filename: str
    status: DocumentStatus


class DocumentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    filename: str
    file_type: FileType
    file_size: int
    status: DocumentStatus = Field(validation_alias=AliasChoices("processing_status", "status"))
    created_at: datetime
    updated_at: datetime


class DocumentDetail(DocumentSummary):
    patient_id: uuid.UUID | None = None
    error_message: str | None = None
    entity_count: int = 0
    relation_count: int = 0
    # Only filled when the client asks with ?include_text=true
    extracted_text: str | None = None
    deidentified_text: str | None = None


class DocumentStatusResponse(BaseModel):
    document_id: uuid.UUID
    status: DocumentStatus
    error_message: str | None = None
    updated_at: datetime


class ExtractionMetadata(BaseModel):
    file_type: FileType
    character_count: int
    word_count: int
    page_count: int | None = None
    paragraph_count: int | None = None
    table_count: int | None = None
    encoding: str | None = None


class ExtractionResponse(BaseModel):
    document_id: uuid.UUID
    status: DocumentStatus
    text: str
    metadata: ExtractionMetadata


class DeidentificationResponse(BaseModel):
    document_id: uuid.UUID
    status: DocumentStatus
    original_text: str
    deidentified_text: str
    identifiers_detected: int
    identifiers_by_type: dict[str, int]


class ProcessingStatistics(BaseModel):
    entity_count: int
    relation_count: int
    entities_by_type: dict[str, int]
    relations_by_type: dict[str, int]
    duration_ms: float
    ner_model: str
    relation_model: str


class ProcessingResponse(BaseModel):
    document_id: uuid.UUID
    status: DocumentStatus
    entities: list[EntityRead]
    relations: list[RelationRead]
    statistics: ProcessingStatistics
