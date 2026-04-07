import { useState } from "react";

import SectionHeader from "../components/SectionHeader";
import { sendJoinMessage } from "../services/api";

const perks = [
  "Ship projects with other builders instead of learning alone.",
  "Get visibility on upcoming workshops, hackathons, and demo opportunities.",
  "Submit your own projects to the official showcase for approval.",
];

const initialForm = {
  name: "",
  email: "",
  interest_area: "Web Development",
  message: "",
};

function JoinPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFeedback("");

    try {
      await sendJoinMessage(form);
      setFeedback("Your message has been sent to the Dev Cell dashboard.");
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Unable to submit right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shell stack-xl">
      <section className="split-panel">
        <div className="section surface">
          <SectionHeader
            eyebrow="Join the club"
            title="Introduce yourself and tell the core team what you want to build"
            description="This form is stored in the database so the admin team can actually follow up instead of losing messages in a personal inbox."
          />
          <div className="stack-sm">
            {perks.map((perk) => (
              <div key={perk} className="mini-card">
                {perk}
              </div>
            ))}
          </div>
        </div>

        <form className="section form-card" onSubmit={handleSubmit}>
          <SectionHeader
            eyebrow="Contact / Join"
            title="Tell us where you want to contribute"
            description="This covers the public contact flow and doubles as a join request pipeline for club operations."
          />
          <div className="form-grid">
            <label className="field">
              <span>Name</span>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </label>
            <label className="field field-full">
              <span>Interest area</span>
              <select
                className="input"
                value={form.interest_area}
                onChange={(event) => setForm({ ...form, interest_area: event.target.value })}
              >
                <option>Web Development</option>
                <option>Backend Systems</option>
                <option>UI and Design</option>
                <option>AI Tooling</option>
                <option>Event Operations</option>
              </select>
            </label>
            <label className="field field-full">
              <span>Message</span>
              <textarea
                className="input textarea"
                rows="7"
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder="Tell us what you want to learn, build, or contribute."
                required
              />
            </label>
          </div>

          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send to Dev Cell"}
          </button>
          {feedback ? <p className="success-text">{feedback}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>
    </div>
  );
}

export default JoinPage;

