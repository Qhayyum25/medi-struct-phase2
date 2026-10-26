"""Application settings, loaded from environment variables / .env via Pydantic."""
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    APP_NAME: str = "MediStruct AI"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # --- NLP ---
    NER_MODEL_NAME: str = ""                 # Hugging Face model id, e.g. d4data/biomedical-ner-all
    NER_MODEL_REVISION: str = ""             # optional git revision/tag to pin the weights
    NER_AGGREGATION_STRATEGY: str = "max"    # simple | first | average | max
    NER_MIN_CONFIDENCE: float = 0.5
    NER_CHUNK_CHARS: int = 1000              # keeps every chunk safely below 512 tokens
    NER_LABEL_MAP_PATH: str = ""             # optional JSON: {"Model_Label": "Our Type"}
    RELATION_MODEL_NAME: str = ""            # "rule_based" (built in)
    RELATION_SCHEMA_PATH: str = ""           # optional JSON file with relation rules
    RELATION_MIN_CONFIDENCE: float = 0.35
    PRELOAD_MODELS: bool = False             # load the NER model at start-up instead of first use

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = 10

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    AUTO_CREATE_TABLES: bool = False

    @field_validator("NER_MIN_CONFIDENCE", "RELATION_MIN_CONFIDENCE")
    @classmethod
    def _unit_interval(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("confidence thresholds must be between 0 and 1")
        return v

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def _check_secret(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError(
                "JWT_SECRET_KEY must be at least 32 characters. Generate one with: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def upload_path(self) -> Path:
        return Path(self.UPLOAD_DIR).resolve()

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
