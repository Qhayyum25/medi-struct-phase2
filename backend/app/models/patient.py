import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Patient(Base):
    """Pseudonymous patient. No name, DOB, address or contact details are stored."""
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    anonymized_identifier: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    documents: Mapped[list["Document"]] = relationship(back_populates="patient")
    observations: Mapped[list["Observation"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan", passive_deletes=True)
