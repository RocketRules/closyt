"""Shared fixture loaders for tests."""

from __future__ import annotations

import json
from pathlib import Path

from app.schemas import (
    AttributedItem,
    BodyInfo,
    ClothingAttributes,
    ClothingItem,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def load_body() -> BodyInfo:
    data = json.loads((FIXTURES / "sample_body.json").read_text(encoding="utf-8"))
    return BodyInfo.model_validate(data)


def load_wardrobe_raw() -> list[ClothingItem]:
    data = json.loads((FIXTURES / "sample_wardrobe.json").read_text(encoding="utf-8"))
    return [
        ClothingItem(id=row["id"], category=row["category"], description=row["description"])
        for row in data["items"]
    ]


def load_attributed_wardrobe() -> list[AttributedItem]:
    data = json.loads((FIXTURES / "sample_wardrobe.json").read_text(encoding="utf-8"))
    out: list[AttributedItem] = []
    for row in data["items"]:
        item = ClothingItem(
            id=row["id"],
            category=row["category"],
            description=row["description"],
        )
        attr_data = dict(row["attributes"])
        attr_data["item_id"] = row["id"]
        attr_data["category"] = row["category"]
        attrs = ClothingAttributes.model_validate(attr_data)
        out.append(AttributedItem(item=item, attributes=attrs))
    return out


def attributes_by_id() -> dict[str, ClothingAttributes]:
    return {a.item.id: a.attributes for a in load_attributed_wardrobe()}
