import { useEffect, useState } from "react";

import EmptyState from "../components/EmptyState";
import EventCard from "../components/EventCard";
import LoadingScreen from "../components/LoadingScreen";
import SectionHeader from "../components/SectionHeader";
import { getEvents } from "../services/api";

function EventsPage() {
  const [events, setEvents] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEvents() {
      try {
        setEvents(await getEvents());
      } catch (requestError) {
        setError(requestError.response?.data?.detail || "Unable to load events right now.");
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  if (loading) {
    return <LoadingScreen label="Loading event calendar" />;
  }

  const filteredEvents = events.filter((event) => {
    const matchesStatus = statusFilter === "all" ? true : event.status === statusFilter;
    const matchesQuery = `${event.title} ${event.description} ${event.location}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="shell stack-xl">
      <section className="page-header">
        <SectionHeader
          eyebrow="Events"
          title="Dynamic scheduling with live status and countdowns"
          description="Events are persisted in the backend, filterable on the frontend, and fully manageable from the protected dashboard."
        />
      </section>

      <section className="filter-bar">
        <label className="field">
          <span>Search</span>
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hackathon, workshop, demo day"
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select
            className="input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All events</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </section>

      {error ? <EmptyState title="Events unavailable" description={error} /> : null}
      <section className="content-grid two">
        {filteredEvents.length ? (
          filteredEvents.map((event) => <EventCard key={event.id} event={event} />)
        ) : (
          <EmptyState
            title="No events match the current filters"
            description="Adjust your filters or create a new event from the admin dashboard."
          />
        )}
      </section>
    </div>
  );
}

export default EventsPage;

