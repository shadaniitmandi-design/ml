from pydantic import BaseModel, EmailStr


class AuthUser(BaseModel):
    uid: str
    email: EmailStr | None = None
    name: str | None = None
    is_admin: bool = False

