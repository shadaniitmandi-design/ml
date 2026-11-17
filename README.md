# SightBridge

SightBridge is a phone-first eye screening startup MVP for schools, clinics, NGOs, and outreach camps. It is intentionally positioned as a **screening and referral workflow**, not a diagnosis or prescription app.

## What the product does

- Public landing page for the startup story and care model
- Guided screening intake with eye image upload, symptoms, visual acuity, and consent capture
- Conservative auto-triage based on intake signals
- Admin dashboard for reviewer sign-off, referral decisions, and partner lead qualification
- Partner pilot intake flow for schools and clinics

## Stack

- Frontend: React + Vite + Framer Motion
- Backend: FastAPI + SQLAlchemy
- Database: SQLite by default, PostgreSQL-ready through Docker
- Auth: Firebase Auth with an explicit local dev bypass for demos

## Core product idea

The wedge is:

`Low-cost school/clinic screening with AI + referral + optometrist review`

This MVP implements the workflow around that idea first:

1. A screener captures eye images and intake context on a phone.
2. The platform flags risky or incomplete cases.
3. A reviewer updates the case, recommends referral when needed, and closes the loop.

That gives you a usable product now and the labeled operational data you would need before training a validated medical model later.

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

## Demo auth

- Frontend dev bypass: `VITE_DEV_BYPASS_AUTH=true`
- Backend dev bypass: `DEV_AUTH_BYPASS=true`
- Default local admin: `admin@sightbridge.health`

With bypass enabled, you can open `/admin` without setting up Firebase.

## API surface used by the MVP

- `GET /api/overview`
- `POST /api/screenings`
- `GET /api/screenings/admin`
- `PATCH /api/screenings/{id}/review`
- `POST /api/partner-leads`
- `GET /api/partner-leads`
- `PATCH /api/partner-leads/{id}`
- `GET /api/analytics`

## Important product guardrail

This build is for **screening, triage, and referral workflow**. It does **not** claim to diagnose disease or produce a glasses prescription from a phone image alone.
# ml
