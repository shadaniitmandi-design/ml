from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_user
from app.models.event import Event
from app.models.enums import EventStatus
from app.schemas.event import EventCreate, EventRead, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventRead])
def list_events(
    status_filter: EventStatus | None = Query(default=None, alias="status"),
    featured: bool | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(Event).order_by(Event.start_at.asc())
    if status_filter:
        query = query.where(Event.status == status_filter)
    if featured is not None:
        query = query.where(Event.featured == featured)
    if search:
        query = query.where(Event.title.ilike(f"%{search.strip()}%"))
    return db.execute(query).scalars().all()


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    data = payload.model_dump()
    if data.get("registration_url") is not None:
        data["registration_url"] = str(data["registration_url"])
    event = Event(**data)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("registration_url") is not None:
        updates["registration_url"] = str(updates["registration_url"])

    for field, value in updates.items():
        setattr(event, field, value)

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    db.delete(event)
    db.commit()
