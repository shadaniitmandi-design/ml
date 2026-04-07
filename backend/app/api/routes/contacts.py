from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_user
from app.models.contact import ContactSubmission
from app.schemas.contact import ContactStatusUpdate, ContactSubmissionCreate, ContactSubmissionRead

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", response_model=ContactSubmissionRead, status_code=status.HTTP_201_CREATED)
def create_contact_submission(payload: ContactSubmissionCreate, db: Session = Depends(get_db)):
    submission = ContactSubmission(**payload.model_dump(mode="json"))
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get("", response_model=list[ContactSubmissionRead])
def list_contact_submissions(
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    return db.execute(select(ContactSubmission).order_by(ContactSubmission.created_at.desc())).scalars().all()


@router.patch("/{submission_id}", response_model=ContactSubmissionRead)
def update_contact_submission(
    submission_id: int,
    payload: ContactStatusUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    submission = db.get(ContactSubmission, submission_id)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    submission.status = payload.status
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission

