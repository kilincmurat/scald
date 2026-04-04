"""Auth and user schemas."""
import uuid
from pydantic import EmailStr, Field
from .base import SCАLDBaseModel, SCАLDBaseResponse
from src.db.models.enums import UserRole

SUPPORTED_LOCALES = {"tr", "en", "el", "ro", "mk"}


class UserCreate(SCАLDBaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str | None = Field(None, max_length=255)
    organization_id: uuid.UUID | None = None
    preferred_locale: str = "tr"
    role: UserRole = UserRole.VIEWER


class UserUpdate(SCАLDBaseModel):
    full_name: str | None = None
    preferred_locale: str | None = None
    is_active: bool | None = None
    role: UserRole | None = None


class UserResponse(SCАLDBaseResponse):
    email: str
    full_name: str | None
    role: UserRole
    preferred_locale: str
    is_active: bool
    organization_id: uuid.UUID | None


class TokenResponse(SCАLDBaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class LoginRequest(SCАLDBaseModel):
    email: EmailStr
    password: str
