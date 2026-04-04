"""
SCALD API — FastAPI application entry point.

Startup sequence:
  1. Load settings (pydantic-settings from .env)
  2. Create DB engine + session factory
  3. Mount API router (v1)
  4. Register exception handlers + middleware
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.core.config.settings import settings
from src.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Async context manager for startup / shutdown hooks."""
    # Startup: nothing to do — Alembic handles migrations separately
    yield
    # Shutdown: dispose connection pool
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "SCALD — Data-driven Decision Support Ecosystem for Local Governments. "
        "Supports 5 languages: tr, en, el, ro, mk."
    ),
    docs_url="/docs" if settings.DEBUG else None,   # hide Swagger in prod
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handlers ─────────────────────────────────────────────────
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)},
    )


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"], include_in_schema=False)
async def health() -> dict:
    return {"status": "ok", "version": settings.APP_VERSION}


# ── API routers ───────────────────────────────────────────────────────────────
# Core routers (to be enabled as implemented):
# from src.api.v1.endpoints import indicators, observations, municipalities, iot, auth
# app.include_router(auth.router,            prefix="/api/v1/auth",           tags=["auth"])
# app.include_router(municipalities.router,  prefix="/api/v1/municipalities", tags=["municipalities"])
# app.include_router(indicators.router,      prefix="/api/v1/indicators",     tags=["indicators"])
# app.include_router(observations.router,    prefix="/api/v1/observations",   tags=["observations"])
# app.include_router(iot.router,             prefix="/api/v1/iot",            tags=["iot"])

# ── EFCT module routers ────────────────────────────────────────────────────────
from src.api.v1.endpoints.efct import scores, submissions, indicators, climate  # noqa: E402

app.include_router(scores.router,      prefix="/api/v1/efct")
app.include_router(submissions.router, prefix="/api/v1/efct")
app.include_router(indicators.router,  prefix="/api/v1/efct")
app.include_router(climate.router,     prefix="/api/v1/efct")
