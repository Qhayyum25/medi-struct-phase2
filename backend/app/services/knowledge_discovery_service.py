"""Module 11 - knowledge discovery: association-rule mining, clustering, cohort discovery.

All three operate on data the pipeline actually produced (Entity/Relation/Observation
rows) - nothing here is hardcoded or synthetic. Every function validates it has enough
data before calling into pandas/scikit-learn/mlxtend and raises AppError(422,
"INSUFFICIENT_DATA", ...) with a clear message otherwise.
"""
import logging
import uuid

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import Document, Entity, Observation, Patient, User
from app.services.query_utils import ilike_contains, restrict_to_owner

logger = logging.getLogger("app.analytics")

MIN_TRANSACTIONS_FOR_RULES = 3
MIN_PATIENTS_FOR_CLUSTERING = 4


def _insufficient(message: str) -> AppError:
    return AppError(422, "INSUFFICIENT_DATA", message)


# ============================================================ association rules
def _document_item_frame(db: Session, user: User, *, item_level: str,
                         entity_types: list[str] | None) -> pd.DataFrame:
    stmt = restrict_to_owner(select(Entity.document_id, Entity.entity_type, Entity.entity_text)
                             .join(Document, Document.id == Entity.document_id)
                             .where(Document.processing_status == "completed"), user)
    if entity_types:
        stmt = stmt.where(Entity.entity_type.in_(entity_types))
    rows = db.execute(stmt).all()
    if not rows:
        return pd.DataFrame()

    def item_of(entity_type: str, entity_text: str) -> str:
        return entity_type if item_level == "entity_type" else f"{entity_type}:{entity_text}"

    frame = pd.DataFrame([(str(r.document_id), item_of(r.entity_type, r.entity_text)) for r in rows],
                         columns=["document_id", "item"])
    basket = (frame.drop_duplicates().assign(present=True)
             .pivot(index="document_id", columns="item", values="present")
             .fillna(False).astype(bool))
    return basket


def mine_association_rules(db: Session, user: User, *, item_level: str = "entity_type",
                           entity_types: list[str] | None = None, min_support: float = 0.1,
                           min_confidence: float = 0.5, min_lift: float = 1.0,
                           max_len: int | None = None) -> list[dict]:
    """Apriori (mlxtend) over a documents x items basket. `item_level` is 'entity_type'
    (coarse: 'Disease', 'Medication', ...) or 'entity_text' (specific values)."""
    from mlxtend.frequent_patterns import apriori
    from mlxtend.frequent_patterns import association_rules as mlxtend_rules

    basket = _document_item_frame(db, user, item_level=item_level, entity_types=entity_types)
    if len(basket) < MIN_TRANSACTIONS_FOR_RULES:
        raise _insufficient(
            f"At least {MIN_TRANSACTIONS_FOR_RULES} fully processed documents with entities are "
            f"required for association-rule mining ({len(basket)} available).")
    if basket.shape[1] < 2:
        raise _insufficient("At least two distinct entity items are required.")

    frequent = apriori(basket, min_support=min_support, use_colnames=True, max_len=max_len)
    if frequent.empty:
        return []
    rules = mlxtend_rules(frequent, metric="confidence", min_threshold=min_confidence,
                          num_itemsets=len(basket))
    rules = rules[rules["lift"] >= min_lift].sort_values(
        ["lift", "confidence", "support"], ascending=False)

    return [{"antecedents": sorted(row.antecedents), "consequents": sorted(row.consequents),
             "support": round(float(row.support), 4), "confidence": round(float(row.confidence), 4),
             "lift": round(float(row.lift), 4)} for row in rules.itertuples()]


# ============================================================ clustering
def _patient_observation_frame(db: Session, user: User, *, observation_types: list[str] | None
                               ) -> pd.DataFrame:
    stmt = (select(Observation.patient_id, Observation.observation_type, Observation.value)
            .join(Document, Document.id == Observation.document_id)
            .where(Observation.value.is_not(None)))
    stmt = restrict_to_owner(stmt, user)
    if observation_types:
        stmt = stmt.where(Observation.observation_type.in_(observation_types))
    rows = db.execute(stmt).all()
    if not rows:
        return pd.DataFrame()
    frame = pd.DataFrame([(str(r.patient_id), r.observation_type, r.value) for r in rows],
                         columns=["patient_id", "observation_type", "value"])
    # Multiple observations of the same type for one patient (re-processing, several
    # documents) are averaged, which is a defensible, simple summary for clustering.
    return frame.pivot_table(index="patient_id", columns="observation_type", values="value",
                             aggfunc="mean")


def cluster_patients(db: Session, user: User, *, k: int, observation_types: list[str] | None = None
                     ) -> dict:
    """K-Means over per-patient mean observation values (scikit-learn), standardised first
    so observation types on different scales (e.g. '%' vs 'mmHg') weigh comparably."""
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    frame = _patient_observation_frame(db, user, observation_types=observation_types)
    frame = frame.dropna(axis=1, how="all")
    complete = frame.dropna(axis=0, how="any")   # patients missing any selected observation
    if len(complete) < max(k, MIN_PATIENTS_FOR_CLUSTERING):
        raise _insufficient(
            f"At least {max(k, MIN_PATIENTS_FOR_CLUSTERING)} patients with a complete set of "
            f"numeric observations are required for clustering ({len(complete)} available).")
    if complete.shape[1] < 1:
        raise _insufficient("No numeric observation types are available to cluster on.")

    scaled = StandardScaler().fit_transform(complete.to_numpy())
    model = KMeans(n_clusters=k, random_state=42, n_init=10).fit(scaled)

    complete = complete.assign(cluster=model.labels_)
    anon = dict(db.execute(select(Patient.id, Patient.anonymized_identifier)
                           .where(Patient.id.in_([uuid.UUID(i) for i in complete.index]))).all())

    assignments = [{"patient_id": pid, "anonymized_identifier": anon.get(uuid.UUID(pid), pid),
                    "cluster": int(row.cluster)} for pid, row in
                   zip(complete.index, complete.itertuples(index=False))]
    clusters = []
    for label in range(k):
        members = complete[complete["cluster"] == label].drop(columns="cluster")
        clusters.append({"cluster": label, "size": int(len(members)),
                         "mean_values": {col: round(float(members[col].mean()), 4)
                                        for col in members.columns}})
    return {"k": k, "observation_types": list(complete.columns.drop("cluster")),
           "inertia": round(float(model.inertia_), 4), "assignments": assignments, "clusters": clusters}


# ============================================================ cohort discovery
def discover_cohort(db: Session, user: User, *, entity_filters: list[tuple[str, str | None]],
                    observation_filters: list[tuple[str, float | None, float | None]],
                    page: int, page_size: int) -> tuple[list[dict], int]:
    """Patients (of the current user's documents) matching ALL given filters.

    entity_filters: [(entity_type, entity_text_contains_or_None), ...]
    observation_filters: [(observation_type, min_value_or_None, max_value_or_None), ...]
    """
    if not entity_filters and not observation_filters:
        raise AppError(422, "VALIDATION_ERROR", "Provide at least one entity or observation filter.")

    patient_ids = restrict_to_owner(select(Document.patient_id).where(Document.patient_id.is_not(None)),
                                    user).distinct()
    candidates = {row[0] for row in db.execute(patient_ids)}

    for entity_type, text_contains in entity_filters:
        stmt = (select(Document.patient_id).join(Entity, Entity.document_id == Document.id)
                .where(Document.patient_id.is_not(None), Entity.entity_type == entity_type))
        if text_contains:
            stmt = stmt.where(ilike_contains(Entity.entity_text, text_contains))
        candidates &= {row[0] for row in db.execute(restrict_to_owner(stmt, user).distinct())}
        if not candidates:
            return [], 0

    for obs_type, min_value, max_value in observation_filters:
        stmt = (select(Document.patient_id).join(Observation, Observation.document_id == Document.id)
                .where(Document.patient_id.is_not(None), Observation.observation_type == obs_type))
        if min_value is not None:
            stmt = stmt.where(Observation.value >= min_value)
        if max_value is not None:
            stmt = stmt.where(Observation.value <= max_value)
        candidates &= {row[0] for row in db.execute(restrict_to_owner(stmt, user).distinct())}
        if not candidates:
            return [], 0

    total = len(candidates)
    ordered = sorted(candidates, key=str)[(page - 1) * page_size: (page - 1) * page_size + page_size]
    if not ordered:
        return [], total

    patients = {p.id: p for p in db.scalars(select(Patient).where(Patient.id.in_(ordered)))}
    doc_rows = db.execute(restrict_to_owner(
        select(Document.id, Document.patient_id, Document.filename), user)
        .where(Document.patient_id.in_(ordered))).all()
    docs_by_patient: dict = {}
    for doc_id, patient_id, filename in doc_rows:
        docs_by_patient.setdefault(patient_id, []).append({"document_id": str(doc_id), "filename": filename})

    return ([{"patient_id": str(pid), "anonymized_identifier": patients[pid].anonymized_identifier,
              "documents": docs_by_patient.get(pid, [])} for pid in ordered], total)
