"""Test doubles for the transformer boundary ONLY.

`StubTokenClassifier` imitates the callable returned by
`transformers.pipeline("token-classification", aggregation_strategy=...)`: it takes a list of
strings and returns, per string, dicts with the keys entity_group / score / word / start /
end (scores are numpy float32, exactly like the real pipeline). Everything else - chunking,
label mapping, thresholds, offsets, relation extraction, persistence - is the real code.
"""
import re

import numpy as np

# term -> (model label as d4data/biomedical-ner-all would emit it, score)
LEXICON = {
    "54-year-old": ("Age", 0.96),
    "male": ("Sex", 0.97),
    "type 2 diabetes mellitus": ("Disease_disorder", 0.98),
    "polyuria": ("Sign_symptom", 0.93),
    "fatigue": ("Sign_symptom", 0.90),
    "Metformin": ("Medication", 0.99),
    "500 mg": ("Dosage", 0.95),
    "twice daily": ("Frequency", 0.94),
    "HbA1c": ("Diagnostic_procedure", 0.90),
    "8.2 %": ("Lab_value", 0.92),
    "Ultrasound": ("Diagnostic_procedure", 0.88),
    "abdomen": ("Biological_structure", 0.90),
    "fatty liver": ("Disease_disorder", 0.91),
    # things the pipeline must discard:
    "glycemic control": ("Detailed_description", 0.90),   # label not in the label map
    "poor": ("Sign_symptom", 0.30),                       # below NER_MIN_CONFIDENCE
    "[NAME]": ("Disease_disorder", 0.90),                 # de-identification placeholder
}


class StubTokenClassifier:
    def __init__(self, lexicon: dict[str, tuple[str, float]] = LEXICON) -> None:
        self.lexicon = lexicon
        self.calls: list[list[str]] = []

    def __call__(self, texts, batch_size: int = 8):
        self.calls.append(list(texts))
        output = []
        for text in texts:
            items = []
            for term, (label, score) in self.lexicon.items():
                for m in re.finditer(re.escape(term), text):
                    items.append({"entity_group": label, "score": np.float32(score),
                                  "word": term, "start": m.start(), "end": m.end()})
            output.append(sorted(items, key=lambda i: i["start"]))
        return output


class FailingClassifier:
    def __call__(self, texts, batch_size: int = 8):
        raise RuntimeError("simulated inference crash with text: " + texts[0][:20])
