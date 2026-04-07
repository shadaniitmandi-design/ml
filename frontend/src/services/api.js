import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 10000,
});

function authHeaders(token) {
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
}

export async function getHomeOverview() {
  const response = await api.get("/overview");
  return response.data;
}

export async function getEvents(params = {}) {
  const response = await api.get("/events", { params });
  return response.data;
}

export async function createEvent(token, payload) {
  const response = await api.post("/events", payload, authHeaders(token));
  return response.data;
}

export async function updateEvent(token, eventId, payload) {
  const response = await api.put(`/events/${eventId}`, payload, authHeaders(token));
  return response.data;
}

export async function deleteEvent(token, eventId) {
  await api.delete(`/events/${eventId}`, authHeaders(token));
}

export async function getTeam(params = {}) {
  const response = await api.get("/team", { params });
  return response.data;
}

export async function createTeamMember(token, payload) {
  const response = await api.post("/team", payload, authHeaders(token));
  return response.data;
}

export async function updateTeamMember(token, memberId, payload) {
  const response = await api.put(`/team/${memberId}`, payload, authHeaders(token));
  return response.data;
}

export async function deleteTeamMember(token, memberId) {
  await api.delete(`/team/${memberId}`, authHeaders(token));
}

export async function getProjects(params = {}) {
  const response = await api.get("/projects", { params });
  return response.data;
}

export async function getProjectsAdmin(token, params = {}) {
  const response = await api.get("/projects/admin", {
    ...authHeaders(token),
    params,
  });
  return response.data;
}

export async function submitProject(payload) {
  const response = await api.post("/projects/submissions", payload);
  return response.data;
}

export async function createProject(token, payload) {
  const response = await api.post("/projects", payload, authHeaders(token));
  return response.data;
}

export async function updateProject(token, projectId, payload) {
  const response = await api.put(`/projects/${projectId}`, payload, authHeaders(token));
  return response.data;
}

export async function updateProjectStatus(token, projectId, status) {
  const response = await api.patch(
    `/projects/${projectId}/status`,
    { status },
    authHeaders(token)
  );
  return response.data;
}

export async function deleteProject(token, projectId) {
  await api.delete(`/projects/${projectId}`, authHeaders(token));
}

export async function sendJoinMessage(payload) {
  const response = await api.post("/contact", payload);
  return response.data;
}

export async function getContacts(token) {
  const response = await api.get("/contact", authHeaders(token));
  return response.data;
}

export async function updateContactStatus(token, submissionId, status) {
  const response = await api.patch(
    `/contact/${submissionId}`,
    { status },
    authHeaders(token)
  );
  return response.data;
}

export async function getAnalytics(token) {
  const response = await api.get("/analytics", authHeaders(token));
  return response.data;
}

export async function uploadImage(token, file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/uploads/images", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

