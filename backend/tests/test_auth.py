import jwt

from app.core.config import settings


def test_register_success_and_email_normalised(client, user_credentials):
    r = client.post("/api/auth/register", json=user_credentials)
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "student@example.com"
    assert "password" not in body and "hashed_password" not in body


def test_register_duplicate_email_returns_409(client, user_credentials):
    client.post("/api/auth/register", json=user_credentials)
    r = client.post("/api/auth/register", json=user_credentials)
    assert r.status_code == 409
    assert r.json() == {"success": False, "error": {
        "code": "EMAIL_EXISTS", "message": "An account with this e-mail already exists."}}


def test_register_validation_errors(client):
    r = client.post("/api/auth/register", json={"email": "not-an-email", "password": "short"})
    assert r.status_code == 422
    body = r.json()
    assert body["success"] is False and body["error"]["code"] == "VALIDATION_ERROR"
    assert "short" not in str(body)  # submitted values are never echoed


def test_password_stored_hashed(client, user_credentials):
    from app.db.database import SessionLocal
    from app.models.user import User
    client.post("/api/auth/register", json=user_credentials)
    with SessionLocal() as db:
        stored = db.query(User).one().hashed_password
    assert stored != user_credentials["password"] and stored.startswith("$2")


def test_login_success_returns_jwt(client, user_credentials):
    client.post("/api/auth/register", json=user_credentials)
    r = client.post("/api/auth/login", data={"username": user_credentials["email"],
                                             "password": user_credentials["password"]})
    assert r.status_code == 200
    token = r.json()["access_token"]
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert "sub" in payload and "exp" in payload


def test_login_wrong_password_and_unknown_user_look_identical(client, user_credentials):
    client.post("/api/auth/register", json=user_credentials)
    bad_pw = client.post("/api/auth/login", data={"username": user_credentials["email"],
                                                  "password": "wrong-password"})
    unknown = client.post("/api/auth/login", data={"username": "nobody@example.com",
                                                   "password": "whatever123"})
    assert bad_pw.status_code == unknown.status_code == 401
    assert bad_pw.json() == unknown.json()


def test_me_requires_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401
    assert r.json()["success"] is False
    assert r.headers["www-authenticate"] == "Bearer"


def test_me_with_valid_token(client, auth_headers):
    r = client.get("/api/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "student@example.com"


def test_me_rejects_garbage_and_expired_tokens(client):
    from datetime import timedelta
    from app.core.security import create_access_token
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401
    expired = create_access_token("00000000-0000-0000-0000-000000000000", timedelta(seconds=-5))
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401
