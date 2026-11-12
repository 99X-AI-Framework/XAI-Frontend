from datetime import UTC, datetime


def utcnow() -> datetime:
    """Naive UTC timestamp (SQLite drops tzinfo, so we store naive UTC everywhere)."""
    return datetime.now(UTC).replace(tzinfo=None)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return email
    masked = f"{local[0]}***{local[-1]}" if len(local) > 2 else f"{local[:1]}***"
    return f"{masked}@{domain}"

