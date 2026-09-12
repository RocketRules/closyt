"""Step 1: raw description -> ClothingAttributes via IFM K2 Horizon (structured)."""

from __future__ import annotations

import json
import os
from typing import Any

import httpx

from app import config
from app.schemas import (
    CATEGORY_VALUES,
    ClothingAttributes,
    ClothingItem,
    ColorDepthPreference,
    FitPreference,
    LayerType,
    Pattern,
    PrimaryColor,
    SleevePreference,
)

# In-process cache keyed by item id (and description, so edits invalidate).
_ATTR_CACHE: dict[str, ClothingAttributes] = {}


class LlmUnavailableError(RuntimeError):
    """Raised when IFM_API_KEY is missing or the API call fails."""


def clear_attribute_cache() -> None:
    _ATTR_CACHE.clear()


def _cache_key(item: ClothingItem) -> str:
    return f"{item.id}::{item.description}::{item.category}"


def _require_api_key() -> str:
    key = os.getenv("IFM_API_KEY", "").strip().strip("\"'")
    if key.lower().startswith("bearer "):
        key = key[7:].strip()
    if not key:
        raise LlmUnavailableError(
            "IFM_API_KEY is missing. Set it in the environment or .env file."
        )
    return key


def _extraction_schema_hint() -> str:
    return (
        "Return ONLY a JSON object with keys: "
        "primary_color, secondary_color (or null), pattern, formality_tier (1-5 int), "
        "season_tags (array of spring|summer|fall|winter|all), layer_type, "
        "fit_hint (tighter|looser|null), sleeve_hint (long|short|null), "
        "color_depth (lighter|darker|null). "
        f"primary_color must be one of: {[c.value for c in PrimaryColor]}. "
        f"pattern must be one of: {[p.value for p in Pattern]}. "
        f"layer_type must be one of: {[l.value for l in LayerType]}."
    )


def _parse_attributes(item: ClothingItem, data: dict[str, Any]) -> ClothingAttributes:
    secondary = data.get("secondary_color")
    if secondary in ("", "null", None):
        secondary = None

    def _enum_or_none(enum_cls: type, raw: Any) -> Any:
        if raw is None or raw == "" or raw == "null":
            return None
        return enum_cls(raw)

    return ClothingAttributes(
        item_id=item.id,
        category=item.category,
        primary_color=PrimaryColor(data["primary_color"]),
        secondary_color=PrimaryColor(secondary) if secondary else None,
        pattern=Pattern(data.get("pattern", "solid")),
        formality_tier=int(data["formality_tier"]),
        season_tags=list(data.get("season_tags") or ["all"]),
        layer_type=LayerType(data["layer_type"]),
        fit_hint=_enum_or_none(FitPreference, data.get("fit_hint")),
        sleeve_hint=_enum_or_none(SleevePreference, data.get("sleeve_hint")),
        color_depth=_enum_or_none(ColorDepthPreference, data.get("color_depth")),
    )


def _call_ifm_json(system: str, user: str) -> dict[str, Any]:
    api_key = _require_api_key()
    payload = {
        "model": config.IFM_MODEL_ID,
        "temperature": config.IFM_TEMPERATURE,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                f"{config.IFM_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            body = resp.json()
    except LlmUnavailableError:
        raise
    except Exception as exc:  # noqa: BLE001 — surface as hard failure for demo reliability
        raise LlmUnavailableError(f"IFM attribute extraction failed: {exc}") from exc

    try:
        content = body["choices"][0]["message"]["content"]
        if isinstance(content, list):
            # Some providers return content parts
            content = "".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in content
            )
        return json.loads(content)
    except Exception as exc:  # noqa: BLE001
        raise LlmUnavailableError(
            f"IFM returned unparseable attribute JSON: {exc}"
        ) from exc


def extract_attributes(item: ClothingItem, *, use_cache: bool = True) -> ClothingAttributes:
    """One structured LLM call per clothing item. Cached by id+description."""
    key = _cache_key(item)
    if use_cache and key in _ATTR_CACHE:
        return _ATTR_CACHE[key]

    if item.category not in CATEGORY_VALUES:
        raise ValueError(f"Unknown category: {item.category}")

    system = (
        "You extract structured clothing attributes for an outfit scoring engine. "
        "Be consistent and deterministic. " + _extraction_schema_hint()
    )
    user = (
        f"category={item.category}\n"
        f"description={item.description}\n"
        "Infer formality_tier, colors, pattern, seasons, and layer_type."
    )
    data = _call_ifm_json(system, user)
    attrs = _parse_attributes(item, data)
    _ATTR_CACHE[key] = attrs
    return attrs


def extract_wardrobe(
    items: list[ClothingItem],
    *,
    use_cache: bool = True,
) -> list[ClothingAttributes]:
    return [extract_attributes(item, use_cache=use_cache) for item in items]
