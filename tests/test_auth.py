from datetime import datetime, timedelta

import pytest

COOKIE = "eol_session_id"


def test_register_returns_user_without_password(make_user):
    client, username, _ = make_user(login=False)

    response = client.get("/api/auth/session")
    assert response.json() == {"authenticated": False, "user": None}

    # Register again with the same name: the first one must win.
    response = client.post(
        "/api/auth/register", json={"username": username, "password": "another-one-1"}
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Username already exists"


@pytest.mark.parametrize(
    "username, password, expected_status",
    [
        ("ab", "Str0ng-pass-123", 422),  # shorter than the schema minimum
        ("bad name!", "Str0ng-pass-123", 400),  # characters the validator rejects
        (".leading", "Str0ng-pass-123", 400),  # cannot start with a dot
        ("fine_name", "short", 422),  # shorter than the schema minimum
    ],
)
def test_register_rejects_invalid_input(client, username, password, expected_status):
    response = client.post(
        "/api/auth/register", json={"username": username, "password": password}
    )

    assert response.status_code == expected_status


def test_login_sets_httponly_session_cookie(make_user):
    client, username, password = make_user(login=False)

    response = client.post(
        "/api/auth/login", json={"username": username, "password": password}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["user"]["username"] == username
    assert body["user"]["last_login"] is not None

    set_cookie = response.headers["set-cookie"]
    assert set_cookie.startswith(f"{COOKIE}=")
    assert "HttpOnly" in set_cookie
    assert "SameSite=lax" in set_cookie
    assert "Max-Age=86400" in set_cookie


def test_login_failures_do_not_reveal_which_field_was_wrong(make_user, client):
    _, username, _ = make_user(login=False)

    wrong_password = client.post(
        "/api/auth/login", json={"username": username, "password": "not-it-123"}
    )
    unknown_user = client.post(
        "/api/auth/login", json={"username": "nobody_here", "password": "not-it-123"}
    )

    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.json()["detail"] == unknown_user.json()["detail"]
    assert COOKIE not in wrong_password.cookies


def test_me_requires_a_session(client, user):
    assert client.get("/api/auth/me").status_code == 401

    response = user.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["username"].startswith("tester_")


def test_tampered_cookie_is_rejected(client):
    client.cookies.set(COOKIE, "not-a-real-session-id")

    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower() or "invalid" in response.json()["detail"].lower()


def test_logout_invalidates_the_session_server_side(user):
    session_id = user.cookies.get(COOKIE)
    assert user.get("/api/auth/session").json()["authenticated"] is True

    response = user.post("/api/auth/logout")
    assert response.status_code == 200
    assert "Max-Age=0" in response.headers["set-cookie"] or 'expires=' in response.headers["set-cookie"].lower()

    # Even if a client kept the old cookie value, the server must refuse it.
    user.cookies.set(COOKIE, session_id)
    assert user.get("/api/auth/me").status_code == 401


def test_expired_session_is_rejected(user, database):
    session_id = user.cookies.get(COOKIE)

    db = database.SessionLocal()
    try:
        row = db.query(database.Session).filter_by(session_id=session_id).one()
        row.expires_at = datetime.utcnow() - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()

    assert user.get("/api/auth/me").status_code == 401
