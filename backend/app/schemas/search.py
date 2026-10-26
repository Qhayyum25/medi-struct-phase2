from pydantic import BaseModel

from app.schemas.common import Page
from app.schemas.document import DocumentSummary
from app.schemas.entity import EntityRead
from app.schemas.relation import RelationRead


class SearchResponse(BaseModel):
    entities: Page[EntityRead]
    relations: Page[RelationRead]
    documents: Page[DocumentSummary]
