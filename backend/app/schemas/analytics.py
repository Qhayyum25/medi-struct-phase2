from typing import Literal

from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------- association rules
class AssociationRuleRequest(BaseModel):
    item_level: Literal["entity_type", "entity_text"] = Field(
        "entity_type", description="'entity_type' = coarse (Disease, Medication...); "
                                   "'entity_text' = specific values")
    entity_types: list[str] | None = Field(None, description="restrict to these entity types")
    min_support: float = Field(0.1, gt=0, le=1)
    min_confidence: float = Field(0.5, gt=0, le=1)
    min_lift: float = Field(1.0, ge=0)
    max_len: int | None = Field(None, ge=2, le=10, description="max items per rule side")


class AssociationRule(BaseModel):
    antecedents: list[str]
    consequents: list[str]
    support: float
    confidence: float
    lift: float


class AssociationRuleResponse(BaseModel):
    rules: list[AssociationRule]
    transactions_considered: int


# ---------------------------------------------------------------- clustering
class ClusterRequest(BaseModel):
    k: int = Field(..., ge=2, le=20, description="number of clusters")
    observation_types: list[str] | None = Field(
        None, description="restrict to these observation types (e.g. ['HbA1c', 'Blood pressure'])")


class ClusterAssignment(BaseModel):
    patient_id: str
    anonymized_identifier: str
    cluster: int


class ClusterSummary(BaseModel):
    cluster: int
    size: int
    mean_values: dict[str, float]


class ClusterResponse(BaseModel):
    k: int
    observation_types: list[str]
    inertia: float
    assignments: list[ClusterAssignment]
    clusters: list[ClusterSummary]


# ---------------------------------------------------------------- cohort discovery
class EntityFilter(BaseModel):
    entity_type: str
    entity_text: str | None = Field(None, description="case-insensitive 'contains' match")


class ObservationFilter(BaseModel):
    observation_type: str
    min_value: float | None = None
    max_value: float | None = None

    @model_validator(mode="after")
    def _range_makes_sense(self) -> "ObservationFilter":
        if self.min_value is not None and self.max_value is not None and self.min_value > self.max_value:
            raise ValueError("min_value must not be greater than max_value")
        return self


class CohortRequest(BaseModel):
    entity_filters: list[EntityFilter] = Field(default_factory=list)
    observation_filters: list[ObservationFilter] = Field(default_factory=list)
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class CohortDocumentRef(BaseModel):
    document_id: str
    filename: str


class CohortPatient(BaseModel):
    patient_id: str
    anonymized_identifier: str
    documents: list[CohortDocumentRef]


class CohortResponse(BaseModel):
    items: list[CohortPatient]
    total: int
    page: int
    page_size: int
