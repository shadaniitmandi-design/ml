from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, HttpUrl, field_validator

from app.models.enums import TeamRole


class TeamMemberBase(BaseModel):
    name: str
    role: TeamRole
    title: str
    bio: str
    image_url: str | None = None
    linkedin_url: HttpUrl | None = None
    github_url: HttpUrl | None = None
    order_index: int = 0
    active: bool = True

    @field_validator("name", "title")
    @classmethod
    def validate_short_text(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Value is too short.")
        return value

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 20:
            raise ValueError("Bio must be at least 20 characters long.")
        return value


class TeamMemberCreate(TeamMemberBase):
    pass


class TeamMemberUpdate(BaseModel):
    name: str | None = None
    role: TeamRole | None = None
    title: str | None = None
    bio: str | None = None
    image_url: str | None = None
    linkedin_url: HttpUrl | None = None
    github_url: HttpUrl | None = None
    order_index: int | None = None
    active: bool | None = None


class TeamMemberRead(TeamMemberBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

