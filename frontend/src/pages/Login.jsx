import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import SectionHeader from "../components/SectionHeader";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, authEnabled, devBypassEnabled } = useAuth();
  const [email, setEmail] = useState("admin@kpdevcell.dev");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(location.state?.from || "/admin", { replace: true });
    }
  }, [location.state, navigate, user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signIn(email, password);
      navigate(location.state?.from || "/admin", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shell stack-xl">
      <section className="center-panel">
        <div className="section form-card narrow">
          <SectionHeader
            eyebrow="Admin Access"
            title="Protected routes only"
            description="The dashboard sits behind auth because write actions should never be exposed through a public UI."
          />

          {devBypassEnabled ? (
            <div className="callout-card">
              <strong>Local dev bypass is enabled.</strong>
              <p>
                This is useful for demos and local review. In production, switch to Firebase credentials and disable the bypass on both frontend and backend.
              </p>
              <Link className="button" to="/admin">
                Open dashboard
              </Link>
            </div>
          ) : null}

          {!devBypassEnabled && !authEnabled ? (
            <div className="callout-card">
              <strong>Firebase is not configured yet.</strong>
              <p>
                Add your frontend Firebase environment variables and matching backend admin credentials to enable real admin login.
              </p>
            </div>
          ) : null}

          {!devBypassEnabled ? (
            <form className="stack-md" onSubmit={handleSubmit}>
              <label className="field">
                <span>Email</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button className="button" type="submit" disabled={submitting || !authEnabled}>
                {submitting ? "Signing in..." : "Login"}
              </button>
              {error ? <p className="error-text">{error}</p> : null}
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default LoginPage;

