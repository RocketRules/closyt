#!/usr/bin/env python3
"""Local demo: run deterministic ranking on fixture wardrobe (no LLM required)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.ranking import deterministic_only_preview  # noqa: E402
from tests.conftest import load_attributed_wardrobe, load_body  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Deterministic outfit ranking demo")
    parser.add_argument("--top", type=int, default=10, help="How many outfits to print")
    args = parser.parse_args()

    body = load_body()
    attributed = load_attributed_wardrobe()
    ranked = deterministic_only_preview(body, attributed, top_n=args.top)

    print(f"Body: {body.model_dump()}")
    print(f"Wardrobe items: {len(attributed)}")
    print(f"Top {len(ranked)} deterministic outfits:\n")
    for i, (ids, breakdown) in enumerate(ranked, start=1):
        print(f"{i:2d}. score={breakdown.deterministic_base:.3f}  items={ids}")
        print(
            f"    color={breakdown.color_harmony:.2f} "
            f"style={breakdown.style_cohesion:.2f} "
            f"formality={breakdown.formality_consistency:.2f} "
            f"flattery={breakdown.body_flattery:.2f}"
        )

    out_path = ROOT / "scripts" / "last_deterministic_run.json"
    payload = [
        {"rank": i, "item_ids": ids, "breakdown": breakdown.model_dump()}
        for i, (ids, breakdown) in enumerate(ranked, start=1)
    ]
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"\nWrote {out_path}")


if __name__ == "__main__":
    main()
