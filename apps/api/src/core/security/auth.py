"""
Supabase JWT doğrulama ve FastAPI auth bağımlılıkları.

SCALD web uygulaması kimlik doğrulamayı Supabase üzerinden yapar. Bu backend
kendi oturumunu tutmaz; gelen isteklerdeki `Authorization: Bearer <access_token>`
başlığındaki Supabase access token'ını doğrular.

Token, Supabase tarafından HS256 ile `SUPABASE_JWT_SECRET` kullanılarak imzalanır
(self-hosted Supabase docker .env'indeki JWT_SECRET ile aynı değer).

GÜVENLİK: `SUPABASE_JWT_SECRET` boşsa korumalı endpoint'ler fail-closed davranır
(503) — yani yanlış yapılandırma "açık kapı" değil, "kapalı kapı" üretir.
"""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from src.core.config.settings import settings

# auto_error=False: başlık yoksa 403 yerine None döner; kararı biz veririz.
_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthUser:
    """Doğrulanmış Supabase kullanıcısının token'dan çıkarılan kimliği."""

    id: str
    email: str | None
    role: str | None


async def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    """
    Geçerli bir Supabase access token'ı zorunlu kılar.

    Raises:
        503 — sunucuda SUPABASE_JWT_SECRET tanımlı değil (fail-closed).
        401 — token yok, geçersiz, süresi dolmuş veya sub claim'i eksik.
    """
    if not settings.SUPABASE_JWT_SECRET:
        # Fail-closed: yapılandırma eksikse erişimi reddet.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth not configured (SUPABASE_JWT_SECRET missing).",
        )

    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience=settings.SUPABASE_JWT_AUDIENCE,
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: no subject.",
        )

    return AuthUser(
        id=subject,
        email=payload.get("email"),
        role=payload.get("role"),
    )
