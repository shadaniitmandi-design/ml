from __future__ import annotations

import argparse
import csv
import gzip
import sqlite3
import urllib.request
from pathlib import Path
from typing import Iterable

from .main import DB_PATH, init_db, now_iso

IMDB_BASE_URL = "https://datasets.imdbws.com"
DATA_DIR = Path(__file__).resolve().parent / "data"


def download_dataset(name: str) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    target = DATA_DIR / name
    if target.exists():
        return target
    urllib.request.urlretrieve(f"{IMDB_BASE_URL}/{name}", target)
    return target


def open_tsv(path: Path) -> Iterable[dict[str, str]]:
    handle = gzip.open(path, "rt", encoding="utf-8", newline="") if path.suffix == ".gz" else path.open("r", encoding="utf-8")
    with handle:
        yield from csv.DictReader(handle, delimiter="\t")


def clean(value: str | None) -> str | None:
    if value is None or value == r"\N":
        return None
    return value


def import_imdb(basics_path: Path, ratings_path: Path, limit: int, min_votes: int) -> int:
    init_db()
    ratings: dict[str, tuple[float, int]] = {}
    for row in open_tsv(ratings_path):
        votes = int(row["numVotes"])
        if votes >= min_votes:
            ratings[row["tconst"]] = (float(row["averageRating"]), votes)

    candidates = []
    for row in open_tsv(basics_path):
        imdb_id = row["tconst"]
        if imdb_id not in ratings:
            continue
        if row["titleType"] != "movie" or row.get("isAdult") == "1":
            continue
        year_raw = clean(row.get("startYear"))
        runtime_raw = clean(row.get("runtimeMinutes"))
        rating, votes = ratings[imdb_id]
        candidates.append(
            {
                "imdb_id": imdb_id,
                "title": clean(row.get("primaryTitle")) or "Untitled",
                "original_title": clean(row.get("originalTitle")),
                "year": int(year_raw) if year_raw and year_raw.isdigit() else None,
                "runtime_minutes": int(runtime_raw) if runtime_raw and runtime_raw.isdigit() else None,
                "genres": (clean(row.get("genres")) or "").replace(",", ", "),
                "imdb_rating": rating,
                "imdb_votes": votes,
                "summary": None,
                "poster_url": None,
                "backdrop_url": None,
                "content_rating": None,
                "director": None,
                "cast": None,
                "created_at": now_iso(),
            }
        )

    candidates.sort(key=lambda movie: (movie["imdb_votes"], movie["imdb_rating"]), reverse=True)
    selected = candidates[:limit]

    with sqlite3.connect(DB_PATH) as conn:
        conn.executemany(
            """
            INSERT INTO movies (
                imdb_id, title, original_title, year, runtime_minutes, genres, imdb_rating,
                imdb_votes, summary, poster_url, backdrop_url, content_rating, director, cast, created_at
            )
            VALUES (
                :imdb_id, :title, :original_title, :year, :runtime_minutes, :genres, :imdb_rating,
                :imdb_votes, :summary, :poster_url, :backdrop_url, :content_rating, :director, :cast, :created_at
            )
            ON CONFLICT(imdb_id) DO UPDATE SET
                title = excluded.title,
                original_title = excluded.original_title,
                year = excluded.year,
                runtime_minutes = excluded.runtime_minutes,
                genres = excluded.genres,
                imdb_rating = excluded.imdb_rating,
                imdb_votes = excluded.imdb_votes
            """,
            selected,
        )
        conn.commit()
    return len(selected)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import movies from IMDb's public TSV datasets.")
    parser.add_argument("--download", action="store_true", help="Download title.basics.tsv.gz and title.ratings.tsv.gz first.")
    parser.add_argument("--basics", type=Path, help="Path to title.basics.tsv.gz")
    parser.add_argument("--ratings", type=Path, help="Path to title.ratings.tsv.gz")
    parser.add_argument("--limit", type=int, default=2000, help="Maximum movies to import.")
    parser.add_argument("--min-votes", type=int, default=25000, help="Minimum IMDb vote count.")
    args = parser.parse_args()

    basics_path = args.basics
    ratings_path = args.ratings
    if args.download:
        basics_path = download_dataset("title.basics.tsv.gz")
        ratings_path = download_dataset("title.ratings.tsv.gz")
    if basics_path is None or ratings_path is None:
        parser.error("Pass --download or both --basics and --ratings.")

    count = import_imdb(basics_path, ratings_path, args.limit, args.min_votes)
    print(f"Imported or updated {count} movies into {DB_PATH}")


if __name__ == "__main__":
    main()

