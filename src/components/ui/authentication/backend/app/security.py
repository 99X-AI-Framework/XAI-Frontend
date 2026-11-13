import hashlib
import secrets
import time
import uuid
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from .config import Settings

_hasher = PasswordHasher()  # Argon2id with library defaults
_DUMMY_HASH = _hasher.hash("timing-equalizer-not-a-real-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """Constant-ish time: always runs one Argon2 verify, even for unknown users."""
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def new_opaque_token(nbytes: int = 48) -> str:
    return secrets.token_urlsafe(nbytes)


def create_access_token(settings: Settings, user_id: str) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "type": "access",
        "iat": now,
        "exp": now + settings.access_token_ttl_seconds,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(settings: Settings, token: str) -> dict[str, Any]:
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["exp", "iat", "sub"]},
    )
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("wrong token type")
    return payload


def sign_state(settings: Settings, data: dict[str, Any], ttl_seconds: int) -> str:
    now = int(time.time())
    return jwt.encode(
        {**data, "type": "oauth_state", "iat": now, "exp": now + ttl_seconds},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def verify_state(settings: Settings, token: str) -> dict[str, Any]:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != "oauth_state":
        raise jwt.InvalidTokenError("wrong token type")
    return payload

