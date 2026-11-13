import re
from collections.abc import Iterator
from dataclasses import dataclass, field

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import API_PREFIX, Settings
from app.main import create_app


@dataclass
class Outbox:
    messages: list[tuple[str, str, str]] = field(default_factory=list)

    async def send(self, to: str, subject: str, body: str) -> None:
        self.messages.append((to, subject, body))

    def last_code(self, to: str) -> str:
        for rcpt, _, body in reversed(self.messages):
            if rcpt == to and (m := re.search(r"^\s+(\d{6})$", body, re.M)):
                return m.group(1)
        raise AssertionError(f"no OTP email for {to}")


def make_settings(**overrides: object) -> Settings:
    base: dict[str, object] = {
        "environment": "test",
        "database_url": "sqlite+aiosqlite:///:memory:",
        "rate_limit_enabled": False,
        "otp_resend_cooldown_seconds": 0,
        "google_client_id": "gid",
        "google_client_secret": "gsecret",
        "github_client_id": "ghid",
        "github_client_secret": "ghsecret",
    }
    base.update(overrides)
    return Settings(_env_file=None, **base)  # type: ignore[call-arg]


@dataclass
class Ctx:
    client: TestClient
    outbox: Outbox
    provider_routes: dict[str, httpx.Response]

    def post(self, path: str, **kw: object) -> httpx.Response:
        return self.client.post(f"{API_PREFIX}{path}", **kw)  # type: ignore[arg-type]

    def get(self, path: str, **kw: object) -> httpx.Response:
        return self.client.get(f"{API_PREFIX}{path}", **kw)  # type: ignore[arg-type]


def build_ctx(settings: Settings) -> Iterator[Ctx]:
    outbox = Outbox()
    routes: dict[str, httpx.Response] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        key = f"{request.method} {request.url.copy_with(query=None)}"
        if key not in routes:
            return httpx.Response(404, json={"error": "not mocked", "key": key})
        return routes[key]

    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app = create_app(settings, email_sender=outbox, http_client=http)
    with TestClient(app) as client:
        yield Ctx(client, outbox, routes)


@pytest.fixture
def ctx() -> Iterator[Ctx]:
    yield from build_ctx(make_settings())


CSRF = {"X-Requested-With": "XMLHttpRequest"}

