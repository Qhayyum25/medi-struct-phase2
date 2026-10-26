"""Builds (once) and hands out the configured clinical NER model."""
import json
import logging
from functools import lru_cache

from app.core.config import settings
from app.core.errors import AppError
from app.nlp import model_loader
from app.nlp.clinical_ner import ClinicalNERModel, HuggingFaceClinicalNER, NEREntity

logger = logging.getLogger("app.ner")


def _load_label_map(path: str) -> dict[str, str] | None:
    if not path:
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, dict) or not all(isinstance(v, str) for v in data.values()):
            raise ValueError("label map must be an object of strings")
        return data
    except (OSError, ValueError) as exc:
        logger.error("NER label map could not be read (%s)", type(exc).__name__)
        raise AppError(503, "MODEL_NOT_CONFIGURED", "The NER label map file is invalid.") from exc


def _build() -> ClinicalNERModel:
    if not settings.NER_MODEL_NAME:
        raise AppError(503, "MODEL_NOT_CONFIGURED",
                       "No NER model is configured. Set NER_MODEL_NAME in the environment.")
    return HuggingFaceClinicalNER(
        settings.NER_MODEL_NAME,
        revision=settings.NER_MODEL_REVISION or None,
        aggregation_strategy=settings.NER_AGGREGATION_STRATEGY,
        label_map=_load_label_map(settings.NER_LABEL_MAP_PATH),
        min_confidence=settings.NER_MIN_CONFIDENCE,
        chunk_chars=settings.NER_CHUNK_CHARS)


def get_ner_model() -> ClinicalNERModel:
    """FastAPI dependency (override it in tests). The instance is shared process-wide,
    so the weights are loaded once, on first use."""
    key = ("ner", settings.NER_MODEL_NAME, settings.NER_MODEL_REVISION,
           settings.NER_AGGREGATION_STRATEGY, settings.NER_MIN_CONFIDENCE,
           settings.NER_CHUNK_CHARS, settings.NER_LABEL_MAP_PATH)
    return model_loader.get_singleton(key, _build)


def run_ner(model: ClinicalNERModel, text: str) -> list[NEREntity]:
    try:
        return model.extract_entities(text)
    except model_loader.ModelLoadError as exc:
        raise AppError(503, "MODEL_UNAVAILABLE",
                       "The NER model could not be loaded. Check the server logs and the "
                       "network access needed to download it.") from exc
