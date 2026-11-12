"""Sliding-window rate limiter.

In-memory = correct for a single process only. For multiple workers/instances swap the
storage for Redis (same interface: `hit(key, limit, window)`).
"""

import math
import time
from collections import defaultdict, deque

from .errors import AuthError

# (limit, window_seconds)
RULES: dict[str, tuple[int, int]] = {
    "signup:ip": (10, 600),
    "signup:email": (3, 600),
    "login:ip": (20, 300),
    "login:email": (8, 300),
    "otp_verify:ip": (30, 300),
    "otp_resend:ip": (10, 600),
    "otp_info:ip": (60, 300),
    "forgot:ip": (5, 900),
    "forgot:email": (3, 900),
    "oauth:ip": (30, 300),
    "refresh:ip": (60, 60),
}


class RateLimiter:
    def __init__(self, enabled: bool = True) -> None:
        self.enabled = enabled
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, rule: str, subject: str) -> None:
        if not self.enabled:
            return
        limit, window = RULES[rule]
        key = f"{rule}:{subject}"
        now = time.monotonic()
        bucket = self._hits[key]
        while bucket and bucket[0] <= now - window:
            bucket.popleft()
        if len(bucket) >= limit:
            retry_after = max(1, math.ceil(bucket[0] + window - now))
            raise AuthError(
                429, "rate_limited", "Too many requests. Please try again later.", retry_after=retry_after
            )
        bucket.append(now)

