"""Step 5: blend deterministic + LLM rubric scores and return ranked outfits."""

from __future__ import annotations

from app import config
from app.attribute_extraction import LlmUnavailableError as AttrLlmError
from app.attribute_extraction import extract_attributes
from app.deterministic_scoring import rank_deterministically, score_outfit
from app.llm_rubric_scoring import LlmUnavailableError as RubricLlmError
from app.llm_rubric_scoring import score_outfit_rubric
from app.outfit_generation import generate_outfits
from app.schemas import (
    AttributedItem,
    BodyInfo,
    ClothingAttributes,
    ClothingItem,
    LlmRubricScores,
    RankedOutfit,
    RankRequest,
    RankResponse,
    ScoreBreakdown,
)


class RankingError(RuntimeError):
    """Hard failure for the ranking pipeline (including missing LLM)."""


def _blend(deterministic_base: float, llm_avg: float) -> float:
    return round(
        config.DETERMINISTIC_WEIGHT * deterministic_base
        + config.LLM_RUBRIC_WEIGHT * llm_avg,
        4,
    )


def _merge_breakdown(
    det: ScoreBreakdown,
    llm: LlmRubricScores,
) -> ScoreBreakdown:
    """Expose LLM sub-scores in the public breakdown; keep deterministic_base from rules."""
    return ScoreBreakdown(
        deterministic_base=det.deterministic_base,
        color_harmony=llm.color_harmony,
        style_cohesion=llm.style_cohesion,
        formality_consistency=llm.formality_consistency,
        body_flattery=llm.body_flattery,
    )


def attribute_items(
    items: list[ClothingItem],
    *,
    precomputed: dict[str, ClothingAttributes] | None = None,
) -> list[AttributedItem]:
    """Attach attributes via precomputed map (tests) or live LLM extraction."""
    attributed: list[AttributedItem] = []
    for item in items:
        if precomputed is not None and item.id in precomputed:
            attrs = precomputed[item.id]
        else:
            try:
                attrs = extract_attributes(item)
            except AttrLlmError as exc:
                raise RankingError(str(exc)) from exc
        attributed.append(AttributedItem(item=item, attributes=attrs))
    return attributed


def rank_outfits_from_attributed(
    body: BodyInfo,
    attributed: list[AttributedItem],
    *,
    llm_scorer=None,
    response_top_n: int | None = None,
    deterministic_top_n: int | None = None,
) -> RankResponse:
    """Core ranking given already-attributed items.

    ``llm_scorer`` injectable for tests: (outfit, body) -> LlmRubricScores.
    When omitted, calls the real IFM rubric (fails hard if unavailable).
    """
    candidates = generate_outfits(attributed)
    if not candidates:
        return RankResponse(outfits=[])

    top = rank_deterministically(
        candidates,
        body,
        top_n=deterministic_top_n or config.DETERMINISTIC_TOP_N,
    )

    scorer = llm_scorer or score_outfit_rubric
    ranked: list[RankedOutfit] = []
    for outfit, det in top:
        try:
            llm = scorer(outfit, body)
        except RubricLlmError as exc:
            raise RankingError(str(exc)) from exc
        except AttrLlmError as exc:
            raise RankingError(str(exc)) from exc

        final = _blend(det.deterministic_base, llm.average)
        ranked.append(
            RankedOutfit(
                item_ids=[p.item.id for p in outfit],
                final_score=final,
                breakdown=_merge_breakdown(det, llm),
                rationale=llm.rationale,
            )
        )

    ranked.sort(key=lambda o: o.final_score, reverse=True)
    n = response_top_n if response_top_n is not None else config.RESPONSE_TOP_N
    return RankResponse(outfits=ranked[:n])


def rank_outfits(
    request: RankRequest,
    *,
    precomputed_attributes: dict[str, ClothingAttributes] | None = None,
    llm_scorer=None,
) -> RankResponse:
    """Full pipeline: extract -> generate -> deterministic -> LLM rubric -> blend."""
    attributed = attribute_items(
        request.items,
        precomputed=precomputed_attributes,
    )
    return rank_outfits_from_attributed(
        request.body,
        attributed,
        llm_scorer=llm_scorer,
    )


def deterministic_only_preview(
    body: BodyInfo,
    attributed: list[AttributedItem],
    *,
    top_n: int | None = None,
) -> list[tuple[list[str], ScoreBreakdown]]:
    """Helper for local demos/tests without LLM — not used by the HTTP API."""
    candidates = generate_outfits(attributed)
    top = rank_deterministically(candidates, body, top_n=top_n)
    return [([p.item.id for p in outfit], breakdown) for outfit, breakdown in top]
