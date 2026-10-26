"""How confidence values are produced (documented because the spec asks for it).

ENTITIES - the Hugging Face token-classification pipeline runs a softmax over the label
set for every token. For each entity we store the mean of the softmax probability of the
predicted label over the entity's tokens/words. It is a model probability in [0, 1]; like
most neural-network probabilities it is NOT calibrated (0.9 does not mean "right 90 % of
the time"), so it is best used for ranking and thresholding (NER_MIN_CONFIDENCE).

RELATIONS - the built-in rule-based extractor has no probabilistic model. Its score is a
transparent heuristic:

    score = prior * sqrt(conf_subject * conf_object) * distance_factor + cue_bonus

  prior            reliability assigned to the rule (0-1), from the relation schema
  sqrt(a*b)        geometric mean of the two entity confidences
  distance_factor  1.0 when the entities touch, falling linearly to 0.5 at the rule's
                   maximum allowed distance
  cue_bonus        +0.2 when a trigger phrase ("treated with", "consistent with", ...)
                   appears next to the pair

The result is clamped to [0, 0.99]. It expresses "how much evidence this rule found",
not a calibrated probability.
"""
import math

CUE_BONUS = 0.2
MAX_RELATION_CONFIDENCE = 0.99


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def entity_confidence(raw_score: float) -> float:
    return round(clamp01(raw_score), 4)


def relation_confidence(*, prior: float, subject_conf: float, object_conf: float,
                        distance: int, max_distance: int, cue_found: bool) -> float:
    distance_factor = 1.0 - 0.5 * clamp01(distance / max_distance) if max_distance > 0 else 1.0
    base = prior * math.sqrt(clamp01(subject_conf) * clamp01(object_conf)) * distance_factor
    score = base + (CUE_BONUS if cue_found else 0.0)
    return round(min(MAX_RELATION_CONFIDENCE, clamp01(score)), 4)
