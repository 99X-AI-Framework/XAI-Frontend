"""Email delivery. Sending happens in FastAPI BackgroundTasks so response latency doesn't
reveal whether an email was actually sent (anti-enumeration)."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage
from typing import Protocol

from .config import Settings
from .models import OtpPurpose

log = logging.getLogger("auth.email")


class EmailSender(Protocol):
    async def send(self, to: str, subject: str, body: str) -> None: ...


class ConsoleEmailSender:
    """Development only: prints emails (including OTP codes) to the server log."""

    async def send(self, to: str, subject: str, body: str) -> None:
        log.warning("\n=== DEV EMAIL ===\nTo: %s\nSubject: %s\n\n%s\n=================", to, subject, body)


class SmtpEmailSender:
    def __init__(self, settings: Settings) -> None:
        self.s = settings

    def _send_sync(self, to: str, subject: str, body: str) -> None:
        msg = EmailMessage()
        msg["From"] = self.s.smtp_from
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(self.s.smtp_host, self.s.smtp_port, timeout=15) as smtp:
            if self.s.smtp_starttls:
                smtp.starttls()
            if self.s.smtp_username and self.s.smtp_password:
                smtp.login(self.s.smtp_username, self.s.smtp_password)
            smtp.send_message(msg)

    async def send(self, to: str, subject: str, body: str) -> None:
        await asyncio.to_thread(self._send_sync, to, subject, body)


def build_email_sender(settings: Settings) -> EmailSender:
    return SmtpEmailSender(settings) if settings.email_backend == "smtp" else ConsoleEmailSender()


async def send_safely(sender: EmailSender, to: str, subject: str, body: str) -> None:
    try:
        await sender.send(to, subject, body)
    except Exception:  # never crash the worker; alert on this log line instead
        log.exception("Failed to send email to %s (%s)", to, subject)


# --- Templates ----------------------------------------------------------------------
_PURPOSE_COPY = {
    OtpPurpose.SIGNUP: ("Verify your email", "to finish creating your account"),
    OtpPurpose.LOGIN: ("Your sign-in code", "to sign in"),
    OtpPurpose.OAUTH: ("Your sign-in code", "to finish signing in"),
    OtpPurpose.PASSWORD_RESET: ("Reset your password", "to reset your password"),
}


def otp_email(settings: Settings, purpose: OtpPurpose, code: str) -> tuple[str, str]:
    title, action = _PURPOSE_COPY[purpose]
    minutes = settings.otp_ttl_seconds // 60
    body = (
        f"Your {settings.app_name} verification code is:\n\n"
        f"    {code}\n\n"
        f"Enter it {action}. It expires in {minutes} minutes.\n"
        "If you didn't request this, you can ignore this email. Never share this code."
    )
    return f"{title} - {settings.app_name}", body


def account_exists_email(settings: Settings) -> tuple[str, str]:
    body = (
        f"Someone tried to create a {settings.app_name} account with this email, "
        "but you already have one.\n\n"
        f"Sign in: {settings.frontend_url}/login\n"
        f"Forgot your password? {settings.frontend_url}/forgot-password\n\n"
        "If this wasn't you, no action is needed."
    )
    return f"You already have an account - {settings.app_name}", body


def password_changed_email(settings: Settings) -> tuple[str, str]:
    body = (
        f"The password for your {settings.app_name} account was just changed and all "
        "sessions were signed out.\n\nIf this wasn't you, reset your password immediately: "
        f"{settings.frontend_url}/forgot-password"
    )
    return f"Your password was changed - {settings.app_name}", body

