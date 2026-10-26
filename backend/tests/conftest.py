"""Test setup. Env vars are set BEFORE the app is imported, so the app uses an
in-memory SQLite database, a throw-away secret and a temporary upload folder.
No real data is involved."""
import os
import shutil
import tempfile

_UPLOAD_TMP = tempfile.mkdtemp(prefix="medistruct_test_uploads_")
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-that-is-at-least-32-characters-long"
os.environ["UPLOAD_DIR"] = _UPLOAD_TMP
os.environ["LOG_LEVEL"] = "WARNING"

import pytest
from fastapi.testclient import TestClient

from app import models as _models  # noqa: F401  (registers tables)
from app.db.base import Base
from app.db.database import engine
from app.main import app
from app.nlp import model_loader


@pytest.fixture(autouse=True)
def _fresh_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _reset_model_singletons():
    model_loader.reset_singletons()
    yield
    model_loader.reset_singletons()


@pytest.fixture(autouse=True)
def _clean_uploads():
    os.makedirs(_UPLOAD_TMP, exist_ok=True)
    yield
    for child in os.scandir(_UPLOAD_TMP):
        shutil.rmtree(child.path, ignore_errors=True)


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_UPLOAD_TMP, ignore_errors=True)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def user_credentials():
    return {"email": "Student@Example.com", "password": "S3cure-pass!", "full_name": "Test User"}


def _login_headers(client, email: str, password: str) -> dict:
    r = client.post("/api/auth/login", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def auth_headers(client, user_credentials):
    client.post("/api/auth/register", json=user_credentials)
    return _login_headers(client, user_credentials["email"], user_credentials["password"])


@pytest.fixture
def second_user_headers(client):
    creds = {"email": "other@example.com", "password": "An0ther-pass!"}
    client.post("/api/auth/register", json=creds)
    return _login_headers(client, creds["email"], creds["password"])


@pytest.fixture
def upload(client, auth_headers):
    """upload(name, data, headers=None) -> Response"""
    def _upload(name="note.txt", data=b"Patient has fever and cough.", headers=None):
        return client.post("/api/documents/upload", files={"file": (name, data)},
                           headers=headers or auth_headers)
    return _upload


@pytest.fixture
def stub_ner():
    """Real HuggingFaceClinicalNER wrapper around a stub transformer pipeline."""
    from app.nlp.clinical_ner import HuggingFaceClinicalNER
    from tests.stubs import StubTokenClassifier
    return HuggingFaceClinicalNER("stub-clinical-ner", min_confidence=0.5,
                                  pipeline_factory=lambda: StubTokenClassifier())


@pytest.fixture
def nlp_client(client, stub_ner):
    """client whose NER dependency is the stubbed model; relation extraction is real."""
    from app.services.ner_service import get_ner_model
    app.dependency_overrides[get_ner_model] = lambda: stub_ner
    yield client
    app.dependency_overrides.pop(get_ner_model, None)


@pytest.fixture
def processed_doc(nlp_client, upload, auth_headers):
    """Uploads NLP_NOTE and runs the whole pipeline. Returns (document_id, response_json)."""
    from tests.samples import NLP_NOTE
    doc_id = upload("visit.txt", NLP_NOTE.encode()).json()["document_id"]
    r = nlp_client.post(f"/api/documents/{doc_id}/process", headers=auth_headers)
    assert r.status_code == 200, r.text
    return doc_id, r.json()
