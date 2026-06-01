# MovieList

A full-stack movie tracker inspired by MyAnimeList, built as one FastAPI app with a static frontend.

## Features

- Movie catalog with search, genres, sort, generated poster art, and IMDb IDs.
- User registration and login.
- Passwords are stored with PBKDF2-HMAC-SHA256 hashes.
- Bearer session tokens are signed with HMAC.
- Personal movie list with planned, watching, completed, on hold, and dropped states.
- Scores, progress, favorites, notes, reviews, and profile stats.
- IMDb public dataset importer for `title.basics.tsv.gz` and `title.ratings.tsv.gz`.

## Run locally

```bash
cd movie-list
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8010
```

Then open:

```text
http://127.0.0.1:8010
```

The app seeds a demo account:

```text
username: demo
password: demo1234
```

## Import IMDb data

IMDb provides non-commercial datasets at:

```text
https://datasets.imdbws.com/
```

To import a larger catalog:

```bash
cd movie-list
python -m backend.imdb_importer --download --limit 5000 --min-votes 25000
```

IMDb datasets do not include poster images or plot summaries. This app keeps seed summaries for the bundled sample movies and generates local poster-style PNG art for imported rows.

For production, set `MOVIELIST_SECRET_KEY` to a long random value and use HTTPS in front of the app.

