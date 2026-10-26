import logging

from app.core.logging_config import RedactionFilter


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}
    assert "x-request-id" in r.headers


def test_unknown_route_uses_standard_error_format(client):
    r = client.get("/api/does-not-exist")
    assert r.status_code == 404
    assert r.json()["success"] is False and r.json()["error"]["code"] == "NOT_FOUND"


def test_wrong_method_uses_standard_error_format(client):
    r = client.put("/health")
    assert r.status_code == 405 and r.json()["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_docs_are_exposed(client):
    assert client.get("/docs").status_code == 200
    assert client.get("/redoc").status_code == 200
    assert "/api/auth/login" in client.get("/openapi.json").json()["paths"]


def test_log_redaction_filter():
    rec = logging.LogRecord("x", logging.INFO, "", 0,
                            "auth Bearer abc.def.ghi password=hunter2 ok", None, None)
    RedactionFilter().filter(rec)
    assert "abc.def.ghi" not in rec.msg and "hunter2" not in rec.msg
