from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path


class Settings:
    def __init__(self) -> None:
        backend_dir = Path(__file__).resolve().parents[2]
        self.project_name = "KP Dev Cell API"
        self.api_prefix = "/api"
        self.backend_dir = backend_dir
        self.uploads_dir = backend_dir / "app" / "uploads"
        default_sqlite_path = backend_dir / "kp_dev_cell.db"
        self.database_url = os.getenv(
            "DATABASE_URL",
            f"sqlite:///{default_sqlite_path}",
        )
        self.cors_origins = [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://localhost:4173,http://localhost:8080",
            ).split(",")
            if origin.strip()
        ]
        self.firebase_project_id = os.getenv("FIREBASE_PROJECT_ID", "")
        self.firebase_client_email = os.getenv("FIREBASE_CLIENT_EMAIL", "")
        self.firebase_private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
        self.dev_auth_bypass = os.getenv("DEV_AUTH_BYPASS", "false").lower() == "true"
        self.dev_admin_email = os.getenv("DEV_ADMIN_EMAIL", "admin@kpdevcell.dev")
        self.admin_emails = {
            email.strip().lower()
            for email in os.getenv("ADMIN_EMAILS", self.dev_admin_email).split(",")
            if email.strip()
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()

