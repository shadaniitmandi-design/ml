from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, HttpUrl, field_validator

from app.models.enums import ProjectStatus


class ProjectBase(BaseModel):
    title: str
    summary: str
    description: str
    tech_stack: list[str]
    contributor_names: list[str]
    github_url: HttpUrl | None = None
    live_url: HttpUrl | None = None
    image_url: str | None = None
    submitted_by_name: str
    submitted_by_email: EmailStr
    featured: bool = False

    @field_validator("title", "summary", "submitted_by_name")
    @classmethod
    def validate_short_text(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Value is too short.")
        return value

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 30:
            raise ValueError("Description must be at least 30 characters long.")
        return value

    @field_validator("tech_stack", "contributor_names")
    @classmethod
    def validate_lists(cls, value: list[str]) -> list[str]:
        clean = [item.strip() for item in value if item.strip()]
        if not clean:
            raise ValueError("At least one item is required.")
        return clean


class ProjectSubmissionCreate(ProjectBase):
    pass


class ProjectAdminCreate(ProjectBase):
    status: ProjectStatus = ProjectStatus.approved


class ProjectUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    description: str | None = None
    tech_stack: list[str] | None = None
    contributor_names: list[str] | None = None
    github_url: HttpUrl | None = None
    live_url: HttpUrl | None = None
    image_url: str | None = None
    submitted_by_name: str | None = None
    submitted_by_email: EmailStr | None = None
    status: ProjectStatus | None = None
    featured: bool | None = None


class ProjectRead(ProjectBase):
    id: int
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectStatusUpdate(BaseModel):
    status: ProjectStatus

