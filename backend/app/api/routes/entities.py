import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession, Pagination
from app.schemas.common import ErrorResponse, Page
from app.schemas.entity import EntityRead
from app.services import document_service, entity_service

router = APIRouter(prefix="/api", tags=["Entities"])

_errors = {401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}}


@router.get("/entities", response_model=Page[EntityRead], summary="List extracted entities",
            description="Entities from your documents, newest document first. "
                        "`entity_text` is a case-insensitive 'contains' match.",
            responses={401: {"model": ErrorResponse}})
def list_entities(db: DbSession, user: CurrentUser, paging: Pagination,
                  document_id: uuid.UUID | None = None, entity_type: str | None = None,
                  entity_text: Annotated[str | None, Query(max_length=200)] = None,
                  min_confidence: Annotated[float | None, Query(ge=0, le=1)] = None) -> Page[EntityRead]:
    rows, total = entity_service.list_entities(
        db, user, page=paging.page, page_size=paging.page_size, document_id=document_id,
        entity_type=entity_type, entity_text=entity_text, min_confidence=min_confidence)
    return Page[EntityRead](items=[EntityRead.model_validate(r) for r in rows], total=total,
                            page=paging.page, page_size=paging.page_size)


@router.get("/entities/{entity_id}", response_model=EntityRead, summary="One entity",
            responses=_errors)
def get_entity(entity_id: uuid.UUID, db: DbSession, user: CurrentUser) -> EntityRead:
    return EntityRead.model_validate(entity_service.get_entity(db, entity_id, user))


@router.get("/documents/{document_id}/entities", response_model=Page[EntityRead],
            summary="Entities of one document (in text order)", responses=_errors)
def list_document_entities(document_id: uuid.UUID, db: DbSession, user: CurrentUser,
                           paging: Pagination, entity_type: str | None = None,
                           min_confidence: Annotated[float | None, Query(ge=0, le=1)] = None
                           ) -> Page[EntityRead]:
    document_service.get_document(db, document_id, user)          # 404 unless it is yours
    rows, total = entity_service.list_entities(
        db, user, page=paging.page, page_size=paging.page_size, document_id=document_id,
        entity_type=entity_type, min_confidence=min_confidence)
    rows.sort(key=lambda e: (e.start_position, str(e.id)))         # text order within the page
    return Page[EntityRead](items=[EntityRead.model_validate(r) for r in rows], total=total,
                            page=paging.page, page_size=paging.page_size)
