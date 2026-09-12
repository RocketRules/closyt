"""Deterministic scoring — no LLM calls."""

from __future__ import annotations

from app.deterministic_scoring import (
    rank_deterministically,
    score_color_harmony,
    score_formality_consistency,
    score_outfit,
)
from app.outfit_generation import generate_outfits
from app.schemas import AttributedItem
from tests.conftest import load_attributed_wardrobe, load_body


def _by_id(items: list[AttributedItem]) -> dict[str, AttributedItem]:
    return {i.item.id: i for i in items}


def _pick(ids: list[str], catalog: dict[str, AttributedItem]) -> list[AttributedItem]:
    return [catalog[i] for i in ids]


def test_good_outfit_beats_bad_outfit():
    catalog = _by_id(load_attributed_wardrobe())
    body = load_body()

    good = _pick(
        [
            "shirt_navy_oxford",
            "pant_charcoal_wool",
            "shoe_leather_derby",
            "sock_black_dress",
            "jacket_navy_blazer",
        ],
        catalog,
    )
    bad = _pick(
        [
            "shirt_neon_graphic",
            "pant_charcoal_wool",
            "shoe_white_sneaker",
            "sock_black_dress",
        ],
        catalog,
    )

    good_score = score_outfit(good, body)
    bad_score = score_outfit(bad, body)
    assert good_score.deterministic_base > bad_score.deterministic_base + 1.0
    assert good_score.color_harmony > bad_score.color_harmony
    assert good_score.formality_consistency >= bad_score.formality_consistency


def test_color_clash_scores_lower_than_navy_white():
    catalog = _by_id(load_attributed_wardrobe())
    harmonious = _pick(
        ["shirt_navy_oxford", "pant_indigo_jeans", "shoe_white_sneaker", "sock_white_athletic"],
        catalog,
    )
    clashing = _pick(
        ["shirt_neon_graphic", "pant_indigo_jeans", "shoe_white_sneaker", "sock_white_athletic"],
        catalog,
    )
    assert score_color_harmony(harmonious) > score_color_harmony(clashing)


def test_formality_spread_affects_score():
    catalog = _by_id(load_attributed_wardrobe())
    tight = _pick(
        ["shirt_navy_oxford", "pant_charcoal_wool", "shoe_leather_derby", "sock_black_dress"],
        catalog,
    )
    wider = _pick(
        ["shirt_white_tee", "pant_charcoal_wool", "shoe_leather_derby", "sock_black_dress"],
        catalog,
    )
    assert score_formality_consistency(tight) > score_formality_consistency(wider)


def test_rank_deterministically_orders_descending():
    body = load_body()
    items = load_attributed_wardrobe()
    outfits = generate_outfits(items)
    ranked = rank_deterministically(outfits, body, top_n=20)
    assert ranked
    scores = [b.deterministic_base for _, b in ranked]
    assert scores == sorted(scores, reverse=True)
    assert len(ranked) <= 20


def test_obviously_good_ranks_above_obviously_bad_in_full_set():
    body = load_body()
    catalog = _by_id(load_attributed_wardrobe())
    items = load_attributed_wardrobe()
    outfits = generate_outfits(items)
    ranked = rank_deterministically(outfits, body, top_n=len(outfits))

    def ids_of(outfit: list[AttributedItem]) -> frozenset[str]:
        return frozenset(p.item.id for p in outfit)

    good_ids = frozenset(
        {
            "shirt_navy_oxford",
            "pant_charcoal_wool",
            "shoe_leather_derby",
            "sock_black_dress",
            "jacket_navy_blazer",
        }
    )
    # Find best score among outfits that are a superset of a strong core
    # vs outfits that include the neon clash tee with formal pants.
    good_scores = [
        b.deterministic_base
        for o, b in ranked
        if good_ids.issubset(ids_of(o))
    ]
    bad_scores = [
        b.deterministic_base
        for o, b in ranked
        if {"shirt_neon_graphic", "pant_charcoal_wool"}.issubset(ids_of(o))
    ]
    # Formality filter may drop neon+charcoal entirely; if present, must score lower.
    if good_scores and bad_scores:
        assert max(good_scores) > max(bad_scores)

    # Always: top outfit should not include neon graphic + dress pants together
    top_ids = ids_of(ranked[0][0])
    assert not ({"shirt_neon_graphic", "pant_charcoal_wool"} <= top_ids)
    # Sanity: top score is high
    assert ranked[0][1].deterministic_base >= 6.0
    # Reference good combo if generated should land in top half
    if good_scores:
        good_best = max(good_scores)
        median = scores_median([b.deterministic_base for _, b in ranked])
        assert good_best >= median


def scores_median(vals: list[float]) -> float:
    s = sorted(vals)
    mid = len(s) // 2
    if len(s) % 2:
        return s[mid]
    return (s[mid - 1] + s[mid]) / 2.0
