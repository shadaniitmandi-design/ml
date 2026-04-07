from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.models.enums import ContactStatus


class ContactSubmissionCreate(BaseModel):
    name: str
    email: EmailStr
    message: str
    interest_area: str

    @field_validator("name", "interest_area")
    @classmethod
    def validate_short_text(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Value is too short.")
        return value

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 20:
            raise ValueError("Message must be at least 20 characters long.")
        return value


class ContactSubmissionRead(ContactSubmissionCreate):
    id: int
    status: ContactStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContactStatusUpdate(BaseModel):
    status: ContactStatus

