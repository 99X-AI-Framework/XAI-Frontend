from urllib.parse import parse_qs, urlparse

import httpx

from app.config import API_PREFIX
from conftest import Ctx, build_ctx, make_settings

CSRF = {"X-Requested-With": "XMLHttpRequest"}
EMAIL = "ada@example.com"
PASSWORD = "Sup3rSecret!"


def signup_and_verify(ctx: Ctx, email: str = EMAIL) -> dict:
    r = ctx.post("/signup", json={"name": "Ada", "email": email, "password": PASSWORD})
    assert r.status_code == 202, r.text
    challenge = r.json()
    assert challenge["status"] == "otp_required" and challenge["purpose"] == "signup"
    r = ctx.post("/otp/verify", json={"challenge_id": challenge["challenge_id"], "code": ctx.outbox.last_code(email)})
    assert r.status_code == 200, r.text
    return r.json()


# --- Signup / verify / session --------------------------------------------------------
def test_signup_verify_me_refresh_logout(ctx: Ctx) -> None:
    auth = signup_and_verify(ctx)
    assert auth["status"] == "authenticated"
    assert auth["user"]["is_email_verified"] is True
    assert ctx.client.cookies.get("xai_refresh")

    me = ctx.get("/me", headers={"Authorization": f"Bearer {auth['access_token']}"})
    assert me.status_code == 200 and me.json()["email"] == EMAIL

    old_cookie = ctx.client.cookies.get("xai_refresh")
    r = ctx.post("/refresh", headers=CSRF)
    assert r.status_code == 200
    assert ctx.client.cookies.get("xai_refresh") != old_cookie

    r = ctx.post("/logout", headers=CSRF)
    assert r.status_code == 204
    assert ctx.post("/refresh", headers=CSRF).status_code == 401


def test_refresh_requires_csrf_header(ctx: Ctx) -> None:
    signup_and_verify(ctx)
    assert ctx.post("/refresh").status_code == 403
    assert ctx.post("/refresh", headers={**CSRF, "Origin": "https://evil.test"}).status_code == 403


def test_refresh_token_replay_revokes_family() -> None:
    from app import sessions

    for c in build_ctx(make_settings()):
        signup_and_verify(c)
        stolen = c.client.cookies.get("xai_refresh")
        assert c.post("/refresh", headers=CSRF).status_code == 200
        sessions.ROTATION_GRACE = sessions.timedelta(seconds=0)  # disable grace window
        try:
            c.client.cookies.clear()
            c.client.cookies.set("xai_refresh", stolen, path=API_PREFIX)
            r = c.post("/refresh", headers=CSRF)
            assert r.status_code == 401 and r.json()["detail"]["code"] == "session_expired"
        finally:
            sessions.ROTATION_GRACE = sessions.timedelta(seconds=10)


def test_unauthenticated_me(ctx: Ctx) -> None:
    assert ctx.get("/me").json()["detail"]["code"] == "not_authenticated"


# --- Login + OTP ----------------------------------------------------------------------
def test_login_requires_otp_and_locks_after_max_attempts(ctx: Ctx) -> None:
    signup_and_verify(ctx)
    ctx.client.cookies.clear()

    assert ctx.post("/login", json={"email": EMAIL, "password": "wrong-pass1"}).status_code == 401

    r = ctx.post("/login", json={"email": EMAIL.upper(), "password": PASSWORD, "remember": True})
    body = r.json()
    assert body["status"] == "otp_required" and body["purpose"] == "login"
    assert body["masked_email"] == "a***a@example.com"

    good = ctx.outbox.last_code(EMAIL)
    bad = "000000" if good != "000000" else "111111"
    for remaining in (4, 3, 2, 1):
        r = ctx.post("/otp/verify", json={"challenge_id": body["challenge_id"], "code": bad})
        assert r.status_code == 400
        assert r.json()["detail"]["attempts_remaining"] == remaining
    r = ctx.post("/otp/verify", json={"challenge_id": body["challenge_id"], "code": bad})
    assert r.json()["detail"]["code"] == "otp_locked"
    # Even the right code is rejected once locked.
    r = ctx.post("/otp/verify", json={"challenge_id": body["challenge_id"], "code": good})
    assert r.json()["detail"]["code"] == "otp_locked"


def test_login_otp_success_sets_persistent_cookie(ctx: Ctx) -> None:
    signup_and_verify(ctx)
    r = ctx.post("/login", json={"email": EMAIL, "password": PASSWORD, "remember": True})
    cid = r.json()["challenge_id"]
    r = ctx.post("/otp/verify", json={"challenge_id": cid, "code": ctx.outbox.last_code(EMAIL)})
    assert r.status_code == 200
    assert "Max-Age=" in r.headers["set-cookie"]
    # Single use
    r = ctx.post("/otp/verify", json={"challenge_id": cid, "code": ctx.outbox.last_code(EMAIL)})
    assert r.json()["detail"]["code"] == "challenge_invalid"


def test_login_without_otp_policy() -> None:
    for c in build_ctx(make_settings(login_otp_required=False)):
        signup_and_verify(c)
        r = c.post("/login", json={"email": EMAIL, "password": PASSWORD})
        assert r.json()["status"] == "authenticated"


def test_unverified_user_login_gets_signup_challenge(ctx: Ctx) -> None:
    ctx.post("/signup", json={"name": "Ada", "email": EMAIL, "password": PASSWORD})
    r = ctx.post("/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.json()["purpose"] == "signup"


def test_resend_rotates_code_and_respects_cooldown() -> None:
    for c in build_ctx(make_settings(otp_resend_cooldown_seconds=30)):
        r = c.post("/signup", json={"name": "Ada", "email": EMAIL, "password": PASSWORD})
        cid = r.json()["challenge_id"]
        r = c.post("/otp/resend", json={"challenge_id": cid})
        assert r.status_code == 429 and r.json()["detail"]["code"] == "resend_cooldown"
        assert int(r.headers["retry-after"]) > 0

    for c in build_ctx(make_settings()):
        r = c.post("/signup", json={"name": "Ada", "email": EMAIL, "password": PASSWORD})
        cid = r.json()["challenge_id"]
        first = c.outbox.last_code(EMAIL)
        r = c.post("/otp/resend", json={"challenge_id": cid})
        assert r.status_code == 200 and r.json()["resends_remaining"] == 4
        assert len(c.outbox.messages) == 2
        if c.outbox.last_code(EMAIL) != first:
            r = c.post("/otp/verify", json={"challenge_id": cid, "code": first})
            assert r.status_code == 400


def test_challenge_info_endpoint(ctx: Ctx) -> None:
    r = ctx.post("/signup", json={"name": "Ada", "email": EMAIL, "password": PASSWORD})
    cid = r.json()["challenge_id"]
    info = ctx.get(f"/otp/{cid}").json()
    assert info["challenge_id"] == cid and info["code_length"] == 6
    assert ctx.get("/otp/doesnotexist-doesnotexist").status_code == 404


# --- Anti-enumeration -----------------------------------------------------------------
def test_signup_with_existing_email_is_indistinguishable(ctx: Ctx) -> None:
    signup_and_verify(ctx)
    r = ctx.post("/signup", json={"name": "Mallory", "email": EMAIL, "password": "Other1234"})
    assert r.status_code == 202 and r.json()["status"] == "otp_required"
    # Owner gets an "account exists" notice, not a code; nothing can verify the decoy.
    assert "already have an account" in ctx.outbox.messages[-1][1]
    cid = r.json()["challenge_id"]
    for code in ("000000", "123456"):
        r = ctx.post("/otp/verify", json={"challenge_id": cid, "code": code})
        assert r.status_code == 400 and r.json()["detail"]["code"] == "otp_invalid"


def test_forgot_password_unknown_email_returns_same_shape(ctx: Ctx) -> None:
    r = ctx.post("/password/forgot", json={"email": "nobody@example.com"})
    assert r.status_code == 202 and r.json()["status"] == "otp_required"
    assert ctx.outbox.messages == []


def test_password_reset_flow(ctx: Ctx) -> None:
    signup_and_verify(ctx)
    r = ctx.post("/password/forgot", json={"email": EMAIL})
    cid = r.json()["challenge_id"]
    code = ctx.outbox.last_code(EMAIL)
    assert ctx.post("/password/reset", json={"challenge_id": cid, "code": code, "new_password": "weak"}).status_code == 422
    r = ctx.post("/password/reset", json={"challenge_id": cid, "code": code, "new_password": "BrandNew123"})
    assert r.status_code == 204
    assert ctx.post("/refresh", headers=CSRF).status_code == 401  # all sessions revoked
    assert ctx.post("/login", json={"email": EMAIL, "password": PASSWORD}).status_code == 401
    assert ctx.post("/login", json={"email": EMAIL, "password": "BrandNew123"}).status_code == 200


# --- OAuth ----------------------------------------------------------------------------
def _google_mocks(ctx: Ctx, email: str, verified: bool = True) -> None:
    ctx.provider_routes["POST https://oauth2.googleapis.com/token"] = httpx.Response(
        200, json={"access_token": "g-token", "token_type": "Bearer"}
    )
    ctx.provider_routes["GET https://openidconnect.googleapis.com/v1/userinfo"] = httpx.Response(
        200, json={"sub": "google-123", "email": email, "email_verified": verified, "name": "Ada G"}
    )


def _start_oauth(ctx: Ctx, provider: str) -> str:
    r = ctx.get(f"/oauth/{provider}/authorize", params={"remember": "true"}, follow_redirects=False)
    assert r.status_code == 302
    return parse_qs(urlparse(r.headers["location"]).query)["state"][0]


def test_oauth_providers_listing(ctx: Ctx) -> None:
    assert sorted(ctx.get("/oauth/providers").json()["providers"]) == ["github", "google"]
    for c in build_ctx(make_settings(github_client_id=None)):
        assert c.get("/oauth/providers").json()["providers"] == ["google"]
        assert c.get("/oauth/github/authorize", follow_redirects=False).status_code == 404


def test_google_oauth_creates_user_and_session(ctx: Ctx) -> None:
    _google_mocks(ctx, "grace@example.com")
    state = _start_oauth(ctx, "google")
    r = ctx.get("/oauth/google/callback", params={"code": "abc", "state": state}, follow_redirects=False)
    assert r.status_code == 302
    assert r.headers["location"] == "http://localhost:5173/auth/callback?status=success"
    r = ctx.post("/refresh", headers=CSRF)
    assert r.status_code == 200
    user = r.json()["user"]
    assert user["email"] == "grace@example.com" and user["has_password"] is False


def test_oauth_rejects_bad_state(ctx: Ctx) -> None:
    _google_mocks(ctx, "grace@example.com")
    _start_oauth(ctx, "google")
    r = ctx.get("/oauth/google/callback", params={"code": "abc", "state": "forged"}, follow_redirects=False)
    assert "error=invalid_state" in r.headers["location"]


def test_oauth_rejects_unverified_email(ctx: Ctx) -> None:
    _google_mocks(ctx, "grace@example.com", verified=False)
    state = _start_oauth(ctx, "google")
    r = ctx.get("/oauth/google/callback", params={"code": "abc", "state": state}, follow_redirects=False)
    assert "error=email_unverified" in r.headers["location"]


def test_oauth_wipes_password_of_unverified_squatter(ctx: Ctx) -> None:
    # Attacker pre-registers the victim's email but can't verify it.
    ctx.post("/signup", json={"name": "Mallory", "email": "victim@example.com", "password": "Attacker123"})
    _google_mocks(ctx, "victim@example.com")
    state = _start_oauth(ctx, "google")
    ctx.get("/oauth/google/callback", params={"code": "abc", "state": state}, follow_redirects=False)
    r = ctx.post("/login", json={"email": "victim@example.com", "password": "Attacker123"})
    assert r.status_code == 401


def test_github_oauth_uses_verified_primary_email(ctx: Ctx) -> None:
    ctx.provider_routes["POST https://github.com/login/oauth/access_token"] = httpx.Response(
        200, json={"access_token": "gh-token"}
    )
    ctx.provider_routes["GET https://api.github.com/user"] = httpx.Response(
        200, json={"id": 42, "login": "octo", "name": None, "email": None}
    )
    ctx.provider_routes["GET https://api.github.com/user/emails"] = httpx.Response(
        200,
        json=[
            {"email": "old@example.com", "verified": False, "primary": False},
            {"email": "octo@example.com", "verified": True, "primary": True},
        ],
    )
    state = _start_oauth(ctx, "github")
    r = ctx.get("/oauth/github/callback", params={"code": "abc", "state": state}, follow_redirects=False)
    assert "status=success" in r.headers["location"]
    assert ctx.post("/refresh", headers=CSRF).json()["user"]["email"] == "octo@example.com"


def test_oauth_with_required_otp_redirects_to_verify() -> None:
    for c in build_ctx(make_settings(oauth_require_otp=True)):
        _google_mocks(c, "grace@example.com")
        state = _start_oauth(c, "google")
        r = c.get("/oauth/google/callback", params={"code": "abc", "state": state}, follow_redirects=False)
        loc = urlparse(r.headers["location"])
        assert loc.path == "/verify"
        cid = parse_qs(loc.query)["challenge"][0]
        r = c.post("/otp/verify", json={"challenge_id": cid, "code": c.outbox.last_code("grace@example.com")})
        assert r.status_code == 200 and r.json()["status"] == "authenticated"
