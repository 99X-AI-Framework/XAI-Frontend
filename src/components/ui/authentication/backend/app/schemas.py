import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .models import OtpPurpose

_CODE = r"^\d{4,8}$"


def _strong_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("Password must contain at least one letter and one number.")
    return value


# --- Requests -----------------------------------------------------------------------
class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(max_length=128)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required.")
        return v

    @field_validator("password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        return _strong_password(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    remember: bool = False


class VerifyOtpRequest(BaseModel):
    challenge_id: str = Field(min_length=16, max_length=64)
    code: str = Field(pattern=_CODE)


class ResendOtpRequest(BaseModel):
    challenge_id: str = Field(min_length=16, max_length=64)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    challenge_id: str = Field(min_length=16, max_length=64)
    code: str = Field(pattern=_CODE)
    new_password: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        return _strong_password(v)


# --- Responses ----------------------------------------------------------------------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    is_email_verified: bool
    has_password: bool
    created_at: datetime


class AuthenticatedResponse(BaseModel):
    status: Literal["authenticated"] = "authenticated"
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserOut


class OtpChallengeResponse(BaseModel):
    status: Literal["otp_required"] = "otp_required"
    challenge_id: str
    purpose: OtpPurpose
    masked_email: str
    code_length: int
    expires_in: int
    resend_available_in: int
    attempts_remaining: int
    resends_remaining: int


class OAuthProvidersResponse(BaseModel):
    providers: list[str]
