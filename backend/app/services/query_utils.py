"""Small helpers for safe, parameterised text filtering."""
from sqlalchemy import Select
from sqlalchemy.orm import InstrumentedAttribute

from app.models import Document, User

LIKE_ESCAPE = "\\"


def contains_pattern(term: str) -> str:
    """Build a LIKE pattern for a 'contains' search, escaping %, _ and the escape char so the
    user's text is always matched literally."""
    escaped = term.replace(LIKE_ESCAPE, LIKE_ESCAPE * 2).replace("%", LIKE_ESCAPE + "%").replace("_", LIKE_ESCAPE + "_")
    return f"%{escaped}%"


def ilike_contains(column: InstrumentedAttribute, term: str):
    return column.ilike(contains_pattern(term), escape=LIKE_ESCAPE)


def restrict_to_owner(stmt: Select, user: User) -> Select:
    """Non-admin users only ever see rows that belong to their own documents."""
    return stmt if user.role == "admin" else stmt.where(Document.owner_id == user.id)
