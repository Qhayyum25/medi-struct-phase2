import logging
import uuid

from app.core.config import settings
from app.nlp import model_loader
from app.nlp.model_loader import ModelLoadError
from app.nlp.clinical_ner import HuggingFaceClinicalNER
from app.main import app
from app.services.ner_service import get_ner_model
from tests.samples import NLP_NOTE
from tests.stubs import FailingClassifier, StubTokenClassifier


def _detail(client, headers, doc_id):
    return client.get(f"/api/documents/{doc_id}?include_text=true", headers=headers).json()


def test_process_runs_the_whole_pipeline(processed_doc, nlp_client, auth_headers):
    doc_id, body = processed_doc
    assert body["document_id"] == doc_id and body["status"] == "completed"
    stats = body["statistics"]
    assert stats["entity_count"] == len(body["entities"]) >= 10
    assert stats["relation_count"] == len(body["relations"]) >= 5
    assert sum(stats["entities_by_type"].values()) == stats["entity_count"]
    assert sum(stats["relations_by_type"].values()) == stats["relation_count"]
    assert stats["ner_model"] == "stub-clinical-ner" and stats["relation_model"] == "rule_based"
    assert stats["duration_ms"] >= 0
    detail = _detail(nlp_client, auth_headers, doc_id)
    assert detail["status"] == "completed" and detail["error_message"] is None
    assert detail["entity_count"] == stats["entity_count"] and detail["relation_count"] == stats["relation_count"]


def test_nlp_runs_on_deidentified_text_and_offsets_are_exact(processed_doc, nlp_client, auth_headers):
    doc_id, body = processed_doc
    detail = _detail(nlp_client, auth_headers, doc_id)
    text = detail["deidentified_text"]
    assert "Ramesh" not in text and "[NAME]" in text
    for e in body["entities"]:
        assert text[e["start_position"]:e["end_position"]] == e["entity_text"]
        assert 0.5 <= e["confidence"] <= 1 and e["model_name"] == "stub-clinical-ner"
    assert "Ramesh" not in str(body) and "98765" not in str(body) and "[NAME]" not in {e["entity_text"] for e in body["entities"]}


def test_expected_entities_and_relations_are_found(processed_doc):
    _, body = processed_doc
    entities = {(e["entity_text"], e["entity_type"]) for e in body["entities"]}
    assert {("Metformin", "Medication"), ("polyuria", "Symptom"), ("HbA1c", "Test"),
            ("type 2 diabetes mellitus", "Disease"), ("54-year-old", "Age")} <= entities
    assert not any(t in ("glycemic control", "poor") for t, _ in entities)
    rels = {(r["subject_entity"]["entity_text"], r["relation_type"], r["object_entity"]["entity_text"])
            for r in body["relations"]}
    assert {("Metformin", "dosage", "500 mg"), ("Metformin", "frequency", "twice daily"),
            ("type 2 diabetes mellitus", "treated_by", "Metformin"), ("HbA1c", "has_value", "8.2 %"),
            ("Ultrasound", "indicates", "fatty liver"), ("male", "has_disease", "type 2 diabetes mellitus")} <= rels
    assert all(0 < r["confidence"] <= 0.99 for r in body["relations"])


def test_reprocessing_replaces_results_without_duplicates(processed_doc, nlp_client, auth_headers):
    doc_id, first = processed_doc
    second = nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers).json()
    assert second["statistics"]["entity_count"] == first["statistics"]["entity_count"]
    assert second["statistics"]["relation_count"] == first["statistics"]["relation_count"]
    total = nlp_client.get("/api/entities", headers=auth_headers).json()["total"]
    assert total == first["statistics"]["entity_count"]
    assert {e["id"] for e in first["entities"]}.isdisjoint({e["id"] for e in second["entities"]})


def test_process_reuses_existing_deidentified_text(nlp_client, upload, auth_headers):
    doc_id = upload("v.txt", NLP_NOTE.encode()).json()["document_id"]
    nlp_client.post(f"/api/documents/{doc_id}/deidentify", headers=auth_headers)
    before = _detail(nlp_client, auth_headers, doc_id)["deidentified_text"]
    assert nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers).status_code == 200
    assert _detail(nlp_client, auth_headers, doc_id)["deidentified_text"] == before


def test_document_without_clinical_terms_completes_with_no_results(nlp_client, upload, auth_headers):
    doc_id = upload("x.txt", b"Meeting notes about the parking lot renovation.").json()["document_id"]
    r = nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers)
    assert r.status_code == 200 and r.json()["statistics"]["entity_count"] == 0
    assert r.json()["status"] == "completed" and r.json()["relations"] == []


def test_process_is_private_and_validates_ids(nlp_client, upload, auth_headers, second_user_headers):
    doc_id = upload("v.txt", NLP_NOTE.encode()).json()["document_id"]
    assert nlp_client.post(f"/api/documents/{doc_id}/process", headers=second_user_headers).status_code == 404
    assert nlp_client.post(f"/api/documents/{uuid.uuid4()}/process", headers=auth_headers).status_code == 404
    assert nlp_client.post(f"/api/documents/{doc_id}/process").status_code == 401


def test_concurrent_processing_is_rejected_with_409(nlp_client, upload, auth_headers):
    from app.db.database import SessionLocal
    from app.models import Document
    doc_id = upload("v.txt", NLP_NOTE.encode()).json()["document_id"]
    with SessionLocal() as db:
        db.get(Document, uuid.UUID(doc_id)).processing_status = "processing"
        db.commit()
    r = nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers)
    assert r.status_code == 409 and r.json()["error"]["code"] == "DOCUMENT_BUSY"


def test_inference_crash_marks_document_failed_and_hides_details(nlp_client, upload, auth_headers):
    doc_id = upload("v.txt", NLP_NOTE.encode()).json()["document_id"]
    broken = HuggingFaceClinicalNER("broken", pipeline_factory=lambda: FailingClassifier())
    app.dependency_overrides[get_ner_model] = lambda: broken
    r = nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers)
    assert r.status_code == 500 and r.json()["error"]["code"] == "PROCESSING_FAILED"
    assert "simulated" not in r.text and "Ramesh" not in r.text and "Traceback" not in r.text
    status = nlp_client.get(f"/api/documents/{doc_id}/status", headers=auth_headers).json()
    assert status["status"] == "failed" and status["error_message"] == "Processing failed unexpectedly."


def test_failed_run_keeps_old_results_and_can_be_retried(processed_doc, nlp_client, auth_headers, stub_ner):
    doc_id, first = processed_doc
    broken = HuggingFaceClinicalNER("broken", pipeline_factory=lambda: FailingClassifier())
    app.dependency_overrides[get_ner_model] = lambda: broken
    assert nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers).status_code == 500
    assert nlp_client.get(f"/api/documents/{doc_id}", headers=auth_headers).json()["entity_count"] == \
        first["statistics"]["entity_count"]                      # the failed run changed nothing
    app.dependency_overrides[get_ner_model] = lambda: stub_ner
    retry = nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers)
    assert retry.status_code == 200 and retry.json()["status"] == "completed"


def test_model_that_cannot_load_gives_503(nlp_client, upload, auth_headers):
    doc_id = upload("v.txt", NLP_NOTE.encode()).json()["document_id"]

    def offline():
        raise ModelLoadError("no network")

    app.dependency_overrides[get_ner_model] = lambda: HuggingFaceClinicalNER("m", pipeline_factory=offline)
    r = nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers)
    assert r.status_code == 503 and r.json()["error"]["code"] == "MODEL_UNAVAILABLE"
    assert nlp_client.get(f"/api/documents/{doc_id}/status", headers=auth_headers).json()["status"] == "failed"


def test_unconfigured_model_gives_503_and_leaves_document_untouched(client, upload, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "NER_MODEL_NAME", "")
    model_loader.reset_singletons()
    doc_id = upload("v.txt", NLP_NOTE.encode()).json()["document_id"]
    r = client.post(f"/api/documents/{doc_id}/process", headers=auth_headers)
    assert r.status_code == 503 and r.json()["error"]["code"] == "MODEL_NOT_CONFIGURED"
    assert client.get(f"/api/documents/{doc_id}/status", headers=auth_headers).json()["status"] == "uploaded"


def test_pipeline_logs_contain_no_clinical_text(nlp_client, upload, auth_headers, caplog):
    doc_id = upload("v.txt", NLP_NOTE.encode()).json()["document_id"]
    caplog.set_level(logging.DEBUG)
    with caplog.at_level(logging.DEBUG):
        r1 = nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers)
        nlp_client.get("/api/entities?entity_text=metformin", headers=auth_headers)
        nlp_client.get("/api/search?q=polyuria", headers=auth_headers)
    assert r1.status_code == 200
    # Only our own application loggers matter here: httpx (the *test client's* transport)
    # logs the request line including its query string, which is test-harness noise, not
    # something our app ever writes.
    app_records = [r for r in caplog.records if r.name.startswith("app.")]
    assert app_records
    logged = " ".join(r.getMessage() for r in app_records)
    for secret in ("Metformin", "metformin", "polyuria", "54-year-old", "Ramesh", "98765", "diabetes"):
        assert secret not in logged
    assert any(getattr(r, "stage", None) == "process" for r in caplog.records)
