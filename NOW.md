# EOL-Azure: now

Updated 2026-10-21.

## State
- Branch `test/pytest-playwright-suite` holds the first automated test suite for L&T-CORe. Nothing is committed yet.
- 37 API tests (`tests/`) run against FastAPI's TestClient with every distributor and Azure OpenAI key blanked, so the app answers from the offline catalogue in `backend/app/demo_data.py`.
- 7 browser tests (`tests/e2e/`) start uvicorn on a free port serving the built SPA and drive it with Playwright. Locally they attach to BrowserOS neo over `PW_CDP_URL=http://127.0.0.1:9112`; in CI they launch Playwright's own Chromium.
- `.github/workflows/tests.yml` runs both jobs on push to master and on pull requests. The browser job has not yet been exercised on GitHub.
- One backend fix shipped with the suite: `lookup_eol_specs` takes `{part_number:path}` so a URL-encoded slash (`MCP73831T-2ACI%2FOT`, the third quick scenario in the UI) no longer 404s.

## How to run
```
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python -r backend/requirements.txt -r tests/requirements-test.txt
.venv/bin/python -m pytest tests --ignore=tests/e2e          # API
(cd frontend && npm ci && npm run build)
PW_CDP_URL=http://127.0.0.1:9112 .venv/bin/python -m pytest tests/e2e   # browser, via BrowserOS neo
```

## Open
- Commit and push the branch, then watch the first CI run of the browser job.
- `find_alternatives` has no auth dependency while every other data route does. Decide whether that is intended.
- No tests yet for the paths that need real keys (Octopart, Digi-Key, Mouser, Azure OpenAI colouring). They would need recorded fixtures.
