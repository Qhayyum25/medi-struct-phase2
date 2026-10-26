import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    entity_text: Mapped[str] = mapped_column(String(500), index=True)
    entity_type: Mapped[str] = mapped_column(String(64), index=True)
    start_position: Mapped[int] = mapped_column(Integer)   # offsets into documents.deidentified_text
    end_position: Mapped[int] = mapped_column(Integer)
    confidence: Mapped[float] = mapped_column(Float)
    model_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    document: Mapped["Document"] = relationship(back_populates="entities")
