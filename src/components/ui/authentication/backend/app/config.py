"""Runtime configuration (12-factor: everything comes from env / .env)."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_PREFIX = "/api/v1/auth"

_DEV_JWT_SECRET = "dev-only-jwt-secret-change-me-0123456789abcdef"
_DEV_OTP_PEPPER = "dev-only-otp-pepper-change-me-0123456789abcdef"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "XAI Governance"
    environment: Literal["development", "test", "production"] = "development"

    # --- Infrastructure -----------------------------------------------------------
    database_url: str = "sqlite+aiosqlite:///./auth.db"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    # JSON list in env, e.g. CORS_ORIGINS='["http://localhost:5173"]'
    cors_origins: list[str] = ["http://localhost:5173"]
    rate_limit_enabled: bool = True

    # --- Tokens / sessions --------------------------------------------------------
    jwt_secret: str = Field(default=_DEV_JWT_SECRET, min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_ttl_seconds: int = 15 * 60
    refresh_ttl_days_remember: int = 30  # "Remember for 30 days"
    refresh_ttl_hours_session: int = 12  # browser-session cookie
    refresh_cookie_name: str = "xai_refresh"
    cookie_secure: bool = False  # MUST be true in production (HTTPS)
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: str | None = None

    # --- OTP ----------------------------------------------------------------------
    otp_pepper: str = Field(default=_DEV_OTP_PEPPER, min_length=32)
    otp_length: int = Field(default=6, ge=4, le=8)
    otp_ttl_seconds: int = 10 * 60
    otp_max_attempts: int = 5
    otp_resend_cooldown_seconds: int = 30
    otp_max_resends: int = 5

    # --- Policy switches ----------------------------------------------------------
    login_otp_required: bool = True  # email OTP as 2nd factor on every password login
    oauth_require_otp: bool = False  # also demand email OTP after Google/GitHub sign-in

    # --- OAuth providers (a provider is enabled iff both values are set) ----------
    google_client_id: str | None = None
    google_client_secret: str | None = None
    github_client_id: str | None = None
    github_client_secret: str | None = None

    # --- Email --------------------------------------------------------------------
    email_backend: Literal["console", "smtp"] = "console"
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "XAI Governance <no-reply@localhost>"
    smtp_starttls: bool = True

    @model_validator(mode="after")
    def _guard_production(self) -> "Settings":
        if self.environment != "production":
            return self
        problems = []
        if self.jwt_secret == _DEV_JWT_SECRET:
            problems.append("JWT_SECRET must be set")
        if self.otp_pepper == _DEV_OTP_PEPPER:
            problems.append("OTP_PEPPER must be set")
        if not self.cookie_secure:
            problems.append("COOKIE_SECURE must be true")
        if self.email_backend == "console":
            problems.append("EMAIL_BACKEND must not be 'console'")
        if problems:
            raise ValueError("Unsafe production config: " + "; ".join(problems))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

