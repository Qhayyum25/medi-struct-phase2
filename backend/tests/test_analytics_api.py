import uuid

from app.db.database import SessionLocal
from tests.analytics_helpers import seed_document


def test_analytics_endpoints_require_auth(client):
    assert client.post("/api/analytics/association-rules", json={}).status_code == 401
    assert client.post("/api/analytics/clusters", json={"k": 2}).status_code == 401
    assert client.post("/api/analytics/cohorts", json={"entity_filters": [{"entity_type": "Disease"}]}
                       ).status_code == 401


def test_association_rules_endpoint(client, auth_headers):
    with SessionLocal() as db:
        from app.models import User
        user = db.query(User).filter_by(email="student@example.com").one()
        for i in range(4):
            seed_document(db, user, filename=f"d{i}.txt",
                          entities=[("Disease", "diabetes"), ("Medication", "metformin")])
        for i in range(2):
            seed_document(db, user, filename=f"x{i}.txt", entities=[("Symptom", "cough")])

    r = client.post("/api/analytics/association-rules",
                    json={"min_support": 0.1, "min_confidence": 0.5}, headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["transactions_considered"] == 6
    assert any(rule["antecedents"] == ["Disease"] and rule["consequents"] == ["Medication"]
              for rule in body["rules"])


def test_association_rules_insufficient_data_returns_422(client, auth_headers):
    r = client.post("/api/analytics/association-rules", json={}, headers=auth_headers)
    assert r.status_code == 422 and r.json()["error"]["code"] == "INSUFFICIENT_DATA"


def test_association_rules_validates_request_body(client, auth_headers):
    r = client.post("/api/analytics/association-rules",
                    json={"min_support": 1.5}, headers=auth_headers)
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"
    r = client.post("/api/analytics/association-rules",
                    json={"item_level": "bogus"}, headers=auth_headers)
    assert r.status_code == 422


def test_clusters_endpoint(client, auth_headers):
    with SessionLocal() as db:
        from app.models import User
        user = db.query(User).filter_by(email="student@example.com").one()
        for v in [7.9, 8.0, 8.1, 8.2]:
            seed_document(db, user, filename=f"low{v}.txt", observations=[("HbA1c", v, "%")])
        for v in [11.9, 12.0, 12.1, 12.2]:
            seed_document(db, user, filename=f"high{v}.txt", observations=[("HbA1c", v, "%")])

    r = client.post("/api/analytics/clusters", json={"k": 2}, headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["k"] == 2 and len(body["assignments"]) == 8 and len(body["clusters"]) == 2
    assert all("anonymized_identifier" in a for a in body["assignments"])
    assert all(len(a["patient_id"]) == 36 for a in body["assignments"])  # UUID string, not raw PHI


def test_clusters_validates_k_and_reports_insufficient_data(client, auth_headers):
    assert client.post("/api/analytics/clusters", json={"k": 1}, headers=auth_headers).status_code == 422
    assert client.post("/api/analytics/clusters", json={"k": 25}, headers=auth_headers).status_code == 422
    r = client.post("/api/analytics/clusters", json={"k": 2}, headers=auth_headers)
    assert r.status_code == 422 and r.json()["error"]["code"] == "INSUFFICIENT_DATA"


def test_cohorts_endpoint(client, auth_headers):
    with SessionLocal() as db:
        from app.models import User
        user = db.query(User).filter_by(email="student@example.com").one()
        seed_document(db, user, filename="m.txt",
                      entities=[("Disease", "type 2 diabetes"), ("Medication", "metformin")],
                      observations=[("HbA1c", 8.5, "%")])
        seed_document(db, user, filename="o.txt", entities=[("Disease", "asthma")])

    r = client.post("/api/analytics/cohorts",
                    json={"entity_filters": [{"entity_type": "Disease", "entity_text": "diabetes"}],
                          "observation_filters": [{"observation_type": "HbA1c", "min_value": 7.0}]},
                    headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["documents"][0]["filename"] == "m.txt"


def test_cohorts_requires_a_filter(client, auth_headers):
    r = client.post("/api/analytics/cohorts", json={}, headers=auth_headers)
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_cohorts_rejects_inverted_range(client, auth_headers):
    r = client.post("/api/analytics/cohorts",
                    json={"observation_filters": [{"observation_type": "HbA1c",
                                                   "min_value": 10, "max_value": 5}]},
                    headers=auth_headers)
    assert r.status_code == 422


def test_analytics_are_scoped_per_user(client, auth_headers, second_user_headers):
    with SessionLocal() as db:
        from app.models import User
        user = db.query(User).filter_by(email="student@example.com").one()
        for i in range(4):
            seed_document(db, user, filename=f"d{i}.txt",
                          entities=[("Disease", "diabetes"), ("Medication", "metformin")])
    r = client.post("/api/analytics/association-rules", json={"min_support": 0.1},
                    headers=second_user_headers)
    assert r.status_code == 422 and r.json()["error"]["code"] == "INSUFFICIENT_DATA"

    r = client.post("/api/analytics/cohorts",
                    json={"entity_filters": [{"entity_type": "Disease"}]}, headers=second_user_headers)
    assert r.status_code == 200 and r.json()["total"] == 0
