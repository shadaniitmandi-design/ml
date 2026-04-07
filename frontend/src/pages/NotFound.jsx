import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section className="center-stage">
      <div className="loading-card">
        <h1>404</h1>
        <p>The page you are looking for does not exist on this club platform.</p>
        <Link className="button" to="/">
          Back home
        </Link>
      </div>
    </section>
  );
}

export default NotFoundPage;

