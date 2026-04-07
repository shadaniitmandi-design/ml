from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_user
from app.models.enums import TeamRole
from app.models.team import TeamMember
from app.schemas.team import TeamMemberCreate, TeamMemberRead, TeamMemberUpdate

router = APIRouter(prefix="/team", tags=["team"])


@router.get("", response_model=list[TeamMemberRead])
def list_team(
    role: TeamRole | None = Query(default=None),
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    query = select(TeamMember).order_by(TeamMember.order_index.asc(), TeamMember.name.asc())
    if role:
        query = query.where(TeamMember.role == role)
    if active_only:
        query = query.where(TeamMember.active.is_(True))
    return db.execute(query).scalars().all()


@router.post("", response_model=TeamMemberRead, status_code=status.HTTP_201_CREATED)
def create_team_member(
    payload: TeamMemberCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    team_member = TeamMember(**payload.model_dump(mode="json"))
    db.add(team_member)
    db.commit()
    db.refresh(team_member)
    return team_member


@router.put("/{member_id}", response_model=TeamMemberRead)
def update_team_member(
    member_id: int,
    payload: TeamMemberUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    team_member = db.get(TeamMember, member_id)
    if not team_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")

    for field, value in payload.model_dump(exclude_unset=True, mode="json").items():
        setattr(team_member, field, value)

    db.add(team_member)
    db.commit()
    db.refresh(team_member)
    return team_member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_member(
    member_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    team_member = db.get(TeamMember, member_id)
    if not team_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")

    db.delete(team_member)
    db.commit()

