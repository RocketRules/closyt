"""Wardrobe gap analysis — suggest new pieces to complete the closet.

Uses IFM K2 Horizon to analyze what's missing from the current wardrobe
and suggest specific items the user should buy.
"""

from __future__ import annotations

import json
import os

import httpx

from app import config
from app.schemas import BodyInfo, ClothingItem, RankRequest

SUGGEST_PROMPT = """\
You are a personal stylist analyzing someone's existing wardrobe.

BODY PROFILE:
{body_info}

CURRENT WARDROBE ({n_items} items):
{wardrobe_summary}

Analyze the wardrobe for gaps and suggest 3-5 specific clothing items this person should add.
Consider:
1. Missing categories (e.g., no outerwear, no versatile shoes)
2. Color palette gaps (too monochrome, or missing neutrals/accent colors)
3. Formality range (all casual? needs a smart piece?)
4. Season coverage (missing cold/warm weather items)
5. Body-flattering choices based on the profile

Return JSON only:
{{
  "analysis": "One paragraph about the wardrobe's strengths and gaps",
  "suggestions": [
    {{
      "category": "shirt|pant|jacket|shoe|sweater|short|outerwear",
      "description": "specific item description, e.g. 'charcoal wool overcoat'",
      "reason": "why this fills a gap",
      "priority": "high|medium|low"
    }}
  ]
}}
"""


def _require_api_key() -> str:
    raw = os.getenv("IFM_API_KEY", "").strip().strip("\"'")
    if raw.lower().startswith("bearer "):
        raw = raw[7:].strip()
    if not raw:
        raise RuntimeError("IFM_API_KEY not set")
    return raw


def suggest_pieces(request: RankRequest) -> dict:
    """Call IFM to analyze wardrobe gaps and suggest purchases."""
    api_key = _require_api_key()

    body_info = (
        f"Gender: {request.body.gender.value}, Age: {request.body.age}, "
        f"Height: {request.body.height_cm}cm, Weight: {request.body.weight_kg}kg, "
        f"Fit preference: {request.body.fit_preference.value}, "
        f"Sleeve preference: {request.body.sleeve_preference.value}, "
        f"Color preference: {request.body.color_preference.value}"
    )

    wardrobe_lines = []
    for item in request.items:
        wardrobe_lines.append(f"- [{item.category}] {item.description}")
    wardrobe_summary = "\n".join(wardrobe_lines) if wardrobe_lines else "(empty wardrobe)"

    prompt = SUGGEST_PROMPT.format(
        body_info=body_info,
        n_items=len(request.items),
        wardrobe_summary=wardrobe_summary,
    )

    with httpx.Client(timeout=60.0) as client:
        resp = client.post(
            f"{config.IFM_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": config.IFM_MODEL_ID,
                "temperature": config.IFM_TEMPERATURE,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return json.loads(content)
