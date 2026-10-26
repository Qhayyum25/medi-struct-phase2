import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.database import SessionLocal
from app.models import Document, Entity, Observation, Patient, Relation, User


def _seed(db):
    user = User(email="u@example.com", hashed_password="x")
    patient = Patient(anonymized_identifier="PT-0001")
    db.add_all([user, patient]); db.flush()
    doc = Document(owner_id=user.id, patient_id=patient.id, filename="a.txt", file_type="txt",
                   file_size=1, original_path="x/y.txt")
    db.add(doc); db.flush()
    e1 = Entity(document_id=doc.id, entity_text="diabetes", entity_type="Disease",
                start_position=0, end_position=8, confidence=0.9)
    e2 = Entity(document_id=doc.id, entity_text="Metformin", entity_type="Medication",
                start_position=20, end_position=29, confidence=0.8)
    db.add_all([e1, e2]); db.flush()
    db.add_all([Relation(document_id=doc.id, subject_entity_id=e2.id, object_entity_id=e1.id,
                         relation_type="treats", confidence=0.7),
                Observation(patient_id=patient.id, document_id=doc.id, observation_type="HbA1c",
                            value=8.2, unit="%")])
    db.commit()
    return user, patient, doc


def test_relationships_load(client):
    with SessionLocal() as db:
        user, patient, doc = _seed(db)
        assert doc.owner.email == "u@example.com" and doc.patient.anonymized_identifier == "PT-0001"
        assert {e.entity_type for e in doc.entities} == {"Disease", "Medication"}
        rel = doc.relations[0]
        assert rel.subject.entity_text == "Metformin" and rel.object.entity_text == "diabetes"
        assert patient.observations[0].value == 8.2 and doc.processing_status == "uploaded"


def test_deleting_document_cascades(client):
    with SessionLocal() as db:
        user, patient, doc = _seed(db)
        db.delete(doc); db.commit()
        assert db.scalars(select(Entity)).all() == []
        assert db.scalars(select(Relation)).all() == []
        assert db.scalars(select(Observation)).all() == []
        assert db.get(Patient, patient.id) is not None      # patient survives


def test_deleting_patient_keeps_documents(client):
    with SessionLocal() as db:
        user, patient, doc = _seed(db)
        db.delete(patient); db.commit()
        db.refresh(doc)
        assert doc.patient_id is None


def test_unique_email_constraint(client):
    with SessionLocal() as db:
        db.add(User(email="dup@example.com", hashed_password="x")); db.commit()
        db.add(User(email="dup@example.com", hashed_password="y"))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


def test_uuid_primary_keys_and_timestamps(client):
    with SessionLocal() as db:
        _, _, doc = _seed(db)
        assert isinstance(doc.id, uuid.UUID)
        assert doc.created_at is not None and doc.updated_at is not None
