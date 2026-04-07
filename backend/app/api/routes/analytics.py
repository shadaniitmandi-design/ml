from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_user
from app.models.contact import ContactSubmission
from app.models.enums import EventStatus, ProjectStatus, TeamRole
from app.models.event import Event
from app.models.project import Project
from app.models.team import TeamMember
from app.schemas.analytics import AnalyticsOverview

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsOverview)
def get_analytics(
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    return AnalyticsOverview(
        total_events=db.scalar(select(func.count()).select_from(Event)) or 0,
        upcoming_events=db.scalar(
            select(func.count()).select_from(Event).where(Event.status == EventStatus.upcoming)
        )
        or 0,
        total_team_members=db.scalar(select(func.count()).select_from(TeamMember)) or 0,
        core_team_members=db.scalar(
            select(func.count()).select_from(TeamMember).where(TeamMember.role == TeamRole.core)
        )
        or 0,
        approved_projects=db.scalar(
            select(func.count()).select_from(Project).where(Project.status == ProjectStatus.approved)
        )
        or 0,
        pending_projects=db.scalar(
            select(func.count()).select_from(Project).where(Project.status == ProjectStatus.pending)
        )
        or 0,
        contact_submissions=db.scalar(select(func.count()).select_from(ContactSubmission)) or 0,
    )

