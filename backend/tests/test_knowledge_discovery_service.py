import pytest

from app.core.errors import AppError
from app.db.database import SessionLocal
from app.models import User
from app.services import knowledge_discovery_service as kd
from tests.analytics_helpers import seed_document


@pytest.fixture
def owner(client):
    with SessionLocal() as db:
        u = User(email="owner@example.com", hashed_password="x")
        db.add(u); db.commit(); db.refresh(u)
        yield u, db


# ---------------------------------------------------------------- association rules
def test_association_rules_find_a_perfect_co_occurrence(owner):
    user, db = owner
    # 4 docs where Disease and Medication co-occur, plus 2 distractor docs with neither
    # (a different entity type), so Disease/Medication are NOT in every transaction and a
    # positive lift is meaningful (lift == 1 would just mean "no correlation").
    for i in range(4):
        seed_document(db, user, filename=f"d{i}.txt",
                      entities=[("Disease", "diabetes"), ("Medication", "metformin")])
    for i in range(2):
        seed_document(db, user, filename=f"other{i}.txt", entities=[("Symptom", "fatigue")])

    rules = kd.mine_association_rules(db, user, item_level="entity_type",
                                      min_support=0.1, min_confidence=0.5)
    pairs = {(tuple(r["antecedents"]), tuple(r["consequents"])) for r in rules}
    assert (("Disease",), ("Medication",)) in pairs
    rule = next(r for r in rules if r["antecedents"] == ["Disease"] and r["consequents"] == ["Medication"])
    assert rule["confidence"] == pytest.approx(1.0) and rule["lift"] > 1


def test_association_rules_entity_text_level(owner):
    user, db = owner
    for i in range(3):
        seed_document(db, user, filename=f"d{i}.txt",
                      entities=[("Medication", "metformin"), ("Disease", "type 2 diabetes")])
    rules = kd.mine_association_rules(db, user, item_level="entity_text", min_support=0.5, min_confidence=0.5)
    items = {item for r in rules for item in r["antecedents"] + r["consequents"]}
    assert "Medication:metformin" in items and "Disease:type 2 diabetes" in items


def test_association_rules_respects_entity_type_filter(owner):
    user, db = owner
    for i in range(3):
        seed_document(db, user, filename=f"d{i}.txt",
                      entities=[("Disease", "diabetes"), ("Symptom", "fatigue"), ("Medication", "metformin")])
    rules = kd.mine_association_rules(db, user, entity_types=["Disease", "Medication"], min_support=0.5)
    items = {item for r in rules for item in r["antecedents"] + r["consequents"]}
    assert items <= {"Disease", "Medication"}


def test_association_rules_insufficient_transactions(owner):
    user, db = owner
    seed_document(db, user, entities=[("Disease", "diabetes"), ("Medication", "metformin")])
    with pytest.raises(AppError) as err:
        kd.mine_association_rules(db, user)
    assert err.value.status_code == 422 and err.value.code == "INSUFFICIENT_DATA"


def test_association_rules_empty_when_no_frequent_pattern(owner):
    user, db = owner
    for i in range(3):
        seed_document(db, user, filename=f"d{i}.txt", entities=[("Disease", f"unique{i}")])
    assert kd.mine_association_rules(db, user, item_level="entity_text", min_support=0.9) == []


def test_association_rules_are_scoped_per_user(owner):
    user, db = owner
    other = User(email="other-analytics@example.com", hashed_password="x")
    db.add(other); db.commit(); db.refresh(other)
    for i in range(3):
        seed_document(db, other, filename=f"o{i}.txt",
                      entities=[("Disease", "diabetes"), ("Medication", "metformin")])
    with pytest.raises(AppError):
        kd.mine_association_rules(db, user)   # the requesting user has no documents at all


# ---------------------------------------------------------------- clustering
def test_clustering_separates_two_clear_groups(owner):
    user, db = owner
    for v in [7.9, 8.0, 8.1, 8.2]:
        seed_document(db, user, filename=f"low{v}.txt", observations=[("HbA1c", v, "%")])
    for v in [11.9, 12.0, 12.1, 12.2]:
        seed_document(db, user, filename=f("high{v}.txt".format(v=v)) if False else f"high{v}.txt",
                      observations=[("HbA1c", v, "%")])
    result = kd.cluster_patients(db, user, k=2)
    assert result["k"] == 2 and len(result["assignments"]) == 8
    by_cluster = {}
    for a in result["assignments"]:
        by_cluster.setdefault(a["cluster"], []).append(a["patient_id"])
    assert sorted(len(v) for v in by_cluster.values()) == [4, 4]
    means = sorted(c["mean_values"]["HbA1c"] for c in result["clusters"])
    assert means[0] < 9 and means[1] > 11


def test_clustering_uses_multiple_observation_types_together(owner):
    user, db = owner
    for i in range(4):
        seed_document(db, user, filename=f"a{i}.txt",
                      observations=[("HbA1c", 7.0 + i * 0.1, "%"), ("Weight", 60 + i, "kg")])
    result = kd.cluster_patients(db, user, k=2, observation_types=["HbA1c", "Weight"])
    assert set(result["observation_types"]) == {"HbA1c", "Weight"}


def test_clustering_insufficient_patients(owner):
    user, db = owner
    seed_document(db, user, observations=[("HbA1c", 8.0, "%")])
    with pytest.raises(AppError) as err:
        kd.cluster_patients(db, user, k=2)
    assert err.value.status_code == 422 and err.value.code == "INSUFFICIENT_DATA"


def test_clustering_no_numeric_observations(owner):
    user, db = owner
    for i in range(4):
        seed_document(db, user, filename=f"a{i}.txt", entities=[("Disease", "diabetes")])
    with pytest.raises(AppError):
        kd.cluster_patients(db, user, k=2)


def test_clustering_drops_patients_with_incomplete_observation_sets(owner):
    user, db = owner
    for i in range(4):
        seed_document(db, user, filename=f"both{i}.txt",
                      observations=[("HbA1c", 8.0 + i * 0.1, "%"), ("Weight", 60 + i, "kg")])
    seed_document(db, user, filename="onlyone.txt", observations=[("HbA1c", 9.0, "%")])
    result = kd.cluster_patients(db, user, k=2, observation_types=["HbA1c", "Weight"])
    assert len(result["assignments"]) == 4     # the incomplete patient is excluded


def test_clustering_is_scoped_per_user(owner):
    user, db = owner
    other = User(email="other-cluster@example.com", hashed_password="x")
    db.add(other); db.commit(); db.refresh(other)
    for i in range(5):
        seed_document(db, other, filename=f"o{i}.txt", observations=[("HbA1c", 8.0 + i, "%")])
    with pytest.raises(AppError):
        kd.cluster_patients(db, user, k=2)


# ---------------------------------------------------------------- cohort discovery
def test_cohort_matches_all_filters(owner):
    user, db = owner
    _, p_match = seed_document(db, user, filename="m.txt",
                               entities=[("Disease", "type 2 diabetes"), ("Medication", "metformin")],
                               observations=[("HbA1c", 8.5, "%")])
    seed_document(db, user, filename="wrong_drug.txt",
                 entities=[("Disease", "type 2 diabetes"), ("Medication", "insulin")],
                 observations=[("HbA1c", 8.5, "%")])
    seed_document(db, user, filename="low_hba1c.txt",
                 entities=[("Disease", "type 2 diabetes"), ("Medication", "metformin")],
                 observations=[("HbA1c", 5.5, "%")])

    items, total = kd.discover_cohort(
        db, user, entity_filters=[("Disease", "diabetes"), ("Medication", "metformin")],
        observation_filters=[("HbA1c", 7.0, None)], page=1, page_size=20)
    assert total == 1 and items[0]["patient_id"] == str(p_match.id)


def test_cohort_entity_text_is_optional_contains_filter(owner):
    user, db = owner
    seed_document(db, user, entities=[("Disease", "hypertension")])
    seed_document(db, user, filename="d2.txt", entities=[("Disease", "type 2 diabetes")])
    any_disease = kd.discover_cohort(db, user, entity_filters=[("Disease", None)],
                                     observation_filters=[], page=1, page_size=20)
    assert any_disease[1] == 2
    specific = kd.discover_cohort(db, user, entity_filters=[("Disease", "diabetes")],
                                  observation_filters=[], page=1, page_size=20)
    assert specific[1] == 1


def test_cohort_observation_range_filters(owner):
    user, db = owner
    seed_document(db, user, observations=[("HbA1c", 6.0, "%")])
    seed_document(db, user, filename="d2.txt", observations=[("HbA1c", 9.0, "%")])
    result, total = kd.discover_cohort(db, user, entity_filters=[],
                                       observation_filters=[("HbA1c", 8.0, 10.0)], page=1, page_size=20)
    assert total == 1


def test_cohort_pagination(owner):
    user, db = owner
    for i in range(5):
        seed_document(db, user, filename=f"d{i}.txt", entities=[("Disease", "diabetes")])
    page1, total = kd.discover_cohort(db, user, entity_filters=[("Disease", None)],
                                      observation_filters=[], page=1, page_size=2)
    assert total == 5 and len(page1) == 2
    page3, _ = kd.discover_cohort(db, user, entity_filters=[("Disease", None)],
                                  observation_filters=[], page=3, page_size=2)
    assert len(page3) == 1


def test_cohort_requires_at_least_one_filter(owner):
    user, db = owner
    with pytest.raises(AppError) as err:
        kd.discover_cohort(db, user, entity_filters=[], observation_filters=[], page=1, page_size=20)
    assert err.value.status_code == 422 and err.value.code == "VALIDATION_ERROR"


def test_cohort_is_scoped_per_user(owner):
    user, db = owner
    other = User(email="other-cohort@example.com", hashed_password="x")
    db.add(other); db.commit(); db.refresh(other)
    seed_document(db, other, entities=[("Disease", "diabetes")])
    _, total = kd.discover_cohort(db, user, entity_filters=[("Disease", None)],
                                  observation_filters=[], page=1, page_size=20)
    assert total == 0
