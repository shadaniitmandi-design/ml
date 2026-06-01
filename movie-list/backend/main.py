from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import struct
import zlib
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

ROOT_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT_DIR / "frontend"
DB_PATH = Path(os.getenv("MOVIELIST_DB", Path(__file__).resolve().parent / "movie_list.db"))
SECRET_KEY = os.getenv("MOVIELIST_SECRET_KEY", "change-this-dev-secret-before-production")
TOKEN_TTL_HOURS = int(os.getenv("MOVIELIST_TOKEN_TTL_HOURS", "168"))
ALLOWED_STATUSES = {"planned", "watching", "completed", "on_hold", "dropped"}

bearer_scheme = HTTPBearer(auto_error=False)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    iterations = 240_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return "$".join(
        [
            "pbkdf2_sha256",
            str(iterations),
            base64.urlsafe_b64encode(salt).decode("ascii"),
            base64.urlsafe_b64encode(digest).decode("ascii"),
        ]
    )


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        scheme, iterations_raw, salt_raw, digest_raw = stored_hash.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        iterations = int(iterations_raw)
        salt = base64.urlsafe_b64decode(salt_raw.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_raw.encode("ascii"))
    except (ValueError, TypeError):
        return False

    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(candidate, expected)


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def create_token(user: sqlite3.Row) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)
    payload = {
        "sub": user["id"],
        "username": user["username"],
        "exp": int(expires_at.timestamp()),
        "nonce": secrets.token_urlsafe(8),
    }
    payload_raw = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(SECRET_KEY.encode("utf-8"), payload_raw.encode("ascii"), hashlib.sha256).digest()
    return f"{payload_raw}.{_b64url(signature)}"


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload_raw, signature_raw = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.") from exc

    expected = hmac.new(SECRET_KEY.encode("utf-8"), payload_raw.encode("ascii"), hashlib.sha256).digest()
    try:
        provided = _b64url_decode(signature_raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.") from exc

    if not hmac.compare_digest(expected, provided):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature.")

    payload = json.loads(_b64url_decode(payload_raw).decode("utf-8"))
    if int(payload.get("exp", 0)) < int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired.")
    return payload


def user_from_token(db: sqlite3.Connection, token: str) -> sqlite3.Row:
    payload = decode_token(token)
    user = db.execute("SELECT * FROM users WHERE id = ?", (payload["sub"],)).fetchone()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: sqlite3.Connection = Depends(get_db),
) -> sqlite3.Row:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")
    return user_from_token(db, credentials.credentials)


def get_optional_user(request: Request, db: sqlite3.Connection) -> sqlite3.Row | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    return user_from_token(db, auth_header.split(" ", 1)[1].strip())


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    login: str
    password: str


class LibraryEntryRequest(BaseModel):
    status: str
    score: float | None = None
    progress: int | None = None
    favorite: bool = False
    notes: str | None = None
    started_at: str | None = None
    finished_at: str | None = None


class ReviewRequest(BaseModel):
    rating: float
    body: str
    contains_spoilers: bool = False


SEED_MOVIES: list[dict[str, Any]] = [
    {
        "imdb_id": "tt0111161",
        "title": "The Shawshank Redemption",
        "original_title": "The Shawshank Redemption",
        "year": 1994,
        "runtime_minutes": 142,
        "genres": "Drama",
        "imdb_rating": 9.3,
        "imdb_votes": 2900000,
        "summary": "A banker builds a hidden life of patience, friendship, and escape inside a brutal prison system.",
        "content_rating": "R",
        "director": "Frank Darabont",
        "cast": "Tim Robbins, Morgan Freeman, Bob Gunton",
    },
    {
        "imdb_id": "tt0068646",
        "title": "The Godfather",
        "original_title": "The Godfather",
        "year": 1972,
        "runtime_minutes": 175,
        "genres": "Crime, Drama",
        "imdb_rating": 9.2,
        "imdb_votes": 2000000,
        "summary": "The reluctant son of a crime family is pulled into power as loyalty and violence reshape his future.",
        "content_rating": "R",
        "director": "Francis Ford Coppola",
        "cast": "Marlon Brando, Al Pacino, James Caan",
    },
    {
        "imdb_id": "tt0468569",
        "title": "The Dark Knight",
        "original_title": "The Dark Knight",
        "year": 2008,
        "runtime_minutes": 152,
        "genres": "Action, Crime, Drama",
        "imdb_rating": 9.0,
        "imdb_votes": 2850000,
        "summary": "Batman, Gordon, and Dent face a criminal mind who turns Gotham's ideals against itself.",
        "content_rating": "PG-13",
        "director": "Christopher Nolan",
        "cast": "Christian Bale, Heath Ledger, Aaron Eckhart",
    },
    {
        "imdb_id": "tt0050083",
        "title": "12 Angry Men",
        "original_title": "12 Angry Men",
        "year": 1957,
        "runtime_minutes": 96,
        "genres": "Crime, Drama",
        "imdb_rating": 9.0,
        "imdb_votes": 870000,
        "summary": "A jury room argument becomes a tense study of doubt, prejudice, and moral responsibility.",
        "content_rating": "Approved",
        "director": "Sidney Lumet",
        "cast": "Henry Fonda, Lee J. Cobb, Martin Balsam",
    },
    {
        "imdb_id": "tt0167260",
        "title": "The Lord of the Rings: The Return of the King",
        "original_title": "The Lord of the Rings: The Return of the King",
        "year": 2003,
        "runtime_minutes": 201,
        "genres": "Adventure, Drama, Fantasy",
        "imdb_rating": 9.0,
        "imdb_votes": 1950000,
        "summary": "Final battles and quiet acts of courage decide the fate of Middle-earth.",
        "content_rating": "PG-13",
        "director": "Peter Jackson",
        "cast": "Elijah Wood, Viggo Mortensen, Ian McKellen",
    },
    {
        "imdb_id": "tt0110912",
        "title": "Pulp Fiction",
        "original_title": "Pulp Fiction",
        "year": 1994,
        "runtime_minutes": 154,
        "genres": "Crime, Drama",
        "imdb_rating": 8.9,
        "imdb_votes": 2250000,
        "summary": "Los Angeles criminals, boxers, and fixers collide in a nonlinear chain of choices and consequences.",
        "content_rating": "R",
        "director": "Quentin Tarantino",
        "cast": "John Travolta, Uma Thurman, Samuel L. Jackson",
    },
    {
        "imdb_id": "tt1375666",
        "title": "Inception",
        "original_title": "Inception",
        "year": 2010,
        "runtime_minutes": 148,
        "genres": "Action, Adventure, Sci-Fi",
        "imdb_rating": 8.8,
        "imdb_votes": 2550000,
        "summary": "A thief who steals secrets through dreams risks everything on one impossible act of planting an idea.",
        "content_rating": "PG-13",
        "director": "Christopher Nolan",
        "cast": "Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page",
    },
    {
        "imdb_id": "tt0816692",
        "title": "Interstellar",
        "original_title": "Interstellar",
        "year": 2014,
        "runtime_minutes": 169,
        "genres": "Adventure, Drama, Sci-Fi",
        "imdb_rating": 8.7,
        "imdb_votes": 2100000,
        "summary": "A pilot leaves a dying Earth to search for a future across time, gravity, and family memory.",
        "content_rating": "PG-13",
        "director": "Christopher Nolan",
        "cast": "Matthew McConaughey, Anne Hathaway, Jessica Chastain",
    },
    {
        "imdb_id": "tt0133093",
        "title": "The Matrix",
        "original_title": "The Matrix",
        "year": 1999,
        "runtime_minutes": 136,
        "genres": "Action, Sci-Fi",
        "imdb_rating": 8.7,
        "imdb_votes": 2050000,
        "summary": "A hacker discovers reality is a machine-built prison and joins a rebellion against its controllers.",
        "content_rating": "R",
        "director": "Lana Wachowski, Lilly Wachowski",
        "cast": "Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss",
    },
    {
        "imdb_id": "tt6751668",
        "title": "Parasite",
        "original_title": "Gisaengchung",
        "year": 2019,
        "runtime_minutes": 132,
        "genres": "Drama, Thriller",
        "imdb_rating": 8.5,
        "imdb_votes": 950000,
        "summary": "Two families become entangled through deception, class pressure, and a house full of secrets.",
        "content_rating": "R",
        "director": "Bong Joon Ho",
        "cast": "Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong",
    },
    {
        "imdb_id": "tt0245429",
        "title": "Spirited Away",
        "original_title": "Sen to Chihiro no kamikakushi",
        "year": 2001,
        "runtime_minutes": 125,
        "genres": "Adventure, Animation, Family",
        "imdb_rating": 8.6,
        "imdb_votes": 850000,
        "summary": "A lost girl navigates a spirit bathhouse while trying to save her parents and herself.",
        "content_rating": "PG",
        "director": "Hayao Miyazaki",
        "cast": "Rumi Hiiragi, Miyu Irino, Mari Natsuki",
    },
    {
        "imdb_id": "tt2582802",
        "title": "Whiplash",
        "original_title": "Whiplash",
        "year": 2014,
        "runtime_minutes": 106,
        "genres": "Drama, Music",
        "imdb_rating": 8.5,
        "imdb_votes": 1000000,
        "summary": "An ambitious drummer and a ruthless instructor push talent, obsession, and control to the limit.",
        "content_rating": "R",
        "director": "Damien Chazelle",
        "cast": "Miles Teller, J.K. Simmons, Melissa Benoist",
    },
    {
        "imdb_id": "tt0986264",
        "title": "Like Stars on Earth",
        "original_title": "Taare Zameen Par",
        "year": 2007,
        "runtime_minutes": 165,
        "genres": "Drama, Family",
        "imdb_rating": 8.3,
        "imdb_votes": 210000,
        "summary": "A teacher helps a misunderstood child find confidence, creativity, and language for his inner world.",
        "content_rating": "PG",
        "director": "Aamir Khan, Amole Gupte",
        "cast": "Darsheel Safary, Aamir Khan, Tisca Chopra",
    },
    {
        "imdb_id": "tt1187043",
        "title": "3 Idiots",
        "original_title": "3 Idiots",
        "year": 2009,
        "runtime_minutes": 170,
        "genres": "Comedy, Drama",
        "imdb_rating": 8.4,
        "imdb_votes": 440000,
        "summary": "Three engineering students challenge pressure, fear, and narrow ideas of success.",
        "content_rating": "PG-13",
        "director": "Rajkumar Hirani",
        "cast": "Aamir Khan, Madhavan, Sharman Joshi",
    },
    {
        "imdb_id": "tt5074352",
        "title": "Dangal",
        "original_title": "Dangal",
        "year": 2016,
        "runtime_minutes": 161,
        "genres": "Action, Biography, Drama",
        "imdb_rating": 8.3,
        "imdb_votes": 220000,
        "summary": "A former wrestler trains his daughters to compete while the family fights social expectations.",
        "content_rating": "Not Rated",
        "director": "Nitesh Tiwari",
        "cast": "Aamir Khan, Fatima Sana Shaikh, Sanya Malhotra",
    },
]


def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                display_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'member',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS movies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                imdb_id TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                original_title TEXT,
                year INTEGER,
                runtime_minutes INTEGER,
                genres TEXT NOT NULL DEFAULT '',
                imdb_rating REAL,
                imdb_votes INTEGER,
                summary TEXT,
                poster_url TEXT,
                backdrop_url TEXT,
                content_rating TEXT,
                director TEXT,
                cast TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS list_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                movie_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                score REAL,
                progress INTEGER NOT NULL DEFAULT 0,
                favorite INTEGER NOT NULL DEFAULT 0,
                notes TEXT,
                started_at TEXT,
                finished_at TEXT,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, movie_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(movie_id) REFERENCES movies(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                movie_id INTEGER NOT NULL,
                rating REAL NOT NULL,
                body TEXT NOT NULL,
                contains_spoilers INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, movie_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(movie_id) REFERENCES movies(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
            CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies(genres);
            CREATE INDEX IF NOT EXISTS idx_entries_user_status ON list_entries(user_id, status);
            """
        )
        seed_database(conn)


def seed_database(conn: sqlite3.Connection) -> None:
    created_at = now_iso()
    for movie in SEED_MOVIES:
        conn.execute(
            """
            INSERT INTO movies (
                imdb_id, title, original_title, year, runtime_minutes, genres, imdb_rating,
                imdb_votes, summary, poster_url, backdrop_url, content_rating, director, cast, created_at
            )
            VALUES (
                :imdb_id, :title, :original_title, :year, :runtime_minutes, :genres, :imdb_rating,
                :imdb_votes, :summary, NULL, NULL, :content_rating, :director, :cast, :created_at
            )
            ON CONFLICT(imdb_id) DO UPDATE SET
                title = excluded.title,
                original_title = excluded.original_title,
                year = excluded.year,
                runtime_minutes = excluded.runtime_minutes,
                genres = excluded.genres,
                imdb_rating = excluded.imdb_rating,
                imdb_votes = excluded.imdb_votes,
                summary = COALESCE(movies.summary, excluded.summary),
                content_rating = excluded.content_rating,
                director = COALESCE(movies.director, excluded.director),
                cast = COALESCE(movies.cast, excluded.cast)
            """,
            {**movie, "created_at": created_at},
        )

    if conn.execute("SELECT id FROM users WHERE username = ?", ("demo",)).fetchone() is None:
        conn.execute(
            """
            INSERT INTO users (username, email, password_hash, display_name, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("demo", "demo@movielist.local", hash_password("demo1234"), "Demo Cinephile", "member", created_at),
        )
    conn.commit()


def public_user(user: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "display_name": user["display_name"],
        "role": user["role"],
        "created_at": user["created_at"],
    }


def movie_payload(row: sqlite3.Row) -> dict[str, Any]:
    poster_url = row["poster_url"] or f"/api/movies/{row['id']}/poster.png"
    payload = {
        "id": row["id"],
        "imdb_id": row["imdb_id"],
        "title": row["title"],
        "original_title": row["original_title"],
        "year": row["year"],
        "runtime_minutes": row["runtime_minutes"],
        "genres": [genre.strip() for genre in (row["genres"] or "").split(",") if genre.strip()],
        "imdb_rating": row["imdb_rating"],
        "imdb_votes": row["imdb_votes"],
        "summary": row["summary"],
        "poster_url": poster_url,
        "backdrop_url": row["backdrop_url"],
        "content_rating": row["content_rating"],
        "director": row["director"],
        "cast": [person.strip() for person in (row["cast"] or "").split(",") if person.strip()],
        "created_at": row["created_at"],
    }
    if "entry_status" in row.keys():
        payload["my_entry"] = entry_payload_from_movie_row(row)
    return payload


def entry_payload_from_movie_row(row: sqlite3.Row) -> dict[str, Any] | None:
    if row["entry_status"] is None:
        return None
    return {
        "status": row["entry_status"],
        "score": row["entry_score"],
        "progress": row["entry_progress"],
        "favorite": bool(row["entry_favorite"]),
        "notes": row["entry_notes"],
        "started_at": row["entry_started_at"],
        "finished_at": row["entry_finished_at"],
        "updated_at": row["entry_updated_at"],
    }


def review_payload(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "movie_id": row["movie_id"],
        "rating": row["rating"],
        "body": row["body"],
        "contains_spoilers": bool(row["contains_spoilers"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "user": {
            "id": row["user_id"],
            "username": row["username"],
            "display_name": row["display_name"],
        },
    }


def normalize_register(payload: RegisterRequest) -> tuple[str, str, str, str]:
    username = payload.username.strip().lower()
    email = payload.email.strip().lower()
    display_name = (payload.display_name or payload.username).strip()
    password = payload.password
    if len(username) < 3 or not username.replace("_", "").replace("-", "").isalnum():
        raise HTTPException(status_code=422, detail="Username must be at least 3 letters, numbers, dashes, or underscores.")
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=422, detail="Enter a valid email.")
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    if not display_name:
        display_name = username
    return username, email, display_name, password


def validate_entry(payload: LibraryEntryRequest) -> dict[str, Any]:
    status_value = payload.status.strip().lower()
    if status_value not in ALLOWED_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid list status.")

    progress = payload.progress
    if progress is None:
        progress = 100 if status_value == "completed" else 0
    progress = max(0, min(int(progress), 100))

    score = payload.score
    if score is not None and not (0 <= score <= 10):
        raise HTTPException(status_code=422, detail="Score must be between 0 and 10.")

    return {
        "status": status_value,
        "score": score,
        "progress": progress,
        "favorite": 1 if payload.favorite else 0,
        "notes": (payload.notes or "").strip() or None,
        "started_at": payload.started_at,
        "finished_at": payload.finished_at,
    }


def movie_select(user_id: int | None) -> str:
    if user_id is None:
        return """
            SELECT m.*,
                   NULL AS entry_status, NULL AS entry_score, NULL AS entry_progress,
                   NULL AS entry_favorite, NULL AS entry_notes, NULL AS entry_started_at,
                   NULL AS entry_finished_at, NULL AS entry_updated_at
            FROM movies m
        """
    return """
        SELECT m.*,
               le.status AS entry_status, le.score AS entry_score, le.progress AS entry_progress,
               le.favorite AS entry_favorite, le.notes AS entry_notes, le.started_at AS entry_started_at,
               le.finished_at AS entry_finished_at, le.updated_at AS entry_updated_at
        FROM movies m
        LEFT JOIN list_entries le ON le.movie_id = m.id AND le.user_id = :user_id
    """


def make_poster_png(title: str, genres: str, year: int | None) -> bytes:
    width, height = 360, 540
    digest = hashlib.sha256(f"{title}:{genres}:{year}".encode("utf-8")).digest()
    base = [50 + digest[0] % 140, 40 + digest[1] % 120, 50 + digest[2] % 120]
    accent = [80 + digest[3] % 150, 70 + digest[4] % 150, 60 + digest[5] % 150]
    rows = []
    for y in range(height):
        row = bytearray()
        fade = y / max(height - 1, 1)
        for x in range(width):
            diagonal = 18 if ((x + y + digest[6]) // 34) % 5 == 0 else 0
            vignette = int(45 * (abs(x - width / 2) / width + abs(y - height / 2) / height))
            r = int(base[0] * (1 - fade) + accent[0] * fade) + diagonal - vignette
            g = int(base[1] * (1 - fade) + accent[1] * fade) + diagonal - vignette
            b = int(base[2] * (1 - fade) + accent[2] * fade) + diagonal - vignette
            if y < 18 or y > height - 22:
                r, g, b = max(0, r - 40), max(0, g - 40), max(0, b - 40)
            row.extend([max(0, min(r, 255)), max(0, min(g, 255)), max(0, min(b, 255))])
        rows.append(b"\x00" + bytes(row))

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    raw = b"".join(rows)
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="MovieList", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8010", "http://127.0.0.1:8010", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "MovieList"}


@app.post("/api/auth/register")
def register(payload: RegisterRequest, db: sqlite3.Connection = Depends(get_db)) -> dict[str, Any]:
    username, email, display_name, password = normalize_register(payload)
    try:
        db.execute(
            """
            INSERT INTO users (username, email, password_hash, display_name, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (username, email, hash_password(password), display_name, "member", now_iso()),
        )
        db.commit()
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Username or email already exists.") from exc

    user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    return {"token": create_token(user), "user": public_user(user)}


@app.post("/api/auth/login")
def login(payload: LoginRequest, db: sqlite3.Connection = Depends(get_db)) -> dict[str, Any]:
    login_value = payload.login.strip().lower()
    user = db.execute(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        (login_value, login_value),
    ).fetchone()
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid login or password.")
    return {"token": create_token(user), "user": public_user(user)}


@app.get("/api/auth/me")
def me(user: sqlite3.Row = Depends(get_current_user)) -> dict[str, Any]:
    return {"user": public_user(user)}


@app.get("/api/genres")
def genres(db: sqlite3.Connection = Depends(get_db)) -> dict[str, list[str]]:
    values: set[str] = set()
    for row in db.execute("SELECT genres FROM movies"):
        values.update(genre.strip() for genre in (row["genres"] or "").split(",") if genre.strip())
    return {"genres": sorted(values)}


@app.get("/api/movies")
def list_movies(
    request: Request,
    query: str = "",
    genre: str = "",
    sort: str = "popular",
    limit: int = 36,
    offset: int = 0,
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    user = get_optional_user(request, db)
    params: dict[str, Any] = {"limit": max(1, min(limit, 80)), "offset": max(0, offset)}
    if user is not None:
        params["user_id"] = user["id"]

    where: list[str] = []
    if query.strip():
        params["query"] = f"%{query.strip().lower()}%"
        where.append(
            """
            (
                lower(m.title) LIKE :query OR lower(COALESCE(m.original_title, '')) LIKE :query OR
                lower(COALESCE(m.summary, '')) LIKE :query OR lower(COALESCE(m.director, '')) LIKE :query OR
                lower(COALESCE(m.cast, '')) LIKE :query
            )
            """
        )
    if genre.strip():
        params["genre"] = f"%{genre.strip().lower()}%"
        where.append("lower(m.genres) LIKE :genre")

    order_by = {
        "rating": "COALESCE(m.imdb_rating, 0) DESC, COALESCE(m.imdb_votes, 0) DESC",
        "year": "COALESCE(m.year, 0) DESC, m.title COLLATE NOCASE ASC",
        "title": "m.title COLLATE NOCASE ASC",
        "recent": "m.created_at DESC, m.id DESC",
        "popular": "COALESCE(m.imdb_votes, 0) DESC, COALESCE(m.imdb_rating, 0) DESC",
    }.get(sort, "COALESCE(m.imdb_votes, 0) DESC, COALESCE(m.imdb_rating, 0) DESC")

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    base_sql = movie_select(user["id"] if user is not None else None)
    rows = db.execute(
        f"{base_sql} {where_sql} ORDER BY {order_by} LIMIT :limit OFFSET :offset",
        params,
    ).fetchall()
    count = db.execute(f"SELECT COUNT(*) AS count FROM movies m {where_sql}", params).fetchone()["count"]
    return {
        "movies": [movie_payload(row) for row in rows],
        "total": count,
        "limit": params["limit"],
        "offset": params["offset"],
    }


@app.get("/api/movies/{movie_id}/poster.png")
def movie_poster(movie_id: int, db: sqlite3.Connection = Depends(get_db)) -> Response:
    movie = db.execute("SELECT title, genres, year FROM movies WHERE id = ?", (movie_id,)).fetchone()
    if movie is None:
        raise HTTPException(status_code=404, detail="Movie not found.")
    png = make_poster_png(movie["title"], movie["genres"], movie["year"])
    return Response(content=png, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})


@app.get("/api/movies/{movie_id}")
def movie_detail(
    movie_id: int,
    request: Request,
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    user = get_optional_user(request, db)
    params: dict[str, Any] = {"movie_id": movie_id}
    if user is not None:
        params["user_id"] = user["id"]
    movie = db.execute(
        f"{movie_select(user['id'] if user is not None else None)} WHERE m.id = :movie_id",
        params,
    ).fetchone()
    if movie is None:
        raise HTTPException(status_code=404, detail="Movie not found.")

    reviews = db.execute(
        """
        SELECT r.*, u.username, u.display_name
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.movie_id = ?
        ORDER BY r.updated_at DESC
        """,
        (movie_id,),
    ).fetchall()
    return {"movie": movie_payload(movie), "reviews": [review_payload(row) for row in reviews]}


@app.get("/api/library")
def library(
    status_filter: str = "",
    user: sqlite3.Row = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    params: list[Any] = [user["id"]]
    where = "WHERE le.user_id = ?"
    if status_filter:
        where += " AND le.status = ?"
        params.append(status_filter)
    rows = db.execute(
        f"""
        SELECT
            le.id AS entry_id, le.status AS entry_status, le.score AS entry_score,
            le.progress AS entry_progress, le.favorite AS entry_favorite, le.notes AS entry_notes,
            le.started_at AS entry_started_at, le.finished_at AS entry_finished_at,
            le.updated_at AS entry_updated_at, m.*
        FROM list_entries le
        JOIN movies m ON m.id = le.movie_id
        {where}
        ORDER BY le.favorite DESC, le.updated_at DESC
        """,
        params,
    ).fetchall()
    return {"entries": [movie_payload(row) for row in rows]}


@app.put("/api/library/{movie_id}")
def upsert_library_entry(
    movie_id: int,
    payload: LibraryEntryRequest,
    user: sqlite3.Row = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    if db.execute("SELECT id FROM movies WHERE id = ?", (movie_id,)).fetchone() is None:
        raise HTTPException(status_code=404, detail="Movie not found.")

    entry = validate_entry(payload)
    db.execute(
        """
        INSERT INTO list_entries (
            user_id, movie_id, status, score, progress, favorite, notes,
            started_at, finished_at, updated_at
        )
        VALUES (:user_id, :movie_id, :status, :score, :progress, :favorite, :notes,
                :started_at, :finished_at, :updated_at)
        ON CONFLICT(user_id, movie_id) DO UPDATE SET
            status = excluded.status,
            score = excluded.score,
            progress = excluded.progress,
            favorite = excluded.favorite,
            notes = excluded.notes,
            started_at = excluded.started_at,
            finished_at = excluded.finished_at,
            updated_at = excluded.updated_at
        """,
        {**entry, "user_id": user["id"], "movie_id": movie_id, "updated_at": now_iso()},
    )
    db.commit()
    movie = db.execute(
        f"{movie_select(user['id'])} WHERE m.id = :movie_id",
        {"user_id": user["id"], "movie_id": movie_id},
    ).fetchone()
    return {"movie": movie_payload(movie)}


@app.delete("/api/library/{movie_id}")
def delete_library_entry(
    movie_id: int,
    user: sqlite3.Row = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, bool]:
    db.execute("DELETE FROM list_entries WHERE user_id = ? AND movie_id = ?", (user["id"], movie_id))
    db.commit()
    return {"ok": True}


@app.get("/api/stats")
def stats(user: sqlite3.Row = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)) -> dict[str, Any]:
    counts = {
        row["status"]: row["count"]
        for row in db.execute(
            "SELECT status, COUNT(*) AS count FROM list_entries WHERE user_id = ? GROUP BY status",
            (user["id"],),
        )
    }
    scored = db.execute(
        "SELECT AVG(score) AS avg_score FROM list_entries WHERE user_id = ? AND score IS NOT NULL",
        (user["id"],),
    ).fetchone()["avg_score"]
    favorites = db.execute(
        "SELECT COUNT(*) AS count FROM list_entries WHERE user_id = ? AND favorite = 1",
        (user["id"],),
    ).fetchone()["count"]
    minutes = db.execute(
        """
        SELECT COALESCE(SUM(m.runtime_minutes), 0) AS minutes
        FROM list_entries le
        JOIN movies m ON m.id = le.movie_id
        WHERE le.user_id = ? AND le.status = 'completed'
        """,
        (user["id"],),
    ).fetchone()["minutes"]
    return {
        "counts": {status_key: counts.get(status_key, 0) for status_key in sorted(ALLOWED_STATUSES)},
        "average_score": round(scored, 2) if scored is not None else None,
        "favorites": favorites,
        "completed_minutes": minutes,
    }


@app.post("/api/reviews/{movie_id}")
def upsert_review(
    movie_id: int,
    payload: ReviewRequest,
    user: sqlite3.Row = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    if not (0 <= payload.rating <= 10):
        raise HTTPException(status_code=422, detail="Review rating must be between 0 and 10.")
    body = payload.body.strip()
    if len(body) < 10:
        raise HTTPException(status_code=422, detail="Review must be at least 10 characters.")
    if db.execute("SELECT id FROM movies WHERE id = ?", (movie_id,)).fetchone() is None:
        raise HTTPException(status_code=404, detail="Movie not found.")

    timestamp = now_iso()
    db.execute(
        """
        INSERT INTO reviews (user_id, movie_id, rating, body, contains_spoilers, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, movie_id) DO UPDATE SET
            rating = excluded.rating,
            body = excluded.body,
            contains_spoilers = excluded.contains_spoilers,
            updated_at = excluded.updated_at
        """,
        (user["id"], movie_id, payload.rating, body, 1 if payload.contains_spoilers else 0, timestamp, timestamp),
    )
    db.commit()
    review = db.execute(
        """
        SELECT r.*, u.username, u.display_name
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.user_id = ? AND r.movie_id = ?
        """,
        (user["id"], movie_id),
    ).fetchone()
    return {"review": review_payload(review)}


@app.delete("/api/reviews/{review_id}")
def delete_review(
    review_id: int,
    user: sqlite3.Row = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, bool]:
    db.execute("DELETE FROM reviews WHERE id = ? AND user_id = ?", (review_id, user["id"]))
    db.commit()
    return {"ok": True}


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str = ""):
    index_path = FRONTEND_DIR / "index.html"
    requested_path = (FRONTEND_DIR / full_path).resolve()
    frontend_root = FRONTEND_DIR.resolve()
    try:
        requested_path.relative_to(frontend_root)
    except ValueError:
        return FileResponse(index_path)

    if full_path and requested_path.is_file():
        return FileResponse(requested_path)
    return FileResponse(index_path)
