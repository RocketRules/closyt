#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
SERVER="$ROOT/server"

cd "$SERVER"

if [ ! -d .venv ]; then
  echo "Creating Python venv for tagger..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

echo "Starting FashionCLIP tagger on 0.0.0.0:8001 ..."
echo "(first run downloads ~600MB model)"
exec python app.py
