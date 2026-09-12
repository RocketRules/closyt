# Closyt — HackCMU 2026 (Optimization Track)

Photograph your real clothes, get ranked outfit combinations powered by a **hybrid optimization engine** (constrained generation + deterministic scoring + LLM rubric). Not a prompt wrapper — the core ranking is reproducible without any AI call.

```
┌─────────────────────────────────────────────────────────────────────┐
│  User                                                               │
│  ┌──────────┐   ┌───────────┐   ┌─────────────────────────────┐    │
│  │ Body info │   │ Photos of │   │ Today: ranked outfits       │    │
│  │ (onboard) │   │ garments  │   │ with score + rationale      │    │
│  └─────┬─────┘   └─────┬─────┘   └──────────────▲──────────────┘    │
│        │               │                         │                   │
│        v               v                         │                   │
│  ┌──────────┐   ┌───────────┐            ┌───────┴────────┐         │
│  │BodyProfile│  │ Wardrobe  │───────────>│ POST /rank_outfits│       │
│  └──────────┘   │ (tagged)  │            │ (FastAPI)        │       │
│                 └───────────┘            └─────────────────┘        │
│                                                                      │
│  Expo Go (phone / simulator / web)       Python fit engine (laptop)  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | For Expo |
| Python | 3.11+ | For the fit engine |
| Expo Go | Latest | On phone, or use `--web` |
| IFM API key | — | From [platform.ifm.ai](https://platform.ifm.ai) |

---

## 1. Clone and checkout

```bash
git clone https://github.com/RocketRules/closyt.git
cd closyt
git checkout demo
```

---

## 2. Start the fit-scoring engine

```bash
cd services/outfit-creator

# One-time setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Set your IFM API key (raw key only — no "Bearer", no quotes)
cp .env.example .env
# Edit .env: IFM_API_KEY=sk-...

# Start (bind to all interfaces so a phone on LAN can reach it)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or use the helper script from the repo root:

```bash
./scripts/start-fit-engine.sh
```

### Verify the engine

```bash
curl http://127.0.0.1:8000/health
# {"status":"ok","ifm_api_key_configured":"true"}
```

Full smoke test (calls IFM, ~30s):

```bash
cd services/outfit-creator
source .venv/bin/activate
python scripts/demo_live_ifm.py
```

---

## 3. Start the Expo app

Open a **new terminal** in the repo root:

```bash
npm install

# Copy and edit .env
cp .env.example .env
```

Edit `.env` to set `EXPO_PUBLIC_FIT_ENGINE_URL`:

| Running on | Value |
|---|---|
| Simulator / `--web` | `http://127.0.0.1:8000` (default) |
| Physical phone (same Wi-Fi) | `http://<your-laptop-LAN-IP>:8000` |

Find your LAN IP: `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux).

```bash
npx expo start
# Press w for web, or scan the QR with Expo Go
```

---

## 4. Demo walkthrough

1. **Onboarding**: pick gender, age, height, weight → Next → take or skip photos → "I'm ready"
2. **Add clothes**: tap "Add items" → photograph each garment laid flat (or pick from library). You need **at least 1 top, 1 bottom, and 1 pair of shoes**.
3. **Today**: the app calls the fit engine. After ~30s you see ranked outfits with a **match %** and a written **rationale** from the scoring pipeline.
4. **Browse**: swipe through alternatives, tap "I'll wear this" to mark it.

---

## Architecture (Optimization track)

The scoring pipeline is **not** "LLM, rate this outfit 1-10". It's a five-stage hybrid:

1. **Attribute extraction** (IFM K2 Horizon, structured output) — one call per item, cached
2. **Outfit generation** (pure Python) — constrained slot-filling: required top/bottom/shoes, optional layer/outer, hard filters for formality spread and season clashes
3. **Deterministic scoring** (rule tables) — color harmony, formality consistency, pattern discipline, body-preference alignment
4. **LLM rubric** (K2 Horizon, temp 0, few-shot calibrated) — four named sub-scores on top-20 candidates only
5. **Blend + rank** — `final = 0.5 * deterministic + 0.5 * LLM_avg`, return top 10

The deterministic core (steps 2–3) is fully tested with `pytest` and produces correct rankings **without any LLM call**. The LLM rubric adds nuance but cannot override an obviously bad outfit.

```bash
cd services/outfit-creator
source .venv/bin/activate
pytest -q                               # 18 tests, all deterministic
python scripts/demo_deterministic.py    # top 10 from fixture wardrobe, no API key needed
```

---

## What's stubbed

| Feature | Status |
|---------|--------|
| Shopping links for missing pieces | Stub (placeholder copy only) |
| Try-on image rendering | Not in this repo |
| On-device garment classifier (TF.js) | Placeholder model. Works if you export Teachable Machine with **exact** labels `Shirt Tee Knitwear Jacket Trousers Jeans Shoes` into `assets/model/`. Without it, manual tagging works fine. |
| Socks slot | Optional (`ALLOW_MISSING_SOCKS = True`) since the main wardrobe has no sock category |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 503 from engine | `IFM_API_KEY` missing or invalid. Check `services/outfit-creator/.env`. Raw key only — no `Bearer` prefix, no quotes. |
| "Fit engine offline" on Today | Engine not running, or wrong URL. Check `EXPO_PUBLIC_FIT_ENGINE_URL` in root `.env`. |
| Empty outfits | Need ≥1 top (Shirt/Tee), ≥1 bottom (Trousers/Jeans), ≥1 Shoes in your wardrobe. |
| Phone can't connect | Use laptop's LAN IP, not `localhost`. Both devices must be on the same Wi-Fi. Check OS firewall allows port 8000. |
| CORS error in web | Engine should have CORS enabled. Restart it if you changed `main.py`. |
| Slow first rank (~30-60s) | Normal — each item needs one IFM extraction call. Subsequent ranks are faster (cached). |

---

## Repo layout

```
closyt/
  App.js                          # Expo entry — async ranking via fit engine
  src/
    screens/TodayScreen.js        # Ranked outfit cards + loading/error states
    logic/
      fitEngineClient.js          # HTTP client for POST /rank_outfits
      mapToFitEngine.js           # Closyt items → engine contract
      describeGarment.js          # ~5-word description from tags
      bodyProfile.js              # BMI, body type, style constraints (internal)
      recommend.js                # Original local scorer (kept for wardrobeStats)
      tagging.js                  # Camera → colour + category + description
      classifier.js               # TF.js on-device model (placeholder)
  services/
    outfit-creator/               # Python FastAPI hybrid scoring engine
      app/main.py                 # POST /rank_outfits
      app/schemas.py              # Pydantic I/O contract
      app/outfit_generation.py    # Constrained combinatorial generation
      app/deterministic_scoring.py# Rule-based color/formality/body scoring
      app/llm_rubric_scoring.py   # IFM K2 Horizon structured rubric
      app/ranking.py              # Blend + sort
      tests/                      # 18 pytest tests (all deterministic)
  scripts/
    start-fit-engine.sh           # One-command engine startup
    smoke-demo.sh                 # Health + rank smoke test
```

---

## Team

HackCMU 2026 — Optimization track.
