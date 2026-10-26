import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analytics, auth, documents, entities, patients, relations, search
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging_config import setup_logging
from app.core.middleware import register_middleware

setup_logging(settings.LOG_LEVEL)
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    if settings.AUTO_CREATE_TABLES:
        from app.db.init_db import init_db
        init_db()
    if settings.PRELOAD_MODELS:
        from app.services.ner_service import get_ner_model
        get_ner_model().load_model()        # fail fast if the model cannot be loaded
    logger.info("startup complete", extra={"stage": settings.ENVIRONMENT})
    yield
    logger.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description=("Clinical NLP backend: document ingestion, de-identification, "
                     "entity/relation extraction, structured storage and analytics."),
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware, allow_origins=settings.cors_origins_list,
        allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
    )
    register_middleware(app)
    register_exception_handlers(app)

    app.include_router(auth.router)
    app.include_router(documents.router)
    app.include_router(entities.router)
    app.include_router(relations.router)
    app.include_router(search.router)
    app.include_router(analytics.router)
    app.include_router(patients.router)

    @app.get("/health", tags=["System"], summary="Liveness check")
    def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
