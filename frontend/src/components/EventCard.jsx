import { motion } from "framer-motion";

import { formatDateTime, getCountdownLabel } from "../services/date";

const fallbackImage =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";

function EventCard({ event }) {
  return (
    <motion.article
      className="card event-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
    >
      <div className="card-image-wrap">
        <img className="card-image" src={event.cover_image || fallbackImage} alt={event.title} />
        <span className={`status-pill ${event.status}`}>{event.status}</span>
      </div>
      <div className="card-body">
        <div className="card-topline">
          <span>{formatDateTime(event.start_at)}</span>
          {event.status === "upcoming" ? <span>{getCountdownLabel(event.start_at)}</span> : null}
        </div>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        <div className="meta-row">
          <span>{event.location}</span>
          {event.registration_url ? (
            <a href={event.registration_url} target="_blank" rel="noreferrer">
              Register
            </a>
          ) : (
            <span>Registration closed</span>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default EventCard;
