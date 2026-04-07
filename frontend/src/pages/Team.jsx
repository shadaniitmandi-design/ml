import { useEffect, useState } from "react";

import EmptyState from "../components/EmptyState";
import LoadingScreen from "../components/LoadingScreen";
import SectionHeader from "../components/SectionHeader";
import TeamCard from "../components/TeamCard";
import { getTeam } from "../services/api";

function TeamPage() {
  const [members, setMembers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMembers() {
      try {
        setMembers(await getTeam());
      } catch (requestError) {
        setError(requestError.response?.data?.detail || "Unable to load the team right now.");
      } finally {
        setLoading(false);
      }
    }

    loadMembers();
  }, []);

  if (loading) {
    return <LoadingScreen label="Loading the team roster" />;
  }

  const filteredMembers = members.filter((member) => {
    const matchesRole = roleFilter === "all" ? true : member.role === roleFilter;
    const matchesQuery = `${member.name} ${member.title} ${member.bio}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesRole && matchesQuery;
  });

  return (
    <div className="shell stack-xl">
      <section className="page-header">
        <SectionHeader
          eyebrow="Team"
          title="Database-powered team profiles, not hardcoded cards"
          description="The team page supports role filters, hover-rich cards, and a structure that can grow as the club does."
        />
      </section>

      <section className="filter-bar">
        <label className="field">
          <span>Search</span>
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, title, or bio"
          />
        </label>
        <label className="field">
          <span>Role</span>
          <select
            className="input"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="all">All roles</option>
            <option value="core">Core</option>
            <option value="member">Member</option>
          </select>
        </label>
      </section>

      {error ? <EmptyState title="Team feed unavailable" description={error} /> : null}
      <section className="content-grid three">
        {filteredMembers.length ? (
          filteredMembers.map((member) => <TeamCard key={member.id} member={member} />)
        ) : (
          <EmptyState
            title="No matching members"
            description="Try a different role filter or search query."
          />
        )}
      </section>
    </div>
  );
}

export default TeamPage;

