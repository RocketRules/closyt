"""Ranking blend + response contract (LLM injected / mocked)."""

from __future__ import annotations

from app.ranking import rank_outfits, rank_outfits_from_attributed
from app.schemas import (
    LlmRubricScores,
    RankRequest,
    RankResponse,
)
from tests.conftest import attributes_by_id, load_attributed_wardrobe, load_body, load_wardrobe_raw


def _fixed_llm(outfit, body) -> LlmRubricScores:
    # Deterministic mock: slight bump from number of navy/black pieces
    ids = [p.item.id for p in outfit]
    bump = 0.1 * sum(1 for i in ids if "navy" in i or "black" in i or "charcoal" in i or "derby" in i)
    base = 7.0 + bump
    return LlmRubricScores(
        color_harmony=min(10.0, base),
        style_cohesion=min(10.0, base - 0.2),
        formality_consistency=min(10.0, base - 0.1),
        body_flattery=min(10.0, base - 0.3),
        rationale="mock rubric: preference for cohesive dark formal pieces",
    )


def test_rank_response_schema_and_sort_order():
    body = load_body()
    attributed = load_attributed_wardrobe()
    response = rank_outfits_from_attributed(body, attributed, llm_scorer=_fixed_llm)
    assert isinstance(response, RankResponse)
    assert 1 <= len(response.outfits) <= 10
    scores = [o.final_score for o in response.outfits]
    assert scores == sorted(scores, reverse=True)
    for outfit in response.outfits:
        assert outfit.item_ids
        assert 0 <= outfit.final_score <= 10
        assert outfit.rationale
        b = outfit.breakdown
        assert 0 <= b.deterministic_base <= 10
        assert 0 <= b.color_harmony <= 10
        assert 0 <= b.style_cohesion <= 10
        assert 0 <= b.formality_consistency <= 10
        assert 0 <= b.body_flattery <= 10


def test_rank_outfits_with_precomputed_attributes():
    request = RankRequest(body=load_body(), items=load_wardrobe_raw())
    response = rank_outfits(
        request,
        precomputed_attributes=attributes_by_id(),
        llm_scorer=_fixed_llm,
    )
    dumped = response.model_dump()
    assert "outfits" in dumped
    assert dumped["outfits"][0]["item_ids"]


def test_blend_uses_both_signals():
    body = load_body()
    attributed = load_attributed_wardrobe()

    def low_llm(outfit, _body) -> LlmRubricScores:
        return LlmRubricScores(
            color_harmony=1.0,
            style_cohesion=1.0,
            formality_consistency=1.0,
            body_flattery=1.0,
            rationale="intentionally low",
        )

    def high_llm(outfit, _body) -> LlmRubricScores:
        return LlmRubricScores(
            color_harmony=10.0,
            style_cohesion=10.0,
            formality_consistency=10.0,
            body_flattery=10.0,
            rationale="intentionally high",
        )

    low = rank_outfits_from_attributed(body, attributed, llm_scorer=low_llm)
    high = rank_outfits_from_attributed(body, attributed, llm_scorer=high_llm)
    assert high.outfits[0].final_score > low.outfits[0].final_score
