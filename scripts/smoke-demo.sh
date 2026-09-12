#!/usr/bin/env bash
set -euo pipefail

FIT_BASE="${EXPO_PUBLIC_FIT_ENGINE_URL:-http://127.0.0.1:8000}"
TAG_BASE="http://127.0.0.1:8001"

echo "Fit engine: $FIT_BASE"
echo "Tagger:     $TAG_BASE"
echo ""

echo "=== Fit engine health ==="
curl -sf "$FIT_BASE/health" && echo "" || { echo "FAIL: fit engine unreachable at $FIT_BASE"; exit 1; }

echo ""
echo "=== Tagger health ==="
curl -sf "$TAG_BASE/health" && echo "" || { echo "WARN: tagger unreachable at $TAG_BASE (colour-only mode)"; }

echo ""
echo "=== Smoke rank_outfits ==="
curl -sf "$FIT_BASE/rank_outfits" \
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

echo ""
echo "PASS: demo stack is live."
