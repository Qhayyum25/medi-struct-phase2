import uuid

from app.db.database import SessionLocal
from app.models import Observation, Patient
from tests.samples import NLP_NOTE


def test_processing_creates_observations_and_a_patient(processed_doc, auth_headers):
    doc_id, _ = processed_doc
    with SessionLocal() as db:
        obs = db.query(Observation).filter_by(document_id=uuid.UUID(doc_id)).all()
        assert len(obs) == 1
        o = obs[0]
        assert o.observation_type == "HbA1c" and o.value == 8.2 and o.unit == "%"
        assert o.value_text is None
        assert db.query(Patient).filter_by(id=o.patient_id).count() == 1


def test_document_gets_a_patient_assigned(processed_doc, nlp_client, auth_headers):
    doc_id, _ = processed_doc
    detail = nlp_client.get(f"/api/documents/{doc_id}", headers=auth_headers).json()
    assert detail["patient_id"] is not None


def test_reprocessing_reuses_the_same_patient_and_replaces_observations(processed_doc, nlp_client, auth_headers):
    doc_id, _ = processed_doc
    before = nlp_client.get(f"/api/documents/{doc_id}", headers=auth_headers).json()["patient_id"]
    nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers)
    after = nlp_client.get(f"/api/documents/{doc_id}", headers=auth_headers).json()["patient_id"]
    assert before == after
    with SessionLocal() as db:
        assert db.query(Observation).filter_by(document_id=uuid.UUID(doc_id)).count() == 1
        assert db.query(Patient).count() == 1


def test_deleting_document_removes_observations_but_keeps_patient(processed_doc, nlp_client, auth_headers):
    doc_id, _ = processed_doc
    patient_id = nlp_client.get(f"/api/documents/{doc_id}", headers=auth_headers).json()["patient_id"]
    nlp_client.delete(f"/api/documents/{doc_id}", headers=auth_headers)
    with SessionLocal() as db:
        assert db.query(Observation).count() == 0
        assert db.query(Patient).filter_by(id=uuid.UUID(patient_id)).count() == 1


def test_document_without_lab_value_relations_gets_no_observations(nlp_client, upload, auth_headers):
    doc_id = upload("x.txt", b"General notes with no clinical findings.").json()["document_id"]
    nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers)
    with SessionLocal() as db:
        assert db.query(Observation).filter_by(document_id=uuid.UUID(doc_id)).count() == 0
    with SessionLocal() as db:
        from app.models import Document
        assert db.get(Document, uuid.UUID(doc_id)).patient_id is None
