import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = Field(default=None, max_length=120)

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.lower()

    @field_validator("password")
    @classmethod
    def _bcrypt_limit(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:  # bcrypt only uses the first 72 bytes
            raise ValueError("Password must be at most 72 bytes long.")
        return v


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    role: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
