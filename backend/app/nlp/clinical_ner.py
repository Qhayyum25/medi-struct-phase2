"""Module 8 - clinical Named Entity Recognition.

`ClinicalNERModel` is the abstraction the rest of the app depends on. The shipped
implementation wraps any Hugging Face token-classification model that was trained on
biomedical / clinical text (default: d4data/biomedical-ner-all, trained on the MACCROBAT
clinical case-report corpus). A generic (non-clinical) NER model must not be configured
here: its labels would be mapped to nothing and every entity would be dropped.
"""
import logging
import re
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Callable

from app.nlp import model_loader
from app.nlp.confidence import entity_confidence
from app.utils.text_utils import chunk_spans

logger = logging.getLogger("app.nlp.ner")

MAX_ENTITY_CHARS = 200
_PLACEHOLDER = re.compile(r"^\[[A-Z]+\]$")          # [NAME], [DATE] ... from de-identification


@dataclass(frozen=True)
class NEREntity:
    text: str
    entity_type: str
    raw_label: str
    start: int
    end: int
    confidence: float


def normalize_label(label: str) -> str:
    """'B-Disease_disorder' / 'DISEASE_DISORDER' / 'disease disorder' -> 'diseasedisorder'."""
    label = re.sub(r"^[BI]-", "", label.strip(), flags=re.I)
    return re.sub(r"[^a-z0-9]", "", label.lower())


# Model label (MACCROBAT scheme, as used by d4data/biomedical-ner-all) -> our entity type.
# Labels not listed here (Color, Shape, Detailed_description, ...) are dropped on purpose.
# Replace the whole mapping with NER_LABEL_MAP_PATH for a different model.
DEFAULT_LABEL_MAP: dict[str, str] = {
    "Disease_disorder": "Disease",
    "Sign_symptom": "Symptom",
    "Medication": "Medication",
    "Therapeutic_procedure": "Procedure",
    "Diagnostic_procedure": "Test",
    "Lab_value": "LabValue",
    "Biological_structure": "Anatomy",
    "Dosage": "Dosage",
    "Frequency": "Frequency",
    "Duration": "Duration",
    "Administration": "Administration",
    "Age": "Age",
    "Sex": "Sex",
    "Severity": "Severity",
}


class ClinicalNERModel(ABC):
    """Interface: load_model() then extract_entities(text)."""

    name: str

    @abstractmethod
    def load_model(self) -> None: ...

    @abstractmethod
    def extract_entities(self, text: str) -> list[NEREntity]: ...

    @property
    @abstractmethod
    def is_loaded(self) -> bool: ...


PipelineFactory = Callable[[], Callable[..., list]]


class HuggingFaceClinicalNER(ClinicalNERModel):
    def __init__(self, model_name: str, *, revision: str | None = None,
                 aggregation_strategy: str = "max", label_map: dict[str, str] | None = None,
                 min_confidence: float = 0.5, chunk_chars: int = 1000,
                 pipeline_factory: PipelineFactory | None = None) -> None:
        if not model_name:
            raise ValueError("model_name is required")
        self.name = model_name
        self._min_confidence = min_confidence
        self._chunk_chars = chunk_chars
        self._label_map = {normalize_label(k): v for k, v in
                           (label_map if label_map is not None else DEFAULT_LABEL_MAP).items()}
        self._factory: PipelineFactory = pipeline_factory or (
            lambda: model_loader.load_token_classification_pipeline(
                model_name, revision=revision, aggregation_strategy=aggregation_strategy))
        self._pipe: Callable[..., list] | None = None
        self._load_lock = threading.Lock()
        self._infer_lock = threading.Lock()     # HF pipelines are not guaranteed thread-safe

    @property
    def is_loaded(self) -> bool:
        return self._pipe is not None

    def load_model(self) -> None:
        """Idempotent and thread-safe; the weights are loaded once per process."""
        if self._pipe is not None:
            return
        with self._load_lock:
            if self._pipe is not None:
                return
            pipe = self._factory()
            unmapped = [n for n in model_loader.label_names(pipe)
                        if normalize_label(n) not in self._label_map]
            if unmapped:
                logger.info("model labels ignored (not in label map): %s", ", ".join(unmapped))
            self._pipe = pipe

    def extract_entities(self, text: str) -> list[NEREntity]:
        if not text or not text.strip():
            return []
        self.load_model()
        assert self._pipe is not None

        chunks = chunk_spans(text, self._chunk_chars)
        if not chunks:
            return []
        with self._infer_lock:
            raw = self._pipe([text[s:e] for s, e in chunks], batch_size=8)
        if raw and isinstance(raw[0], dict):        # single input may come back un-nested
            raw = [raw]

        found: list[NEREntity] = []
        for (chunk_start, _), items in zip(chunks, raw):
            for item in items:
                entity = self._convert(text, chunk_start, item)
                if entity is not None:
                    found.append(entity)
        return self._resolve_overlaps(found)

    # ------------------------------------------------------------------ helpers
    def _convert(self, text: str, offset: int, item: dict[str, Any]) -> NEREntity | None:
        raw_label = str(item.get("entity_group") or item.get("entity") or "")
        entity_type = self._label_map.get(normalize_label(raw_label))
        if entity_type is None:
            return None
        confidence = entity_confidence(item.get("score", 0.0))
        if confidence < self._min_confidence:
            return None

        start, end = _snap_to_words(text, offset + int(item["start"]), offset + int(item["end"]))
        surface = text[start:end]
        if not surface or len(surface) > MAX_ENTITY_CHARS or _PLACEHOLDER.match(surface):
            return None
        return NEREntity(text=surface, entity_type=entity_type, raw_label=raw_label,
                         start=start, end=end, confidence=confidence)

    @staticmethod
    def _resolve_overlaps(entities: list[NEREntity]) -> list[NEREntity]:
        """Sort by position; when two spans overlap keep the more confident one."""
        kept: list[NEREntity] = []
        for ent in sorted(entities, key=lambda e: (e.start, -(e.end - e.start))):
            if kept and ent.start < kept[-1].end:
                if ent.confidence > kept[-1].confidence:
                    kept[-1] = ent
                continue
            kept.append(ent)
        return kept


def _snap_to_words(text: str, start: int, end: int) -> tuple[int, int]:
    """Repair spans that begin/end inside a word (sub-word tokens) and trim padding."""
    n = len(text)
    start, end = max(0, start), min(n, end)
    while start < end and text[start].isspace():
        start += 1
    while end > start and (text[end - 1].isspace() or text[end - 1] in ".,;:"):
        end -= 1
    while start > 0 and start < n and text[start - 1].isalnum() and text[start].isalnum():
        start -= 1
    while 0 < end < n and text[end - 1].isalnum() and text[end].isalnum():
        end += 1
    return start, end
