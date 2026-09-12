#!/usr/bin/env bash
set -euo pipefail

BASE="${EXPO_PUBLIC_FIT_ENGINE_URL:-http://127.0.0.1:8000}"

echo "Fit engine base: $BASE"
echo ""

echo "=== Health ==="
curl -sf "$BASE/health" && echo "" || { echo "FAIL: engine unreachable at $BASE"; exit 1; }

echo ""
echo "=== Smoke rank_outfits ==="
curl -sf "$BASE/rank_outfits" \
  -H 'Content-Type: application/json' \
  -d '{
  "body": {
    "height_cm": 175, "weight_kg": 72, "age": 22, "gender": "m",
    "fit_preference": "looser", "sleeve_preference": "long", "color_preference": "darker"
  },
  "items": [
    {"id": "s1", "category": "shirt", "description": "navy oxford button-down shirt"},
    {"id": "p1", "category": "pant", "description": "charcoal wool dress pants"},
    {"id": "sh1", "category": "shoe", "description": "black leather derby shoes"}
  ]
}' | python3 -m json.tool && echo "" || { echo "FAIL: rank_outfits returned error"; exit 1; }

echo "PASS: engine is live and ranking."
