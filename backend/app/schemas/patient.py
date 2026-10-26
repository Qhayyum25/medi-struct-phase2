import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PatientSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    anonymized_identifier: str
    created_at: datetime
    document_count: int = 0
    observation_count: int = 0


class PatientDetail(PatientSummary):
    document_ids: list[uuid.UUID] = []
