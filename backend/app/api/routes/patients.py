import uuid

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession, Pagination
from app.core.errors import AppError
from app.models import Document, Observation, Patient
from app.schemas.common import ErrorResponse, Page
from app.schemas.patient import PatientDetail, PatientSummary
from app.services.query_utils import restrict_to_owner

router = APIRouter(prefix="/api/patients", tags=["Patients"])


def _base_query():
    return (select(Patient.id, Patient.anonymized_identifier, Patient.created_at,
                   func.count(func.distinct(Document.id)).label("document_count"))
            .join(Document, Document.patient_id == Patient.id))


@router.get("", response_model=Page[PatientSummary],
            summary="List pseudonymous patients derived from your processed documents",
            responses={401: {"model": ErrorResponse}})
def list_patients(db: DbSession, user: CurrentUser, paging: Pagination) -> Page[PatientSummary]:
    stmt = restrict_to_owner(_base_query(), user).group_by(Patient.id).order_by(Patient.created_at.desc())
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(stmt.offset((paging.page - 1) * paging.page_size).limit(paging.page_size)).all()

    obs_counts = dict(db.execute(
        restrict_to_owner(select(Document.patient_id, func.count(Observation.id))
                          .join(Observation, Observation.document_id == Document.id), user)
        .where(Document.patient_id.in_([r.id for r in rows]) if rows else False)
        .group_by(Document.patient_id)).all()) if rows else {}

    items = [PatientSummary(id=r.id, anonymized_identifier=r.anonymized_identifier,
                            created_at=r.created_at, document_count=r.document_count,
                            observation_count=obs_counts.get(r.id, 0)) for r in rows]
    return Page[PatientSummary](items=items, total=total, page=paging.page, page_size=paging.page_size)


@router.get("/{patient_id}", response_model=PatientDetail, summary="One patient's summary",
            responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}})
def get_patient(patient_id: uuid.UUID, db: DbSession, user: CurrentUser) -> PatientDetail:
    stmt = restrict_to_owner(_base_query(), user).where(Patient.id == patient_id).group_by(Patient.id)
    row = db.execute(stmt).first()
    if row is None:
        raise AppError(404, "PATIENT_NOT_FOUND", "Patient not found.")
    doc_ids = [d for d, in db.execute(restrict_to_owner(select(Document.id), user)
                                      .where(Document.patient_id == patient_id))]
    obs_count = db.scalar(restrict_to_owner(select(func.count(Observation.id))
                                            .join(Document, Document.id == Observation.document_id), user)
                          .where(Document.patient_id == patient_id)) or 0
    return PatientDetail(id=row.id, anonymized_identifier=row.anonymized_identifier,
                         created_at=row.created_at, document_count=row.document_count,
                         observation_count=obs_count, document_ids=doc_ids)
