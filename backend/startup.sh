#!/bin/bash
# Azure App Service (Linux) startup command.
#
# Oryx normally builds the virtualenv during deployment. This script tolerates
# the case where it did not — a cold slot, a zip deploy that skipped the build,
# or a half-written antenv — by recreating it before starting the server.
set -euo pipefail

VENV_PATH="${VENV_PATH:-/home/site/antenv}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

venv_is_healthy() {
    [ -x "$VENV_PATH/bin/python" ] && [ -x "$VENV_PATH/bin/uvicorn" ]
}

if venv_is_healthy; then
    echo "[startup] Using existing virtualenv at $VENV_PATH"
    # shellcheck disable=SC1091
    source "$VENV_PATH/bin/activate"
else
    echo "[startup] Virtualenv missing or incomplete — rebuilding at $VENV_PATH"
    rm -rf "$VENV_PATH"
    python -m venv "$VENV_PATH"
    # shellcheck disable=SC1091
    source "$VENV_PATH/bin/activate"
    pip install --no-cache-dir --upgrade pip
    pip install --no-cache-dir -r "$APP_DIR/requirements.txt"
fi

# /home is the only durable path on App Service — everything else is replaced
# on redeploy. Keep the SQLite database and generated workbooks there.
export DATA_DIR="${DATA_DIR:-/home/data}"
export REPORTS_DIR="${REPORTS_DIR:-/home/data/reports}"
mkdir -p "$DATA_DIR" "$REPORTS_DIR"

# Relative imports inside the app package assume this working directory.
cd "$APP_DIR/app"

echo "[startup] Launching uvicorn on port ${PORT:-8000}"
exec python -m uvicorn app:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers "${WEB_CONCURRENCY:-2}" \
    --proxy-headers \
    --forwarded-allow-ips '*'
