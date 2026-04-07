from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_user
from app.models.enums import ProjectStatus
from app.models.project import Project
from app.schemas.project import (
    ProjectAdminCreate,
    ProjectRead,
    ProjectStatusUpdate,
    ProjectSubmissionCreate,
    ProjectUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
def list_public_projects(
    featured: bool | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(Project).where(Project.status == ProjectStatus.approved).order_by(Project.created_at.desc())
    if featured is not None:
        query = query.where(Project.featured == featured)
    if search:
        query = query.where(Project.title.ilike(f"%{search.strip()}%"))
    return db.execute(query).scalars().all()


@router.get("/admin", response_model=list[ProjectRead])
def list_all_projects(
    status_filter: ProjectStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    query = select(Project).order_by(Project.created_at.desc())
    if status_filter:
        query = query.where(Project.status == status_filter)
    return db.execute(query).scalars().all()


@router.post("/submissions", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def submit_project(payload: ProjectSubmissionCreate, db: Session = Depends(get_db)):
    project = Project(**payload.model_dump(mode="json"), status=ProjectStatus.pending)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_admin_project(
    payload: ProjectAdminCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    project = Project(**payload.model_dump(mode="json"))
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    for field, value in payload.model_dump(exclude_unset=True, mode="json").items():
        setattr(project, field, value)

    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}/status", response_model=ProjectRead)
def update_project_status(
    project_id: int,
    payload: ProjectStatusUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    project.status = payload.status
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    db.delete(project)
    db.commit()

