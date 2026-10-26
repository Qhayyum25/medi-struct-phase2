import uuid

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from app.schemas.entity import EntityRead


class RelationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    document_id: uuid.UUID
    relation_type: str
    confidence: float
    subject_entity: EntityRead = Field(validation_alias=AliasChoices("subject", "subject_entity"))
    object_entity: EntityRead = Field(validation_alias=AliasChoices("object", "object_entity"))
