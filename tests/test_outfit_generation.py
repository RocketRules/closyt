"""Outfit generation — pure Python, no LLM."""

from __future__ import annotations

from app import config
from app.outfit_generation import count_candidates, generate_outfits
from tests.conftest import load_attributed_wardrobe


def test_fixture_wardrobe_produces_sane_candidate_count():
    items = load_attributed_wardrobe()
    outfits = generate_outfits(items)
    n = len(outfits)
    # Small wardrobe should brute-force without exploding; still produce options.
    assert 10 <= n <= 5000, f"unexpected candidate count: {n}"
    assert count_candidates(items) == n


def test_every_outfit_has_required_slots():
    outfits = generate_outfits(load_attributed_wardrobe())
    assert outfits
    for outfit in outfits:
        cats = {p.attributes.category for p in outfit}
        has_onepiece = bool(cats & {"onepiece", "dress"})
        has_top_bottom = "shirt" in cats and bool(cats & {"pant", "short"})
        assert has_onepiece or has_top_bottom
        if has_onepiece:
            assert "pant" not in cats and "short" not in cats
            assert "shirt" not in cats
        assert "shoe" in cats
        if not config.ALLOW_MISSING_SOCKS:
            assert "sock" in cats
        # optional caps
        assert sum(1 for c in cats if c in {"jacket", "outerwear"}) <= 1
        assert sum(1 for c in cats if c == "sweater") <= 1


def test_formality_hard_filter_rejects_extreme_mismatch():
    """Visible pieces must stay within FORMALITY_MAX_SPREAD.

    Underwear is excluded from the formality hard filter (kit, not style).
    Charcoal pants (5) + white sneakers (1) must never co-occur.
    """
    outfits = generate_outfits(load_attributed_wardrobe())
    for outfit in outfits:
        tiers = [
            p.attributes.formality_tier
            for p in outfit
            if p.attributes.category != "underwear"
        ]
        assert max(tiers) - min(tiers) <= config.FORMALITY_MAX_SPREAD
        ids = {p.item.id for p in outfit}
        assert not (
            "pant_charcoal_wool" in ids and "shoe_white_sneaker" in ids
        )


def test_season_hard_filter_rejects_disjoint_seasons():
    """Summer-only neon tee + winter-only parka should never co-occur without overlap."""
    outfits = generate_outfits(load_attributed_wardrobe())
    for outfit in outfits:
        ids = {p.item.id for p in outfit}
        assert not (
            "shirt_neon_graphic" in ids and "outerwear_olive_parka" in ids
        ), "summer-only tee should not pair with winter-only parka"


def test_missing_footwear_yields_zero_outfits():
    items = [
        a
        for a in load_attributed_wardrobe()
        if a.attributes.category != "shoe"
    ]
    assert generate_outfits(items) == []


def test_onepiece_path_does_not_require_bottom():
    dress = next(a for a in load_attributed_wardrobe() if a.item.id == "dress_burgundy_midi")
    shoe = next(a for a in load_attributed_wardrobe() if a.item.id == "shoe_white_sneaker")
    sock = next(a for a in load_attributed_wardrobe() if a.item.id == "sock_white_athletic")
    outfits = generate_outfits([dress, shoe, sock])
    assert len(outfits) >= 1
    assert all("dress" in {p.attributes.category for p in o} for o in outfits)
    assert all("pant" not in {p.attributes.category for p in o} for o in outfits)


def test_at_most_one_outer_layer():
    """Two outers in wardrobe should never both appear in one outfit."""
    items = load_attributed_wardrobe()
    outfits = generate_outfits(items)
    for outfit in outfits:
        outers = [p for p in outfit if p.attributes.category in {"jacket", "outerwear"}]
        assert len(outers) <= 1
