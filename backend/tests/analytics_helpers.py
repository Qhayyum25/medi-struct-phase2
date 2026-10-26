"""Direct DB seeding helpers for analytics tests.

Analytics operate on Entity/Relation/Observation rows that the pipeline would have
produced. Building them directly (rather than running the full NER pipeline) keeps these
tests fast and lets us construct precise, known data distributions to assert against -
the data itself is still realistic clinical structure, not fake application behaviour.
"""
import uuid

from app.models import Document, Entity, Observation, Patient


def seed_document(db, owner, *, filename="d.txt", entities=(), observations=(), patient=None):
    """entities: [(type, text)]  observations: [(type, value, unit)]"""
    patient = patient or Patient(anonymized_identifier=f"PT-{uuid.uuid4().hex[:8]}")
    if patient.id is None:
        db.add(patient); db.flush()
    doc = Document(owner_id=owner.id, patient_id=patient.id, filename=filename, file_type="txt",
                   file_size=1, original_path=f"{owner.id}/{uuid.uuid4().hex}.txt",
                   processing_status="completed", deidentified_text="synthetic")
    db.add(doc); db.flush()
    for etype, etext in entities:
        db.add(Entity(document_id=doc.id, entity_text=etext, entity_type=etype,
                      start_position=0, end_position=len(etext), confidence=0.9))
    for otype, value, unit in observations:
        db.add(Observation(patient_id=patient.id, document_id=doc.id, observation_type=otype,
                           value=value, unit=unit))
    db.commit()
    return doc, patient
