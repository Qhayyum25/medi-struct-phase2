import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, aliased, joinedload

from app.models import Document, Entity, Relation, User
from app.services.query_utils import restrict_to_owner
from app.utils.pagination import paginate


def list_relations(db: Session, user: User, *, page: int, page_size: int,
                   document_id: uuid.UUID | None = None, relation_type: str | None = None,
                   subject_type: str | None = None, object_type: str | None = None,
                   min_confidence: float | None = None) -> tuple[list[Relation], int]:
    subj, obj = aliased(Entity), aliased(Entity)
    stmt = (select(Relation)
            .join(Document, Document.id == Relation.document_id)
            .join(subj, subj.id == Relation.subject_entity_id)
            .join(obj, obj.id == Relation.object_entity_id))
    stmt = restrict_to_owner(stmt, user)
    if document_id:
        stmt = stmt.where(Relation.document_id == document_id)
    if relation_type:
        stmt = stmt.where(Relation.relation_type == relation_type)
    if subject_type:
        stmt = stmt.where(subj.entity_type == subject_type)
    if object_type:
        stmt = stmt.where(obj.entity_type == object_type)
    if min_confidence is not None:
        stmt = stmt.where(Relation.confidence >= min_confidence)
    stmt = (stmt.options(joinedload(Relation.subject), joinedload(Relation.object))
            .order_by(Document.created_at.desc(), Relation.document_id, subj.start_position, Relation.id))
    return paginate(db, stmt, page, page_size)
