"""Centralised error handling. Every error returns:

    {"success": false, "error": {"code": "...", "message": "..."}}

Stack traces and request bodies are logged server-side only.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")

_STATUS_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "VALIDATION_ERROR",
    429: "TOO_MANY_REQUESTS",
}


class AppError(Exception):
    """Raise this from services/routes for expected, user-facing errors."""

    def __init__(self, status_code: int, code: str, message: str,
                 headers: dict[str, str] | None = None):
        self.status_code, self.code, self.message, self.headers = (
            status_code, code, message, headers)
        super().__init__(message)


def _body(code: str, message: str, details: list | None = None) -> dict:
    error: dict = {"code": code, "message": message}
    if details:
        error["details"] = details
    return {"success": False, "error": error}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError):
        return JSONResponse(_body(exc.code, exc.message), status_code=exc.status_code,
                            headers=exc.headers)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException):
        code = _STATUS_CODES.get(exc.status_code, "HTTP_ERROR")
        return JSONResponse(_body(code, str(exc.detail)), status_code=exc.status_code,
                            headers=getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError):
        # Only field location + message: never echo submitted values (may be PHI/passwords).
        details = [
            {"field": ".".join(str(p) for p in e["loc"] if p not in ("body", "query", "path")),
             "message": e["msg"]}
            for e in exc.errors()
        ]
        return JSONResponse(_body("VALIDATION_ERROR", "Request validation failed.", details),
                            status_code=422)

    @app.exception_handler(SQLAlchemyError)
    async def _db_error(request: Request, exc: SQLAlchemyError):
        logger.error("Database error on %s %s", request.method, request.url.path, exc_info=exc)
        return JSONResponse(_body("DATABASE_ERROR", "A database error occurred."),
                            status_code=500)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
        return JSONResponse(_body("INTERNAL_ERROR", "An unexpected error occurred."),
                            status_code=500)
