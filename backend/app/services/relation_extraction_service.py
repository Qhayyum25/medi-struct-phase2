"""Builds (once) and hands out the configured relation-extraction model."""
import logging

from app.core.config import settings
from app.core.errors import AppError
from app.nlp import model_loader
from app.nlp.relation_extraction import (RelationExtractionModel, RuleBasedRelationModel,
                                         load_rules)

logger = logging.getLogger("app.relations")


def _build_rule_based() -> RelationExtractionModel:
    rules = None
    if settings.RELATION_SCHEMA_PATH:
        try:
            rules = load_rules(settings.RELATION_SCHEMA_PATH)
        except ValueError as exc:
            logger.error("relation schema rejected: %s", exc)
            raise AppError(503, "MODEL_NOT_CONFIGURED", "The relation schema file is invalid.") from exc
    return RuleBasedRelationModel(rules=rules, min_confidence=settings.RELATION_MIN_CONFIDENCE)


# To add a learned model: implement RelationExtractionModel and register it here.
BACKENDS = {"rule_based": _build_rule_based}


def get_relation_model() -> RelationExtractionModel:
    name = settings.RELATION_MODEL_NAME or "rule_based"
    builder = BACKENDS.get(name)
    if builder is None:
        raise AppError(503, "MODEL_NOT_CONFIGURED",
                       f"Unknown RELATION_MODEL_NAME '{name}'. Available: {', '.join(BACKENDS)}.")
    key = ("relation", name, settings.RELATION_SCHEMA_PATH, settings.RELATION_MIN_CONFIDENCE)
    return model_loader.get_singleton(key, builder)
