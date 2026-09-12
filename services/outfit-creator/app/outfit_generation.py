"""Step 2: constrained combinatorial outfit generation (no LLM)."""

from __future__ import annotations

from itertools import product

from app import config
from app.schemas import (
    BOTTOM_CATEGORIES,
    FOOTWEAR_CATEGORIES,
    ONEPIECE_CATEGORIES,
    OUTER_CATEGORIES,
    SOCK_CATEGORIES,
    SWEATER_CATEGORIES,
    TOP_CATEGORIES,
    UNDERWEAR_CATEGORIES,
    AttributedItem,
    ClothingAttributes,
)


def _by_slot(items: list[AttributedItem]) -> dict[str, list[AttributedItem]]:
    slots: dict[str, list[AttributedItem]] = {
        "top": [],
        "bottom": [],
        "onepiece": [],
        "footwear": [],
        "sock": [],
        "sweater": [],
        "outer": [],
        "underwear": [],
    }
    for it in items:
        cat = it.attributes.category
        if cat in TOP_CATEGORIES:
            slots["top"].append(it)
        elif cat in BOTTOM_CATEGORIES:
            slots["bottom"].append(it)
        elif cat in ONEPIECE_CATEGORIES:
            slots["onepiece"].append(it)
        elif cat in FOOTWEAR_CATEGORIES:
            slots["footwear"].append(it)
        elif cat in SOCK_CATEGORIES:
            slots["sock"].append(it)
        elif cat in SWEATER_CATEGORIES:
            slots["sweater"].append(it)
        elif cat in OUTER_CATEGORIES:
            slots["outer"].append(it)
        elif cat in UNDERWEAR_CATEGORIES:
            slots["underwear"].append(it)
    return slots


def _visible_attrs(pieces: list[AttributedItem]) -> list[ClothingAttributes]:
    """Underwear is required-optional kit, not a style/season constraint."""
    return [
        p.attributes
        for p in pieces
        if p.attributes.category not in UNDERWEAR_CATEGORIES
    ]


def _formality_ok(attrs: list[ClothingAttributes]) -> bool:
    if not attrs:
        return False
    tiers = [a.formality_tier for a in attrs]
    return (max(tiers) - min(tiers)) <= config.FORMALITY_MAX_SPREAD


def _season_ok(attrs: list[ClothingAttributes]) -> bool:
    """Reject if items have disjoint concrete seasons (ignoring 'all')."""
    concrete: list[set[str]] = []
    for a in attrs:
        tags = {t.lower() for t in a.season_tags}
        if not tags or tags == {"all"} or "all" in tags:
            continue
        concrete.append(tags)
    if len(concrete) < 2:
        return True
    overlap = concrete[0]
    for s in concrete[1:]:
        overlap = overlap & s
        if not overlap:
            return False
    return True


def _footwear_sock_ok(
    footwear: AttributedItem | None,
    sock: AttributedItem | None,
) -> bool:
    if footwear is None:
        return False
    if config.ALLOW_MISSING_SOCKS:
        return True
    # Formal footwear (tier >= 4) always needs socks; otherwise socks required by default.
    if sock is None:
        return False
    return True


def _optional_choices(items: list[AttributedItem]) -> list[AttributedItem | None]:
    """None = omit optional slot, else exactly one item."""
    return [None, *items]


def generate_outfits(items: list[AttributedItem]) -> list[list[AttributedItem]]:
    """Enumerate all feasible outfits under hard slot + filter constraints.

    Required slots:
      - (top + bottom) XOR onepiece/dress
      - footwear
      - socks (unless ALLOW_MISSING_SOCKS)
    Optional (max 1 each): sweater, outer (jacket|outerwear), underwear
    """
    if not items:
        return []

    slots = _by_slot(items)
    outfits: list[list[AttributedItem]] = []

    sweater_opts = _optional_choices(slots["sweater"])
    outer_opts = _optional_choices(slots["outer"])
    underwear_opts = _optional_choices(slots["underwear"])
    sock_opts: list[AttributedItem | None]
    if config.ALLOW_MISSING_SOCKS:
        sock_opts = _optional_choices(slots["sock"])
    else:
        sock_opts = list(slots["sock"])  # type: ignore[arg-type]
        if not sock_opts:
            return []

    if not slots["footwear"]:
        if not config.ALLOW_MISSING_FOOTWEAR:
            return []
        footwear_opts: list[AttributedItem | None] = [None]
    else:
        footwear_opts = list(slots["footwear"])

    # Path A: top + bottom
    for top, bottom, footwear, sock, sweater, outer, underwear in product(
        slots["top"],
        slots["bottom"],
        footwear_opts,
        sock_opts,
        sweater_opts,
        outer_opts,
        underwear_opts,
    ):
        pieces = [top, bottom]
        if footwear is not None:
            pieces.append(footwear)
        if sock is not None:
            pieces.append(sock)
        if sweater is not None:
            pieces.append(sweater)
        if outer is not None:
            pieces.append(outer)
        if underwear is not None:
            pieces.append(underwear)

        if footwear is not None and not _footwear_sock_ok(footwear, sock if isinstance(sock, AttributedItem) else None):
            continue
        attrs = _visible_attrs(pieces)
        if not _formality_ok(attrs):
            continue
        if not _season_ok(attrs):
            continue
        outfits.append(pieces)

    # Path B: onepiece / dress (no separate bottom)
    for onepiece, footwear, sock, sweater, outer, underwear in product(
        slots["onepiece"],
        footwear_opts,
        sock_opts,
        sweater_opts,
        outer_opts,
        underwear_opts,
    ):
        pieces = [onepiece]
        if footwear is not None:
            pieces.append(footwear)
        if sock is not None:
            pieces.append(sock)
        if sweater is not None:
            pieces.append(sweater)
        if outer is not None:
            pieces.append(outer)
        if underwear is not None:
            pieces.append(underwear)

        if footwear is not None and not _footwear_sock_ok(footwear, sock if isinstance(sock, AttributedItem) else None):
            continue
        attrs = _visible_attrs(pieces)
        if not _formality_ok(attrs):
            continue
        if not _season_ok(attrs):
            continue
        outfits.append(pieces)

    return outfits


def count_candidates(items: list[AttributedItem]) -> int:
    return len(generate_outfits(items))
