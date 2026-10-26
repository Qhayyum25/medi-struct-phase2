import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Observation(Base):
    """Structured measurement (e.g. lab value) attached to a pseudonymous patient."""
    __tablename__ = "observations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    observation_type: Mapped[str] = mapped_column(String(100), index=True)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)        # numeric values (used by clustering)
    value_text: Mapped[str | None] = mapped_column(String(200), nullable=True)  # non-numeric results
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="observations")
    document: Mapped["Document"] = relationship(back_populates="observations")
