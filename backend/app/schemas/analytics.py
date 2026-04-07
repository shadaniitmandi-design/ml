from pydantic import BaseModel


class AnalyticsOverview(BaseModel):
    total_events: int
    upcoming_events: int
    total_team_members: int
    core_team_members: int
    approved_projects: int
    pending_projects: int
    contact_submissions: int


class HomeOverview(BaseModel):
    headline_stats: list[dict[str, str | int]]
    featured_events: list[dict]
    featured_projects: list[dict]
    team_spotlight: list[dict]

