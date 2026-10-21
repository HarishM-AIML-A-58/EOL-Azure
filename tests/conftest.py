"""Shared fixtures for the API tests.

The backend reads DATA_DIR, REPORTS_DIR and the distributor keys at import
time, so this file points storage at a throwaway directory and blanks every
API key *before* the app module is imported. With no keys the app answers
from the offline catalogue in demo_data.py, which is what makes the suite
run anywhere without credentials.
"""

import itertools
import os
import sys
from pathlib import Path

import pytest

from testenv import prepare_env

ROOT = Path(__file__).resolve().parents[1]
APP_DIR = ROOT / "backend" / "app"

_counter = itertools.count(1)


@pytest.fixture(scope="session")
def app_module(tmp_path_factory):
    data_dir = tmp_path_factory.mktemp("eol-data")
    os.environ.update(prepare_env(data_dir))
    os.environ.pop("DATABASE_URL", None)
    os.environ.pop("SEED_DEMO_DATA", None)

    sys.path.insert(0, str(APP_DIR))
    import app as module  # noqa: E402  (import after the environment is set)

    return module


@pytest.fixture(scope="session")
def database(app_module):
    import database

    return database


@pytest.fixture
def client(app_module):
    from fastapi.testclient import TestClient

    with TestClient(app_module.app) as test_client:
        yield test_client


@pytest.fixture
def make_user(app_module):
    """Register a fresh user and return (client, username, password).

    Each call gets its own TestClient so its cookie jar is independent: two
    users in one test are two browsers, not one browser switching accounts.
    """
    from fastapi.testclient import TestClient

    clients = []

    def _make(login: bool = True):
        username = f"tester_{next(_counter)}"
        password = "Str0ng-pass-123"
        test_client = TestClient(app_module.app)
        clients.append(test_client)
        response = test_client.post(
            "/api/auth/register", json={"username": username, "password": password}
        )
        assert response.status_code == 200, response.text
        if login:
            response = test_client.post(
                "/api/auth/login", json={"username": username, "password": password}
            )
            assert response.status_code == 200, response.text
        return test_client, username, password

    yield _make

    for test_client in clients:
        test_client.close()


@pytest.fixture
def user(make_user):
    """A logged-in client for the common case."""
    test_client, username, password = make_user()
    return test_client
