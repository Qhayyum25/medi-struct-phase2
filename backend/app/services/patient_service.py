"""Pseudonymous patient handling.

After de-identification we no longer have any real identifier to link documents from the
same person, so a fresh pseudonymous Patient is created for each document the first time
it is processed (documented as a limitation in the README). Re-processing a document
reuses the same Patient.
"""
import uuid

from sqlalchemy.orm import Session

from app.models import Document, Patient


def get_or_create_patient_for_document(db: Session, doc: Document) -> Patient:
    if doc.patient_id is not None:
        patient = db.get(Patient, doc.patient_id)
        if patient is not None:
            return patient
    patient = Patient(anonymized_identifier=f"PT-{uuid.uuid4().hex[:12].upper()}")
    db.add(patient)
    db.flush()
    doc.patient_id = patient.id
    return patient
