from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.security import require_admin_user

router = APIRouter(prefix="/uploads", tags=["uploads"])
settings = get_settings()
ALLOWED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 2 * 1024 * 1024


@router.post("/images", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    _: object = Depends(require_admin_user),
):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only jpg, jpeg, png, and webp files are allowed.",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be smaller than 2 MB.",
        )

    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"{uuid4().hex}{suffix}"
    destination = settings.uploads_dir / file_name
    destination.write_bytes(content)
    return {"url": f"/uploads/{file_name}", "file_name": file_name}

