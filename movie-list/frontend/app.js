const STATUS_LABELS = {
  planned: "Planned",
  watching: "Watching",
  completed: "Completed",
  on_hold: "On hold",
  dropped: "Dropped",
};

const state = {
  token: localStorage.getItem("movielist_token"),
  user: null,
  view: "catalog",
  query: "",
  genre: "",
  sort: "popular",
  statusFilter: "",
  movies: [],
  genres: [],
  stats: null,
  authMode: "login",
};

const els = {
  authArea: document.querySelector("#authArea"),
  searchInput: document.querySelector("#searchInput"),
  genreSelect: document.querySelector("#genreSelect"),
  sortSelect: document.querySelector("#sortSelect"),
  genreChips: document.querySelector("#genreChips"),
  statusFilters: document.querySelector("#statusFilters"),
  statsGrid: document.querySelector("#statsGrid"),
  profileName: document.querySelector("#profileName"),
  moviesGrid: document.querySelector("#moviesGrid"),
  message: document.querySelector("#message"),
  resultCount: document.querySelector("#resultCount"),
  resultKicker: document.querySelector("#resultKicker"),
  resultTitle: document.querySelector("#resultTitle"),
  pageTitle: document.querySelector("#pageTitle"),
  viewLabel: document.querySelector("#viewLabel"),
  movieModal: document.querySelector("#movieModal"),
  modalBody: document.querySelector("#modalBody"),
  authModal: document.querySelector("#authModal"),
  authForm: document.querySelector("#authForm"),
  authTitle: document.querySelector("#authTitle"),
  authSubmit: document.querySelector("#authSubmit"),
  authError: document.querySelector("#authError"),
  toggleAuthMode: document.querySelector("#toggleAuthMode"),
  registerFields: document.querySelector("#registerFields"),
  loginFields: document.querySelector("#loginFields"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function compactNumber(value) {
  if (!value && value !== 0) return "n/a";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function runtimeLabel(minutes) {
  if (!minutes) return "Runtime n/a";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}m`;
}

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : {};
  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}

function showMessage(text, tone = "neutral") {
  els.message.textContent = text;
  els.message.className = `message ${tone}`;
}

function clearMessage() {
  els.message.className = "message hidden";
  els.message.textContent = "";
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  if (view === "catalog") {
    els.pageTitle.textContent = "Browse movies";
    els.viewLabel.textContent = "Movie catalog";
    els.resultKicker.textContent = "Top picks";
    els.resultTitle.textContent = "Movies";
    els.searchInput.disabled = false;
    els.genreSelect.disabled = false;
    els.sortSelect.disabled = false;
    loadMovies();
  } else {
    els.pageTitle.textContent = "Your movie list";
    els.viewLabel.textContent = "Personal tracker";
    els.resultKicker.textContent = "Saved movies";
    els.resultTitle.textContent = "My List";
    els.searchInput.disabled = true;
    els.genreSelect.disabled = true;
    els.sortSelect.disabled = true;
    loadLibrary();
  }
}

function renderAuth() {
  if (state.user) {
    els.authArea.innerHTML = `
      <span class="user-pill">${escapeHtml(state.user.display_name)}</span>
      <button class="ghost-button" id="logoutButton" type="button">Log out</button>
    `;
    document.querySelector("#logoutButton").addEventListener("click", () => {
      localStorage.removeItem("movielist_token");
      state.token = null;
      state.user = null;
      state.stats = null;
      renderAuth();
      renderStats();
      if (state.view === "library") setView("catalog");
      else loadMovies();
    });
  } else {
    els.authArea.innerHTML = `
      <button class="ghost-button" id="loginButton" type="button">Log in</button>
      <button class="primary-button compact" id="joinButton" type="button">Join</button>
    `;
    document.querySelector("#loginButton").addEventListener("click", () => openAuth("login"));
    document.querySelector("#joinButton").addEventListener("click", () => openAuth("register"));
  }
  els.profileName.textContent = state.user ? state.user.display_name : "Guest";
}

function renderStats() {
  const stats = state.stats;
  const planned = stats?.counts?.planned ?? 0;
  const watching = stats?.counts?.watching ?? 0;
  const completed = stats?.counts?.completed ?? 0;
  const average = stats?.average_score ?? "n/a";
  els.statsGrid.innerHTML = `
    <div class="stat-box"><span>${planned}</span><small>Planned</small></div>
    <div class="stat-box"><span>${watching}</span><small>Watching</small></div>
    <div class="stat-box"><span>${completed}</span><small>Completed</small></div>
    <div class="stat-box"><span>${average}</span><small>Avg score</small></div>
  `;
}

function renderStatusFilters() {
  const buttons = [
    ["", "All"],
    ...Object.entries(STATUS_LABELS),
  ];
  els.statusFilters.innerHTML = buttons
    .map(([value, label]) => {
      const active = state.statusFilter === value ? "active" : "";
      return `<button class="status-filter ${active}" data-status="${value}" type="button">${label}</button>`;
    })
    .join("");
}

function renderGenreControls() {
  els.genreSelect.innerHTML = `<option value="">All genres</option>${state.genres
    .map((genre) => `<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`)
    .join("")}`;
  els.genreSelect.value = state.genre;
  els.genreChips.innerHTML = [
    `<button class="chip ${state.genre === "" ? "active" : ""}" data-genre="" type="button">All</button>`,
    ...state.genres.slice(0, 12).map((genre) => {
      const active = state.genre === genre ? "active" : "";
      return `<button class="chip ${active}" data-genre="${escapeHtml(genre)}" type="button">${escapeHtml(genre)}</button>`;
    }),
  ].join("");
}

function renderMovies() {
  clearMessage();
  els.resultCount.textContent = `${state.movies.length} shown`;
  if (!state.movies.length) {
    showMessage(state.view === "library" ? "No saved movies yet." : "No movies found.", "neutral");
    els.moviesGrid.innerHTML = "";
    return;
  }
  els.moviesGrid.innerHTML = state.movies.map(movieCard).join("");
}

function movieCard(movie) {
  const entry = movie.my_entry;
  const status = entry ? STATUS_LABELS[entry.status] : "Add";
  const score = entry?.score || entry?.score === 0 ? `${entry.score}/10` : "No score";
  const genres = movie.genres.slice(0, 2).map((genre) => `<span>${escapeHtml(genre)}</span>`).join("");
  const listAction = entry
    ? `data-open-movie="${movie.id}"`
    : `data-quick-add="${movie.id}"`;
  return `
    <article class="movie-card" data-movie-id="${movie.id}">
      <button class="poster-button" data-open-movie="${movie.id}" type="button" aria-label="Open ${escapeHtml(movie.title)}">
        <img src="${escapeHtml(movie.poster_url)}" alt="${escapeHtml(movie.title)} poster" loading="lazy">
        <span class="poster-title">${escapeHtml(movie.title)}</span>
      </button>
      <div class="movie-meta">
        <div class="movie-title-row">
          <h3>${escapeHtml(movie.title)}</h3>
          <span class="rating">${movie.imdb_rating ?? "n/a"}</span>
        </div>
        <p>${movie.year || "Year n/a"} &middot; ${runtimeLabel(movie.runtime_minutes)} &middot; ${compactNumber(movie.imdb_votes)} votes</p>
        <div class="tag-row">${genres}</div>
        <div class="card-actions">
          <button class="ghost-button small" data-open-movie="${movie.id}" type="button">Details</button>
          <button class="primary-button small" ${listAction} type="button">${status}</button>
        </div>
        <div class="entry-line">${entry ? `${escapeHtml(status)} &middot; ${escapeHtml(score)}` : "Not in your list"}</div>
      </div>
    </article>
  `;
}

async function loadSession() {
  if (!state.token) return;
  try {
    const data = await api("/api/auth/me");
    state.user = data.user;
    await loadStats();
  } catch {
    localStorage.removeItem("movielist_token");
    state.token = null;
    state.user = null;
  }
}

async function loadStats() {
  if (!state.user) {
    state.stats = null;
    renderStats();
    return;
  }
  state.stats = await api("/api/stats");
  renderStats();
}

async function loadGenres() {
  const data = await api("/api/genres");
  state.genres = data.genres;
  renderGenreControls();
}

async function loadMovies() {
  clearMessage();
  const params = new URLSearchParams({
    query: state.query,
    genre: state.genre,
    sort: state.sort,
    limit: "48",
  });
  try {
    const data = await api(`/api/movies?${params}`);
    state.movies = data.movies;
    renderMovies();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function loadLibrary() {
  if (!state.user) {
    state.movies = [];
    renderMovies();
    showMessage("Log in to view your list.", "neutral");
    openAuth("login");
    return;
  }
  const params = new URLSearchParams();
  if (state.statusFilter) params.set("status_filter", state.statusFilter);
  try {
    const data = await api(`/api/library?${params}`);
    state.movies = data.entries;
    renderMovies();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function openAuth(mode) {
  state.authMode = mode;
  const register = mode === "register";
  els.authTitle.textContent = register ? "Create account" : "Log in";
  els.authSubmit.textContent = register ? "Create account" : "Log in";
  els.toggleAuthMode.textContent = register ? "Use existing account" : "Create an account";
  els.registerFields.classList.toggle("hidden", !register);
  els.loginFields.classList.toggle("hidden", register);
  els.authError.classList.add("hidden");
  els.authModal.classList.remove("hidden");
}

function closeAuth() {
  els.authModal.classList.add("hidden");
}

async function handleAuth(event) {
  event.preventDefault();
  const form = new FormData(els.authForm);
  const endpoint = state.authMode === "register" ? "/api/auth/register" : "/api/auth/login";
  const payload = state.authMode === "register"
    ? {
        display_name: form.get("display_name"),
        email: form.get("email"),
        username: form.get("username"),
        password: form.get("password"),
      }
    : {
        login: form.get("login"),
        password: form.get("password"),
      };
  try {
    const data = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("movielist_token", state.token);
    closeAuth();
    els.authForm.reset();
    renderAuth();
    await loadStats();
    if (state.view === "library") await loadLibrary();
    else await loadMovies();
  } catch (error) {
    els.authError.textContent = error.message;
    els.authError.classList.remove("hidden");
  }
}

async function openMovie(movieId) {
  try {
    const data = await api(`/api/movies/${movieId}`);
    renderMovieModal(data.movie, data.reviews);
    els.movieModal.classList.remove("hidden");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function closeMovie() {
  els.movieModal.classList.add("hidden");
  els.modalBody.innerHTML = "";
}

function renderMovieModal(movie, reviews) {
  const entry = movie.my_entry || {};
  const status = entry.status || "planned";
  const score = entry.score ?? "";
  const progress = entry.progress ?? (status === "completed" ? 100 : 0);
  const favorite = entry.favorite ? "checked" : "";
  els.modalBody.innerHTML = `
    <div class="movie-detail">
      <div class="detail-poster">
        <img src="${escapeHtml(movie.poster_url)}" alt="${escapeHtml(movie.title)} poster">
        <span>${escapeHtml(movie.title)}</span>
      </div>
      <div class="detail-main">
        <p class="eyebrow">${escapeHtml(movie.year || "Year n/a")} &middot; ${escapeHtml(runtimeLabel(movie.runtime_minutes))}</p>
        <h2 id="modalTitle">${escapeHtml(movie.title)}</h2>
        <p class="summary">${escapeHtml(movie.summary || "No summary is stored for this title yet.")}</p>
        <div class="detail-facts">
          <span>IMDb ${escapeHtml(movie.imdb_rating ?? "n/a")}</span>
          <span>${escapeHtml(compactNumber(movie.imdb_votes))} votes</span>
          <span>${escapeHtml(movie.content_rating || "Unrated")}</span>
        </div>
        <dl class="credit-list">
          <div><dt>Director</dt><dd>${escapeHtml(movie.director || "Unknown")}</dd></div>
          <div><dt>Cast</dt><dd>${escapeHtml(movie.cast.join(", ") || "Unknown")}</dd></div>
          <div><dt>Genres</dt><dd>${escapeHtml(movie.genres.join(", ") || "Unknown")}</dd></div>
        </dl>
        <form class="entry-form" id="entryForm">
          <label>
            Status
            <select name="status">
              ${Object.entries(STATUS_LABELS)
                .map(([value, label]) => `<option value="${value}" ${value === status ? "selected" : ""}>${label}</option>`)
                .join("")}
            </select>
          </label>
          <label>
            Score
            <input name="score" type="number" min="0" max="10" step="0.5" value="${escapeHtml(score)}">
          </label>
          <label>
            Progress
            <input name="progress" type="number" min="0" max="100" step="5" value="${escapeHtml(progress)}">
          </label>
          <label class="check-row">
            <input name="favorite" type="checkbox" ${favorite}>
            Favorite
          </label>
          <label class="notes-field">
            Notes
            <textarea name="notes" rows="3">${escapeHtml(entry.notes || "")}</textarea>
          </label>
          <div class="form-actions">
            <button class="primary-button" type="submit">Save</button>
            <button class="ghost-button" data-remove-entry="${movie.id}" type="button">Remove</button>
          </div>
        </form>
        <section class="reviews-section">
          <div class="content-head compact-head">
            <div>
              <p class="section-kicker">Community</p>
              <h3>Reviews</h3>
            </div>
          </div>
          <form class="review-form" id="reviewForm">
            <input name="rating" type="number" min="0" max="10" step="0.5" placeholder="Rating">
            <input name="body" placeholder="Write a review">
            <button class="ghost-button" type="submit">Post</button>
          </form>
          <div class="reviews-list">
            ${reviews.length ? reviews.map(reviewCard).join("") : `<p class="empty-copy">No reviews yet.</p>`}
          </div>
        </section>
      </div>
    </div>
  `;
  document.querySelector("#entryForm").addEventListener("submit", (event) => saveEntry(event, movie.id));
  document.querySelector("#reviewForm").addEventListener("submit", (event) => saveReview(event, movie.id));
}

function reviewCard(review) {
  return `
    <article class="review-card">
      <div>
        <strong>${escapeHtml(review.user.display_name)}</strong>
        <span>${escapeHtml(review.rating)}/10</span>
      </div>
      <p>${escapeHtml(review.body)}</p>
    </article>
  `;
}

async function saveEntry(event, movieId) {
  event.preventDefault();
  if (!state.user) {
    openAuth("login");
    return;
  }
  const form = new FormData(event.currentTarget);
  const scoreRaw = form.get("score");
  const payload = {
    status: form.get("status"),
    score: scoreRaw === "" ? null : Number(scoreRaw),
    progress: Number(form.get("progress") || 0),
    favorite: form.get("favorite") === "on",
    notes: form.get("notes"),
  };
  try {
    await api(`/api/library/${movieId}`, { method: "PUT", body: JSON.stringify(payload) });
    await loadStats();
    if (state.view === "library") await loadLibrary();
    else await loadMovies();
    await openMovie(movieId);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function quickAdd(movieId) {
  if (!state.user) {
    openAuth("login");
    return;
  }
  try {
    await api(`/api/library/${movieId}`, {
      method: "PUT",
      body: JSON.stringify({ status: "planned", progress: 0, favorite: false }),
    });
    await loadStats();
    if (state.view === "library") await loadLibrary();
    else await loadMovies();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function removeEntry(movieId) {
  if (!state.user) return;
  await api(`/api/library/${movieId}`, { method: "DELETE" });
  await loadStats();
  closeMovie();
  if (state.view === "library") await loadLibrary();
  else await loadMovies();
}

async function saveReview(event, movieId) {
  event.preventDefault();
  if (!state.user) {
    openAuth("login");
    return;
  }
  const form = new FormData(event.currentTarget);
  const payload = {
    rating: Number(form.get("rating")),
    body: form.get("body"),
    contains_spoilers: false,
  };
  try {
    await api(`/api/reviews/${movieId}`, { method: "POST", body: JSON.stringify(payload) });
    await openMovie(movieId);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value;
    window.clearTimeout(els.searchInput._timer);
    els.searchInput._timer = window.setTimeout(loadMovies, 180);
  });
  els.genreSelect.addEventListener("change", () => {
    state.genre = els.genreSelect.value;
    renderGenreControls();
    loadMovies();
  });
  els.sortSelect.addEventListener("change", () => {
    state.sort = els.sortSelect.value;
    loadMovies();
  });
  els.genreChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-genre]");
    if (!button) return;
    state.genre = button.dataset.genre;
    els.genreSelect.value = state.genre;
    renderGenreControls();
    loadMovies();
  });
  els.statusFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    state.statusFilter = button.dataset.status;
    renderStatusFilters();
    if (state.view === "library") loadLibrary();
  });
  els.moviesGrid.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-movie]");
    const quickButton = event.target.closest("[data-quick-add]");
    if (openButton) openMovie(openButton.dataset.openMovie);
    if (quickButton) quickAdd(quickButton.dataset.quickAdd);
  });
  els.movieModal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-modal]")) closeMovie();
    const removeButton = event.target.closest("[data-remove-entry]");
    if (removeButton) removeEntry(removeButton.dataset.removeEntry);
  });
  document.querySelectorAll("[data-close-auth]").forEach((button) => {
    button.addEventListener("click", closeAuth);
  });
  els.authForm.addEventListener("submit", handleAuth);
  els.toggleAuthMode.addEventListener("click", () => {
    openAuth(state.authMode === "login" ? "register" : "login");
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMovie();
      closeAuth();
    }
  });
}

async function init() {
  renderAuth();
  renderStats();
  renderStatusFilters();
  bindEvents();
  await loadSession();
  renderAuth();
  await loadGenres();
  setView("catalog");
}

init();
