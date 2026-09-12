"""
Closyt garment tagger — FashionCLIP served over the local network.

The phone already talks to this machine for Expo Go, so the app posts each
garment photo here and gets back a category and a fit.

FashionCLIP is zero-shot: there is no training step and no fixed output layer.
We describe each label in words, embed those descriptions once at startup, and
then score a photo by cosine similarity against them. Changing the vocabulary
is a matter of editing the prompts below.
"""

from contextlib import asynccontextmanager

import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

import base64
import io
import time

MODEL_ID = "patrickjohncyh/fashion-clip"

# The app's category vocabulary (TYPES in src/theme/theme.js). The label on the
# left is what the app stores; the prompt on the right is what CLIP compares
# against, phrased the way the caption of a product photo would be.
CATEGORY_PROMPTS = {
    "Shirt": "a photo of a button-up shirt",
    "Tee": "a photo of a t-shirt",
    "Knitwear": "a photo of a knitted sweater, jumper or hoodie",
    "Jacket": "a photo of a jacket or coat",
    "Trousers": "a photo of a pair of trousers",
    "Jeans": "a photo of a pair of blue denim jeans",
    "Shoes": "a photo of a pair of shoes",
}

FIT_PROMPTS = {
    "Slim": "a photo of slim fit, tight fitting clothing",
    "Regular": "a photo of regular fit clothing",
    "Relaxed": "a photo of loose, oversized, relaxed fit clothing",
    "Straight": "a photo of straight cut clothing",
}

state: dict = {}


def to_embedding(output) -> torch.Tensor:
    """
    Pull the joint-space embedding out of a CLIP feature call.

    transformers 4.x returned a plain tensor from get_text_features /
    get_image_features; 5.x returns a BaseModelOutputWithPooling whose
    `pooler_output` holds the projected vector (512-d here). Support both so
    the server is not pinned to one transformers major version.
    """
    if isinstance(output, torch.Tensor):
        return output
    return output.pooler_output


def embed_prompts(model, processor, prompts: dict[str, str]) -> torch.Tensor:
    """Embed each label's prompt once, normalised, so scoring is a dot product."""
    inputs = processor(text=list(prompts.values()), return_tensors="pt", padding=True)
    with torch.no_grad():
        features = to_embedding(model.get_text_features(**inputs))
    return F.normalize(features, dim=-1)


@asynccontextmanager
async def lifespan(_: FastAPI):
    print(f"loading {MODEL_ID} … (first run downloads ~600MB)")
    started = time.time()
    model = CLIPModel.from_pretrained(MODEL_ID)
    model.eval()
    processor = CLIPProcessor.from_pretrained(MODEL_ID)

    state["model"] = model
    state["processor"] = processor
    state["category"] = (list(CATEGORY_PROMPTS), embed_prompts(model, processor, CATEGORY_PROMPTS))
    state["fit"] = (list(FIT_PROMPTS), embed_prompts(model, processor, FIT_PROMPTS))
    print(f"ready in {time.time() - started:.1f}s — listening for photos")
    yield
    state.clear()


app = FastAPI(title="Closyt tagger", lifespan=lifespan)

# The app is served from a different origin (Metro), so allow it through.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TagRequest(BaseModel):
    image: str  # base64 JPEG, with or without a data: prefix


def score(image_features: torch.Tensor, group: str) -> dict:
    labels, text_features = state[group]
    # Both sides are unit vectors, so this is cosine similarity.
    similarity = (image_features @ text_features.T).squeeze(0)
    probs = (similarity * 100).softmax(dim=-1)
    best = int(probs.argmax())
    return {
        "label": labels[best],
        "confidence": float(probs[best]),
        "all": {labels[i]: round(float(probs[i]), 4) for i in range(len(labels))},
    }


@app.get("/health")
def health():
    """Used by the app to warm the connection and show server status."""
    return {"ok": "model" in state, "model": MODEL_ID}


@app.post("/tag")
def tag(req: TagRequest):
    if "model" not in state:
        raise HTTPException(503, "model still loading")

    raw = req.image.split(",", 1)[-1]  # tolerate a data: URI prefix
    try:
        image = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
    except Exception as exc:
        raise HTTPException(400, f"could not decode image: {exc}")

    inputs = state["processor"](images=image, return_tensors="pt")
    with torch.no_grad():
        features = to_embedding(state["model"].get_image_features(**inputs))
    features = F.normalize(features, dim=-1)

    return {"category": score(features, "category"), "fit": score(features, "fit")}


if __name__ == "__main__":
    import uvicorn

    # 0.0.0.0 so the phone on the same network can reach it.
    uvicorn.run(app, host="0.0.0.0", port=8000)
