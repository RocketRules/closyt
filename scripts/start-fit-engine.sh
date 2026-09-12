#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
ENGINE="$ROOT/services/outfit-creator"

cd "$ENGINE"

if [ ! -d .venv ]; then
  echo "Creating Python venv..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f .env ]; then
  echo "ERROR: services/outfit-creator/.env not found."
  echo "  cp services/outfit-creator/.env.example services/outfit-creator/.env"
  echo "  then set IFM_API_KEY (raw key, no Bearer, no quotes)"
  exit 1
fi

echo "Starting fit-scoring engine on 0.0.0.0:8000 ..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
