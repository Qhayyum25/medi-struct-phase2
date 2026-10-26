import uuid

from pydantic import BaseModel, ConfigDict, Field


class EntityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    entity_text: str
    entity_type: str
    start_position: int = Field(description="offset into the document's de-identified text")
    end_position: int
    confidence: float
    model_name: str | None = None
