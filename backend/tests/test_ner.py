import numpy as np
import pytest

from app.core.config import settings
from app.core.errors import AppError
from app.nlp import model_loader
from app.nlp.clinical_ner import HuggingFaceClinicalNER, normalize_label
from app.nlp.model_loader import ModelLoadError
from app.services import ner_service
from tests.samples import NLP_NOTE
from tests.stubs import FailingClassifier, StubTokenClassifier


def _hit(label, start, end, score=0.95):
    return {"entity_group": label, "score": np.float32(score), "word": "x", "start": start, "end": end}


def _ner(pipe, **kw):
    return HuggingFaceClinicalNER("test-model", pipeline_factory=lambda: pipe, **kw)


def test_model_is_loaded_lazily_and_only_once():
    calls = []

    def factory():
        calls.append(1)
        return StubTokenClassifier()

    ner = HuggingFaceClinicalNER("test-model", pipeline_factory=factory)
    assert calls == [] and not ner.is_loaded
    assert ner.extract_entities("   ") == [] and calls == []           # nothing to do -> no load
    ner.extract_entities("Started on Metformin 500 mg")
    ner.extract_entities("Started on Metformin 500 mg")
    assert calls == [1] and ner.is_loaded


def test_maps_labels_and_filters_noise():
    ner = _ner(StubTokenClassifier())
    entities = ner.extract_entities(NLP_NOTE.replace("Ramesh Kumar", "[NAME]"))
    texts = {e.text: e for e in entities}
    assert texts["Metformin"].entity_type == "Medication"
    assert texts["type 2 diabetes mellitus"].entity_type == "Disease"
    assert texts["polyuria"].entity_type == "Symptom"
    assert texts["HbA1c"].entity_type == "Test" and texts["8.2 %"].entity_type == "LabValue"
    assert texts["abdomen"].entity_type == "Anatomy" and texts["500 mg"].entity_type == "Dosage"
    assert "glycemic control" not in texts          # unmapped label
    assert "poor" not in texts                       # confidence 0.30 < 0.5
    assert "[NAME]" not in texts                     # placeholder
    assert all(isinstance(e.confidence, float) and 0.5 <= e.confidence <= 1 for e in entities)


def test_offsets_point_at_the_entity_text():
    ner = _ner(StubTokenClassifier())
    for e in ner.extract_entities(NLP_NOTE):
        assert NLP_NOTE[e.start:e.end] == e.text


def test_entities_are_sorted_by_position():
    starts = [e.start for e in _ner(StubTokenClassifier()).extract_entities(NLP_NOTE)]
    assert starts == sorted(starts) and len(starts) >= 10


def test_subword_fragments_snap_to_whole_words_and_punctuation_is_trimmed():
    text = "Started on Metformin now. Has diabetes."
    pipe = lambda texts, batch_size=8: [[_hit("Medication", 13, 18),          # 'form' inside Metformin
                                          _hit("Disease_disorder", 30, 38)]]  # 'diabetes.' incl. dot
    ents = _ner(pipe).extract_entities(text)
    assert [(e.text, e.entity_type) for e in ents] == [("Metformin", "Medication"), ("diabetes", "Disease")]


def test_long_documents_are_chunked_and_offsets_stay_exact():
    text = " ".join(f"Visit {i}: patient reports polyuria." for i in range(150))
    pipe = StubTokenClassifier({"polyuria": ("Sign_symptom", 0.9)})
    ents = _ner(pipe, chunk_chars=400).extract_entities(text)
    assert len(ents) == 150
    assert all(text[e.start:e.end] == "polyuria" for e in ents)
    assert len(pipe.calls) == 1 and len(pipe.calls[0]) > 10                # one batched call
    assert all(len(chunk) <= 400 for chunk in pipe.calls[0])


def test_overlapping_spans_keep_the_more_confident_one():
    text = "severe chest pain today"
    pipe = lambda texts, batch_size=8: [[_hit("Sign_symptom", 7, 17, 0.6), _hit("Sign_symptom", 0, 17, 0.9)]]
    ents = _ner(pipe).extract_entities(text)
    assert [(e.text, e.confidence) for e in ents] == [("severe chest pain", 0.9)]


def test_unnested_pipeline_output_is_accepted():
    pipe = lambda texts, batch_size=8: [_hit("Medication", 0, 9)]        # list of dict, not list of lists
    assert [e.text for e in _ner(pipe).extract_entities("Metformin daily")] == ["Metformin"]


@pytest.mark.parametrize("label", ["Disease_disorder", "B-Disease_disorder", "DISEASE_DISORDER", "disease disorder"])
def test_label_normalisation_accepts_common_spellings(label):
    assert normalize_label(label) == "diseasedisorder"
    pipe = lambda texts, batch_size=8: [[_hit(label, 0, 8)]]
    assert _ner(pipe).extract_entities("diabetes mellitus")[0].entity_type == "Disease"


def test_custom_label_map_replaces_the_default():
    pipe = lambda texts, batch_size=8: [[_hit("Medication", 0, 9), _hit("Sign_symptom", 10, 15)]]
    ents = _ner(pipe, label_map={"Medication": "Drug"}).extract_entities("Metformin fever")
    assert [(e.text, e.entity_type) for e in ents] == [("Metformin", "Drug")]


def test_min_confidence_threshold():
    pipe = lambda texts, batch_size=8: [[_hit("Medication", 0, 9, 0.7)]]
    assert len(_ner(pipe, min_confidence=0.5).extract_entities("Metformin")) == 1
    assert _ner(pipe, min_confidence=0.8).extract_entities("Metformin") == []


def test_model_name_is_required():
    with pytest.raises(ValueError):
        HuggingFaceClinicalNER("")


def test_label_names_helper_strips_bio_prefixes():
    class Cfg: id2label = {0: "O", 1: "B-Disease", 2: "I-Disease", 3: "B-Drug"}
    class Model: config = Cfg()
    class Pipe: model = Model()
    assert model_loader.label_names(Pipe()) == ["Disease", "Drug"]
    assert model_loader.label_names(object()) == []


# ---------------------------------------------------------------- service layer
def test_run_ner_converts_load_errors_to_503():
    def broken():
        raise ModelLoadError("offline")
    ner = HuggingFaceClinicalNER("test-model", pipeline_factory=broken)
    with pytest.raises(AppError) as err:
        ner_service.run_ner(ner, "some text")
    assert err.value.status_code == 503 and err.value.code == "MODEL_UNAVAILABLE"


def test_inference_errors_are_not_swallowed():
    ner = _ner(FailingClassifier())
    with pytest.raises(RuntimeError):
        ner.extract_entities("Metformin")


def test_get_ner_model_requires_configuration(monkeypatch):
    monkeypatch.setattr(settings, "NER_MODEL_NAME", "")
    with pytest.raises(AppError) as err:
        ner_service.get_ner_model()
    assert err.value.status_code == 503 and err.value.code == "MODEL_NOT_CONFIGURED"


def test_get_ner_model_is_a_lazy_singleton(monkeypatch):
    monkeypatch.setattr(settings, "NER_MODEL_NAME", "some/model")
    first = ner_service.get_ner_model()
    assert first.name == "some/model" and not first.is_loaded       # nothing was downloaded
    assert ner_service.get_ner_model() is first


def test_label_map_file_is_used_and_validated(monkeypatch, tmp_path):
    good = tmp_path / "map.json"
    good.write_text('{"Medication": "Drug"}')
    monkeypatch.setattr(settings, "NER_MODEL_NAME", "some/model")
    monkeypatch.setattr(settings, "NER_LABEL_MAP_PATH", str(good))
    model = ner_service.get_ner_model()
    assert model._label_map == {"medication": "Drug"}

    bad = tmp_path / "bad.json"
    bad.write_text("[1, 2]")
    model_loader.reset_singletons()
    monkeypatch.setattr(settings, "NER_LABEL_MAP_PATH", str(bad))
    with pytest.raises(AppError) as err:
        ner_service.get_ner_model()
    assert err.value.code == "MODEL_NOT_CONFIGURED"
