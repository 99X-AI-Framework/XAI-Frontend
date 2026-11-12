"""Single error envelope for the whole auth API.

Every failure is returned as: {"detail": {"code": "<machine_code>", "message": "<human text>", ...extra}}
The frontend switches on `code`, and shows `message`.
"""

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class AuthError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        *,
        retry_after: int | None = None,
        clear_refresh_cookie: bool = False,
        **extra: Any,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.retry_after = retry_after
        self.clear_refresh_cookie = clear_refresh_cookie
        self.extra = extra


async def auth_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AuthError)
    detail: dict[str, Any] = {"code": exc.code, "message": exc.message, **exc.extra}
    headers: dict[str, str] = {}
    if exc.retry_after is not None:
        detail["retry_after"] = exc.retry_after
        headers["Retry-After"] = str(exc.retry_after)
    response = JSONResponse({"detail": detail}, status_code=exc.status_code, headers=headers)
    if exc.clear_refresh_cookie:
        from .sessions import clear_refresh_cookie

        clear_refresh_cookie(response, request.app.state.settings)
    return response

