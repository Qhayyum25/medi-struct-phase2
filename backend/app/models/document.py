import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Lifecycle: uploaded -> extracted -> deidentified -> processing -> completed | failed
STATUSES = ("uploaded", "extracted", "deidentified", "processing", "completed", "failed")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # Design choice: a document may be linked to a pseudonymous patient (needed for cohorts).
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True, index=True)

    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(10))            # pdf | docx | txt
    file_size: Mapped[int] = mapped_column(BigInteger, default=0)
    original_path: Mapped[str] = mapped_column(String(512))       # relative to UPLOAD_DIR; never returned by the API
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    deidentified_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    processing_status: Mapped[str] = mapped_column(String(20), default="uploaded", index=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner: Mapped["User"] = relationship(back_populates="documents")
    patient: Mapped["Patient | None"] = relationship(back_populates="documents")
    entities: Mapped[list["Entity"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
    relations: Mapped[list["Relation"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
    observations: Mapped[list["Observation"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
