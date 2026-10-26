import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import Document, Entity, User
from app.services.query_utils import ilike_contains, restrict_to_owner
from app.utils.pagination import paginate


def list_entities(db: Session, user: User, *, page: int, page_size: int,
                  document_id: uuid.UUID | None = None, entity_type: str | None = None,
                  entity_text: str | None = None, min_confidence: float | None = None
                  ) -> tuple[list[Entity], int]:
    stmt = select(Entity).join(Document, Document.id == Entity.document_id)
    stmt = restrict_to_owner(stmt, user)
    if document_id:
        stmt = stmt.where(Entity.document_id == document_id)
    if entity_type:
        stmt = stmt.where(Entity.entity_type == entity_type)
    if entity_text:
        stmt = stmt.where(ilike_contains(Entity.entity_text, entity_text))
    if min_confidence is not None:
        stmt = stmt.where(Entity.confidence >= min_confidence)
    stmt = stmt.order_by(Document.created_at.desc(), Entity.document_id, Entity.start_position, Entity.id)
    return paginate(db, stmt, page, page_size)


def get_entity(db: Session, entity_id: uuid.UUID, user: User) -> Entity:
    stmt = restrict_to_owner(select(Entity).join(Document, Document.id == Entity.document_id)
                             .where(Entity.id == entity_id), user)
    entity = db.scalar(stmt)
    if entity is None:
        raise AppError(404, "ENTITY_NOT_FOUND", "Entity not found.")
    return entity
