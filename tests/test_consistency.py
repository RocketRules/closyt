"""Reliability: same input twice -> near-identical scores."""

from __future__ import annotations

from app import config
from app.deterministic_scoring import rank_deterministically, score_outfit
from app.outfit_generation import generate_outfits
from app.ranking import rank_outfits_from_attributed
from app.schemas import LlmRubricScores
from tests.conftest import load_attributed_wardrobe, load_body


def _stable_llm(outfit, body) -> LlmRubricScores:
    """Temperature-0 stand-in: pure function of item ids (no randomness)."""
    ids = tuple(sorted(p.item.id for p in outfit))
    seed = sum(ord(c) for c in "".join(ids)) % 100
    base = 5.0 + (seed / 100.0) * 4.0
    return LlmRubricScores(
        color_harmony=round(base, 4),
        style_cohesion=round(base - 0.1, 4),
        formality_consistency=round(base + 0.1, 4),
        body_flattery=round(base - 0.05, 4),
        rationale=f"stable mock for {ids}",
    )


def test_deterministic_scores_are_bit_identical_across_runs():
    body = load_body()
    items = load_attributed_wardrobe()
    outfits = generate_outfits(items)

    run_a = [(tuple(p.item.id for p in o), score_outfit(o, body)) for o in outfits]
    run_b = [(tuple(p.item.id for p in o), score_outfit(o, body)) for o in outfits]
    assert run_a == run_b


def test_full_pipeline_consistency_within_tolerance():
    body = load_body()
    attributed = load_attributed_wardrobe()

    a = rank_outfits_from_attributed(body, attributed, llm_scorer=_stable_llm)
    b = rank_outfits_from_attributed(body, attributed, llm_scorer=_stable_llm)

    assert len(a.outfits) == len(b.outfits)
    assert [o.item_ids for o in a.outfits] == [o.item_ids for o in b.outfits]
    for oa, ob in zip(a.outfits, b.outfits, strict=True):
        assert abs(oa.final_score - ob.final_score) <= config.CONSISTENCY_TOLERANCE
        assert oa.breakdown.deterministic_base == ob.breakdown.deterministic_base


def test_rank_deterministically_stable_ordering():
    body = load_body()
    outfits = generate_outfits(load_attributed_wardrobe())
    a = rank_deterministically(outfits, body, top_n=20)
    b = rank_deterministically(outfits, body, top_n=20)
    assert [tuple(p.item.id for p in o) for o, _ in a] == [
        tuple(p.item.id for p in o) for o, _ in b
    ]
    assert [s.deterministic_base for _, s in a] == [s.deterministic_base for _, s in b]
