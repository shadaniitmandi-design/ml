import { motion } from "framer-motion";

import { formatDate } from "../services/date";

const fallbackImage =
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80";

function ProjectCard({ project, showStatus = false }) {
  return (
    <motion.article
      className="card project-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
    >
      <div className="card-image-wrap">
        <img className="card-image" src={project.image_url || fallbackImage} alt={project.title} />
        {showStatus ? <span className={`status-pill ${project.status}`}>{project.status}</span> : null}
      </div>
      <div className="card-body">
        <div className="card-topline">
          <span>{formatDate(project.created_at)}</span>
          <span>{project.summary}</span>
        </div>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <div className="chip-row">
          {project.tech_stack.map((item) => (
            <span key={`${project.id}-${item}`} className="tech-chip">
              {item}
            </span>
          ))}
        </div>
        <div className="meta-column">
          <span>Contributors: {project.contributor_names.join(", ")}</span>
          <div className="meta-row">
            {project.github_url ? (
              <a href={project.github_url} target="_blank" rel="noreferrer">
                GitHub
              </a>
            ) : null}
            {project.live_url ? (
              <a href={project.live_url} target="_blank" rel="noreferrer">
                Live demo
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default ProjectCard;
