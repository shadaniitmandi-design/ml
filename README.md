# KP Dev Cell Platform

KP Dev Cell is a full-stack club platform built for the internal hackathon brief: a real homepage, dynamic team and events data, project submissions with approvals, a protected admin dashboard, contact intake, and Dockerized deployment.

## Chosen stack

- Frontend: React + Vite + Framer Motion
- Backend: FastAPI
- Database: PostgreSQL in Docker, with SQLite fallback for quick local setup
- Auth: Firebase Auth, with a clearly isolated local dev bypass for demo mode only

## Why this stack

- FastAPI gives typed request validation, clean route organization, and auto-generated API docs that are easy to defend in a review.
- SQL is a strong fit because events, team members, projects, approvals, and contact submissions are structured operational data.
- PostgreSQL makes the Docker setup feel production-grade, while SQLite keeps local iteration lightweight when Docker is unavailable.
- Firebase is practical for hackathon auth because it offloads credential handling to a managed provider while the backend still verifies write requests.

## What is implemented

- Homepage with product-style hero, featured projects, upcoming events, team spotlight, and club positioning
- Team page with DB-backed member cards and role filtering
- Events page with dynamic data, status filters, and countdown labels
- Projects page with public submissions and admin approval flow
- Contact / Join page with messages stored in the database
- Admin dashboard for events, team, projects, analytics, contact triage, and image uploads
- Docker setup with frontend, backend, and PostgreSQL services

## Project structure

```text
frontend/
  src/
    components/
    context/
    pages/
    services/
    styles/

backend/
  app/
    api/routes/
    core/
    models/
    schemas/
    services/
```

## Local development

### 1. Backend

```bash
cd /Users/mdshadan/Documents/New\ project/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### 2. Frontend

```bash
cd /Users/mdshadan/Documents/New\ project/frontend
npm install
cp .env.example .env
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:8000`.

## Docker

```bash
cd /Users/mdshadan/Documents/New\ project
docker compose up --build
```

This brings up:

- frontend at `http://localhost:4173`
- backend at `http://localhost:8000`
- postgres at `localhost:5432`

## Auth notes

- For local demo mode, `DEV_AUTH_BYPASS=true` and `VITE_DEV_BYPASS_AUTH=true` allow quick access to the admin dashboard.
- For a real deployment, disable both bypass flags and add Firebase credentials in `backend/.env` and `frontend/.env`.
- Backend write routes still validate bearer tokens; the bypass is explicit and opt-in.

## API surface

- `GET /api/overview`
- `GET /api/events`
- `POST /api/events`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`
- `GET /api/team`
- `POST /api/team`
- `GET /api/projects`
- `POST /api/projects/submissions`
- `GET /api/projects/admin`
- `PATCH /api/projects/:id/status`
- `POST /api/contact`
- `GET /api/contact`
- `GET /api/analytics`
- `POST /api/uploads/images`

## What to tell reviewers

- The public site is designed for four user groups: explorers, members, core operators, and admins.
- Dynamic data lives in the database and is surfaced through a typed API instead of embedded in JSX.
- The admin dashboard is not cosmetic; it owns the operational workflows that make the club website useful over time.
