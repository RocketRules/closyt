#!/usr/bin/env python3
"""Live IFM smoke test: full pipeline (attribute extraction + LLM rubric).

Requires IFM_API_KEY in .env (raw key only — do not include the word Bearer).

Usage:
  python scripts/demo_live_ifm.py
  python scripts/demo_live_ifm.py --consistency
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env", override=True)

from app import config  # noqa: E402
from app.attribute_extraction import clear_attribute_cache  # noqa: E402
from app.ranking import RankingError, rank_outfits  # noqa: E402
from app.schemas import (  # noqa: E402
    BodyInfo,
    ClothingItem,
    ColorDepthPreference,
    FitPreference,
    Gender,
    RankRequest,
    SleevePreference,
)


def _normalize_key(raw: str) -> str:
    key = raw.strip().strip("\"'")
    if key.lower().startswith("bearer "):
        key = key[7:].strip()
    return key


def _require_key() -> None:
    key = _normalize_key(os.getenv("IFM_API_KEY", ""))
    if not key or key == "your_key_here":
        print(
            "FAIL: IFM_API_KEY missing or still set to placeholder.\n"
            "  1. cp .env.example .env\n"
            "  2. Set IFM_API_KEY=<raw key only>  (no 'Bearer', no quotes)\n"
            "  3. Re-run: python scripts/demo_live_ifm.py",
            file=sys.stderr,
        )
        sys.exit(2)
    # Put normalized key back so httpx clients see the clean value
    os.environ["IFM_API_KEY"] = key
    print(f"OK: IFM_API_KEY loaded (len={len(key)})")
    print(f"    model={config.IFM_MODEL_ID}  base={config.IFM_BASE_URL}")


def _sample_request() -> RankRequest:
    """Small wardrobe — enough for a real end-to-end call without huge cost/latency."""
    return RankRequest(
        body=BodyInfo(
            height_cm=175.0,
            weight_kg=72.0,
            age=22,
            gender=Gender.m,
            fit_preference=FitPreference.looser,
            sleeve_preference=SleevePreference.long,
            color_preference=ColorDepthPreference.darker,
        ),
        items=[
            ClothingItem(
                id="s1",
                category="shirt",
                description="navy oxford button-down shirt",
            ),
            ClothingItem(
                id="p1",
                category="pant",
                description="charcoal wool dress pants",
            ),
            ClothingItem(
                id="sh1",
                category="shoe",
                description="black leather derby shoes",
            ),
            ClothingItem(
                id="sk1",
                category="sock",
                description="black mid-calf dress socks",
            ),
        ],
    )


def _run_once(label: str) -> dict:
    clear_attribute_cache()
    req = _sample_request()
    print(f"\n[{label}] Calling full pipeline (extract → generate → score → LLM rubric)...")
    t0 = time.time()
    resp = rank_outfits(req)
    elapsed = time.time() - t0
    print(f"[{label}] OK in {elapsed:.1f}s — {len(resp.outfits)} outfit(s)")
    for i, outfit in enumerate(resp.outfits, start=1):
        print(f"  {i}. final={outfit.final_score:.3f}  items={outfit.item_ids}")
        b = outfit.breakdown
        print(
            f"     det={b.deterministic_base:.2f}  "
            f"color={b.color_harmony:.2f}  style={b.style_cohesion:.2f}  "
            f"formality={b.formality_consistency:.2f}  flattery={b.body_flattery:.2f}"
        )
        print(f"     rationale: {outfit.rationale[:160]}{'…' if len(outfit.rationale) > 160 else ''}")
    return {"elapsed_s": round(elapsed, 2), "response": resp.model_dump(mode="json")}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Live IFM smoke test for the Closet fit-scoring engine"
    )
    parser.add_argument(
        "--consistency",
        action="store_true",
        help="Run the same request twice and assert final scores within ±0.3",
    )
    args = parser.parse_args()

    _require_key()

    try:
        run_a = _run_once("run-1")
        payload: dict = {"run_1": run_a}

        if args.consistency:
            run_b = _run_once("run-2")
            payload["run_2"] = run_b
            outfits_a = run_a["response"]["outfits"]
            outfits_b = run_b["response"]["outfits"]
            if len(outfits_a) != len(outfits_b):
                print(
                    f"FAIL: outfit count mismatch ({len(outfits_a)} vs {len(outfits_b)})",
                    file=sys.stderr,
                )
                sys.exit(1)
            max_delta = 0.0
            for oa, ob in zip(outfits_a, outfits_b, strict=True):
                if oa["item_ids"] != ob["item_ids"]:
                    print(
                        f"FAIL: ranking order/ids differ:\n  {oa['item_ids']}\n  {ob['item_ids']}",
                        file=sys.stderr,
                    )
                    sys.exit(1)
                delta = abs(oa["final_score"] - ob["final_score"])
                max_delta = max(max_delta, delta)
                if delta > config.CONSISTENCY_TOLERANCE:
                    print(
                        f"FAIL: score drift {delta:.3f} > ±{config.CONSISTENCY_TOLERANCE} "
                        f"for {oa['item_ids']}",
                        file=sys.stderr,
                    )
                    sys.exit(1)
            print(
                f"\nCONSISTENCY OK: max |Δscore|={max_delta:.3f} "
                f"(tolerance ±{config.CONSISTENCY_TOLERANCE})"
            )
            payload["consistency"] = {
                "max_abs_delta": max_delta,
                "tolerance": config.CONSISTENCY_TOLERANCE,
                "passed": True,
            }

    except RankingError as exc:
        print(f"FAIL: ranking pipeline error: {exc}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL: unexpected error: {exc}", file=sys.stderr)
        sys.exit(1)

    out_path = ROOT / "scripts" / "last_live_ifm_run.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"\nPASS — wrote {out_path}")
    sys.exit(0)


if __name__ == "__main__":
    main()
