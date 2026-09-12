"""Step 4: structured LLM rubric scoring for top-N candidates (temperature 0)."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx

from app import config
from app.schemas import AttributedItem, BodyInfo, LlmRubricScores

_REFERENCE_PATH = Path(__file__).resolve().parent / "calibration" / "reference_outfits.json"


class LlmUnavailableError(RuntimeError):
    """Raised when IFM_API_KEY is missing or the API call fails."""


def _require_api_key() -> str:
    key = os.getenv("IFM_API_KEY", "").strip().strip("\"'")
    if key.lower().startswith("bearer "):
        key = key[7:].strip()
    if not key:
        raise LlmUnavailableError(
            "IFM_API_KEY is missing. Set it in the environment or .env file."
        )
    return key


def load_reference_outfits(path: Path | None = None) -> list[dict[str, Any]]:
    p = path or _REFERENCE_PATH
    with p.open(encoding="utf-8") as f:
        data = json.load(f)
    return list(data.get("references", data))


def _format_references(refs: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for ref in refs:
        lines.append(
            f"- label={ref.get('label')} target_score={ref.get('target_score')} "
            f"items={ref.get('items')} note={ref.get('note', '')} "
            f"expected_subscores={ref.get('subscores', {})}"
        )
    return "\n".join(lines)


def _outfit_payload(outfit: list[AttributedItem]) -> list[dict[str, Any]]:
    return [
        {
            "id": p.item.id,
            "category": p.attributes.category,
            "description": p.item.description,
            "primary_color": p.attributes.primary_color.value,
            "pattern": p.attributes.pattern.value,
            "formality_tier": p.attributes.formality_tier,
            "season_tags": p.attributes.season_tags,
        }
        for p in outfit
    ]


def _body_payload(body: BodyInfo) -> dict[str, Any]:
    return body.model_dump(mode="json")


def score_outfit_rubric(
    outfit: list[AttributedItem],
    body: BodyInfo,
    *,
    references: list[dict[str, Any]] | None = None,
) -> LlmRubricScores:
    """One structured rubric call per outfit. Never returns a single free-floating score."""
    api_key = _require_api_key()
    refs = references if references is not None else load_reference_outfits()

    system = (
        "You are a calibrated outfit rubric scorer for a hackathon fit engine. "
        "Score ONLY with the four named sub-scores on a 0-10 scale. "
        "Use the few-shot reference outfits below to anchor the scale. "
        "Return ONLY JSON with keys: color_harmony, style_cohesion, "
        "formality_consistency, body_flattery, rationale.\n\n"
        "REFERENCE OUTFITS (few-shot anchors):\n"
        f"{_format_references(refs)}"
    )
    user = json.dumps(
        {
            "body": _body_payload(body),
            "outfit": _outfit_payload(outfit),
            "instructions": (
                "Evaluate this outfit for the given body/preferences. "
                "Be consistent across identical inputs. Temperature is 0."
            ),
        },
        indent=2,
    )

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
        with httpx.Client(timeout=90.0) as client:
            resp = client.post(
                f"{config.IFM_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            body_json = resp.json()
            content = body_json["choices"][0]["message"]["content"]
            if isinstance(content, list):
                content = "".join(
                    part.get("text", "") if isinstance(part, dict) else str(part)
                    for part in content
                )
            data = json.loads(content)
            return LlmRubricScores.model_validate(data)
    except LlmUnavailableError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise LlmUnavailableError(f"IFM rubric scoring failed: {exc}") from exc


def score_outfits_rubric(
    outfits: list[list[AttributedItem]],
    body: BodyInfo,
) -> list[LlmRubricScores]:
    refs = load_reference_outfits()
    return [score_outfit_rubric(o, body, references=refs) for o in outfits]
