"""Session issuance: short-lived JWT access token (memory) + rotating refresh token (httpOnly cookie)."""

import uuid
from dataclasses import dataclass
from datetime import timedelta

from fastapi import Request, Response
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .config import API_PREFIX, Settings
from .errors import AuthError
from .models import RefreshToken, User
from .schemas import AuthenticatedResponse, UserOut
from .security import create_access_token, new_opaque_token, sha256_hex
from .utils import utcnow

ROTATION_GRACE = timedelta(seconds=10)


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        is_email_verified=user.is_email_verified,
        has_password=user.password_hash is not None,
        created_at=user.created_at,
    )


@dataclass
class IssuedSession:
    body: AuthenticatedResponse
    refresh_token: str
    persistent: bool


def _ttl(settings: Settings, persistent: bool) -> timedelta:
    return (
        timedelta(days=settings.refresh_ttl_days_remember)
        if persistent
        else timedelta(hours=settings.refresh_ttl_hours_session)
    )


async def _create_refresh(
    db: AsyncSession,
    settings: Settings,
    user_id: str,
    *,
    persistent: bool,
    family_id: str,
    request: Request | None,
) -> tuple[RefreshToken, str]:
    raw = new_opaque_token()
    row = RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        family_id=family_id,
        token_hash=sha256_hex(raw),
        persistent=persistent,
        expires_at=utcnow() + _ttl(settings, persistent),
        user_agent=(request.headers.get("user-agent", "")[:255] if request else None),
        ip=(request.client.host if request and request.client else None),
    )
    db.add(row)
    await db.flush()
    return row, raw


def _body(settings: Settings, user: User) -> AuthenticatedResponse:
    return AuthenticatedResponse(
        access_token=create_access_token(settings, user.id),
        expires_in=settings.access_token_ttl_seconds,
        user=user_out(user),
    )


async def issue_session(
    db: AsyncSession, settings: Settings, user: User, *, persistent: bool, request: Request | None
) -> IssuedSession:
    _, raw = await _create_refresh(
        db, settings, user.id, persistent=persistent, family_id=str(uuid.uuid4()), request=request
    )
    user.last_login_at = utcnow()
    return IssuedSession(_body(settings, user), raw, persistent)


async def rotate_session(
    db: AsyncSession, settings: Settings, raw: str, request: Request
) -> IssuedSession:
    def unauthorized() -> AuthError:
        return AuthError(401, "session_expired", "Your session has expired.", clear_refresh_cookie=True)

    row = (
        await db.execute(select(RefreshToken).where(RefreshToken.token_hash == sha256_hex(raw)))
    ).scalar_one_or_none()
    if row is None:
        raise unauthorized()
    if row.revoked_at is not None:
        if row.replaced_by_id and utcnow() - row.revoked_at < ROTATION_GRACE:
            # Benign race (two tabs refreshing at once): the browser already holds the
            # successor cookie, so the client should simply retry.
            raise AuthError(409, "refresh_conflict", "Session was refreshed concurrently; retry.")
        # Replay of a rotated token => likely theft. Kill the entire family.
        await revoke_family(db, row.family_id)
        await db.commit()
        raise unauthorized()
    if row.expires_at <= utcnow():
        raise unauthorized()
    user = await db.get(User, row.user_id)
    if user is None:
        raise unauthorized()

    new_row, new_raw = await _create_refresh(
        db, settings, user.id, persistent=row.persistent, family_id=row.family_id, request=request
    )
    row.revoked_at = utcnow()
    row.replaced_by_id = new_row.id
    return IssuedSession(_body(settings, user), new_raw, row.persistent)


async def revoke_family(db: AsyncSession, family_id: str) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )


async def revoke_by_raw(db: AsyncSession, raw: str) -> None:
    row = (
        await db.execute(select(RefreshToken).where(RefreshToken.token_hash == sha256_hex(raw)))
    ).scalar_one_or_none()
    if row is not None:
        await revoke_family(db, row.family_id)


async def revoke_all_for_user(db: AsyncSession, user_id: str) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )


# --- Cookie helpers -----------------------------------------------------------------
def set_refresh_cookie(response: Response, settings: Settings, session: IssuedSession) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=session.refresh_token,
        # No max_age => browser-session cookie when "remember me" is off.
        max_age=int(_ttl(settings, True).total_seconds()) if session.persistent else None,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
        path=API_PREFIX,  # only ever sent to the auth API
    )


def clear_refresh_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path=API_PREFIX,
        domain=settings.cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )
