import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import EmptyState from "../components/EmptyState";
import EventCard from "../components/EventCard";
import LoadingScreen from "../components/LoadingScreen";
import ProjectCard from "../components/ProjectCard";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import TeamCard from "../components/TeamCard";
import { getHomeOverview } from "../services/api";

const audienceCards = [
  {
    title: "New students",
    text: "See what the club builds, where to start, and which domains feel exciting enough to jump into.",
  },
  {
    title: "Members",
    text: "Track live events, discover open projects, and stay plugged into the current momentum of the club.",
  },
  {
    title: "Core team",
    text: "Operate the club with a real backend for events, approvals, team updates, and incoming interest.",
  },
  {
    title: "Admins",
    text: "Control content, moderate submissions, and protect write actions behind real auth instead of hidden routes.",
  },
];

const domains = [
  "Web products",
  "AI tooling",
  "Backend systems",
  "UI engineering",
  "Open source",
  "Hackathon builds",
];

const principles = [
  "Dynamic data from the database, not hardcoded JSX.",
  "Admin actions are authenticated and validated on the backend.",
  "Projects can be submitted by members and approved before they go live.",
];

function HomePage() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      try {
        setOverview(await getHomeOverview());
      } catch (requestError) {
        setError(requestError.response?.data?.detail || "Unable to load the homepage right now.");
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, []);

  if (loading) {
    return <LoadingScreen label="Loading the club story" />;
  }

  return (
    <div className="shell stack-xl">
      <section className="hero-grid">
        <motion.div
          className="hero-panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="eyebrow">Official Club Platform</p>
          <h1>Build. Learn. Ship.</h1>
          <p className="hero-copy">
            KP Dev Cell is where students stop collecting tutorials and start shipping products with real teammates, deadlines, reviews, and demos.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/join">
              Join us
            </Link>
            <Link className="button button-secondary" to="/events">
              View events
            </Link>
          </div>
          <div className="hero-microgrid">
            {principles.map((item) => (
              <div key={item} className="micro-card">
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.aside
          className="hero-aside"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          <p className="eyebrow">What this site enables</p>
          <div className="orbital-card">
            <strong>Not a brochure.</strong>
            <p>
              This is the operating layer for the club: discovery, updates, approvals, moderation, and outreach in one flow.
            </p>
          </div>
          <div className="stack-sm">
            {(overview?.headline_stats || []).map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </motion.aside>
      </section>

      <section className="section surface">
        <SectionHeader
          eyebrow="Built for every layer"
          title="If the platform doesn’t serve all four user groups, it is incomplete."
          description="The homepage makes that product thinking visible immediately instead of hiding it in the codebase."
        />
        <div className="audience-grid">
          {audienceCards.map((card) => (
            <article key={card.title} className="mini-card">
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeader
          eyebrow="Featured Projects"
          title="Real builds from club members"
          description="These are not placeholder panels. They are pulled from the project system and can be expanded by approved submissions."
        />
        {error ? <EmptyState title="Public feed unavailable" description={error} /> : null}
        <div className="content-grid three">
          {(overview?.featured_projects || []).length ? (
            overview.featured_projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))
          ) : (
            <EmptyState
              title="No featured projects yet"
              description="Approve a few submissions from the dashboard to spotlight them here."
            />
          )}
        </div>
      </section>

      <section className="section">
        <SectionHeader
          eyebrow="Upcoming Events"
          title="Workshops, hackathons, and demo nights"
          description="The event system is fully dynamic, searchable, and ready for admin scheduling."
        />
        <div className="content-grid two">
          {(overview?.featured_events || []).length ? (
            overview.featured_events.map((event) => <EventCard key={event.id} event={event} />)
          ) : (
            <EmptyState
              title="No featured events found"
              description="Create or mark an event as featured from the admin dashboard."
            />
          )}
        </div>
      </section>

      <section className="section surface">
        <SectionHeader
          eyebrow="Tech Domains"
          title="A club should feel bigger than a single stack."
          description="The visual language here is dark, deliberate, and product-oriented because the club itself should feel serious about shipping."
        />
        <div className="chip-row roomy">
          {domains.map((domain) => (
            <span key={domain} className="tech-chip">
              {domain}
            </span>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeader
          eyebrow="Core Team"
          title="The operators behind the momentum"
          description="The team page is database-driven, filterable, and easy to maintain from the admin side."
        />
        <div className="content-grid three">
          {(overview?.team_spotlight || []).length ? (
            overview.team_spotlight.map((member) => <TeamCard key={member.id} member={member} />)
          ) : (
            <EmptyState
              title="No team spotlight yet"
              description="Add a few core members from the dashboard to bring this section to life."
            />
          )}
        </div>
      </section>
    </div>
  );
}

export default HomePage;

