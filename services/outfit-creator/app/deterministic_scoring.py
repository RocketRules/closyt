"""Step 3: rule-based color / formality / body-flattery scoring (no LLM)."""

from __future__ import annotations

from app import config
from app.schemas import (
    AttributedItem,
    BodyInfo,
    ColorDepthPreference,
    FitPreference,
    PrimaryColor,
    ScoreBreakdown,
    SleevePreference,
)

# Complementary / analogous pairs that score well together (unordered).
_HARMONY_PAIRS: frozenset[frozenset[PrimaryColor]] = frozenset(
    {
        frozenset({PrimaryColor.navy, PrimaryColor.white}),
        frozenset({PrimaryColor.navy, PrimaryColor.gray}),
        frozenset({PrimaryColor.navy, PrimaryColor.beige}),
        frozenset({PrimaryColor.navy, PrimaryColor.cream}),
        frozenset({PrimaryColor.black, PrimaryColor.white}),
        frozenset({PrimaryColor.black, PrimaryColor.gray}),
        frozenset({PrimaryColor.black, PrimaryColor.red}),
        frozenset({PrimaryColor.denim, PrimaryColor.white}),
        frozenset({PrimaryColor.denim, PrimaryColor.gray}),
        frozenset({PrimaryColor.denim, PrimaryColor.navy}),
        frozenset({PrimaryColor.denim, PrimaryColor.black}),
        frozenset({PrimaryColor.olive, PrimaryColor.beige}),
        frozenset({PrimaryColor.olive, PrimaryColor.brown}),
        frozenset({PrimaryColor.olive, PrimaryColor.cream}),
        frozenset({PrimaryColor.brown, PrimaryColor.cream}),
        frozenset({PrimaryColor.brown, PrimaryColor.beige}),
        frozenset({PrimaryColor.khaki, PrimaryColor.navy}),
        frozenset({PrimaryColor.khaki, PrimaryColor.white}),
        frozenset({PrimaryColor.burgundy, PrimaryColor.navy}),
        frozenset({PrimaryColor.burgundy, PrimaryColor.gray}),
        frozenset({PrimaryColor.burgundy, PrimaryColor.beige}),
        frozenset({PrimaryColor.blue, PrimaryColor.white}),
        frozenset({PrimaryColor.light_blue, PrimaryColor.navy}),
        frozenset({PrimaryColor.light_blue, PrimaryColor.khaki}),
        frozenset({PrimaryColor.tan, PrimaryColor.navy}),
        frozenset({PrimaryColor.tan, PrimaryColor.white}),
        frozenset({PrimaryColor.green, PrimaryColor.beige}),
        frozenset({PrimaryColor.pink, PrimaryColor.navy}),
        frozenset({PrimaryColor.pink, PrimaryColor.gray}),
    }
)

_CLASH_PAIRS: frozenset[frozenset[PrimaryColor]] = frozenset(
    {
        frozenset({PrimaryColor.red, PrimaryColor.orange}),
        frozenset({PrimaryColor.red, PrimaryColor.pink}),
        frozenset({PrimaryColor.orange, PrimaryColor.pink}),
        frozenset({PrimaryColor.purple, PrimaryColor.orange}),
        frozenset({PrimaryColor.yellow, PrimaryColor.pink}),
        frozenset({PrimaryColor.yellow, PrimaryColor.purple}),
        frozenset({PrimaryColor.green, PrimaryColor.red}),
        frozenset({PrimaryColor.burgundy, PrimaryColor.orange}),
    }
)

_NEUTRALS: frozenset[PrimaryColor] = frozenset(
    {
        PrimaryColor.black,
        PrimaryColor.white,
        PrimaryColor.gray,
        PrimaryColor.navy,
        PrimaryColor.beige,
        PrimaryColor.cream,
        PrimaryColor.tan,
        PrimaryColor.brown,
        PrimaryColor.khaki,
    }
)

_LIGHT_COLORS: frozenset[PrimaryColor] = frozenset(
    {
        PrimaryColor.white,
        PrimaryColor.cream,
        PrimaryColor.beige,
        PrimaryColor.tan,
        PrimaryColor.light_blue,
        PrimaryColor.yellow,
        PrimaryColor.pink,
    }
)

_DARK_COLORS: frozenset[PrimaryColor] = frozenset(
    {
        PrimaryColor.black,
        PrimaryColor.navy,
        PrimaryColor.burgundy,
        PrimaryColor.brown,
        PrimaryColor.olive,
        PrimaryColor.purple,
    }
)


def score_color_harmony(outfit: list[AttributedItem]) -> float:
    colors = [p.attributes.primary_color for p in outfit]
    if len(colors) < 2:
        return 7.0

    unique = list(dict.fromkeys(colors))
    clash_hits = 0
    harmony_hits = 0
    for i in range(len(unique)):
        for j in range(i + 1, len(unique)):
            pair = frozenset({unique[i], unique[j]})
            if pair in _CLASH_PAIRS:
                clash_hits += 1
            if pair in _HARMONY_PAIRS:
                harmony_hits += 1

    non_neutral = [c for c in unique if c not in _NEUTRALS]
    # Monochrome / all-neutral outfits are safe and polished.
    if len(non_neutral) == 0:
        base = 8.5
    elif len(non_neutral) == 1:
        base = 8.0
    elif len(non_neutral) == 2:
        base = 7.0
    else:
        base = 5.0

    score = base + 0.6 * harmony_hits - 2.0 * clash_hits
    # Soft penalty for many distinct hues
    score -= max(0, len(unique) - 4) * 0.5
    return _clamp(score)


def score_formality_consistency(outfit: list[AttributedItem]) -> float:
    tiers = [p.attributes.formality_tier for p in outfit]
    spread = max(tiers) - min(tiers)
    # spread 0 -> 10, spread 1 -> 8.5, spread 2 -> 6.5, higher shouldn't appear (filtered)
    table = {0: 10.0, 1: 8.5, 2: 6.5, 3: 4.0, 4: 2.0}
    return table.get(spread, 2.0)


def score_style_cohesion(outfit: list[AttributedItem]) -> float:
    """Pattern discipline + layer sanity (not LLM)."""
    patterns = [p.attributes.pattern.value for p in outfit]
    non_solid = [p for p in patterns if p != "solid"]
    if len(non_solid) == 0:
        pattern_score = 9.0
    elif len(non_solid) == 1:
        pattern_score = 8.0
    elif len(non_solid) == 2:
        pattern_score = 5.5
    else:
        pattern_score = 3.5

    layers = [p.attributes.layer_type.value for p in outfit]
    # Penalize duplicate competing mid/outer layers (generation already caps, but keep soft check)
    mid_count = layers.count("mid")
    outer_count = layers.count("outer")
    layer_penalty = 0.0
    if mid_count > 1:
        layer_penalty += 1.5 * (mid_count - 1)
    if outer_count > 1:
        layer_penalty += 1.5 * (outer_count - 1)

    return _clamp(pattern_score - layer_penalty)


def score_body_flattery(outfit: list[AttributedItem], body: BodyInfo) -> float:
    """Positive preference alignment — never body-shaming language or harsh floors."""
    scores: list[float] = []

    for piece in outfit:
        attr = piece.attributes
        piece_score = 7.5  # neutral baseline

        if attr.fit_hint is not None:
            if attr.fit_hint == body.fit_preference:
                piece_score += 1.5
            else:
                piece_score -= 0.8

        if attr.sleeve_hint is not None and attr.category in {"shirt", "sweater", "jacket", "outerwear", "onepiece", "dress"}:
            if attr.sleeve_hint == body.sleeve_preference:
                piece_score += 1.0
            else:
                piece_score -= 0.5

        depth = attr.color_depth
        if depth is None:
            if attr.primary_color in _LIGHT_COLORS:
                depth = ColorDepthPreference.lighter
            elif attr.primary_color in _DARK_COLORS:
                depth = ColorDepthPreference.darker

        if depth is not None:
            if depth == body.color_preference:
                piece_score += 1.0
            else:
                piece_score -= 0.4

        # Soft silhouette cue from height/weight ratio (BMI-ish), framed as preference only
        bmi = body.weight_kg / ((body.height_cm / 100.0) ** 2)
        if body.fit_preference == FitPreference.looser and attr.fit_hint == FitPreference.tighter:
            piece_score -= 0.3
        if body.fit_preference == FitPreference.tighter and bmi >= 27 and attr.category in {"shirt", "onepiece", "dress"}:
            # prefer structured pieces when user asked for tighter — slight bump if mid formality
            if attr.formality_tier >= 2:
                piece_score += 0.2

        if body.sleeve_preference == SleevePreference.short and attr.sleeve_hint == SleevePreference.long:
            piece_score -= 0.2

        scores.append(_clamp(piece_score))

    if not scores:
        return 7.0
    return _clamp(sum(scores) / len(scores))


def score_outfit(
    outfit: list[AttributedItem],
    body: BodyInfo,
) -> ScoreBreakdown:
    color = score_color_harmony(outfit)
    style = score_style_cohesion(outfit)
    formality = score_formality_consistency(outfit)
    flattery = score_body_flattery(outfit, body)

    deterministic_base = (
        config.COLOR_HARMONY_WEIGHT * color
        + config.STYLE_COHESION_WEIGHT * style
        + config.FORMALITY_CONSISTENCY_WEIGHT * formality
        + config.BODY_FLATTERY_WEIGHT * flattery
    )
    return ScoreBreakdown(
        deterministic_base=_clamp(deterministic_base),
        color_harmony=color,
        style_cohesion=style,
        formality_consistency=formality,
        body_flattery=flattery,
    )


def rank_deterministically(
    outfits: list[list[AttributedItem]],
    body: BodyInfo,
    top_n: int | None = None,
) -> list[tuple[list[AttributedItem], ScoreBreakdown]]:
    """Score all outfits and return top_n by deterministic_base descending."""
    n = top_n if top_n is not None else config.DETERMINISTIC_TOP_N
    scored = [(outfit, score_outfit(outfit, body)) for outfit in outfits]
    scored.sort(key=lambda x: x[1].deterministic_base, reverse=True)
    return scored[:n]


def _clamp(value: float) -> float:
    return max(config.SCORE_MIN, min(config.SCORE_MAX, round(value, 4)))
