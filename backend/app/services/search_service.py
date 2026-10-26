"""Module 12 - search across entities, relations and documents.

All filters are optional, but at least one is required. They narrow the three result
groups consistently:

  entities   entity_type / entity_text / q on the entity itself; relation_type keeps only
             entities taking part in such a relation; min_confidence = entity confidence
  relations  relation_type; entity_type / entity_text / q must match the subject OR the
             object entity; min_confidence = relation confidence
  documents  documents that contain a matching entity AND/OR a matching relation
             (q also matches the filename)

Every user-supplied value is bound as a query parameter, and LIKE wildcards in the text are
escaped, so input is always treated as data.
"""
import uuid

from sqlalchemy import and_, exists, or_, select
from sqlalchemy.orm import Session, aliased, joinedload

from app.core.errors import AppError
from app.models import Document, Entity, Relation, User
from app.schemas.common import Page
from app.schemas.document import DocumentSummary
from app.schemas.entity import EntityRead
from app.schemas.relation import RelationRead
from app.schemas.search import SearchResponse
from app.services.query_utils import ilike_contains, restrict_to_owner
from app.utils.pagination import paginate


def _entity_conditions(entity_cls, *, entity_type, entity_text, q) -> list:
    conditions = []
    if entity_type:
        conditions.append(entity_cls.entity_type == entity_type)
    if entity_text:
        conditions.append(ilike_contains(entity_cls.entity_text, entity_text))
    if q:
        conditions.append(ilike_contains(entity_cls.entity_text, q))
    return conditions


def search(db: Session, user: User, *, page: int, page_size: int, q: str | None = None,
           entity_type: str | None = None, entity_text: str | None = None,
           relation_type: str | None = None, document_id: uuid.UUID | None = None,
           min_confidence: float | None = None) -> SearchResponse:
    if not any([q, entity_type, entity_text, relation_type, document_id]):
        raise AppError(422, "VALIDATION_ERROR",
                       "Provide at least one of: q, entity_type, entity_text, relation_type, document_id.")
    entity_filters = dict(entity_type=entity_type, entity_text=entity_text, q=q)
    has_entity_filter = any(entity_filters.values())

    # ------------------------------------------------------------ entities
    ent_stmt = restrict_to_owner(
        select(Entity).join(Document, Document.id == Entity.document_id), user)
    for cond in _entity_conditions(Entity, **entity_filters):
        ent_stmt = ent_stmt.where(cond)
    if document_id:
        ent_stmt = ent_stmt.where(Entity.document_id == document_id)
    if min_confidence is not None:
        ent_stmt = ent_stmt.where(Entity.confidence >= min_confidence)
    if relation_type:
        rel_ids = select(Relation.subject_entity_id).where(Relation.relation_type == relation_type)
        rel_objs = select(Relation.object_entity_id).where(Relation.relation_type == relation_type)
        ent_stmt = ent_stmt.where(or_(Entity.id.in_(rel_ids), Entity.id.in_(rel_objs)))
    ent_stmt = ent_stmt.order_by(Document.created_at.desc(), Entity.document_id,
                                 Entity.start_position, Entity.id)
    entities, ent_total = paginate(db, ent_stmt, page, page_size)

    # ------------------------------------------------------------ relations
    subj, obj = aliased(Entity), aliased(Entity)
    rel_stmt = restrict_to_owner(
        select(Relation).join(Document, Document.id == Relation.document_id)
        .join(subj, subj.id == Relation.subject_entity_id)
        .join(obj, obj.id == Relation.object_entity_id), user)
    if relation_type:
        rel_stmt = rel_stmt.where(Relation.relation_type == relation_type)
    if document_id:
        rel_stmt = rel_stmt.where(Relation.document_id == document_id)
    if min_confidence is not None:
        rel_stmt = rel_stmt.where(Relation.confidence >= min_confidence)
    if has_entity_filter:
        s_conds = _entity_conditions(subj, **entity_filters)
        o_conds = _entity_conditions(obj, **entity_filters)
        rel_stmt = rel_stmt.where(or_(and_(*s_conds), and_(*o_conds)))
    rel_stmt = (rel_stmt.options(joinedload(Relation.subject), joinedload(Relation.object))
                .order_by(Document.created_at.desc(), Relation.document_id, subj.start_position, Relation.id))
    relations, rel_total = paginate(db, rel_stmt, page, page_size)

    # ------------------------------------------------------------ documents
    doc_stmt = restrict_to_owner(select(Document), user)
    if document_id:
        doc_stmt = doc_stmt.where(Document.id == document_id)
    if entity_type or entity_text or min_confidence is not None:
        e = aliased(Entity)
        conds = [e.document_id == Document.id,
                 *_entity_conditions(e, entity_type=entity_type, entity_text=entity_text, q=None)]
        if min_confidence is not None:
            conds.append(e.confidence >= min_confidence)
        doc_stmt = doc_stmt.where(exists().where(*conds))
    if q:
        qe = aliased(Entity)
        doc_stmt = doc_stmt.where(or_(
            exists().where(qe.document_id == Document.id, ilike_contains(qe.entity_text, q)),
            ilike_contains(Document.filename, q)))
    if relation_type:
        doc_stmt = doc_stmt.where(exists().where(Relation.document_id == Document.id,
                                                 Relation.relation_type == relation_type))
    doc_stmt = doc_stmt.order_by(Document.created_at.desc(), Document.id)
    documents, doc_total = paginate(db, doc_stmt, page, page_size)

    def wrap(items, total, schema):
        return Page(items=[schema.model_validate(i) for i in items], total=total,
                    page=page, page_size=page_size)

    return SearchResponse(entities=wrap(entities, ent_total, EntityRead),
                          relations=wrap(relations, rel_total, RelationRead),
                          documents=wrap(documents, doc_total, DocumentSummary))
