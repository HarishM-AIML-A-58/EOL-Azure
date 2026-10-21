# EOL-Azure: decisions

## 2026-10-21: tests run with no credentials, against the offline catalogue
Choice: the suite blanks every API key before importing the app and asserts on `demo_data.py` answers.
Why: anyone can run it, CI needs no secrets, and the offline path is the one a fresh deployment shows a reviewer.
Rejected: mocking `OctopartAPI` and `search_component_3api`. It would test the mocks, and the catalogue path is already the fallback the app uses.

## 2026-10-21: browser tests attach to BrowserOS neo locally, launch Chromium in CI
Choice: `tests/e2e/conftest.py` overrides pytest-playwright's `browser` fixture: `connect_over_cdp(PW_CDP_URL)` when set, `chromium.launch()` otherwise.
Why: the developer already runs BrowserOS neo, which exposes DevTools on 127.0.0.1:9112, so no second browser download locally. CI has no neo, so it installs Chromium.
Rejected: requiring `playwright install chromium` locally (150 MB that duplicates a browser already running).

## 2026-10-21: httpx pinned to 0.27.2
Choice: `tests/requirements-test.txt` pins `httpx==0.27.2`.
Why: FastAPI 0.104.1's TestClient passes `app=` to httpx, which httpx 0.28 removed. Bumping FastAPI is a bigger change than this suite should carry.

## 2026-10-21: the lookup route takes `{part_number:path}`
Choice: one-token change in `backend/app/app.py`.
Why: the test for `MCP73831T-2ACI/OT` returned 404. Starlette decodes `%2F` before routing, so the default string converter never matched. The UI's third quick scenario was broken in production.
Rejected: changing the frontend to send a different separator. The catalogue and distributor APIs use the slash.
