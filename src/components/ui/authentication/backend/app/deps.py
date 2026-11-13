from collections.abc import AsyncIterator

import httpx
import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from .config import Settings
from .email import EmailSender
from .errors import AuthError
from .models import User
from .otp import OtpService
from .rate_limit import RateLimiter
from .security import decode_access_token


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


async def get_db(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.sessionmaker() as session:
        yield session


def get_otp(request: Request) -> OtpService:
    return request.app.state.otp_service


def get_mailer(request: Request) -> EmailSender:
    return request.app.state.email_sender


def get_limiter(request: Request) -> RateLimiter:
    return request.app.state.rate_limiter


def get_http(request: Request) -> httpx.AsyncClient:
    return request.app.state.http_client


def client_ip(request: Request) -> str:
    # Run uvicorn with --proxy-headers --forwarded-allow-ips=<lb> behind a load balancer.
    return request.client.host if request.client else "unknown"


def require_csrf_guard(request: Request, settings: Settings = Depends(get_settings)) -> None:
    """For cookie-authenticated endpoints (refresh/logout).

    A custom header forces a CORS preflight, which a cross-site attacker can't pass; the
    Origin check is defence in depth.
    """
    if request.headers.get("x-requested-with") != "XMLHttpRequest":
        raise AuthError(403, "csrf_failed", "Missing request header.")
    origin = request.headers.get("origin")
    if origin and origin not in settings.cors_origins:
        raise AuthError(403, "csrf_failed", "Origin not allowed.")


_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> User:
    if creds is None:
        raise AuthError(401, "not_authenticated", "Authentication required.")
    try:
        payload = decode_access_token(settings, creds.credentials)
    except jwt.ExpiredSignatureError:
        raise AuthError(401, "token_expired", "Access token expired.") from None
    except jwt.InvalidTokenError:
        raise AuthError(401, "invalid_token", "Invalid access token.") from None
    user = await db.get(User, payload["sub"])
    if user is None:
        raise AuthError(401, "invalid_token", "Invalid access token.")
    return user

