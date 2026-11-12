import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .db import build_engine, build_sessionmaker, create_schema
from .email import EmailSender, build_email_sender
from .errors import AuthError, auth_error_handler
from .otp import OtpService
from .rate_limit import RateLimiter
from .routers.auth import router as auth_router

logging.basicConfig(level=logging.INFO)


def create_app(
    settings: Settings | None = None,
    *,
    email_sender: EmailSender | None = None,
    http_client: httpx.AsyncClient | None = None,
) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = build_engine(settings.database_url)
        await create_schema(engine)
        app.state.sessionmaker = build_sessionmaker(engine)
        client = http_client or httpx.AsyncClient(timeout=10.0)
        app.state.http_client = client
        try:
            yield
        finally:
            if http_client is None:
                await client.aclose()
            await engine.dispose()

    app = FastAPI(title=f"{settings.app_name} Auth API", version="1.0.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.email_sender = email_sender or build_email_sender(settings)
    app.state.rate_limiter = RateLimiter(enabled=settings.rate_limit_enabled)
    app.state.otp_service = OtpService(settings)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,  # needed for the httpOnly refresh cookie
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        expose_headers=["Retry-After"],
    )
    app.add_exception_handler(AuthError, auth_error_handler)
    app.include_router(auth_router)

    @app.get("/health", include_in_schema=False)
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

