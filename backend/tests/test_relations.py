import json

import pytest

from app.core.config import settings
from app.core.errors import AppError
from app.nlp import model_loader
from app.nlp.confidence import relation_confidence
from app.nlp.relation_extraction import (DEFAULT_RULES, EntityMention, RelationRule,
                                         RuleBasedRelationModel, load_rules)
from app.services import relation_extraction_service as svc


def mentions(text, spec):
    """spec: [(term, type)] or [(term, type, confidence)] located left-to-right in text."""
    out, cursor = [], 0
    for i, item in enumerate(spec):
        term, etype, conf = (*item, 0.9)[:3]
        start = text.index(term, cursor)
        out.append(EntityMention(i, term, etype, start, start + len(term), conf))
        cursor = start + len(term)
    return out


def triples(text, spec, model=None):
    ms = mentions(text, spec)
    model = model or RuleBasedRelationModel()
    return {(ms[r.subject_index].text, r.relation_type, ms[r.object_index].text)
            for r in model.extract_relations(text, ms)}, model.extract_relations(text, ms)


def test_medication_attributes_attach_to_the_nearest_medication():
    text = "Started Metformin 500 mg twice daily and Aspirin 75 mg once daily."
    found, _ = triples(text, [("Metformin", "Medication"), ("500 mg", "Dosage"), ("twice daily", "Frequency"),
                              ("Aspirin", "Medication"), ("75 mg", "Dosage"), ("once daily", "Frequency")])
    assert ("Metformin", "dosage", "500 mg") in found and ("Aspirin", "dosage", "75 mg") in found
    assert ("Metformin", "frequency", "twice daily") in found and ("Aspirin", "frequency", "once daily") in found
    assert ("Aspirin", "dosage", "500 mg") not in found and ("Metformin", "dosage", "75 mg") not in found


def test_disease_treated_by_medication_and_reverse_word_order():
    a, _ = triples("Diabetes was treated with Metformin.", [("Diabetes", "Disease"), ("Metformin", "Medication")])
    b, _ = triples("Started Metformin for diabetes.", [("Metformin", "Medication"), ("diabetes", "Disease")])
    assert ("Diabetes", "treated_by", "Metformin") in a
    assert ("diabetes", "treated_by", "Metformin") in b


def test_cue_raises_confidence():
    with_cue = triples("Diabetes treated with Metformin.", [("Diabetes", "Disease"), ("Metformin", "Medication")])[1]
    no_cue = triples("Diabetes noted; Metformin listed.", [("Diabetes", "Disease"), ("Metformin", "Medication")])[1]
    assert with_cue and no_cue and with_cue[0].confidence > no_cue[0].confidence + 0.15


def test_indicates_requires_a_cue():
    spec = [("Ultrasound", "Test"), ("fatty liver", "Disease")]
    yes, _ = triples("Ultrasound showed fatty liver.", spec)
    no, _ = triples("Ultrasound today. Fatty liver", [("Ultrasound", "Test"), ("Fatty liver", "Disease")])  # different sentences
    no2, _ = triples("Ultrasound and fatty liver", spec)            # same sentence but no cue
    assert ("Ultrasound", "indicates", "fatty liver") in yes
    assert not any(t[1] == "indicates" for t in no | no2)


def test_test_has_value():
    found, _ = triples("HbA1c 8.2 % on admission.", [("HbA1c", "Test"), ("8.2 %", "LabValue")])
    assert ("HbA1c", "has_value", "8.2 %") in found


def test_patient_relations_use_the_demographic_mention_and_need_a_cue():
    text = "A 54-year-old male with hypertension. He takes aspirin."
    found, _ = triples(text, [("54-year-old", "Age"), ("male", "Sex"), ("hypertension", "Disease"),
                              ("aspirin", "Medication")])
    assert ("male", "has_disease", "hypertension") in found             # nearest patient mention only
    assert ("54-year-old", "has_disease", "hypertension") not in found
    assert not any(t[1] == "prescribed" for t in found)                  # aspirin is in another sentence


def test_relations_never_cross_sentences_or_exceed_max_distance():
    text = "Patient has diabetes. Metformin 500 mg was started."
    found, _ = triples(text, [("diabetes", "Disease"), ("Metformin", "Medication"), ("500 mg", "Dosage")])
    assert not any(t[1] == "treated_by" for t in found) and ("Metformin", "dosage", "500 mg") in found
    far = "Metformin " + "x " * 40 + "500 mg"
    assert triples(far, [("Metformin", "Medication"), ("500 mg", "Dosage")])[0] == set()


def test_confidence_is_bounded_and_low_confidence_is_filtered():
    text = "Metformin 500 mg daily."
    _, rels = triples(text, [("Metformin", "Medication"), ("500 mg", "Dosage")])
    assert rels and all(0 < r.confidence <= 0.99 for r in rels)
    strict = RuleBasedRelationModel(min_confidence=0.99)
    assert triples(text, [("Metformin", "Medication"), ("500 mg", "Dosage")], strict)[0] == set()


def test_no_duplicates_and_stable_order():
    text = "Diabetes treated with Metformin 500 mg."
    spec = [("Diabetes", "Disease"), ("Metformin", "Medication"), ("500 mg", "Dosage")]
    _, first = triples(text, spec)
    _, second = triples(text, spec)
    assert first == second
    keys = [(r.subject_index, r.relation_type, r.object_index) for r in first]
    assert len(keys) == len(set(keys))


def test_fewer_than_two_entities_and_unknown_types():
    assert RuleBasedRelationModel().extract_relations("text", []) == []
    assert triples("Foo bar baz", [("Foo", "Color"), ("baz", "Shape")])[0] == set()


def test_confidence_formula():
    near = relation_confidence(prior=0.8, subject_conf=0.9, object_conf=0.9, distance=0, max_distance=100, cue_found=False)
    far = relation_confidence(prior=0.8, subject_conf=0.9, object_conf=0.9, distance=100, max_distance=100, cue_found=False)
    assert near == pytest.approx(0.72) and far == pytest.approx(0.36)
    assert relation_confidence(prior=1, subject_conf=1, object_conf=1, distance=0, max_distance=10, cue_found=True) == 0.99


# ---------------------------------------------------------------- schema is data, not code
def test_rules_can_be_replaced_by_a_json_file(tmp_path):
    schema = {"rules": [{"relation_type": "worsens", "subject_types": ["Medication"],
                         "object_types": ["Symptom"], "max_distance": 80, "prior": 0.9,
                         "cues": ["caused", "worsen"], "require_cue": True}]}
    path = tmp_path / "rules.json"
    path.write_text(json.dumps(schema))
    model = RuleBasedRelationModel(rules=load_rules(path))
    found, _ = triples("Aspirin caused nausea.", [("Aspirin", "Medication"), ("nausea", "Symptom")], model)
    assert found == {("Aspirin", "worsens", "nausea")}
    assert triples("Metformin 500 mg", [("Metformin", "Medication"), ("500 mg", "Dosage")], model)[0] == set()


@pytest.mark.parametrize("content", ["not json", '{"rules": [{"relation_type": ""}]}', '{"nope": 1}', "[]"])
def test_invalid_schema_files_are_rejected(tmp_path, content):
    path = tmp_path / "bad.json"
    path.write_text(content)
    with pytest.raises(ValueError):
        load_rules(path)
    with pytest.raises(ValueError):
        load_rules(tmp_path / "missing.json")


def test_service_builds_default_model_and_reports_bad_config(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "RELATION_MODEL_NAME", "")
    model = svc.get_relation_model()
    assert model.name == "rule_based" and len(model.rules) == len(DEFAULT_RULES)
    assert svc.get_relation_model() is model

    monkeypatch.setattr(settings, "RELATION_MODEL_NAME", "does_not_exist")
    with pytest.raises(AppError) as err:
        svc.get_relation_model()
    assert err.value.status_code == 503

    bad = tmp_path / "bad.json"
    bad.write_text("nope")
    model_loader.reset_singletons()
    monkeypatch.setattr(settings, "RELATION_MODEL_NAME", "rule_based")
    monkeypatch.setattr(settings, "RELATION_SCHEMA_PATH", str(bad))
    with pytest.raises(AppError) as err:
        svc.get_relation_model()
    assert err.value.code == "MODEL_NOT_CONFIGURED"


def test_rule_model_validation():
    with pytest.raises(ValueError):
        RelationRule(relation_type="x", subject_types=[], object_types=["A"])
    with pytest.raises(ValueError):
        RelationRule(relation_type="x", subject_types=["A"], object_types=["B"], prior=0)
