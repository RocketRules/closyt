"""Named constants for weights, thresholds, and slot rules.

Provisional enums and knobs — confirm with teammates / IFM docs as needed.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# IFM K2 Horizon (OpenAI-compatible Chat Completions)
# ---------------------------------------------------------------------------
IFM_BASE_URL = "https://api.ifm.ai/v1"
IFM_MODEL_ID = "IFM/K2-Horizon-375B-A23B"
IFM_TEMPERATURE = 0.0

# ---------------------------------------------------------------------------
# Ranking / pipeline knobs
# ---------------------------------------------------------------------------
DETERMINISTIC_TOP_N = 20  # candidates passed to LLM rubric scoring
RESPONSE_TOP_N = 10  # outfits returned in RankResponse
DETERMINISTIC_WEIGHT = 0.5
LLM_RUBRIC_WEIGHT = 0.5
CONSISTENCY_TOLERANCE = 0.3  # max |score_a - score_b| for reliability tests

# ---------------------------------------------------------------------------
# Outfit generation — slots & hard filters
# ---------------------------------------------------------------------------
# Required: top XOR onepiece/dress; bottom if not onepiece; footwear; socks.
# Optional: at most one sweater, at most one outer layer (jacket|outerwear),
#           at most one underwear item.
FORMALITY_MAX_SPREAD = 2  # reject if max(formality) - min(formality) > this
ALLOW_MISSING_SOCKS = True  # Closyt main wardrobe has no socks category
ALLOW_MISSING_FOOTWEAR = True  # Allow outfits without shoes for limited wardrobes

# Season tags used by CV descriptions / attribute extraction
SEASON_TAGS = ("spring", "summer", "fall", "winter", "all")

# ---------------------------------------------------------------------------
# Deterministic scoring weights (sum to 1.0 within deterministic_base)
# ---------------------------------------------------------------------------
COLOR_HARMONY_WEIGHT = 0.35
STYLE_COHESION_WEIGHT = 0.20
FORMALITY_CONSISTENCY_WEIGHT = 0.25
BODY_FLATTERY_WEIGHT = 0.20

# Score scale
SCORE_MIN = 0.0
SCORE_MAX = 10.0
