"""Auth HTTP API. See ../README.md (section "API contract") for the sequence diagrams."""

import secrets
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import API_PREFIX, Settings
from ..deps import (
    client_ip,
    get_current_user,
    get_db,
    get_http,
    get_limiter,
    get_mailer,
    get_otp,
    get_settings,
    require_csrf_guard,
)
from ..email import (
    EmailSender,
    account_exists_email,
    otp_email,
    password_changed_email,
    send_safely,
)
from ..errors import AuthError
from ..models import OAuthAccount, OtpChallenge, OtpPurpose, User
from ..oauth import (
    OAuthError,
    OAuthIdentity,
    build_authorize_url,
    enabled_providers,
    exchange_code,
    fetch_identity,
    pkce_pair,
)
from ..otp import OtpService
from ..rate_limit import RateLimiter
from ..schemas import (
    AuthenticatedResponse,
    ForgotPasswordRequest,
    LoginRequest,
    OAuthProvidersResponse,
    OtpChallengeResponse,
    ResendOtpRequest,
    ResetPasswordRequest,
    SignupRequest,
    UserOut,
    VerifyOtpRequest,
)
from ..security import (
    hash_password,
    password_needs_rehash,
    sign_state,
    verify_password,
    verify_state,
)
from ..sessions import (
    clear_refresh_cookie,
    issue_session,
    revoke_all_for_user,
    revoke_by_raw,
    rotate_session,
    set_refresh_cookie,
    user_out,
)
from ..utils import normalize_email

router = APIRouter(prefix=API_PREFIX, tags=["auth"])

OAUTH_STATE_COOKIE = "xai_oauth_state"
OAUTH_STATE_TTL = 600
VERIFIABLE_FOR_SESSION = {OtpPurpose.SIGNUP, OtpPurpose.LOGIN, OtpPurpose.OAUTH}


async def _user_by_email(db: AsyncSession, email: str) -> User | None:
    return (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()


def _queue_otp_email(
    bg: BackgroundTasks, mailer: EmailSender, settings: Settings, challenge: OtpChallenge, code: str
) -> None:
    """Real challenge -> send the code. Decoy challenge -> send a notice or nothing."""
    if challenge.user_id is not None:
        subject, body = otp_email(settings, challenge.purpose, code)
    elif challenge.purpose == OtpPurpose.SIGNUP:
        subject, body = account_exists_email(settings)
    else:
        return
    bg.add_task(send_safely, mailer, challenge.email, subject, body)


async def _authenticate(
    db: AsyncSession,
    settings: Settings,
    user: User,
    *,
    persistent: bool,
    request: Request,
    response: Response,
) -> AuthenticatedResponse:
    session = await issue_session(db, settings, user, persistent=persistent, request=request)
    await db.commit()
    set_refresh_cookie(response, settings, session)
    return session.body


# =====================================================================================
# Email + password
# =====================================================================================
@router.post("/signup", response_model=OtpChallengeResponse, status_code=202)
async def signup(
    body: SignupRequest,
    request: Request,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    otp: OtpService = Depends(get_otp),
    mailer: EmailSender = Depends(get_mailer),
    limiter: RateLimiter = Depends(get_limiter),
) -> OtpChallengeResponse:
    email = normalize_email(body.email)
    limiter.hit("signup:ip", client_ip(request))
    limiter.hit("signup:email", email)

    user = await _user_by_email(db, email)
    if user is not None and user.is_email_verified:
        # Don't reveal that the account exists: same response shape, decoy challenge.
        challenge, code = await otp.issue(db, email=email, purpose=OtpPurpose.SIGNUP, user_id=None)
    else:
        if user is None:
            user = User(email=email, name=body.name, password_hash=hash_password(body.password))
            db.add(user)
        else:
            # Unverified account: the latest signup wins (prevents email squatting).
            user.name = body.name
            user.password_hash = hash_password(body.password)
        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            raise AuthError(409, "signup_conflict", "Please try again.") from None
        challenge, code = await otp.issue(db, email=email, purpose=OtpPurpose.SIGNUP, user_id=user.id)

    await db.commit()
    _queue_otp_email(bg, mailer, settings, challenge, code)
    return otp.describe(challenge)


@router.post("/login", response_model=AuthenticatedResponse | OtpChallengeResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    otp: OtpService = Depends(get_otp),
    mailer: EmailSender = Depends(get_mailer),
    limiter: RateLimiter = Depends(get_limiter),
) -> AuthenticatedResponse | OtpChallengeResponse:
    email = normalize_email(body.email)
    limiter.hit("login:ip", client_ip(request))
    limiter.hit("login:email", email)

    user = await _user_by_email(db, email)
    if not verify_password(body.password, user.password_hash if user else None) or user is None:
        raise AuthError(401, "invalid_credentials", "Invalid email or password.")
    if user.password_hash and password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(body.password)

    if not user.is_email_verified:
        purpose = OtpPurpose.SIGNUP  # finish email verification first
    elif settings.login_otp_required:
        purpose = OtpPurpose.LOGIN
    else:
        return await _authenticate(
            db, settings, user, persistent=body.remember, request=request, response=response
        )

    challenge, code = await otp.issue(
        db, email=email, purpose=purpose, user_id=user.id, remember=body.remember
    )
    await db.commit()
    _queue_otp_email(bg, mailer, settings, challenge, code)
    return otp.describe(challenge)


# =====================================================================================
# OTP
# =====================================================================================
@router.get("/otp/{challenge_id}", response_model=OtpChallengeResponse)
async def otp_info(
    challenge_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    otp: OtpService = Depends(get_otp),
    limiter: RateLimiter = Depends(get_limiter),
) -> OtpChallengeResponse:
    """Lets the verify page survive a reload: it only keeps the opaque challenge id."""
    limiter.hit("otp_info:ip", client_ip(request))
    return otp.describe(await otp.get_open(db, challenge_id))


@router.post("/otp/verify", response_model=AuthenticatedResponse)
async def otp_verify(
    body: VerifyOtpRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    otp: OtpService = Depends(get_otp),
    limiter: RateLimiter = Depends(get_limiter),
) -> AuthenticatedResponse:
    limiter.hit("otp_verify:ip", client_ip(request))
    challenge = await otp.verify(db, body.challenge_id, body.code, VERIFIABLE_FOR_SESSION)
    user = await db.get(User, challenge.user_id)
    if user is None:
        raise AuthError(404, "challenge_invalid", "This verification session is no longer valid.")
    if challenge.purpose == OtpPurpose.SIGNUP:
        user.is_email_verified = True
    return await _authenticate(
        db, settings, user, persistent=challenge.remember, request=request, response=response
    )


@router.post("/otp/resend", response_model=OtpChallengeResponse)
async def otp_resend(
    body: ResendOtpRequest,
    request: Request,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    otp: OtpService = Depends(get_otp),
    mailer: EmailSender = Depends(get_mailer),
    limiter: RateLimiter = Depends(get_limiter),
) -> OtpChallengeResponse:
    limiter.hit("otp_resend:ip", client_ip(request))
    challenge, code = await otp.resend(db, body.challenge_id)
    await db.commit()
    _queue_otp_email(bg, mailer, settings, challenge, code)
    return otp.describe(challenge)


# =====================================================================================
# Password reset (reuses the OTP engine)
# =====================================================================================
@router.post("/password/forgot", response_model=OtpChallengeResponse, status_code=202)
async def password_forgot(
    body: ForgotPasswordRequest,
    request: Request,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    otp: OtpService = Depends(get_otp),
    mailer: EmailSender = Depends(get_mailer),
    limiter: RateLimiter = Depends(get_limiter),
) -> OtpChallengeResponse:
    email = normalize_email(body.email)
    limiter.hit("forgot:ip", client_ip(request))
    limiter.hit("forgot:email", email)
    user = await _user_by_email(db, email)
    challenge, code = await otp.issue(
        db, email=email, purpose=OtpPurpose.PASSWORD_RESET, user_id=user.id if user else None
    )
    await db.commit()
    _queue_otp_email(bg, mailer, settings, challenge, code)
    return otp.describe(challenge)


@router.post("/password/reset", status_code=204)
async def password_reset(
    body: ResetPasswordRequest,
    request: Request,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    otp: OtpService = Depends(get_otp),
    mailer: EmailSender = Depends(get_mailer),
    limiter: RateLimiter = Depends(get_limiter),
) -> Response:
    limiter.hit("otp_verify:ip", client_ip(request))
    challenge = await otp.verify(db, body.challenge_id, body.code, {OtpPurpose.PASSWORD_RESET})
    user = await db.get(User, challenge.user_id)
    if user is None:
        raise AuthError(404, "challenge_invalid", "This verification session is no longer valid.")
    user.password_hash = hash_password(body.new_password)
    user.is_email_verified = True  # they just proved inbox ownership
    await revoke_all_for_user(db, user.id)  # sign out everywhere
    await db.commit()
    bg.add_task(send_safely, mailer, user.email, *password_changed_email(settings))
    return Response(status_code=204)


# =====================================================================================
# Session
# =====================================================================================
@router.post(
    "/refresh", response_model=AuthenticatedResponse, dependencies=[Depends(require_csrf_guard)]
)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    limiter: RateLimiter = Depends(get_limiter),
) -> AuthenticatedResponse:
    limiter.hit("refresh:ip", client_ip(request))
    raw = request.cookies.get(settings.refresh_cookie_name)
    if not raw:
        raise AuthError(401, "no_session", "Not signed in.")
    session = await rotate_session(db, settings, raw, request)
    await db.commit()
    set_refresh_cookie(response, settings, session)
    return session.body


@router.post("/logout", status_code=204, dependencies=[Depends(require_csrf_guard)])
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    raw = request.cookies.get(settings.refresh_cookie_name)
    if raw:
        await revoke_by_raw(db, raw)
        await db.commit()
    response = Response(status_code=204)
    clear_refresh_cookie(response, settings)
    return response


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    return user_out(user)


# =====================================================================================
# OAuth (Google / GitHub)
# =====================================================================================
@router.get("/oauth/providers", response_model=OAuthProvidersResponse)
async def oauth_providers(settings: Settings = Depends(get_settings)) -> OAuthProvidersResponse:
    return OAuthProvidersResponse(providers=list(enabled_providers(settings)))


@router.get("/oauth/{provider}/authorize")
async def oauth_authorize(
    provider: str,
    request: Request,
    remember: bool = False,
    settings: Settings = Depends(get_settings),
    limiter: RateLimiter = Depends(get_limiter),
) -> RedirectResponse:
    limiter.hit("oauth:ip", client_ip(request))
    cfg = enabled_providers(settings).get(provider)
    if cfg is None:
        raise AuthError(404, "provider_disabled", f"{provider} sign-in is not enabled.")
    state = secrets.token_urlsafe(32)
    verifier, challenge = pkce_pair()
    response = RedirectResponse(
        build_authorize_url(cfg, settings, state=state, code_challenge=challenge), status_code=302
    )
    response.set_cookie(
        OAUTH_STATE_COOKIE,
        sign_state(
            settings,
            {"state": state, "verifier": verifier, "provider": provider, "remember": remember},
            OAUTH_STATE_TTL,
        ),
        max_age=OAUTH_STATE_TTL,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",  # must survive the top-level redirect back from the provider
        path=f"{API_PREFIX}/oauth",
    )
    return response


async def _resolve_oauth_user(db: AsyncSession, identity: OAuthIdentity) -> User:
    assert identity.email is not None
    email = normalize_email(identity.email)
    link = (
        await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == identity.provider,
                OAuthAccount.provider_user_id == identity.subject,
            )
        )
    ).scalar_one_or_none()
    if link is not None:
        user = await db.get(User, link.user_id)
        if user is not None:
            return user

    user = await _user_by_email(db, email)
    if user is None:
        user = User(
            email=email,
            name=(identity.name or email.split("@")[0])[:120],
            password_hash=None,
            is_email_verified=True,
        )
        db.add(user)
        await db.flush()
    elif not user.is_email_verified:
        # Pre-account-takeover defence: someone may have registered this email with a
        # password they know. The provider just proved the real owner, so drop it.
        user.password_hash = None
        user.is_email_verified = True
        await revoke_all_for_user(db, user.id)

    db.add(
        OAuthAccount(
            user_id=user.id,
            provider=identity.provider,
            provider_user_id=identity.subject,
            email=email,
        )
    )
    await db.flush()
    return user


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    bg: BackgroundTasks,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    otp: OtpService = Depends(get_otp),
    mailer: EmailSender = Depends(get_mailer),
    http: httpx.AsyncClient = Depends(get_http),
) -> RedirectResponse:
    front = settings.frontend_url.rstrip("/")

    def redirect(path: str, **params: str) -> RedirectResponse:
        url = f"{front}{path}" + (f"?{urlencode(params)}" if params else "")
        resp = RedirectResponse(url, status_code=302)
        resp.delete_cookie(OAUTH_STATE_COOKIE, path=f"{API_PREFIX}/oauth")
        return resp

    if error:
        return redirect("/auth/callback", error="access_denied" if error == "access_denied" else "provider_error")

    cfg = enabled_providers(settings).get(provider)
    raw_state = request.cookies.get(OAUTH_STATE_COOKIE)
    if cfg is None or not code or not state or not raw_state:
        return redirect("/auth/callback", error="invalid_request")
    try:
        saved = verify_state(settings, raw_state)
    except jwt.InvalidTokenError:
        return redirect("/auth/callback", error="state_expired")
    if saved.get("provider") != provider or not secrets.compare_digest(str(saved.get("state")), state):
        return redirect("/auth/callback", error="invalid_state")

    try:
        token = await exchange_code(cfg, settings, http, code=code, verifier=str(saved["verifier"]))
        identity = await fetch_identity(cfg, http, token)
    except OAuthError as exc:
        return redirect("/auth/callback", error=exc.reason)
    except (httpx.HTTPError, ValueError, KeyError):
        return redirect("/auth/callback", error="provider_error")

    if not identity.email or not identity.email_verified:
        return redirect("/auth/callback", error="email_unverified")

    user = await _resolve_oauth_user(db, identity)
    remember = bool(saved.get("remember"))

    if settings.oauth_require_otp:
        challenge, otp_code = await otp.issue(
            db, email=user.email, purpose=OtpPurpose.OAUTH, user_id=user.id, remember=remember
        )
        await db.commit()
        _queue_otp_email(bg, mailer, settings, challenge, otp_code)
        return redirect("/verify", challenge=challenge.id)

    session = await issue_session(db, settings, user, persistent=remember, request=request)
    await db.commit()
    # No tokens in the URL: the SPA calls /refresh to obtain its access token.
    resp = redirect("/auth/callback", status="success")
    set_refresh_cookie(resp, settings, session)
    return resp

