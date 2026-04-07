from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.contact import ContactSubmission
from app.models.enums import ContactStatus, EventStatus, ProjectStatus, TeamRole
from app.models.event import Event
from app.models.project import Project
from app.models.team import TeamMember


def seed_database(db: Session) -> None:
    has_events = db.execute(select(Event.id).limit(1)).scalar_one_or_none()
    if has_events:
        return

    now = datetime.now(UTC)

    events = [
        Event(
            title="KP Dev Cell Internal Hackathon",
            description="A 48-hour product sprint where builders ship the next official club tools, demos, and experiments together.",
            location="KP Campus Auditorium",
            start_at=now + timedelta(days=5),
            end_at=now + timedelta(days=5, hours=8),
            status=EventStatus.upcoming,
            registration_url="https://example.com/hackathon",
            cover_image="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
            featured=True,
        ),
        Event(
            title="Ship Week Demo Day",
            description="A showcase night for member-built tools, portfolio launches, and lightning talks on what actually shipped.",
            location="Innovation Lab",
            start_at=now + timedelta(days=14),
            end_at=now + timedelta(days=14, hours=3),
            status=EventStatus.upcoming,
            registration_url="https://example.com/demo-day",
            cover_image="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
            featured=True,
        ),
        Event(
            title="Git and GitHub Sprint",
            description="A hands-on workshop covering collaboration, pull requests, branching strategy, and clean repository practices.",
            location="Lab 204",
            start_at=now - timedelta(days=12),
            end_at=now - timedelta(days=12, hours=-2),
            status=EventStatus.completed,
            registration_url="https://example.com/git-sprint",
            cover_image="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
            featured=False,
        ),
    ]

    team = [
        TeamMember(
            name="Aarav Sharma",
            role=TeamRole.core,
            title="Lead, Product and Community",
            bio="Drives club programming, member onboarding, and the systems that help teams move from idea to shipped product.",
            image_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
            linkedin_url="https://linkedin.com",
            github_url="https://github.com",
            order_index=1,
        ),
        TeamMember(
            name="Naina Verma",
            role=TeamRole.core,
            title="Engineering Lead",
            bio="Owns the technical roadmap for club projects, architecture reviews, and delivery standards across internal builds.",
            image_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
            linkedin_url="https://linkedin.com",
            github_url="https://github.com",
            order_index=2,
        ),
        TeamMember(
            name="Rohan Iyer",
            role=TeamRole.core,
            title="Events and Partnerships",
            bio="Runs workshops, hackathons, and sponsor touchpoints while making sure every event leads to tangible member outcomes.",
            image_url="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
            linkedin_url="https://linkedin.com",
            github_url="https://github.com",
            order_index=3,
        ),
        TeamMember(
            name="Megha Nair",
            role=TeamRole.member,
            title="Frontend Builder",
            bio="Builds interface systems, motion details, and design QA for showcase projects and public-facing club assets.",
            image_url="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=600&q=80",
            linkedin_url="https://linkedin.com",
            github_url="https://github.com",
            order_index=4,
        ),
        TeamMember(
            name="Kabir Khan",
            role=TeamRole.member,
            title="Backend Builder",
            bio="Works on APIs, data modeling, and deployment flows for club products that need reliability beyond demo day.",
            image_url="https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=600&q=80",
            linkedin_url="https://linkedin.com",
            github_url="https://github.com",
            order_index=5,
        ),
    ]

    projects = [
        Project(
            title="Campus Connect",
            summary="A student collaboration board that pairs builders with real campus problems.",
            description="Campus Connect helps students post ideas, find collaborators by skill, and assemble small shipping teams around real student-facing problems.",
            tech_stack=["React", "FastAPI", "PostgreSQL"],
            contributor_names=["Naina Verma", "Kabir Khan", "Megha Nair"],
            github_url="https://github.com",
            live_url="https://example.com",
            image_url="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
            submitted_by_name="KP Dev Cell Core",
            submitted_by_email="core@kpdevcell.dev",
            status=ProjectStatus.approved,
            featured=True,
        ),
        Project(
            title="Attendly",
            summary="A workshop attendance and feedback tool built for club operators.",
            description="Attendly reduces admin overhead during events with QR attendance, instant feedback capture, and a clean analytics view after every session.",
            tech_stack=["React", "Firebase", "Tailwind"],
            contributor_names=["Aarav Sharma", "Rohan Iyer"],
            github_url="https://github.com",
            live_url="https://example.com",
            image_url="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
            submitted_by_name="KP Dev Cell Core",
            submitted_by_email="core@kpdevcell.dev",
            status=ProjectStatus.approved,
            featured=True,
        ),
        Project(
            title="Mentor Mesh",
            summary="A mentor-matching workflow for pairing members with domain-specific guidance.",
            description="Mentor Mesh streamlines mentor requests, matching, and follow-up so new members get support without manual spreadsheet chaos.",
            tech_stack=["Next.js", "Supabase", "Framer Motion"],
            contributor_names=["Kabir Khan", "Megha Nair"],
            github_url="https://github.com",
            live_url="https://example.com",
            image_url="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
            submitted_by_name="Student Builder",
            submitted_by_email="student@kpdevcell.dev",
            status=ProjectStatus.pending,
            featured=False,
        ),
    ]

    contacts = [
        ContactSubmission(
            name="Ishita Rao",
            email="ishita@example.com",
            message="I want to join the product team and help with design systems, content, and member onboarding workflows.",
            interest_area="Design + Product",
            status=ContactStatus.new,
        )
    ]

    db.add_all(events + team + projects + contacts)
    db.commit()

