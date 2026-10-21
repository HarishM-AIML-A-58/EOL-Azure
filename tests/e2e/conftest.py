"""Browser tests run against a real uvicorn process serving the built SPA.

Browser selection:
- PW_CDP_URL set (for example http://127.0.0.1:9112 for a local BrowserOS
  neo): Playwright attaches to that running Chromium over the DevTools
  protocol. No browser download needed.
- Otherwise Playwright launches its own Chromium, which is what CI does
  after `playwright install chromium`.
"""

import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
APP_DIR = ROOT / "backend" / "app"
DIST_INDEX = ROOT / "backend" / "static" / "dist" / "index.html"

sys.path.insert(0, str(ROOT / "tests"))
from testenv import prepare_env  # noqa: E402


def pytest_collection_modifyitems(items):
    for item in items:
        if "e2e" in item.nodeid.split(os.sep):
            item.add_marker(pytest.mark.e2e)


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@pytest.fixture(scope="session")
def live_server(tmp_path_factory):
    if not DIST_INDEX.is_file():
        pytest.skip("frontend is not built: run `npm run build` in ./frontend first")

    port = _free_port()
    env = {**os.environ, **prepare_env(tmp_path_factory.mktemp("eol-e2e-data"))}
    env.pop("DATABASE_URL", None)
    env.pop("SEED_DEMO_DATA", None)

    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=APP_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    base_url = f"http://127.0.0.1:{port}"
    deadline = time.time() + 30
    while time.time() < deadline:
        if process.poll() is not None:
            output = process.stdout.read().decode(errors="replace")
            raise RuntimeError(f"uvicorn exited early:\n{output}")
        try:
            with urllib.request.urlopen(f"{base_url}/api/health", timeout=1) as response:
                if response.status == 200:
                    break
        except (urllib.error.URLError, ConnectionError, OSError):
            time.sleep(0.2)
    else:
        process.kill()
        raise RuntimeError("uvicorn did not answer /api/health within 30s")

    yield base_url

    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


@pytest.fixture(scope="session")
def browser(playwright, browser_type_launch_args):
    cdp_url = os.getenv("PW_CDP_URL")
    if cdp_url:
        instance = playwright.chromium.connect_over_cdp(cdp_url)
    else:
        instance = playwright.chromium.launch(**browser_type_launch_args)
    yield instance
    # On a CDP connection close() only disconnects; the external browser stays up.
    instance.close()


@pytest.fixture
def account(live_server):
    """A registered user, created through the API so each test starts clean."""
    import json

    username = f"ui_{int(time.time() * 1000)}"
    password = "Str0ng-pass-123"
    request = urllib.request.Request(
        f"{live_server}/api/auth/register",
        data=json.dumps({"username": username, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        assert response.status == 200
    return username, password
