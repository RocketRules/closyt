"""FastAPI service: POST /rank_outfits — teammates integrate against this contract."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.ranking import RankingError, rank_outfits
from app.schemas import RankRequest, RankResponse
from app.suggestions import suggest_pieces

load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield


app = FastAPI(
    title="Closet Fit-Scoring Engine",
    description=(
        "HackCMU 2026 Optimization track — ranked outfit combinations from "
        "body info + clothing descriptions."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _api_key_configured() -> bool:
    key = os.getenv("IFM_API_KEY", "").strip().strip("\"'")
    if key.lower().startswith("bearer "):
        key = key[7:].strip()
    return bool(key)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "ifm_api_key_configured": str(_api_key_configured()).lower()}


@app.post("/rank_outfits", response_model=RankResponse)
def post_rank_outfits(request: RankRequest) -> RankResponse:
    """Rank feasible outfits. Fails hard if IFM_API_KEY is missing or the API flakes."""
    if not _api_key_configured():
        raise HTTPException(
            status_code=503,
            detail="IFM_API_KEY is missing. Configure it before calling /rank_outfits.",
        )
    try:
        return rank_outfits(request)
    except RankingError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/suggest_pieces")
def post_suggest_pieces(request: RankRequest) -> dict:
    """Analyze wardrobe gaps and suggest new pieces to buy."""
    if not _api_key_configured():
        raise HTTPException(
            status_code=503,
            detail="IFM_API_KEY is missing. Configure it before calling /suggest_pieces.",
        )
    try:
        return suggest_pieces(request)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": str(exc)})
