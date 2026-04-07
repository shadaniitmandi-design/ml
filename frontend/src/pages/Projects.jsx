import { useEffect, useState } from "react";

import EmptyState from "../components/EmptyState";
import LoadingScreen from "../components/LoadingScreen";
import ProjectCard from "../components/ProjectCard";
import SectionHeader from "../components/SectionHeader";
import { getProjects, submitProject } from "../services/api";

const initialForm = {
  title: "",
  summary: "",
  description: "",
  tech_stack: "",
  contributor_names: "",
  github_url: "",
  live_url: "",
  image_url: "",
  submitted_by_name: "",
  submitted_by_email: "",
};

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [query, setQuery] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    async function loadProjects() {
      try {
        setProjects(await getProjects());
      } catch (requestError) {
        setError(requestError.response?.data?.detail || "Unable to load projects right now.");
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    setSubmissionError("");

    try {
      await submitProject({
        ...submission,
        tech_stack: submission.tech_stack.split(",").map((item) => item.trim()),
        contributor_names: submission.contributor_names.split(",").map((item) => item.trim()),
        github_url: submission.github_url || null,
        live_url: submission.live_url || null,
        image_url: submission.image_url || null,
      });
      setFeedback("Project submitted. It is now waiting for admin approval.");
      setSubmission(initialForm);
    } catch (requestError) {
      setSubmissionError(requestError.response?.data?.detail || "Unable to submit this project.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading projects showcase" />;
  }

  const filteredProjects = projects.filter((project) => {
    const matchesFeatured = featuredOnly ? project.featured : true;
    const haystack = `${project.title} ${project.summary} ${project.description} ${project.tech_stack.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesFeatured && haystack;
  });

  return (
    <div className="shell stack-xl">
      <section className="page-header">
        <SectionHeader
          eyebrow="Projects"
          title="Showcase what members actually build"
          description="Public visitors see approved work only. Members can still submit new projects through this page for admin review."
        />
      </section>

      <section className="filter-bar">
        <label className="field">
          <span>Search</span>
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, summary, or stack"
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={(event) => setFeaturedOnly(event.target.checked)}
          />
          <span>Featured only</span>
        </label>
      </section>

      {error ? <EmptyState title="Projects unavailable" description={error} /> : null}
      <section className="content-grid three">
        {filteredProjects.length ? (
          filteredProjects.map((project) => <ProjectCard key={project.id} project={project} />)
        ) : (
          <EmptyState
            title="No projects match the current filters"
            description="Approve a new submission or broaden the search."
          />
        )}
      </section>

      <section className="split-panel">
        <div className="section surface">
          <SectionHeader
            eyebrow="Submit a project"
            title="Members can contribute to the showcase"
            description="Submissions are stored as pending until an admin approves them from the dashboard."
          />
          <div className="stack-sm">
            <div className="mini-card">Admin review prevents broken or low-context projects from going live.</div>
            <div className="mini-card">Approved projects can be featured on the homepage automatically.</div>
            <div className="mini-card">The flow is designed to scale beyond a single hackathon weekend.</div>
          </div>
        </div>

        <form className="section form-card" onSubmit={handleSubmit}>
          <SectionHeader
            eyebrow="Project Submission"
            title="Tell the club what you shipped"
            description="Keep this high-signal. Clear summary, solid description, and links that actually work."
          />
          <div className="form-grid">
            <label className="field">
              <span>Title</span>
              <input
                className="input"
                value={submission.title}
                onChange={(event) => setSubmission({ ...submission, title: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Summary</span>
              <input
                className="input"
                value={submission.summary}
                onChange={(event) => setSubmission({ ...submission, summary: event.target.value })}
                placeholder="One-line project pitch"
                required
              />
            </label>
            <label className="field field-full">
              <span>Description</span>
              <textarea
                className="input textarea"
                rows="6"
                value={submission.description}
                onChange={(event) =>
                  setSubmission({ ...submission, description: event.target.value })
                }
                required
              />
            </label>
            <label className="field">
              <span>Tech stack</span>
              <input
                className="input"
                value={submission.tech_stack}
                onChange={(event) =>
                  setSubmission({ ...submission, tech_stack: event.target.value })
                }
                placeholder="React, FastAPI, PostgreSQL"
                required
              />
            </label>
            <label className="field">
              <span>Contributors</span>
              <input
                className="input"
                value={submission.contributor_names}
                onChange={(event) =>
                  setSubmission({ ...submission, contributor_names: event.target.value })
                }
                placeholder="Aarav, Naina"
                required
              />
            </label>
            <label className="field">
              <span>GitHub URL</span>
              <input
                className="input"
                type="url"
                value={submission.github_url}
                onChange={(event) => setSubmission({ ...submission, github_url: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Live URL</span>
              <input
                className="input"
                type="url"
                value={submission.live_url}
                onChange={(event) => setSubmission({ ...submission, live_url: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Preview image URL</span>
              <input
                className="input"
                type="url"
                value={submission.image_url}
                onChange={(event) => setSubmission({ ...submission, image_url: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Your name</span>
              <input
                className="input"
                value={submission.submitted_by_name}
                onChange={(event) =>
                  setSubmission({ ...submission, submitted_by_name: event.target.value })
                }
                required
              />
            </label>
            <label className="field">
              <span>Your email</span>
              <input
                className="input"
                type="email"
                value={submission.submitted_by_email}
                onChange={(event) =>
                  setSubmission({ ...submission, submitted_by_email: event.target.value })
                }
                required
              />
            </label>
          </div>
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit for approval"}
          </button>
          {feedback ? <p className="success-text">{feedback}</p> : null}
          {submissionError ? <p className="error-text">{submissionError}</p> : null}
        </form>
      </section>
    </div>
  );
}

export default ProjectsPage;

