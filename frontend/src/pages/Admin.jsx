import { useEffect, useState } from "react";

import EmptyState from "../components/EmptyState";
import LoadingScreen from "../components/LoadingScreen";
import ProjectCard from "../components/ProjectCard";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import {
  createEvent,
  createProject,
  createTeamMember,
  deleteEvent,
  deleteProject,
  deleteTeamMember,
  getAnalytics,
  getContacts,
  getEvents,
  getProjectsAdmin,
  getTeam,
  updateContactStatus,
  updateEvent,
  updateProjectStatus,
  updateTeamMember,
  uploadImage,
} from "../services/api";
import { formatDateTime, toDateTimeInput, toIsoString } from "../services/date";

const initialEventForm = {
  title: "",
  description: "",
  location: "",
  start_at: "",
  end_at: "",
  status: "upcoming",
  registration_url: "",
  cover_image: "",
  featured: false,
};

const initialMemberForm = {
  name: "",
  role: "core",
  title: "",
  bio: "",
  image_url: "",
  linkedin_url: "",
  github_url: "",
  order_index: 0,
  active: true,
};

const initialProjectForm = {
  title: "",
  summary: "",
  description: "",
  tech_stack: "",
  contributor_names: "",
  github_url: "",
  live_url: "",
  image_url: "",
  submitted_by_name: "KP Dev Cell Core",
  submitted_by_email: "core@kpdevcell.dev",
  featured: true,
  status: "approved",
};

function cleanOptionalValue(value) {
  return value ? value : null;
}

function AdminPage() {
  const { token, user, devBypassEnabled, signOut } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [events, setEvents] = useState([]);
  const [team, setTeam] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const [eventForm, setEventForm] = useState(initialEventForm);
  const [eventEditingId, setEventEditingId] = useState(null);

  const [memberForm, setMemberForm] = useState(initialMemberForm);
  const [memberEditingId, setMemberEditingId] = useState(null);

  const [projectForm, setProjectForm] = useState(initialProjectForm);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function loadDashboard() {
      try {
        const [analyticsData, eventsData, teamData, projectData, contactData] = await Promise.all([
          getAnalytics(token),
          getEvents(),
          getTeam({ active_only: false }),
          getProjectsAdmin(token),
          getContacts(token),
        ]);
        setAnalytics(analyticsData);
        setEvents(eventsData);
        setTeam(teamData);
        setProjects(projectData);
        setContacts(contactData);
      } catch (requestError) {
        setError(
          requestError.response?.data?.detail ||
            "Unable to load the dashboard. Check auth and backend configuration."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [token]);

  async function refreshDashboard() {
    const [analyticsData, eventsData, teamData, projectData, contactData] = await Promise.all([
      getAnalytics(token),
      getEvents(),
      getTeam({ active_only: false }),
      getProjectsAdmin(token),
      getContacts(token),
    ]);

    setAnalytics(analyticsData);
    setEvents(eventsData);
    setTeam(teamData);
    setProjects(projectData);
    setContacts(contactData);
  }

  function resetEditorState() {
    setEventForm(initialEventForm);
    setEventEditingId(null);
    setMemberForm(initialMemberForm);
    setMemberEditingId(null);
    setProjectForm(initialProjectForm);
  }

  async function runAction(label, action) {
    setBusyAction(label);
    setError("");
    setNotice("");

    try {
      await action();
      setNotice(`${label} completed successfully.`);
      await refreshDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || `${label} failed.`);
    } finally {
      setBusyAction("");
    }
  }

  async function handleImageUpload(target, file) {
    if (!file) {
      return;
    }

    await runAction(`Upload ${target} image`, async () => {
      const response = await uploadImage(token, file);
      if (target === "event") {
        setEventForm((current) => ({ ...current, cover_image: response.url }));
      }
      if (target === "member") {
        setMemberForm((current) => ({ ...current, image_url: response.url }));
      }
      if (target === "project") {
        setProjectForm((current) => ({ ...current, image_url: response.url }));
      }
    });
  }

  async function handleEventSubmit(event) {
    event.preventDefault();

    const payload = {
      ...eventForm,
      start_at: toIsoString(eventForm.start_at),
      end_at: toIsoString(eventForm.end_at),
      registration_url: cleanOptionalValue(eventForm.registration_url),
      cover_image: cleanOptionalValue(eventForm.cover_image),
    };

    await runAction(eventEditingId ? "Update event" : "Create event", async () => {
      if (eventEditingId) {
        await updateEvent(token, eventEditingId, payload);
      } else {
        await createEvent(token, payload);
      }
      setEventForm(initialEventForm);
      setEventEditingId(null);
    });
  }

  async function handleMemberSubmit(event) {
    event.preventDefault();

    const payload = {
      ...memberForm,
      order_index: Number(memberForm.order_index),
      image_url: cleanOptionalValue(memberForm.image_url),
      linkedin_url: cleanOptionalValue(memberForm.linkedin_url),
      github_url: cleanOptionalValue(memberForm.github_url),
    };

    await runAction(memberEditingId ? "Update team member" : "Create team member", async () => {
      if (memberEditingId) {
        await updateTeamMember(token, memberEditingId, payload);
      } else {
        await createTeamMember(token, payload);
      }
      setMemberForm(initialMemberForm);
      setMemberEditingId(null);
    });
  }

  async function handleProjectSubmit(event) {
    event.preventDefault();

    const payload = {
      ...projectForm,
      tech_stack: projectForm.tech_stack.split(",").map((item) => item.trim()),
      contributor_names: projectForm.contributor_names.split(",").map((item) => item.trim()),
      github_url: cleanOptionalValue(projectForm.github_url),
      live_url: cleanOptionalValue(projectForm.live_url),
      image_url: cleanOptionalValue(projectForm.image_url),
    };

    await runAction("Create project", async () => {
      await createProject(token, payload);
      setProjectForm(initialProjectForm);
    });
  }

  if (loading) {
    return <LoadingScreen label="Loading admin dashboard" />;
  }

  return (
    <div className="shell stack-xl">
      <section className="page-header dashboard-head">
        <div>
          <SectionHeader
            eyebrow="Admin Dashboard"
            title="Operate the club from one place"
            description="This is the control layer for content, approvals, analytics, incoming messages, and team updates."
          />
          <p className="muted">
            Signed in as {user?.email || "unknown admin"}
            {devBypassEnabled ? " using local dev bypass." : "."}
          </p>
        </div>
        <div className="hero-actions">
          <button className="button button-secondary" type="button" onClick={resetEditorState}>
            Clear editors
          </button>
          <button className="button button-ghost" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </section>

      {error ? <div className="alert error-text">{error}</div> : null}
      {notice ? <div className="alert success-text">{notice}</div> : null}

      <section className="stats-grid">
        <StatCard label="Total events" value={analytics?.total_events || 0} />
        <StatCard label="Upcoming events" value={analytics?.upcoming_events || 0} />
        <StatCard label="Approved projects" value={analytics?.approved_projects || 0} />
        <StatCard label="Pending projects" value={analytics?.pending_projects || 0} />
        <StatCard label="Core team" value={analytics?.core_team_members || 0} />
        <StatCard label="Inbox submissions" value={analytics?.contact_submissions || 0} />
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-panel">
          <SectionHeader
            eyebrow="Events"
            title={eventEditingId ? "Edit event" : "Create event"}
            description="Admin-owned scheduling with backend validation and public rendering."
          />
          <form className="form-grid" onSubmit={handleEventSubmit}>
            <label className="field">
              <span>Title</span>
              <input
                className="input"
                value={eventForm.title}
                onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Location</span>
              <input
                className="input"
                value={eventForm.location}
                onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Starts at</span>
              <input
                className="input"
                type="datetime-local"
                value={eventForm.start_at}
                onChange={(event) => setEventForm({ ...eventForm, start_at: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Ends at</span>
              <input
                className="input"
                type="datetime-local"
                value={eventForm.end_at}
                onChange={(event) => setEventForm({ ...eventForm, end_at: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                className="input"
                value={eventForm.status}
                onChange={(event) => setEventForm({ ...eventForm, status: event.target.value })}
              >
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="field">
              <span>Registration URL</span>
              <input
                className="input"
                type="url"
                value={eventForm.registration_url}
                onChange={(event) =>
                  setEventForm({ ...eventForm, registration_url: event.target.value })
                }
              />
            </label>
            <label className="field field-full">
              <span>Description</span>
              <textarea
                className="input textarea"
                rows="5"
                value={eventForm.description}
                onChange={(event) =>
                  setEventForm({ ...eventForm, description: event.target.value })
                }
                required
              />
            </label>
            <label className="field">
              <span>Cover image URL</span>
              <input
                className="input"
                value={eventForm.cover_image}
                onChange={(event) =>
                  setEventForm({ ...eventForm, cover_image: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Upload image</span>
              <input
                className="input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(event) => handleImageUpload("event", event.target.files?.[0])}
              />
            </label>
            <label className="checkbox-row field-full">
              <input
                type="checkbox"
                checked={eventForm.featured}
                onChange={(event) => setEventForm({ ...eventForm, featured: event.target.checked })}
              />
              <span>Feature this event on the homepage</span>
            </label>
            <button className="button" type="submit" disabled={Boolean(busyAction)}>
              {busyAction || (eventEditingId ? "Save event" : "Create event")}
            </button>
          </form>

          <div className="stack-sm">
            {events.map((eventItem) => (
              <article key={eventItem.id} className="list-card">
                <div>
                  <strong>{eventItem.title}</strong>
                  <p className="muted">
                    {formatDateTime(eventItem.start_at)} • {eventItem.location}
                  </p>
                </div>
                <div className="meta-row wrap">
                  <button
                    className="button button-secondary button-small"
                    type="button"
                    onClick={() => {
                      setEventEditingId(eventItem.id);
                      setEventForm({
                        title: eventItem.title,
                        description: eventItem.description,
                        location: eventItem.location,
                        start_at: toDateTimeInput(eventItem.start_at),
                        end_at: toDateTimeInput(eventItem.end_at),
                        status: eventItem.status,
                        registration_url: eventItem.registration_url || "",
                        cover_image: eventItem.cover_image || "",
                        featured: eventItem.featured,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="button button-ghost button-small"
                    type="button"
                    onClick={() =>
                      window.confirm(`Delete "${eventItem.title}"?`) &&
                      runAction("Delete event", async () => {
                        await deleteEvent(token, eventItem.id);
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="dashboard-panel">
          <SectionHeader
            eyebrow="Team"
            title={memberEditingId ? "Edit member" : "Add team member"}
            description="Team cards stay dynamic because this content lives in the database."
          />
          <form className="form-grid" onSubmit={handleMemberSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                className="input"
                value={memberForm.name}
                onChange={(event) => setMemberForm({ ...memberForm, name: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Role</span>
              <select
                className="input"
                value={memberForm.role}
                onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })}
              >
                <option value="core">Core</option>
                <option value="member">Member</option>
              </select>
            </label>
            <label className="field">
              <span>Title</span>
              <input
                className="input"
                value={memberForm.title}
                onChange={(event) => setMemberForm({ ...memberForm, title: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Order index</span>
              <input
                className="input"
                type="number"
                value={memberForm.order_index}
                onChange={(event) =>
                  setMemberForm({ ...memberForm, order_index: event.target.value })
                }
              />
            </label>
            <label className="field field-full">
              <span>Bio</span>
              <textarea
                className="input textarea"
                rows="5"
                value={memberForm.bio}
                onChange={(event) => setMemberForm({ ...memberForm, bio: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Image URL</span>
              <input
                className="input"
                value={memberForm.image_url}
                onChange={(event) =>
                  setMemberForm({ ...memberForm, image_url: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Upload image</span>
              <input
                className="input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(event) => handleImageUpload("member", event.target.files?.[0])}
              />
            </label>
            <label className="field">
              <span>LinkedIn URL</span>
              <input
                className="input"
                type="url"
                value={memberForm.linkedin_url}
                onChange={(event) =>
                  setMemberForm({ ...memberForm, linkedin_url: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>GitHub URL</span>
              <input
                className="input"
                type="url"
                value={memberForm.github_url}
                onChange={(event) =>
                  setMemberForm({ ...memberForm, github_url: event.target.value })
                }
              />
            </label>
            <label className="checkbox-row field-full">
              <input
                type="checkbox"
                checked={memberForm.active}
                onChange={(event) => setMemberForm({ ...memberForm, active: event.target.checked })}
              />
              <span>Member is active on the public site</span>
            </label>
            <button className="button" type="submit" disabled={Boolean(busyAction)}>
              {busyAction || (memberEditingId ? "Save member" : "Add member")}
            </button>
          </form>

          <div className="stack-sm">
            {team.map((member) => (
              <article key={member.id} className="list-card">
                <div>
                  <strong>{member.name}</strong>
                  <p className="muted">
                    {member.role} • {member.title}
                  </p>
                </div>
                <div className="meta-row wrap">
                  <button
                    className="button button-secondary button-small"
                    type="button"
                    onClick={() => {
                      setMemberEditingId(member.id);
                      setMemberForm({
                        name: member.name,
                        role: member.role,
                        title: member.title,
                        bio: member.bio,
                        image_url: member.image_url || "",
                        linkedin_url: member.linkedin_url || "",
                        github_url: member.github_url || "",
                        order_index: member.order_index,
                        active: member.active,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="button button-ghost button-small"
                    type="button"
                    onClick={() =>
                      window.confirm(`Delete "${member.name}"?`) &&
                      runAction("Delete team member", async () => {
                        await deleteTeamMember(token, member.id);
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-panel">
          <SectionHeader
            eyebrow="Projects"
            title="Create approved projects or moderate submissions"
            description="This section handles both club-created showcase entries and member-submitted approvals."
          />
          <form className="form-grid" onSubmit={handleProjectSubmit}>
            <label className="field">
              <span>Title</span>
              <input
                className="input"
                value={projectForm.title}
                onChange={(event) => setProjectForm({ ...projectForm, title: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Summary</span>
              <input
                className="input"
                value={projectForm.summary}
                onChange={(event) => setProjectForm({ ...projectForm, summary: event.target.value })}
                required
              />
            </label>
            <label className="field field-full">
              <span>Description</span>
              <textarea
                className="input textarea"
                rows="5"
                value={projectForm.description}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, description: event.target.value })
                }
                required
              />
            </label>
            <label className="field">
              <span>Tech stack</span>
              <input
                className="input"
                value={projectForm.tech_stack}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, tech_stack: event.target.value })
                }
                placeholder="React, FastAPI, PostgreSQL"
                required
              />
            </label>
            <label className="field">
              <span>Contributors</span>
              <input
                className="input"
                value={projectForm.contributor_names}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, contributor_names: event.target.value })
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
                value={projectForm.github_url}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, github_url: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Live URL</span>
              <input
                className="input"
                type="url"
                value={projectForm.live_url}
                onChange={(event) => setProjectForm({ ...projectForm, live_url: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Image URL</span>
              <input
                className="input"
                value={projectForm.image_url}
                onChange={(event) => setProjectForm({ ...projectForm, image_url: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Upload image</span>
              <input
                className="input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(event) => handleImageUpload("project", event.target.files?.[0])}
              />
            </label>
            <label className="field">
              <span>Submitted by</span>
              <input
                className="input"
                value={projectForm.submitted_by_name}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, submitted_by_name: event.target.value })
                }
                required
              />
            </label>
            <label className="field">
              <span>Submitter email</span>
              <input
                className="input"
                type="email"
                value={projectForm.submitted_by_email}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, submitted_by_email: event.target.value })
                }
                required
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={projectForm.featured}
                onChange={(event) => setProjectForm({ ...projectForm, featured: event.target.checked })}
              />
              <span>Feature on homepage</span>
            </label>
            <label className="field">
              <span>Status</span>
              <select
                className="input"
                value={projectForm.status}
                onChange={(event) => setProjectForm({ ...projectForm, status: event.target.value })}
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <button className="button" type="submit" disabled={Boolean(busyAction)}>
              {busyAction || "Create project"}
            </button>
          </form>

          <div className="stack-sm">
            {projects.length ? (
              projects.map((project) => (
                <div key={project.id} className="stack-sm">
                  <ProjectCard project={project} showStatus />
                  <div className="meta-row wrap">
                    {project.status !== "approved" ? (
                      <button
                        className="button button-small"
                        type="button"
                        onClick={() =>
                          runAction("Approve project", async () => {
                            await updateProjectStatus(token, project.id, "approved");
                          })
                        }
                      >
                        Approve
                      </button>
                    ) : null}
                    {project.status !== "rejected" ? (
                      <button
                        className="button button-secondary button-small"
                        type="button"
                        onClick={() =>
                          runAction("Reject project", async () => {
                            await updateProjectStatus(token, project.id, "rejected");
                          })
                        }
                      >
                        Reject
                      </button>
                    ) : null}
                    {project.status !== "pending" ? (
                      <button
                        className="button button-ghost button-small"
                        type="button"
                        onClick={() =>
                          runAction("Move project to pending", async () => {
                            await updateProjectStatus(token, project.id, "pending");
                          })
                        }
                      >
                        Mark pending
                      </button>
                    ) : null}
                    <button
                      className="button button-ghost button-small"
                      type="button"
                      onClick={() =>
                        window.confirm(`Delete "${project.title}"?`) &&
                        runAction("Delete project", async () => {
                          await deleteProject(token, project.id);
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No projects found"
                description="Create an approved project or wait for member submissions."
              />
            )}
          </div>
        </div>

        <div className="dashboard-panel">
          <SectionHeader
            eyebrow="Inbox"
            title="Review contact and join submissions"
            description="Public form submissions are stored in the database and can be triaged here."
          />
          <div className="stack-sm">
            {contacts.length ? (
              contacts.map((contact) => (
                <article key={contact.id} className="list-card">
                  <div className="stack-xs">
                    <div className="meta-row wrap">
                      <strong>{contact.name}</strong>
                      <span className={`status-pill ${contact.status}`}>{contact.status}</span>
                    </div>
                    <p className="muted">{contact.email}</p>
                    <p className="muted">{contact.interest_area}</p>
                    <p>{contact.message}</p>
                  </div>
                  <div className="meta-row wrap">
                    {contact.status !== "reviewed" ? (
                      <button
                        className="button button-secondary button-small"
                        type="button"
                        onClick={() =>
                          runAction("Mark reviewed", async () => {
                            await updateContactStatus(token, contact.id, "reviewed");
                          })
                        }
                      >
                        Mark reviewed
                      </button>
                    ) : null}
                    {contact.status !== "archived" ? (
                      <button
                        className="button button-ghost button-small"
                        type="button"
                        onClick={() =>
                          runAction("Archive message", async () => {
                            await updateContactStatus(token, contact.id, "archived");
                          })
                        }
                      >
                        Archive
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                title="Inbox is empty"
                description="New join requests and contact messages will show up here."
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminPage;

