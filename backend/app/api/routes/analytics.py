from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.analytics import (AssociationRule, AssociationRuleRequest, AssociationRuleResponse,
                                   ClusterAssignment, ClusterRequest, ClusterResponse, ClusterSummary,
                                   CohortDocumentRef, CohortPatient, CohortRequest, CohortResponse)
from app.schemas.common import ErrorResponse
from app.services import knowledge_discovery_service as kd

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

_common_errors = {401: {"model": ErrorResponse}, 422: {"model": ErrorResponse}}


@router.post("/association-rules", response_model=AssociationRuleResponse,
            summary="Association-rule mining over entity co-occurrence",
            description=("Apriori (mlxtend) over a documents x entities basket: which entities tend "
                        "to appear together across your completed documents. Set `item_level` to "
                        "'entity_text' for rules about specific values (e.g. 'Metformin') instead of "
                        "types (e.g. 'Medication')."),
            responses=_common_errors)
def association_rules(payload: AssociationRuleRequest, db: DbSession, user: CurrentUser
                      ) -> AssociationRuleResponse:
    rules = kd.mine_association_rules(
        db, user, item_level=payload.item_level, entity_types=payload.entity_types,
        min_support=payload.min_support, min_confidence=payload.min_confidence,
        min_lift=payload.min_lift, max_len=payload.max_len)
    basket = kd._document_item_frame(db, user, item_level=payload.item_level,
                                     entity_types=payload.entity_types)
    return AssociationRuleResponse(rules=[AssociationRule(**r) for r in rules],
                                   transactions_considered=len(basket))


@router.post("/clusters", response_model=ClusterResponse,
            summary="K-Means clustering of patients by their lab observations",
            description=("Clusters pseudonymous patients on the mean value of each numeric "
                        "observation (e.g. HbA1c), standardised first. Requires enough patients "
                        "with a complete set of the selected observation types."),
            responses=_common_errors)
def clusters(payload: ClusterRequest, db: DbSession, user: CurrentUser) -> ClusterResponse:
    result = kd.cluster_patients(db, user, k=payload.k, observation_types=payload.observation_types)
    return ClusterResponse(
        k=result["k"], observation_types=result["observation_types"], inertia=result["inertia"],
        assignments=[ClusterAssignment(**a) for a in result["assignments"]],
        clusters=[ClusterSummary(**c) for c in result["clusters"]])


@router.post("/cohorts", response_model=CohortResponse,
            summary="Cohort discovery by entity and observation filters",
            description=("Finds pseudonymous patients whose documents match ALL given filters "
                        "(disease/medication/procedure entities, lab-value ranges, ...)."),
            responses=_common_errors)
def cohorts(payload: CohortRequest, db: DbSession, user: CurrentUser) -> CohortResponse:
    items, total = kd.discover_cohort(
        db, user,
        entity_filters=[(f.entity_type, f.entity_text) for f in payload.entity_filters],
        observation_filters=[(f.observation_type, f.min_value, f.max_value)
                             for f in payload.observation_filters],
        page=payload.page, page_size=payload.page_size)
    return CohortResponse(
        items=[CohortPatient(patient_id=i["patient_id"], anonymized_identifier=i["anonymized_identifier"],
                             documents=[CohortDocumentRef(**d) for d in i["documents"]]) for i in items],
        total=total, page=payload.page, page_size=payload.page_size)
