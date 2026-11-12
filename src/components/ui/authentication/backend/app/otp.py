"""OTP engine: issue / describe / resend / verify. Purpose-agnostic, reused by every flow."""

import hashlib
import hmac
import math
import secrets
from datetime import timedelta

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from .config import Settings
from .errors import AuthError
from .models import OtpChallenge, OtpPurpose
from .schemas import OtpChallengeResponse
from .utils import mask_email, utcnow


def _challenge_gone() -> AuthError:
    return AuthError(
        404, "challenge_invalid", "This verification session is no longer valid. Please start again."
    )


def _locked() -> AuthError:
    return AuthError(429, "otp_locked", "Too many incorrect attempts. Please start again.")


class OtpService:
    def __init__(self, settings: Settings) -> None:
        self.s = settings

    # -- primitives -------------------------------------------------------------------
    def _generate_code(self) -> str:
        return f"{secrets.randbelow(10**self.s.otp_length):0{self.s.otp_length}d}"

    def _hash(self, challenge_id: str, code: str) -> str:
        # Bound to the challenge id so a hash can't be replayed onto another challenge.
        msg = f"{challenge_id}:{code}".encode()
        return hmac.new(self.s.otp_pepper.encode(), msg, hashlib.sha256).hexdigest()

    # -- lifecycle --------------------------------------------------------------------
    async def issue(
        self,
        db: AsyncSession,
        *,
        email: str,
        purpose: OtpPurpose,
        user_id: str | None,
        remember: bool = False,
    ) -> tuple[OtpChallenge, str]:
        now = utcnow()
        # Only one live challenge per (email, purpose): older codes stop working.
        await db.execute(
            update(OtpChallenge)
            .where(
                OtpChallenge.email == email,
                OtpChallenge.purpose == purpose,
                OtpChallenge.consumed_at.is_(None),
            )
            .values(consumed_at=now)
        )
        challenge_id = secrets.token_urlsafe(32)
        code = self._generate_code()
        challenge = OtpChallenge(
            id=challenge_id,
            user_id=user_id,
            email=email,
            purpose=purpose,
            code_hash=self._hash(challenge_id, code),
            remember=remember,
            attempts=0,
            resend_count=0,
            expires_at=now + timedelta(seconds=self.s.otp_ttl_seconds),
            last_sent_at=now,
        )
        db.add(challenge)
        await db.flush()
        return challenge, code

    async def get_open(self, db: AsyncSession, challenge_id: str) -> OtpChallenge:
        challenge = await db.get(OtpChallenge, challenge_id)
        if challenge is None or challenge.consumed_at is not None:
            raise _challenge_gone()
        return challenge

    def describe(self, c: OtpChallenge) -> OtpChallengeResponse:
        now = utcnow()
        cooldown_ends = c.last_sent_at + timedelta(seconds=self.s.otp_resend_cooldown_seconds)
        return OtpChallengeResponse(
            challenge_id=c.id,
            purpose=c.purpose,
            masked_email=mask_email(c.email),
            expires_in=max(0, math.ceil((c.expires_at - now).total_seconds())),
            resend_available_in=max(0, math.ceil((cooldown_ends - now).total_seconds())),
            attempts_remaining=max(0, self.s.otp_max_attempts - c.attempts),
            resends_remaining=max(0, self.s.otp_max_resends - c.resend_count),
            code_length=self.s.otp_length,
        )

    async def resend(self, db: AsyncSession, challenge_id: str) -> tuple[OtpChallenge, str]:
        c = await self.get_open(db, challenge_id)
        if c.attempts >= self.s.otp_max_attempts:
            raise _locked()
        if c.resend_count >= self.s.otp_max_resends:
            raise AuthError(429, "resend_limit", "Resend limit reached. Please start again.")
        now = utcnow()
        wait = (c.last_sent_at + timedelta(seconds=self.s.otp_resend_cooldown_seconds) - now).total_seconds()
        if wait > 0:
            raise AuthError(
                429,
                "resend_cooldown",
                "Please wait before requesting another code.",
                retry_after=math.ceil(wait),
            )
        code = self._generate_code()
        c.code_hash = self._hash(c.id, code)
        c.resend_count += 1
        c.last_sent_at = now
        c.expires_at = now + timedelta(seconds=self.s.otp_ttl_seconds)
        await db.flush()
        return c, code

    async def verify(
        self, db: AsyncSession, challenge_id: str, code: str, allowed: set[OtpPurpose]
    ) -> OtpChallenge:
        c = await self.get_open(db, challenge_id)
        if c.purpose not in allowed:
            raise _challenge_gone()
        if c.expires_at <= utcnow():
            raise AuthError(410, "otp_expired", "This code has expired. Request a new one.")

        # Atomically count the attempt *before* checking it (race-safe brute-force cap).
        result = await db.execute(
            update(OtpChallenge)
            .where(
                OtpChallenge.id == c.id,
                OtpChallenge.consumed_at.is_(None),
                OtpChallenge.attempts < self.s.otp_max_attempts,
            )
            .values(attempts=OtpChallenge.attempts + 1)
        )
        await db.commit()  # persist the attempt even if we raise below
        if result.rowcount != 1:  # type: ignore[attr-defined]
            raise _locked()
        await db.refresh(c)

        valid = c.user_id is not None and hmac.compare_digest(c.code_hash, self._hash(c.id, code))
        if not valid:
            remaining = self.s.otp_max_attempts - c.attempts
            if remaining <= 0:
                raise _locked()
            raise AuthError(
                400, "otp_invalid", "Incorrect code. Please try again.", attempts_remaining=remaining
            )

        # Single use: only one concurrent request can win this update.
        consumed = await db.execute(
            update(OtpChallenge)
            .where(OtpChallenge.id == c.id, OtpChallenge.consumed_at.is_(None))
            .values(consumed_at=utcnow())
        )
        if consumed.rowcount != 1:  # type: ignore[attr-defined]
            raise _challenge_gone()
        return c
