"""Engine + session factory. Sessions are injected per request via get_db()."""
from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_kwargs: dict = {"pool_pre_ping": True,
                 # keep bound SQL parameters (possible PHI) out of error messages/logs
                 "hide_parameters": True}
if _is_sqlite:  # SQLite is used only by the test-suite
    _kwargs["connect_args"] = {"check_same_thread": False}
    if ":memory:" in settings.DATABASE_URL:
        _kwargs["poolclass"] = StaticPool

engine = create_engine(settings.DATABASE_URL, **_kwargs)

if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _enable_sqlite_fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency. Routes commit explicitly; anything uncommitted is rolled back."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
