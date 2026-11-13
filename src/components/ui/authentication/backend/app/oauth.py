"""Google (OIDC) and GitHub (OAuth 2.0) authorization-code flow with PKCE, done server-side.

The browser never sees provider tokens; the backend exchanges the code, reads a *verified*
email, links/creates the local user and then issues our own session.
"""

import base64
import hashlib
import secrets
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from .config import API_PREFIX, Settings


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    client_id: str
    client_secret: str
    authorize_url: str
    token_url: str
    scopes: tuple[str, ...]
    extra_params: tuple[tuple[str, str], ...] = ()


@dataclass(frozen=True)
class OAuthIdentity:
    provider: str
    subject: str  # stable provider user id (Google `sub`, GitHub numeric `id`)
    email: str | None
    email_verified: bool
    name: str | None


class OAuthError(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def enabled_providers(s: Settings) -> dict[str, ProviderConfig]:
    providers: dict[str, ProviderConfig] = {}
    if s.google_client_id and s.google_client_secret:
        providers["google"] = ProviderConfig(
            name="google",
            client_id=s.google_client_id,
            client_secret=s.google_client_secret,
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=("openid", "email", "profile"),
            extra_params=(("prompt", "select_account"), ("access_type", "online")),
        )
    if s.github_client_id and s.github_client_secret:
        providers["github"] = ProviderConfig(
            name="github",
            client_id=s.github_client_id,
            client_secret=s.github_client_secret,
            authorize_url="https://github.com/login/oauth/authorize",
            token_url="https://github.com/login/oauth/access_token",
            scopes=("read:user", "user:email"),
            extra_params=(("allow_signup", "true"),),
        )
    return providers


def redirect_uri(s: Settings, provider: str) -> str:
    return f"{s.backend_url.rstrip('/')}{API_PREFIX}/oauth/{provider}/callback"


def pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


def build_authorize_url(cfg: ProviderConfig, s: Settings, *, state: str, code_challenge: str) -> str:
    params = {
        "client_id": cfg.client_id,
        "redirect_uri": redirect_uri(s, cfg.name),
        "response_type": "code",
        "scope": " ".join(cfg.scopes),
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        **dict(cfg.extra_params),
    }
    return f"{cfg.authorize_url}?{urlencode(params)}"


async def exchange_code(
    cfg: ProviderConfig, s: Settings, client: httpx.AsyncClient, *, code: str, verifier: str
) -> str:
    resp = await client.post(
        cfg.token_url,
        data={
            "client_id": cfg.client_id,
            "client_secret": cfg.client_secret,
            "code": code,
            "redirect_uri": redirect_uri(s, cfg.name),
            "grant_type": "authorization_code",
            "code_verifier": verifier,
        },
        headers={"Accept": "application/json"},
    )
    data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
    # GitHub returns HTTP 200 with {"error": ...} on failure, so check the body too.
    token = data.get("access_token")
    if resp.status_code != 200 or not token:
        raise OAuthError("token_exchange_failed")
    return str(token)


async def fetch_identity(cfg: ProviderConfig, client: httpx.AsyncClient, access_token: str) -> OAuthIdentity:
    auth = {"Authorization": f"Bearer {access_token}"}
    if cfg.name == "google":
        r = await client.get("https://openidconnect.googleapis.com/v1/userinfo", headers=auth)
        if r.status_code != 200:
            raise OAuthError("profile_fetch_failed")
        info = r.json()
        return OAuthIdentity(
            provider="google",
            subject=str(info["sub"]),
            email=info.get("email"),
            email_verified=bool(info.get("email_verified")),
            name=info.get("name"),
        )

    if cfg.name == "github":
        gh = {**auth, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
        r = await client.get("https://api.github.com/user", headers=gh)
        if r.status_code != 200:
            raise OAuthError("profile_fetch_failed")
        profile = r.json()
        # The public profile email may be hidden/unverified; /user/emails is authoritative.
        er = await client.get("https://api.github.com/user/emails", headers=gh)
        emails = er.json() if er.status_code == 200 else []
        verified = [e for e in emails if e.get("verified")]
        chosen = next((e for e in verified if e.get("primary")), verified[0] if verified else None)
        return OAuthIdentity(
            provider="github",
            subject=str(profile["id"]),
            email=chosen["email"] if chosen else None,
            email_verified=chosen is not None,
            name=profile.get("name") or profile.get("login"),
        )

    raise OAuthError("unsupported_provider")

