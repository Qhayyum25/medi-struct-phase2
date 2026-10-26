"""Lazy loading and caching of NLP models.

Heavy libraries (torch, transformers) are imported only when a model is really loaded, so
the API starts instantly and the test-suite runs without them.
"""
import logging
import threading
import time
from typing import Any, Callable

logger = logging.getLogger("app.nlp.loader")


class ModelLoadError(RuntimeError):
    """The model could not be loaded (missing library, no network, bad name...)."""


def load_token_classification_pipeline(model_name: str, *, revision: str | None = None,
                                       aggregation_strategy: str = "max") -> Any:
    """Download (first run) and load a Hugging Face token-classification pipeline."""
    try:
        import torch
        from transformers import pipeline
    except ImportError as exc:
        raise ModelLoadError("PyTorch/transformers are not installed. "
                             "Run: pip install -r requirements.txt") from exc

    device = 0 if torch.cuda.is_available() else -1
    started = time.perf_counter()
    logger.info("loading NER model %s (device=%s)", model_name, "cuda" if device == 0 else "cpu")
    try:
        pipe = pipeline("token-classification", model=model_name, revision=revision or None,
                        aggregation_strategy=aggregation_strategy, device=device)
    except Exception as exc:  # network, unknown model id, corrupted cache, out of memory...
        logger.error("NER model load failed: %s", type(exc).__name__, exc_info=True)
        raise ModelLoadError(f"Could not load model '{model_name}' ({type(exc).__name__}).") from exc
    logger.info("NER model %s loaded in %.1fs", model_name, time.perf_counter() - started)
    return pipe


def label_names(pipe: Any) -> list[str]:
    """Entity labels the model can output (B-/I- prefixes removed). Empty if unknown."""
    id2label = getattr(getattr(getattr(pipe, "model", None), "config", None), "id2label", None)
    if not id2label:
        return []
    names = {str(v).split("-", 1)[-1] if str(v)[:2] in ("B-", "I-") else str(v)
             for v in id2label.values()}
    names.discard("O")
    return sorted(names)


# ---- process-wide singletons (one model instance shared by every request) -------------
_instances: dict[Any, Any] = {}
_lock = threading.RLock()


def get_singleton(key: Any, factory: Callable[[], Any]) -> Any:
    with _lock:
        if key not in _instances:
            _instances[key] = factory()
        return _instances[key]


def reset_singletons() -> None:
    """Forget cached model objects (used by tests and settings reloads)."""
    with _lock:
        _instances.clear()
