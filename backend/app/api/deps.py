"""Shared FastAPI dependencies (DB session, current user, role checks)."""
import uuid
from typing import Annotated

import jwt
from fastapi import Depends, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User
from app.schemas.common import PageParams

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

DbSession = Annotated[Session, Depends(get_db)]


def _unauthorized(message: str) -> AppError:
    return AppError(401, "UNAUTHORIZED", message, headers={"WWW-Authenticate": "Bearer"})


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: DbSession) -> User:
    try:
        user_id = uuid.UUID(decode_access_token(token)["sub"])
    except (jwt.InvalidTokenError, ValueError):
        raise _unauthorized("Invalid or expired token.")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _unauthorized("User not found or inactive.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if user.role != "admin":
        raise AppError(403, "FORBIDDEN", "Administrator privileges required.")
    return user


def pagination(page: Annotated[int, Query(ge=1, description="1-based page number")] = 1,
               page_size: Annotated[int, Query(ge=1, le=100, description="items per page")] = 20
               ) -> PageParams:
    return PageParams(page=page, page_size=page_size)


Pagination = Annotated[PageParams, Depends(pagination)]
