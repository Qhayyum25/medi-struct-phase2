"""Optional dev helper. Production/normal use: `alembic upgrade head`."""
import logging

from app.db.base import Base
from app.db.database import engine
import app.models  # noqa: F401  (registers all tables on Base.metadata)

logger = logging.getLogger("app.db")


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured (create_all)")
