import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession, Pagination
from app.schemas.common import ErrorResponse, Page
from app.schemas.relation import RelationRead
from app.services import document_service, relation_service

router = APIRouter(prefix="/api", tags=["Relations"])

_errors = {401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}}


def _page(rows, total, paging) -> Page[RelationRead]:
    return Page[RelationRead](items=[RelationRead.model_validate(r) for r in rows], total=total,
                              page=paging.page, page_size=paging.page_size)


@router.get("/relations", response_model=Page[RelationRead], summary="List extracted relations",
            description="Each relation contains its full subject and object entity.",
            responses={401: {"model": ErrorResponse}})
def list_relations(db: DbSession, user: CurrentUser, paging: Pagination,
                   document_id: uuid.UUID | None = None, relation_type: str | None = None,
                   subject_type: str | None = None, object_type: str | None = None,
                   min_confidence: Annotated[float | None, Query(ge=0, le=1)] = None
                   ) -> Page[RelationRead]:
    rows, total = relation_service.list_relations(
        db, user, page=paging.page, page_size=paging.page_size, document_id=document_id,
        relation_type=relation_type, subject_type=subject_type, object_type=object_type,
        min_confidence=min_confidence)
    return _page(rows, total, paging)


@router.get("/documents/{document_id}/relations", response_model=Page[RelationRead],
            summary="Relations of one document", responses=_errors)
def list_document_relations(document_id: uuid.UUID, db: DbSession, user: CurrentUser,
                            paging: Pagination, relation_type: str | None = None,
                            subject_type: str | None = None, object_type: str | None = None,
                            min_confidence: Annotated[float | None, Query(ge=0, le=1)] = None
                            ) -> Page[RelationRead]:
    document_service.get_document(db, document_id, user)
    rows, total = relation_service.list_relations(
        db, user, page=paging.page, page_size=paging.page_size, document_id=document_id,
        relation_type=relation_type, subject_type=subject_type, object_type=object_type,
        min_confidence=min_confidence)
    return _page(rows, total, paging)
