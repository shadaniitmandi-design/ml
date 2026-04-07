import { motion } from "framer-motion";

const fallbackImage =
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80";

function TeamCard({ member }) {
  return (
    <motion.article
      className="card team-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
    >
      <img className="avatar" src={member.image_url || fallbackImage} alt={member.name} />
      <div className="card-body">
        <span className={`status-pill subtle ${member.role}`}>{member.role}</span>
        <h3>{member.name}</h3>
        <p className="member-title">{member.title}</p>
        <p>{member.bio}</p>
        <div className="meta-row">
          {member.linkedin_url ? (
            <a href={member.linkedin_url} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          ) : null}
          {member.github_url ? (
            <a href={member.github_url} target="_blank" rel="noreferrer">
              GitHub
            </a>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

export default TeamCard;
