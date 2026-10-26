import logging
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession
from app.core.errors import AppError
from app.core.security import DUMMY_HASH, create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import Token, UserCreate, UserRead
from app.schemas.common import ErrorResponse

logger = logging.getLogger("app.auth")
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register", response_model=UserRead, status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    responses={409: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
)
def register(payload: UserCreate, db: DbSession) -> User:
    if db.scalar(select(User.id).where(User.email == payload.email)):
        raise AppError(409, "EMAIL_EXISTS", "An account with this e-mail already exists.")
    user = User(email=payload.email, full_name=payload.full_name,
                hashed_password=hash_password(payload.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:  # race: same e-mail registered concurrently
        db.rollback()
        raise AppError(409, "EMAIL_EXISTS", "An account with this e-mail already exists.")
    logger.info("user registered")
    return user


@router.post(
    "/login", response_model=Token, summary="Log in (OAuth2 password form) and get a JWT",
    responses={401: {"model": ErrorResponse}},
)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession) -> Token:
    user = db.scalar(select(User).where(User.email == form.username.lower()))
    # Always run a hash comparison so response time doesn't reveal whether the e-mail exists.
    valid = verify_password(form.password, user.hashed_password if user else DUMMY_HASH)
    if not user or not valid or not user.is_active:
        raise AppError(401, "INVALID_CREDENTIALS", "Incorrect e-mail or password.",
                       headers={"WWW-Authenticate": "Bearer"})
    return Token(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserRead, summary="Current authenticated user",
            responses={401: {"model": ErrorResponse}})
def me(user: CurrentUser) -> User:
    return user
