"""Download and warm up the configured NER model.

    python -m scripts.download_models

Run this once (needs internet access) so the first API request does not have to wait for
the download. Weights are cached in ~/.cache/huggingface (override with HF_HOME).
"""
import sys
import time

from app.core.config import settings
from app.nlp.model_loader import ModelLoadError
from app.services.ner_service import get_ner_model


def main() -> int:
    if not settings.NER_MODEL_NAME:
        print("NER_MODEL_NAME is not set (see .env.example).")
        return 1
    print(f"Loading {settings.NER_MODEL_NAME} ...")
    started = time.perf_counter()
    try:
        model = get_ner_model()
        model.load_model()
        sample = "The patient was started on metformin 500 mg twice daily for type 2 diabetes."
        entities = model.extract_entities(sample)
    except ModelLoadError as exc:
        print(f"FAILED: {exc}")
        return 2
    print(f"OK in {time.perf_counter() - started:.1f}s. Sample entities:")
    for e in entities:
        print(f"  {e.entity_type:<12} {e.text!r:<28} confidence={e.confidence:.2f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
