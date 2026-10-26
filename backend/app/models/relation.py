import uuid

from sqlalchemy import Float, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Relation(Base):
    __tablename__ = "relations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    subject_entity_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("entities.id", ondelete="CASCADE"), index=True)
    object_entity_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("entities.id", ondelete="CASCADE"), index=True)
    relation_type: Mapped[str] = mapped_column(String(64), index=True)
    confidence: Mapped[float] = mapped_column(Float)

    document: Mapped["Document"] = relationship(back_populates="relations")
    subject: Mapped["Entity"] = relationship(foreign_keys=[subject_entity_id])
    object: Mapped["Entity"] = relationship(foreign_keys=[object_entity_id])
