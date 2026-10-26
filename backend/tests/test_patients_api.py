from app.db.database import SessionLocal
from tests.analytics_helpers import seed_document


def test_patients_requires_auth(client):
    assert client.get("/api/patients").status_code == 401


def test_list_and_get_patient(client, auth_headers):
    with SessionLocal() as db:
        from app.models import User
        user = db.query(User).filter_by(email="student@example.com").one()
        doc, patient = seed_document(db, user, filename="a.txt",
                                     entities=[("Disease", "diabetes")],
                                     observations=[("HbA1c", 8.2, "%")])

    listing = client.get("/api/patients", headers=auth_headers).json()
    assert listing["total"] == 1
    item = listing["items"][0]
    assert item["anonymized_identifier"] == patient.anonymized_identifier
    assert item["document_count"] == 1 and item["observation_count"] == 1

    detail = client.get(f"/api/patients/{patient.id}", headers=auth_headers).json()
    assert detail["document_ids"] == [str(doc.id)]
    assert "anonymized_identifier" in detail
    # never leaks the raw stored document text
    assert "diabetes" not in str(detail) and "HbA1c" not in str(detail)


def test_patients_are_private_per_user(client, auth_headers, second_user_headers):
    with SessionLocal() as db:
        from app.models import User
        user = db.query(User).filter_by(email="student@example.com").one()
        _, patient = seed_document(db, user, entities=[("Disease", "diabetes")])

    assert client.get("/api/patients", headers=second_user_headers).json()["total"] == 0
    assert client.get(f"/api/patients/{patient.id}", headers=second_user_headers).status_code == 404


def test_get_unknown_patient(client, auth_headers):
    import uuid
    assert client.get(f"/api/patients/{uuid.uuid4()}", headers=auth_headers).status_code == 404
