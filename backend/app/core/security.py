from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.schemas.auth import AuthUser

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)
_firebase_initialized = False


def _initialize_firebase() -> bool:
    global _firebase_initialized
    if _firebase_initialized:
        return True

    if not all(
        [
            settings.firebase_project_id,
            settings.firebase_client_email,
            settings.firebase_private_key,
        ]
    ):
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        return False

    if not firebase_admin._apps:
        firebase_admin.initialize_app(
            credentials.Certificate(
                {
                    "type": "service_account",
                    "project_id": settings.firebase_project_id,
                    "client_email": settings.firebase_client_email,
                    "private_key": settings.firebase_private_key,
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            )
        )

    _firebase_initialized = True
    return True


def _decode_token(token: str) -> AuthUser:
    if settings.dev_auth_bypass and token == "dev-bypass-token":
        return AuthUser(
            uid="dev-admin",
            email=settings.dev_admin_email,
            name="Local Dev Admin",
            is_admin=True,
        )

    if not _initialize_firebase():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth is not configured on the backend. Set Firebase credentials or enable dev bypass.",
        )

    from firebase_admin import auth

    try:
        decoded: dict[str, Any] = auth.verify_id_token(token, check_revoked=True)
    except Exception as exc:  # pragma: no cover - depends on external provider
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        ) from exc

    email = decoded.get("email")
    is_admin = bool(decoded.get("admin")) or bool(email and email.lower() in settings.admin_emails)
    return AuthUser(
        uid=str(decoded.get("uid")),
        email=email,
        name=decoded.get("name"),
        is_admin=is_admin,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required to access this resource.",
        )

    return _decode_token(credentials.credentials)


def require_admin_user(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required for this action.",
        )
    return user

