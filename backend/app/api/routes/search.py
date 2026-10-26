import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession, Pagination
from app.schemas.common import ErrorResponse
from app.schemas.search import SearchResponse
from app.services import search_service

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("", response_model=SearchResponse, summary="Search entities, relations and documents",
            description=("Provide at least one filter. Text filters are case-insensitive 'contains' "
                         "matches; `q` also matches document filenames. Results come back in three "
                         "paginated groups (`entities`, `relations`, `documents`)."),
            responses={401: {"model": ErrorResponse}, 422: {"model": ErrorResponse}})
def search(db: DbSession, user: CurrentUser, paging: Pagination,
           q: Annotated[str | None, Query(max_length=200, description="free text")] = None,
           entity_type: str | None = None,
           entity_text: Annotated[str | None, Query(max_length=200)] = None,
           relation_type: str | None = None,
           document_id: uuid.UUID | None = None,
           min_confidence: Annotated[float | None, Query(ge=0, le=1)] = None) -> SearchResponse:
    return search_service.search(
        db, user, page=paging.page, page_size=paging.page_size, q=q, entity_type=entity_type,
        entity_text=entity_text, relation_type=relation_type, document_id=document_id,
        min_confidence=min_confidence)
