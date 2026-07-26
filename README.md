# L&T-CORe — Component Obsolescence & Resilience Engine

[![Deploy to Azure App Service](https://github.com/HarishM-AIML-A-58/EOL-Azure/actions/workflows/azure-webapp.yml/badge.svg)](https://github.com/HarishM-AIML-A-58/EOL-Azure/actions/workflows/azure-webapp.yml)

Find a defensible replacement for an end-of-life electronic component.

Look up the obsolete part's specifications, weight every parameter by **Form, Fit and
Function**, pull cross-referenced candidates from three distributor APIs, and export a
colour-coded Excel workbook a procurement reviewer can sign off without a walkthrough.

---

## How it works

| Stage | What happens |
| ----- | ------------ |
| **1 · Look up** | Octopart returns the canonical specification set for the EOL part. Responses are cached for 30 days. |
| **2 · Weight** | Each parameter is marked `P1` must-match, `P2` can-differ, or `P3` cosmetic. This is the engineering judgement the scoring encodes. |
| **3 · Find alternatives** | Digi-Key and Mouser cross-references are merged into one candidate set. |
| **4 · Export** | Azure OpenAI classifies every parameter as match / variation / no-match against the priority map, and the result is written to a colour-coded workbook. |

## Architecture

A monolith by design. `npm run build` emits the Vite bundle into
`backend/static/dist`, and FastAPI serves both the API and the SPA from one origin —
which keeps the session cookie first-party and takes CORS out of the production path
entirely.

```
frontend/          React 18 + Vite 7 + Tailwind v4
  index.css        Tailwind entry + PrimeReact retheme
  src/styles/      Design tokens, transcribed from DESIGN-sentry.md
  src/components/  App shell, auth, shared UI kit (src/components/ui)
  src/pages/       Product surfaces + the marketing landing page

backend/           FastAPI + SQLAlchemy + SQLite
  app/app.py       API routes, FFF pipeline, SPA serving
  app/auth_*.py    Cookie sessions, bcrypt password hashing
  app/database.py  User, Session, SearchHistory, Report models
  startup.sh       Azure App Service startup command
```

### Design language

The interface follows [`DESIGN-sentry.md`](DESIGN-sentry.md) exactly. The load-bearing
rule is **two canvas polarities, never blended**:

- **Dark** (`#1f1633`) — landing page, sign-in, 404. Starfield texture, sticker
  mascots, one lime keyword chip per viewport, white `button-inverted` CTAs.
- **Light** (`#ffffff`) — every product surface. Hairline-cloud borders, dense
  scannable tables, near-black `button-primary` CTAs.

Tokens live in [`frontend/src/styles/sentry.css`](frontend/src/styles/sentry.css) and are
transcribed verbatim from the spec's front-matter. Edit the spec first, then mirror it —
never hand-tune the values.

---

## Running locally

**Prerequisites:** Python 3.11+, Node 20+.

```bash
git clone https://github.com/HarishM-AIML-A-58/EOL-Azure.git
cd EOL-Azure
cp .env.example .env    # then fill in your API credentials
```

Backend:

```bash
python -m venv venv && source venv/Scripts/activate && pip install -r backend/requirements.txt && cd backend/app && python -m uvicorn app:app --reload --port 8000
```

Frontend (separate terminal — Vite proxies `/api` to port 8000):

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. **Instant demo access** on the sign-in page creates and
signs into a shared demo account so you can walk the whole workflow.

To run exactly as production does, build the bundle and let FastAPI serve it:

```bash
cd frontend && npm run build && cd ../backend/app && python -m uvicorn app:app --port 8000
```

---

## Deploying to Azure App Service

The [workflow](.github/workflows/azure-webapp.yml) builds the frontend, verifies the
backend imports, zips `backend/`, deploys, and smoke-tests `/api/health`.

The live deployment is **https://lttseol-core.azurewebsites.net** — resource group
`tendworks-eol-rg`, Central India, F1 plan `tendworks-eol-plan`.

**One-time setup**

1. Create a Linux App Service on the Python 3.11 runtime.
2. Set the startup command to `bash /home/site/wwwroot/startup.sh`.
3. Enable SCM basic auth (`az resource update -g <rg> -n scm --namespace Microsoft.Web
   --resource-type basicPublishingCredentialsPolicies --parent sites/<app>
   --set properties.allow=true`) — new apps ship with it disabled and the publish
   profile will not authenticate without it.
4. Download the app's publish profile and store it as the repository secret
   `AZURE_WEBAPP_PUBLISH_PROFILE`.
5. Update `AZURE_WEBAPP_NAME` in the workflow if your app is named differently.
6. Add the Application Settings below.

**Application Settings**

| Setting | Value | Why |
| ------- | ----- | --- |
| `ENV` | `production` | Marks the session cookie `Secure` + `SameSite=None`. |
| `DATA_DIR` | `/home/data` | `/home` is the only path that survives a redeploy. |
| `REPORTS_DIR` | `/home/data/reports` | Same — generated workbooks must persist. |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `1` | Lets Oryx build the virtualenv. |
| `WEB_CONCURRENCY` | `1` | One uvicorn worker. The F1 plan is a shared single core — two workers thrash it. Raise this on B1 and above. |
| `OCTOPART_CLIENT_ID` / `_SECRET` | — | Specification source. |
| `DIGIKEY_CLIENT_ID` / `_SECRET` | — | Cross-references and pricing. |
| `MOUSER_API_KEY` | — | Availability corroboration. |
| `AZURE_OPENAI_API_KEY` / `_ENDPOINT` / `_DEPLOYMENT` | — | FFF classification. |

Credentials are read from the host environment only. They are never sent to the browser
and never stored client-side. `GET /api/health` reports which sources are configured
without revealing any values.

> **On SQLite:** the database is a single file under `DATA_DIR`. That is fine for one
> App Service instance, which is what this deployment assumes. If you scale out to
> multiple instances, move to PostgreSQL first — set `DATABASE_URL` and the models will
> follow it without further changes.

---

## API

| Method | Route | Purpose |
| ------ | ----- | ------- |
| `GET` | `/api/health` | Liveness probe and configured-source report. |
| `POST` | `/api/auth/register` · `/login` · `/logout` | Cookie session lifecycle. |
| `GET` | `/api/auth/session` · `/me` | Current session and user. |
| `GET` | `/api/v1/lookup_eol_specs/{part_number}` | Specification set for a part. |
| `POST` | `/api/v1/find_alternatives` | Cross-referenced candidates. |
| `POST` | `/api/v1/download_report` | Generate and stream the workbook. |
| `GET` | `/api/v1/reports` · `/reports/{filename}` | List and re-download past workbooks. |
| `GET` | `/api/v1/search-history` | Lookup history for the current user. |

Interactive docs are served at `/docs`.

---

## Licence

Internal engineering platform for L&T Technology Services.
