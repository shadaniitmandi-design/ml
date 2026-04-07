from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, HttpUrl, field_validator, model_validator

from app.models.enums import EventStatus


class EventBase(BaseModel):
    title: str
    description: str
    location: str
    start_at: datetime
    end_at: datetime
    status: EventStatus = EventStatus.upcoming
    registration_url: HttpUrl | None = None
    cover_image: str | None = None
    featured: bool = False

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Title must be at least 3 characters long.")
        return value

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 20:
            raise ValueError("Description must be at least 20 characters long.")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_at <= self.start_at:
            raise ValueError("End time must be after start time.")
        return self


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    status: EventStatus | None = None
    registration_url: HttpUrl | None = None
    cover_image: str | None = None
    featured: bool | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_at and self.end_at and self.end_at <= self.start_at:
            raise ValueError("End time must be after start time.")
        return self


class EventRead(EventBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

