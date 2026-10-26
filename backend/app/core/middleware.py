"""Request logging middleware (no query strings, bodies or auth headers are logged)."""
import logging
import time
import uuid

from fastapi import FastAPI, Request

logger = logging.getLogger("app.request")


def register_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def _log_requests(request: Request, call_next):
        request_id = uuid.uuid4().hex[:12]
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.error("request failed", extra={
                "request_id": request_id, "method": request.method,
                "path": request.url.path})
            raise
        duration = round((time.perf_counter() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id
        logger.info("request", extra={
            "request_id": request_id, "method": request.method,
            "path": request.url.path, "status_code": response.status_code,
            "duration_ms": duration})
        return response
