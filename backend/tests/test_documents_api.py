import os
import uuid

from app.core.config import settings
from tests.samples import SYNTHETIC_NOTE, make_blank_pdf, make_docx, make_pdf


def _stored_files():
    return [os.path.join(d, f) for d, _, fs in os.walk(settings.upload_path) for f in fs]


# ------------------------------------------------------------------ upload
def test_upload_requires_auth(client):
    r = client.post("/api/documents/upload", files={"file": ("a.txt", b"hello")})
    assert r.status_code == 401 and r.json()["success"] is False


def test_upload_txt_pdf_docx_success(upload):
    for name, data in [("note.txt", SYNTHETIC_NOTE.encode()), ("scan.pdf", make_pdf()),
                       ("summary.docx", make_docx())]:
        r = upload(name, data)
        assert r.status_code == 201, r.text
        body = r.json()
        assert set(body) == {"document_id", "filename", "status"}
        assert body["filename"] == name and body["status"] == "uploaded"
        uuid.UUID(body["document_id"])
    assert len(_stored_files()) == 3


def test_upload_never_exposes_server_paths(upload, client, auth_headers):
    doc_id = upload().json()["document_id"]
    text = client.get(f"/api/documents/{doc_id}", headers=auth_headers).text
    assert "original_path" not in text and str(settings.upload_path) not in text


def test_upload_rejects_unsupported_extension(upload):
    r = upload("malware.exe", b"MZ\x90\x00")
    assert r.status_code == 415 and r.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"
    assert upload("noextension", b"hello").status_code == 400


def test_upload_rejects_content_that_does_not_match_extension(upload):
    for name, data in [("fake.pdf", b"just some text"), ("fake.docx", b"PK\x03\x04junk"),
                       ("fake.txt", b"\x00\x01\x02binary\x00")]:
        r = upload(name, data)
        assert r.status_code == 400, name
        assert r.json()["error"]["code"] == "INVALID_FILE_CONTENT"
    assert _stored_files() == []          # rejected files are not left on disk


def test_upload_rejects_empty_file(upload):
    r = upload("empty.txt", b"")
    assert r.status_code == 400 and r.json()["error"]["code"] == "EMPTY_FILE"


def test_upload_rejects_oversized_file(upload, monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 1)
    r = upload("big.txt", b"a" * (1024 * 1024 + 1))
    assert r.status_code == 413 and r.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"
    assert _stored_files() == []
    assert upload("ok.txt", b"a" * 1024 * 1024).status_code == 201


def test_upload_sanitises_filename_and_prevents_traversal(upload):
    r = upload("../../etc/pass wd<>.txt", b"hello world")
    assert r.status_code == 201
    assert r.json()["filename"] == "pass wd__.txt"
    files = _stored_files()
    assert len(files) == 1 and str(settings.upload_path) in files[0]
    assert "etc" not in os.path.relpath(files[0], settings.upload_path)


# ------------------------------------------------------------------ list/get/status/delete
def test_list_pagination_and_filters(upload, client, auth_headers):
    for i in range(3):
        upload(f"n{i}.txt", b"text")
    upload("p.pdf", make_pdf())
    r = client.get("/api/documents?page=1&page_size=3", headers=auth_headers).json()
    assert r["total"] == 4 and len(r["items"]) == 3 and r["page"] == 1
    assert len(client.get("/api/documents?page=2&page_size=3", headers=auth_headers).json()["items"]) == 1
    only_pdf = client.get("/api/documents?file_type=pdf", headers=auth_headers).json()
    assert only_pdf["total"] == 1 and only_pdf["items"][0]["file_type"] == "pdf"
    assert client.get("/api/documents?status=completed", headers=auth_headers).json()["total"] == 0
    assert client.get("/api/documents?status=bogus", headers=auth_headers).status_code == 422
    assert client.get("/api/documents?page_size=1000", headers=auth_headers).status_code == 422


def test_documents_are_private_per_user(upload, client, second_user_headers):
    doc_id = upload().json()["document_id"]
    assert client.get("/api/documents", headers=second_user_headers).json()["total"] == 0
    for method, url in [("get", f"/api/documents/{doc_id}"), ("get", f"/api/documents/{doc_id}/status"),
                        ("post", f"/api/documents/{doc_id}/extract"),
                        ("post", f"/api/documents/{doc_id}/deidentify"),
                        ("delete", f"/api/documents/{doc_id}")]:
        r = getattr(client, method)(url, headers=second_user_headers)
        assert r.status_code == 404, url


def test_get_unknown_and_malformed_ids(client, auth_headers):
    assert client.get(f"/api/documents/{uuid.uuid4()}", headers=auth_headers).status_code == 404
    assert client.get("/api/documents/not-a-uuid", headers=auth_headers).status_code == 422


def test_detail_and_status(upload, client, auth_headers):
    doc_id = upload().json()["document_id"]
    d = client.get(f"/api/documents/{doc_id}", headers=auth_headers).json()
    assert d["status"] == "uploaded" and d["entity_count"] == 0 and d["extracted_text"] is None
    s = client.get(f"/api/documents/{doc_id}/status", headers=auth_headers).json()
    assert s["document_id"] == doc_id and s["status"] == "uploaded"


def test_delete_removes_record_and_file(upload, client, auth_headers):
    doc_id = upload().json()["document_id"]
    assert len(_stored_files()) == 1
    assert client.delete(f"/api/documents/{doc_id}", headers=auth_headers).status_code == 204
    assert _stored_files() == []
    assert client.get(f"/api/documents/{doc_id}", headers=auth_headers).status_code == 404
    assert client.delete(f"/api/documents/{doc_id}", headers=auth_headers).status_code == 404


def test_delete_blocked_while_processing(upload, client, auth_headers):
    from app.db.database import SessionLocal
    from app.models import Document
    doc_id = upload().json()["document_id"]
    with SessionLocal() as db:
        db.get(Document, uuid.UUID(doc_id)).processing_status = "processing"
        db.commit()
    r = client.delete(f"/api/documents/{doc_id}", headers=auth_headers)
    assert r.status_code == 409 and r.json()["error"]["code"] == "DOCUMENT_BUSY"


# ------------------------------------------------------------------ extract
def test_extract_txt_pdf_docx(upload, client, auth_headers):
    for name, data, expect in [("a.txt", SYNTHETIC_NOTE.encode(), "Metformin 500 mg"),
                               ("a.pdf", make_pdf(), "Metformin"),
                               ("a.docx", make_docx(), "Hemoglobin | 11.2 g/dL")]:
        doc_id = upload(name, data).json()["document_id"]
        r = client.post(f"/api/documents/{doc_id}/extract", headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert expect in body["text"] and body["status"] == "extracted"
        assert body["metadata"]["character_count"] == len(body["text"])
        d = client.get(f"/api/documents/{doc_id}?include_text=true", headers=auth_headers).json()
        assert d["extracted_text"] == body["text"] and d["status"] == "extracted"


def test_extract_corrupted_and_empty_documents_fail_gracefully(upload, client, auth_headers):
    bad = upload("bad.pdf", b"%PDF-1.4 garbage garbage").json()["document_id"]
    r = client.post(f"/api/documents/{bad}/extract", headers=auth_headers)
    assert r.status_code == 422 and r.json()["error"]["code"] == "CORRUPTED_DOCUMENT"
    assert client.get(f"/api/documents/{bad}/status", headers=auth_headers).json()["status"] == "failed"

    blank = upload("blank.pdf", make_blank_pdf()).json()["document_id"]
    r = client.post(f"/api/documents/{blank}/extract", headers=auth_headers)
    assert r.status_code == 422 and r.json()["error"]["code"] == "EMPTY_DOCUMENT"
    assert "Traceback" not in r.text


def test_extract_missing_file_on_disk(upload, client, auth_headers):
    doc_id = upload().json()["document_id"]
    for f in _stored_files():
        os.remove(f)
    r = client.post(f"/api/documents/{doc_id}/extract", headers=auth_headers)
    assert r.status_code == 404 and r.json()["error"]["code"] == "FILE_MISSING"


# ------------------------------------------------------------------ de-identify
def test_deidentify_flow(upload, client, auth_headers):
    doc_id = upload("n.txt", SYNTHETIC_NOTE.encode()).json()["document_id"]
    r = client.post(f"/api/documents/{doc_id}/deidentify", headers=auth_headers)   # auto-extracts
    assert r.status_code == 200, r.text
    body = r.json()
    assert "Ramesh" in body["original_text"] and "Ramesh" not in body["deidentified_text"]
    assert body["identifiers_detected"] == sum(body["identifiers_by_type"].values()) >= 6
    assert body["status"] == "deidentified"
    d = client.get(f"/api/documents/{doc_id}?include_text=true", headers=auth_headers).json()
    assert d["deidentified_text"] == body["deidentified_text"] and d["status"] == "deidentified"


def test_reextract_invalidates_deidentified_text_and_entities(upload, client, auth_headers):
    from app.db.database import SessionLocal
    from app.models import Entity
    doc_id = upload("n.txt", SYNTHETIC_NOTE.encode()).json()["document_id"]
    client.post(f"/api/documents/{doc_id}/deidentify", headers=auth_headers)
    with SessionLocal() as db:
        db.add(Entity(document_id=uuid.UUID(doc_id), entity_text="diabetes", entity_type="Disease",
                      start_position=0, end_position=8, confidence=0.9))
        db.commit()
    assert client.get(f"/api/documents/{doc_id}", headers=auth_headers).json()["entity_count"] == 1
    client.post(f"/api/documents/{doc_id}/extract", headers=auth_headers)
    d = client.get(f"/api/documents/{doc_id}?include_text=true", headers=auth_headers).json()
    assert d["deidentified_text"] is None and d["entity_count"] == 0


def test_no_phi_in_server_logs(upload, client, auth_headers, caplog):
    import logging
    with caplog.at_level(logging.DEBUG):
        doc_id = upload("Ramesh_Kumar_note.txt", SYNTHETIC_NOTE.encode()).json()["document_id"]
        client.post(f"/api/documents/{doc_id}/deidentify", headers=auth_headers)
        client.get("/api/documents?status=uploaded", headers=auth_headers)
    logged = " ".join(r.getMessage() for r in caplog.records)
    for secret in ("Ramesh", "98765", "@example.com", "Metformin", "Bearer "):
        assert secret not in logged


def test_upload_missing_file_field_returns_422(client, auth_headers):
    r = client.post("/api/documents/upload", headers=auth_headers)
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_delete_via_api_cascades_to_entities_and_relations(upload, client, auth_headers):
    from app.db.database import SessionLocal
    from app.models import Entity, Relation
    doc_id = uuid.UUID(upload("n.txt", b"text").json()["document_id"])
    with SessionLocal() as db:
        e1 = Entity(document_id=doc_id, entity_text="a", entity_type="Disease",
                    start_position=0, end_position=1, confidence=0.9)
        e2 = Entity(document_id=doc_id, entity_text="b", entity_type="Medication",
                    start_position=2, end_position=3, confidence=0.9)
        db.add_all([e1, e2]); db.flush()
        db.add(Relation(document_id=doc_id, subject_entity_id=e1.id, object_entity_id=e2.id,
                        relation_type="treated_by", confidence=0.5))
        db.commit()
    assert client.delete(f"/api/documents/{doc_id}", headers=auth_headers).status_code == 204
    with SessionLocal() as db:
        assert db.query(Entity).count() == 0 and db.query(Relation).count() == 0
