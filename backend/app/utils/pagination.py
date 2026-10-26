from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session


def paginate(db: Session, stmt: Select, page: int, page_size: int) -> tuple[list, int]:
    """Run `stmt` with LIMIT/OFFSET and also return the total row count."""
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    items = list(db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all())
    return items, total
