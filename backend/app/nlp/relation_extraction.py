"""Module 9 - relation extraction.

`RelationExtractionModel` is the abstraction the pipeline depends on. The built-in
implementation, `RuleBasedRelationModel`, is driven by DATA, not code: a list of
`RelationRule`s (which entity types may be linked, how far apart, whether a trigger phrase
is required, ...). The defaults below can be replaced by a JSON file (RELATION_SCHEMA_PATH)
without touching Python, and a learned classifier can be added by implementing the
interface and registering it in `services/relation_extraction_service.py`.

The subject "Patient" of relations like Patient -> has_disease -> Disease is represented
by the patient's demographic mention (Age / Sex entities, e.g. "54-year-old male"), because
the clinical NER model has no separate "patient" entity.
"""
import bisect
import json
import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, ValidationError, field_validator

from app.nlp.confidence import relation_confidence
from app.utils.text_utils import split_sentences

logger = logging.getLogger("app.nlp.relations")


@dataclass(frozen=True)
class EntityMention:
    index: int                # position in the list passed to extract_relations()
    text: str
    entity_type: str
    start: int
    end: int
    confidence: float


@dataclass(frozen=True)
class ExtractedRelation:
    subject_index: int
    relation_type: str
    object_index: int
    confidence: float


class RelationExtractionModel(ABC):
    name: str

    @abstractmethod
    def load_model(self) -> None: ...

    @abstractmethod
    def extract_relations(self, text: str, entities: list[EntityMention]) -> list[ExtractedRelation]: ...


# --------------------------------------------------------------------------- rules
class RelationRule(BaseModel):
    relation_type: str = Field(min_length=1, max_length=64)
    subject_types: list[str] = Field(min_length=1)
    object_types: list[str] = Field(min_length=1)
    max_distance: int = Field(default=150, ge=0, description="max characters between the two entities")
    same_sentence: bool = True
    order: Literal["any", "subject_first", "object_first"] = "any"
    cues: list[str] = Field(default_factory=list, description="trigger words/phrases (lower-case)")
    require_cue: bool = False
    nearest_only: bool = False      # each object is linked to its closest subject only
    prior: float = Field(default=0.5, gt=0.0, le=1.0)

    @field_validator("cues")
    @classmethod
    def _lower(cls, v: list[str]) -> list[str]:
        return [c.lower() for c in v]


_TREAT_CUES = ["treat", "manag", "started", "initiated", "prescrib", "given", "administ", "receiv",
               "therapy", "controlled", "on ", "for ", "with "]
_PATIENT_CUES = ["with ", "has ", "have ", "had ", "diagnos", "history of", "known case",
                 "suffering", "presented", "presenting", "complain", "c/o", "case of"]

DEFAULT_RULES: list[RelationRule] = [
    RelationRule(relation_type="has_disease", subject_types=["Age", "Sex"], object_types=["Disease"],
                 max_distance=120, order="subject_first", cues=_PATIENT_CUES, require_cue=True,
                 nearest_only=True, prior=0.7),
    RelationRule(relation_type="prescribed", subject_types=["Age", "Sex"], object_types=["Medication"],
                 max_distance=150, order="subject_first",
                 cues=["prescrib", "started", "given", "receiv", "on ", "treated", "administ", "discharged on"],
                 require_cue=True, nearest_only=True, prior=0.6),
    RelationRule(relation_type="treated_by", subject_types=["Disease", "Symptom"],
                 object_types=["Medication", "Procedure"], max_distance=150, cues=_TREAT_CUES, prior=0.5),
    RelationRule(relation_type="indicates", subject_types=["Test", "LabValue"], object_types=["Disease"],
                 max_distance=150, order="subject_first", require_cue=True, prior=0.6,
                 cues=["indicat", "suggest", "consistent with", "confirm", "diagnos", "show", "reveal",
                       "evidence of", "positive for", "concerning for", "c/w"]),
    RelationRule(relation_type="has_value", subject_types=["Test"], object_types=["LabValue"],
                 max_distance=40, order="subject_first", nearest_only=True, prior=0.8),
    RelationRule(relation_type="dosage", subject_types=["Medication"], object_types=["Dosage"],
                 max_distance=40, order="subject_first", nearest_only=True, prior=0.85),
    RelationRule(relation_type="frequency", subject_types=["Medication"], object_types=["Frequency"],
                 max_distance=60, order="subject_first", nearest_only=True, prior=0.8),
    RelationRule(relation_type="duration", subject_types=["Medication"], object_types=["Duration"],
                 max_distance=80, order="subject_first", nearest_only=True, prior=0.7),
    RelationRule(relation_type="route", subject_types=["Medication"], object_types=["Administration"],
                 max_distance=60, nearest_only=True, prior=0.75),
    RelationRule(relation_type="located_at", subject_types=["Symptom", "Disease", "Procedure"],
                 object_types=["Anatomy"], max_distance=60, nearest_only=True, prior=0.6),
]


def load_rules(path: str | Path) -> list[RelationRule]:
    """Load rules from JSON: {"rules": [ {...RelationRule fields...}, ... ]}."""
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return [RelationRule.model_validate(r) for r in data["rules"]]
    except (OSError, ValueError, KeyError, TypeError, ValidationError) as exc:
        raise ValueError(f"Invalid relation schema file: {type(exc).__name__}") from exc


# --------------------------------------------------------------------------- model
class RuleBasedRelationModel(RelationExtractionModel):
    def __init__(self, rules: list[RelationRule] | None = None, min_confidence: float = 0.35,
                 name: str = "rule_based") -> None:
        self.name = name
        self.rules = rules if rules is not None else DEFAULT_RULES
        self.min_confidence = min_confidence

    def load_model(self) -> None:      # nothing to load; kept for interface symmetry
        return None

    def extract_relations(self, text: str, entities: list[EntityMention]) -> list[ExtractedRelation]:
        if len(entities) < 2:
            return []
        sentences = split_sentences(text)
        starts = [s for s, _ in sentences]

        def sentence_of(m: EntityMention) -> int:
            return max(0, bisect.bisect_right(starts, m.start) - 1)

        sent_idx = {m.index: sentence_of(m) for m in entities}
        results: dict[tuple[int, str, int], ExtractedRelation] = {}
        for rule in self.rules:
            for rel in self._apply_rule(rule, text, entities, sentences, sent_idx):
                key = (rel.subject_index, rel.relation_type, rel.object_index)
                if key not in results or rel.confidence > results[key].confidence:
                    results[key] = rel
        return sorted(results.values(), key=lambda r: (r.subject_index, r.object_index, r.relation_type))

    # ------------------------------------------------------------------ one rule
    def _apply_rule(self, rule: RelationRule, text: str, entities: list[EntityMention],
                    sentences: list[tuple[int, int]], sent_idx: dict[int, int]) -> list[ExtractedRelation]:
        subjects = [m for m in entities if m.entity_type in rule.subject_types]
        objects = [m for m in entities if m.entity_type in rule.object_types]
        candidates: list[tuple[int, EntityMention, EntityMention, ExtractedRelation]] = []

        for s in subjects:
            for o in objects:
                if s.index == o.index:
                    continue
                if s.end <= o.start:
                    distance, first, second, order = o.start - s.end, s, o, "subject_first"
                elif o.end <= s.start:
                    distance, first, second, order = s.start - o.end, o, s, "object_first"
                else:
                    continue                                   # overlapping spans
                if rule.order != "any" and rule.order != order:
                    continue
                if distance > rule.max_distance:
                    continue
                if rule.same_sentence and sent_idx[s.index] != sent_idx[o.index]:
                    continue

                cue = self._cue_found(rule, text, sentences, sent_idx[first.index], first, second)
                if rule.require_cue and not cue:
                    continue
                conf = relation_confidence(prior=rule.prior, subject_conf=s.confidence,
                                           object_conf=o.confidence, distance=distance,
                                           max_distance=rule.max_distance, cue_found=cue)
                if conf < self.min_confidence:
                    continue
                candidates.append((distance, s, o, ExtractedRelation(
                    s.index, rule.relation_type, o.index, conf)))

        if rule.nearest_only:                                  # keep the closest subject per object
            best: dict[int, tuple[int, int, ExtractedRelation]] = {}
            for distance, s, o, rel in candidates:
                current = best.get(o.index)
                if current is None or (distance, s.start) < (current[0], current[1]):
                    best[o.index] = (distance, s.start, rel)
            return [rel for _, _, rel in best.values()]
        return [rel for _, _, _, rel in candidates]

    @staticmethod
    def _cue_found(rule: RelationRule, text: str, sentences: list[tuple[int, int]], sentence_index: int,
                   first: EntityMention, second: EntityMention) -> bool:
        if not rule.cues:
            return False
        sent_start = sentences[sentence_index][0] if sentences else 0
        window = text[max(sent_start, first.start - 30): second.end].lower()
        return any(re.search(r"\b" + re.escape(cue), window) for cue in rule.cues)
