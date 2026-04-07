from enum import Enum


class EventStatus(str, Enum):
    upcoming = "upcoming"
    completed = "completed"


class TeamRole(str, Enum):
    core = "core"
    member = "member"


class ProjectStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ContactStatus(str, Enum):
    new = "new"
    reviewed = "reviewed"
    archived = "archived"

