from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.enums import EventStatus, ProjectStatus, TeamRole
from app.models.event import Event
from app.models.project import Project
from app.models.team import TeamMember
from app.schemas.analytics import HomeOverview
from app.schemas.event import EventRead
from app.schemas.project import ProjectRead
from app.schemas.team import TeamMemberRead

router = APIRouter(tags=["public"])


@router.get("/overview", response_model=HomeOverview)
def get_home_overview(db: Session = Depends(get_db)):
    featured_events = db.execute(
        select(Event)
        .where(Event.featured.is_(True))
        .order_by(Event.start_at.asc())
        .limit(3)
    ).scalars().all()
    featured_projects = db.execute(
        select(Project)
        .where(Project.status == ProjectStatus.approved, Project.featured.is_(True))
        .order_by(Project.updated_at.desc())
        .limit(3)
    ).scalars().all()
    team_spotlight = db.execute(
        select(TeamMember)
        .where(TeamMember.role == TeamRole.core, TeamMember.active.is_(True))
        .order_by(TeamMember.order_index.asc())
        .limit(4)
    ).scalars().all()

    return HomeOverview(
        headline_stats=[
            {"label": "Live products shipped", "value": len(featured_projects) + 9},
            {"label": "Builders across the club", "value": 120},
            {"label": "Upcoming sprints", "value": len([event for event in featured_events if event.status == EventStatus.upcoming])},
            {"label": "Core operators", "value": len(team_spotlight)},
        ],
        featured_events=[EventRead.model_validate(event).model_dump(mode="json") for event in featured_events],
        featured_projects=[ProjectRead.model_validate(project).model_dump(mode="json") for project in featured_projects],
        team_spotlight=[TeamMemberRead.model_validate(member).model_dump(mode="json") for member in team_spotlight],
    )

