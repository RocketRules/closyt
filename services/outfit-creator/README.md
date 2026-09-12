# Closet Fit-Scoring Engine (`outfit-creator`)

HackCMU 2026 — Optimization track. Independent service that ranks outfit combinations from body info + clothing descriptions.

Teammates integrate against `POST /rank_outfits` only. CV, image rendering, and shopping links are out of scope (use fixtures to demo standalone).

## Architecture (hybrid — not a prompt wrapper)

1. **Attribute extraction** (LLM) — structured attributes per item, cached by id  
2. **Outfit generation** (pure Python) — constrained combinatorial slot-filling  
3. **Deterministic scoring** (rules) — color harmony, formality, body-preference flattery  
4. **LLM rubric** (K2 Horizon, temp 0) — four named sub-scores on top-20 only, few-shot calibrated  
5. **Ranking** — `final = 0.5 * deterministic + 0.5 * llm_avg`, return top 10  

If `IFM_API_KEY` is missing or the API fails, **`/rank_outfits` fails** (503). Deterministic core remains testable without the LLM.

## Provisional contract notes

Enums below are locked for integration; rename once teammates confirm.

| Field | Provisional values |
|-------|-------------------|
| `category` | `sock`, `shoe`, `shirt`, `pant`, `short`, `jacket`, `sweater`, `underwear`, `outerwear`, `onepiece`, `dress` |
| `BodyInfo` | `height_cm`, `weight_kg`, `age`, `gender` (`m`/`f`), `fit_preference` (`tighter`/`looser`), `sleeve_preference` (`long`/`short`), `color_preference` (`lighter`/`darker`) — **not** A/B/C/D size_class |

## Quickstart

```bash
cd outfit-creator
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Deterministic core (no API key)
pytest -q
python scripts/demo_deterministic.py --top 10
```

### Live IFM smoke test (requires API key)

After you add your key, this is the fastest way to confirm the full pipeline works
(attribute extraction + LLM rubric + blend) without starting the HTTP server.

```bash
cp .env.example .env
# Edit .env and set:
#   IFM_API_KEY=your_raw_key_here
# Use the raw key only — do NOT include the word "Bearer" or quotes.

python scripts/demo_live_ifm.py

# Optional: run the same request twice and assert scores stay within ±0.3
python scripts/demo_live_ifm.py --consistency
```

Expect ~30–60s for a single run. Success prints `PASS` and writes
`scripts/last_live_ifm_run.json`. Exit code `0` = ok; non-zero = key/API/pipeline failure.

### Full HTTP service

```bash
# .env must already contain IFM_API_KEY (see above)
uvicorn app.main:app --reload --port 8000
```

Useful routes: [`/health`](http://127.0.0.1:8000/health), [`/docs`](http://127.0.0.1:8000/docs),
`POST /rank_outfits` (not `/`).

### Example `curl` request

```bash
curl -s http://127.0.0.1:8000/rank_outfits \
  -H 'Content-Type: application/json' \
  -d @- <<'EOF'
{
  "body": {
    "height_cm": 175,
    "weight_kg": 72,
    "age": 22,
    "gender": "m",
    "fit_preference": "looser",
    "sleeve_preference": "long",
    "color_preference": "darker"
  },
  "items": [
    {"id": "s1", "category": "shirt", "description": "navy oxford button-down shirt"},
    {"id": "p1", "category": "pant", "description": "charcoal wool dress pants"},
    {"id": "sh1", "category": "shoe", "description": "black leather derby shoes"},
    {"id": "sk1", "category": "sock", "description": "black mid-calf dress socks"}
  ]
}
EOF
```

## IFM K2 Horizon

Confirmed from your curl snippet:

- Base URL: `https://api.ifm.ai/v1`
- Auth: `Authorization: Bearer $IFM_API_KEY` (code adds `Bearer`; `.env` stores the raw key only)
- Model: `IFM/K2-Horizon-375B-A23B`
- Structured path: Chat Completions + `response_format: json_object` (OpenAI-compatible)

## Tests

| File | What it proves |
|------|----------------|
| `test_outfit_generation.py` | Slot rules, hard filters, sane candidate counts |
| `test_deterministic_scoring.py` | Good outfits beat bad ones with zero LLM calls |
| `test_ranking.py` | Blend + `RankResponse` contract |
| `test_consistency.py` | Same input twice → scores within ±0.3 (mocked LLM) |
| `scripts/demo_live_ifm.py` | Live IFM end-to-end smoke (needs `IFM_API_KEY`) |

Fixtures live in `tests/fixtures/` (hand-authored, not generated at test time).

## Layout

```
outfit-creator/
  app/
    main.py
    schemas.py
    attribute_extraction.py
    outfit_generation.py
    deterministic_scoring.py
    llm_rubric_scoring.py
    ranking.py
    config.py
    calibration/reference_outfits.json
  tests/
  scripts/demo_deterministic.py
  scripts/demo_live_ifm.py
```
