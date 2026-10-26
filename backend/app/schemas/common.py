from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: list[dict] | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class PageParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
