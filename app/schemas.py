"""Strict I/O contract for the Closet fit-scoring engine.

Provisional enums are locked so teammates can integrate; rename once confirmed.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Clothing categories (provisional — confirmed draft from CV teammate)
# ---------------------------------------------------------------------------
ClothingCategory = Literal[
    "sock",
    "shoe",
    "shirt",
    "pant",
    "short",
    "jacket",
    "sweater",
    "underwear",
    "outerwear",
    "onepiece",
    "dress",
]

CATEGORY_VALUES: tuple[str, ...] = (
    "sock",
    "shoe",
    "shirt",
    "pant",
    "short",
    "jacket",
    "sweater",
    "underwear",
    "outerwear",
    "onepiece",
    "dress",
)

TOP_CATEGORIES: frozenset[str] = frozenset({"shirt"})
BOTTOM_CATEGORIES: frozenset[str] = frozenset({"pant", "short"})
ONEPIECE_CATEGORIES: frozenset[str] = frozenset({"onepiece", "dress"})
FOOTWEAR_CATEGORIES: frozenset[str] = frozenset({"shoe"})
SOCK_CATEGORIES: frozenset[str] = frozenset({"sock"})
SWEATER_CATEGORIES: frozenset[str] = frozenset({"sweater"})
OUTER_CATEGORIES: frozenset[str] = frozenset({"jacket", "outerwear"})
UNDERWEAR_CATEGORIES: frozenset[str] = frozenset({"underwear"})


class FitPreference(str, Enum):
    """Prefer tighter vs looser garments (body-classification teammate)."""

    tighter = "tighter"
    looser = "looser"


class SleevePreference(str, Enum):
    long = "long"
    short = "short"


class ColorDepthPreference(str, Enum):
    lighter = "lighter"
    darker = "darker"


class Gender(str, Enum):
    m = "m"
    f = "f"


class Pattern(str, Enum):
    solid = "solid"
    striped = "striped"
    plaid = "plaid"
    floral = "floral"
    graphic = "graphic"
    other = "other"


class LayerType(str, Enum):
    base = "base"
    mid = "mid"
    outer = "outer"
    footwear = "footwear"
    accessory = "accessory"
    underwear = "underwear"
    onepiece = "onepiece"


class PrimaryColor(str, Enum):
    """Coarse palette for rule-based color harmony."""

    black = "black"
    white = "white"
    gray = "gray"
    navy = "navy"
    blue = "blue"
    light_blue = "light_blue"
    red = "red"
    burgundy = "burgundy"
    green = "green"
    olive = "olive"
    brown = "brown"
    beige = "beige"
    tan = "tan"
    cream = "cream"
    yellow = "yellow"
    orange = "orange"
    pink = "pink"
    purple = "purple"
    khaki = "khaki"
    denim = "denim"


# ---------------------------------------------------------------------------
# Input
# ---------------------------------------------------------------------------
class BodyInfo(BaseModel):
    """Body + preference signal from the body-classification teammate.

    Provisional: no A/B/C/D size_class — preferences + biometrics instead.
    """

    height_cm: float = Field(..., gt=0, description="Height in centimeters")
    weight_kg: float = Field(..., gt=0, description="Weight in kilograms")
    age: int = Field(..., ge=0, le=120)
    gender: Gender
    fit_preference: FitPreference
    sleeve_preference: SleevePreference
    color_preference: ColorDepthPreference


class ClothingItem(BaseModel):
    id: str = Field(..., min_length=1)
    category: ClothingCategory
    description: str = Field(..., min_length=1, description="~5-word raw CV description")


class RankRequest(BaseModel):
    body: BodyInfo
    items: list[ClothingItem] = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Internal structured attributes (LLM extraction output)
# ---------------------------------------------------------------------------
class ClothingAttributes(BaseModel):
    """Structured attributes extracted once per item (cached by item id)."""

    item_id: str
    category: ClothingCategory
    primary_color: PrimaryColor
    secondary_color: PrimaryColor | None = None
    pattern: Pattern = Pattern.solid
    formality_tier: int = Field(..., ge=1, le=5)
    season_tags: list[str] = Field(default_factory=lambda: ["all"])
    layer_type: LayerType
    # Optional fit cues for body-flattery rules (LLM may fill; fixtures can set)
    fit_hint: FitPreference | None = None
    sleeve_hint: SleevePreference | None = None
    color_depth: ColorDepthPreference | None = None

    @field_validator("season_tags")
    @classmethod
    def normalize_seasons(cls, v: list[str]) -> list[str]:
        if not v:
            return ["all"]
        return [s.lower() for s in v]


class AttributedItem(BaseModel):
    """Clothing item paired with extracted attributes (pipeline working unit)."""

    item: ClothingItem
    attributes: ClothingAttributes


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
class ScoreBreakdown(BaseModel):
    deterministic_base: float = Field(..., ge=0, le=10)
    color_harmony: float = Field(..., ge=0, le=10)
    style_cohesion: float = Field(..., ge=0, le=10)
    formality_consistency: float = Field(..., ge=0, le=10)
    body_flattery: float = Field(..., ge=0, le=10)


class RankedOutfit(BaseModel):
    item_ids: list[str]
    final_score: float = Field(..., ge=0, le=10)
    breakdown: ScoreBreakdown
    rationale: str


class RankResponse(BaseModel):
    outfits: list[RankedOutfit]  # sorted descending by final_score


# ---------------------------------------------------------------------------
# LLM rubric sub-scores (structured response only)
# ---------------------------------------------------------------------------
class LlmRubricScores(BaseModel):
    color_harmony: float = Field(..., ge=0, le=10)
    style_cohesion: float = Field(..., ge=0, le=10)
    formality_consistency: float = Field(..., ge=0, le=10)
    body_flattery: float = Field(..., ge=0, le=10)
    rationale: str = Field(..., min_length=1)

    @property
    def average(self) -> float:
        return (
            self.color_harmony
            + self.style_cohesion
            + self.formality_consistency
            + self.body_flattery
        ) / 4.0
