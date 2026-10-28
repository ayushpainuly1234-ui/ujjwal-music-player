"use strict";

const audio = document.getElementById("audio");
const songGrid = document.getElementById("songGrid");
const recentList = document.getElementById("recentList");
const searchInput = document.getElementById("searchInput");
const toastElement = document.getElementById("toast");

const state = {
  songs: [],
  user: null,
  currentSongId: null,
  likedSongs: [],
  playlists: [],
  history: [],
  recommendations: [],
  shuffle: false,
  repeat: false,
  authMode: "login",
  lastSavedBucket: -1,
  searchTimer: null,
  toastTimer: null,
  busySavingPlayback: false
};

const fallbackCover = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80";

function el(id) {
  return document.getElementById(id);
}

function idOf(item) {
  if (!item) return "";
  const raw = item._id || item.id || (item.song && (item.song._id || item.song.id));
  return raw ? String(raw) : "";
}

function knownSongs() {
  const gathered = [...state.songs, ...state.likedSongs];
  for (const record of state.history) {
    if (record && record.song) gathered.push(record.song);
  }
  for (const playlist of state.playlists) {
    if (Array.isArray(playlist.songs)) gathered.push(...playlist.songs);
  }
  const unique = new Map();
  for (const song of gathered) {
    const id = idOf(song);
    if (id) unique.set(id, song);
  }
  return [...unique.values()];
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body != null && !isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin"
  });
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Request failed. Please try again.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function notify(message) {
  toastElement.textContent = message;
  toastElement.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toastElement.classList.remove("show"), 3200);
}

function setPlayerStatus(message) {
  el("playerStatus").textContent = message || "";
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
}

function setButtonIcon(button, iconClass) {
  button.innerHTML = '<i class="' + iconClass + '" aria-hidden="true"></i>';
}

function showAuth(mode = "login") {
  state.authMode = mode;
  const registering = mode === "register";
  el("authHeading").textContent = registering ? "Create your account" : "Sign in to SoundSphere";
  el("authSubmit").textContent = registering ? "Create account" : "Sign in";
  el("toggleAuthMode").textContent = registering ? "Already registered? Sign in" : "New here? Create an account";
  el("nameField").hidden = !registering;
  el("authName").required = registering;
  el("authPassword").autocomplete = registering ? "new-password" : "current-password";
  el("authError").textContent = "";
  el("authDialog").hidden = false;
  (registering ? el("authName") : el("authEmail")).focus();
}

function closeAuth() {
  el("authDialog").hidden = true;
  el("authError").textContent = "";
}

function paintAccount() {
  const button = el("authButton");
  const hint = el("accountHint");
  if (state.user) {
    button.textContent = state.user.name + " · Sign out";
    button.setAttribute("aria-label", "Signed in as " + state.user.name + ". Click to sign out.");
    hint.textContent = "Signed in as " + state.user.name + ". Your saved library syncs to this account.";
  } else {
    button.textContent = "Sign in";
    button.setAttribute("aria-label", "Sign in or create an account");
    hint.textContent = "Sign in to sync playlists and favourites.";
  }
}

function findSong(songId) {
  return knownSongs().find(song => idOf(song) === String(songId));
}

function isLiked(songId) {
  return state.likedSongs.some(song => idOf(song) === String(songId));
}

function makeSongCard(song, mode = "catalogue") {
  const songId = idOf(song);
  const card = document.createElement("article");
  card.className = "song-card";

  const cover = document.createElement("img");
  cover.loading = "lazy";
  cover.alt = "Cover art for " + (song.title || "untitled track");
  cover.src = song.coverUrl || fallbackCover;
  cover.addEventListener("error", () => { cover.src = fallbackCover; }, { once: true });

  const play = document.createElement("button");
  play.className = "play-small";
  play.type = "button";
  play.title = "Play " + (song.title || "track");
  play.setAttribute("aria-label", play.title);
  setButtonIcon(play, "fa-solid fa-play");
  play.addEventListener("click", () => playSong(songId));

  const title = document.createElement("h3");
  title.textContent = song.title || "Untitled track";
  const artist = document.createElement("p");
  artist.textContent = [song.artist || "Unknown artist", song.genre || ""].filter(Boolean).join(" · ");

  const reason = document.createElement("p");
  reason.className = "recommendation-reason";
  reason.textContent = mode === "recommendation" ? (song.recommendationReason || "Picked from your library") : "";

  const actions = document.createElement("div");
  actions.className = "song-card-actions";
  const like = document.createElement("button");
  like.type = "button";
  like.textContent = isLiked(songId) ? "♥ Saved" : "♡ Save";
  like.setAttribute("aria-pressed", String(isLiked(songId)));
  like.addEventListener("click", () => toggleLike(songId));

  actions.appendChild(like);
  if (mode === "catalogue" || mode === "recommendation") {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "add-song";
    add.textContent = "+ Playlist";
    add.addEventListener("click", () => addSongToPlaylist(songId));
    actions.appendChild(add);
  }

  if (mode === "recommendation") card.append(cover, play, title, artist, reason, actions);
  else card.append(cover, play, title, artist, actions);
  return card;
}

function renderSongs(list = state.songs) {
  songGrid.replaceChildren();
  el("songCount").textContent = list.length + (list.length === 1 ? " track" : " tracks");

  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = searchInput.value.trim()
      ? "No tracks match that search. Try an artist or genre."
      : "No tracks are in the catalogue yet. Sign in to upload audio you own.";
    songGrid.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  list.forEach(song => fragment.appendChild(makeSongCard(song)));
  songGrid.appendChild(fragment);
}

function renderLikes() {
  const container = el("likesList");
  container.replaceChildren();
  if (!state.user) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "Sign in to save favourites across devices.";
    container.appendChild(message);
    return;
  }
  if (!state.likedSongs.length) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "Your favourites will show up here. Press ♡ Save on any track.";
    container.appendChild(message);
    return;
  }
  state.likedSongs.forEach(song => container.appendChild(makeSongCard(song, "favourite")));
}

function renderPlaylists() {
  const container = el("playlistList");
  container.replaceChildren();
  if (!state.user) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "Sign in to create and keep your own playlists.";
    container.appendChild(message);
    return;
  }
  if (!state.playlists.length) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "No playlists yet. Choose Create playlist in the sidebar.";
    container.appendChild(message);
    return;
  }

  for (const playlist of state.playlists) {
    const card = document.createElement("article");
    card.className = "playlist-card";

    const top = document.createElement("div");
    top.className = "playlist-card-top";
    const info = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = playlist.name;
    const description = document.createElement("p");
    description.className = "muted";
    const count = Array.isArray(playlist.songs) ? playlist.songs.length : 0;
    description.textContent = count + (count === 1 ? " track" : " tracks");
    info.append(heading, description);

    const removePlaylist = document.createElement("button");
    removePlaylist.type = "button";
    removePlaylist.textContent = "Delete";
    removePlaylist.addEventListener("click", () => deletePlaylist(idOf(playlist)));
    top.append(info, removePlaylist);
    card.appendChild(top);

    const tracks = document.createElement("div");
    tracks.className = "playlist-tracks";
    if (!count) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Add tracks from the catalogue.";
      tracks.appendChild(empty);
    } else {
      playlist.songs.forEach(song => {
        const row = document.createElement("div");
        row.className = "playlist-track";
        const title = document.createElement("span");
        title.textContent = song.title + " — " + song.artist;
        const actions = document.createElement("div");
        const play = document.createElement("button");
        play.type = "button";
        play.textContent = "Play";
        play.addEventListener("click", () => playSong(idOf(song)));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", "Remove " + song.title + " from " + playlist.name);
        remove.addEventListener("click", () => removeSongFromPlaylist(idOf(playlist), idOf(song)));
        actions.append(play, remove);
        row.append(title, actions);
        tracks.appendChild(row);
      });
    }
    card.append(tracks);
    container.appendChild(card);
  }
}

function renderHistory() {
  const container = el("recentList");
  container.replaceChildren();
  if (!state.user) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "Sign in to keep listening history across sessions.";
    container.appendChild(message);
    return;
  }
  const items = state.history.filter(item => item && item.song);
  if (!items.length) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "Tracks you listen to will appear here.";
    container.appendChild(message);
    return;
  }
  for (const item of items.slice(0, 10)) {
    const song = item.song;
    const wrapper = document.createElement("div");
    wrapper.className = "recent-item";
    const button = document.createElement("button");
    button.type = "button";
    const cover = document.createElement("img");
    cover.loading = "lazy";
    cover.src = song.coverUrl || fallbackCover;
    cover.alt = "";
    cover.addEventListener("error", () => { cover.src = fallbackCover; }, { once: true });
    const meta = document.createElement("div");
    meta.className = "recent-meta";
    const title = document.createElement("strong");
    title.textContent = song.title;
    const artist = document.createElement("p");
    artist.textContent = song.artist;
    const time = document.createElement("p");
    time.textContent = item.playedAt ? "Played " + new Date(item.playedAt).toLocaleString() : "";
    meta.append(title, artist, time);
    const play = document.createElement("span");
    play.className = "muted";
    play.textContent = "Play ▶";
    button.append(cover, meta, play);
    button.addEventListener("click", () => playSong(idOf(song)));
    wrapper.appendChild(button);
    container.appendChild(wrapper);
  }
}

function renderRecommendations() {
  const container = el("recommendationGrid");
  container.replaceChildren();
  if (!state.user) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "Sign in to get recommendations from your favourites and listening history.";
    container.appendChild(message);
    return;
  }
  if (!state.recommendations.length) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "Listen to a few tracks or save favourites to build your personal recommendations.";
    container.appendChild(message);
    return;
  }
  state.recommendations.forEach(song => container.appendChild(makeSongCard(song, "recommendation")));
}

async function refreshRecommendations() {
  if (!state.user) {
    state.recommendations = [];
    renderRecommendations();
    return;
  }
  try {
    const data = await api("/api/library/recommendations");
    state.recommendations = Array.isArray(data.songs) ? data.songs : [];
  } catch (_error) {
    state.recommendations = [];
  }
  renderRecommendations();
}



async function loadSongs(query = "") {
  const params = new URLSearchParams({ limit: "50" });
  if (query.trim()) params.set("q", query.trim());
  try {
    const data = await api("/api/songs?" + params.toString());
    state.songs = Array.isArray(data.songs) ? data.songs : [];
    renderSongs(state.songs);
    el("searchStatus").textContent = query.trim() ? state.songs.length + " result(s)" : "";
    return state.songs;
  } catch (error) {
    songGrid.replaceChildren();
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "The API could not be reached. Start the server and make sure MongoDB is running.";
    songGrid.appendChild(message);
    setPlayerStatus(error.message);
    return [];
  }
}

async function loadAccountData() {
  const [likesResult, playlistsResult, historyResult, playbackResult, recommendationResult] = await Promise.allSettled([
    api("/api/library/likes"),
    api("/api/playlists"),
    api("/api/library/history"),
    api("/api/library/playback"),
    api("/api/library/recommendations")
  ]);

  state.likedSongs = likesResult.status === "fulfilled" && Array.isArray(likesResult.value.songs)
    ? likesResult.value.songs : [];
  state.playlists = playlistsResult.status === "fulfilled" && Array.isArray(playlistsResult.value.playlists)
    ? playlistsResult.value.playlists : [];
  state.history = historyResult.status === "fulfilled" && Array.isArray(historyResult.value.history)
    ? historyResult.value.history : [];
  state.recommendations = recommendationResult.status === "fulfilled" && Array.isArray(recommendationResult.value.songs)
    ? recommendationResult.value.songs : [];

  paintAccount();
  renderSongs(state.songs);
  renderLikes();
  renderPlaylists();
  renderHistory();
  renderRecommendations();

  if (playbackResult.status === "fulfilled" && playbackResult.value.playback && playbackResult.value.playback.song) {
    restorePlayback(playbackResult.value.playback);
  }
}

function setCurrentSong(song) {
  state.currentSongId = idOf(song);
  el("currentCover").src = song.coverUrl || fallbackCover;
  el("currentCover").alt = "Cover art for " + (song.title || "untitled track");
  el("currentTitle").textContent = song.title || "Untitled track";
  el("currentArtist").textContent = song.artist || "Unknown artist";
  el("likeButton").textContent = isLiked(state.currentSongId) ? "♥" : "♡";
  el("likeButton").setAttribute("aria-pressed", String(isLiked(state.currentSongId)));
  el("likeButton").title = isLiked(state.currentSongId) ? "Remove from favourites" : "Save to favourites";
  state.lastSavedBucket = -1;
}

function restorePlayback(playback) {
  const song = playback.song;
  if (!song || !song.audioUrl) return;
  if (!state.songs.some(item => idOf(item) === idOf(song))) state.songs.unshift(song);
  setCurrentSong(song);
  audio.src = song.audioUrl;
  audio.load();

  const resumeAt = Number(playback.positionSeconds) || 0;
  const seek = () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = Math.min(resumeAt, Math.max(0, audio.duration - 0.5));
    } else {
      audio.currentTime = resumeAt;
    }
    updateProgress();
    audio.removeEventListener("loadedmetadata", seek);
    setPlayerStatus("Last session restored. Press play to resume.");
  };
  audio.addEventListener("loadedmetadata", seek);
  if (audio.readyState >= 1) seek();
  setButtonIcon(el("playButton"), "fa-solid fa-play");
}

async function playSong(songId) {
  const song = findSong(songId);
  if (!song || !song.audioUrl) {
    setPlayerStatus("This track is unavailable.");
    return;
  }
  if (state.currentSongId !== String(songId)) {
    await savePlayback(true);
    audio.pause();
    audio.src = song.audioUrl;
    audio.load();
    setCurrentSong(song);
    audio.currentTime = 0;
  }
  try {
    await audio.play();
    setButtonIcon(el("playButton"), "fa-solid fa-pause");
    setPlayerStatus("");
  } catch (error) {
    setButtonIcon(el("playButton"), "fa-solid fa-play");
    setPlayerStatus("Playback was blocked or this audio file is unavailable.");
  }
}

function nextSong() {
  const list = knownSongs();
  if (!list.length) return;
  const currentIndex = list.findIndex(song => idOf(song) === state.currentSongId);
  let nextIndex;
  if (state.shuffle && list.length > 1) {
    do { nextIndex = Math.floor(Math.random() * list.length); }
    while (nextIndex === currentIndex);
  } else {
    nextIndex = (currentIndex + 1 + list.length) % list.length;
  }
  playSong(idOf(list[nextIndex]));
}

function previousSong() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    updateProgress();
    return;
  }
  const list = knownSongs();
  if (!list.length) return;
  const currentIndex = list.findIndex(song => idOf(song) === state.currentSongId);
  const previousIndex = (currentIndex - 1 + list.length) % list.length;
  playSong(idOf(list[previousIndex]));
}

function updateProgress() {
  el("currentTime").textContent = formatTime(audio.currentTime);
  el("duration").textContent = formatTime(audio.duration);
  el("progress").value = Number.isFinite(audio.duration) && audio.duration > 0
    ? (audio.currentTime / audio.duration) * 100 : 0;
}

async function recordHistory() {
  if (!state.user || !state.currentSongId) return;
  try {
    await api("/api/library/history", {
      method: "POST",
      body: JSON.stringify({ songId: state.currentSongId })
    });
    const song = findSong(state.currentSongId);
    if (song) {
      state.history = [{ song, playedAt: new Date().toISOString(), positionSeconds: 0 },
        ...state.history.filter(item => idOf(item.song) !== state.currentSongId)].slice(0, 30);
      renderHistory();
      await refreshRecommendations();
    }
  } catch (_error) {
    setPlayerStatus("Could not sync listening history. Check your connection.");
  }
}

async function savePlayback(force = false) {
  if (!state.user || !state.currentSongId || state.busySavingPlayback) return;
  const position = Number.isFinite(audio.currentTime) ? Math.max(0, audio.currentTime) : 0;
  const bucket = Math.floor(position / 10);
  if (!force && bucket <= state.lastSavedBucket) return;
  state.busySavingPlayback = true;
  try {
    await api("/api/library/playback", {
      method: "PUT",
      body: JSON.stringify({ songId: state.currentSongId, positionSeconds: position })
    });
    state.lastSavedBucket = bucket;
  } catch (_error) {
    // Playback continues locally even if the save endpoint is temporarily offline.
  } finally {
    state.busySavingPlayback = false;
  }
}

async function toggleLike(songId) {
  if (!state.user) {
    showAuth("login");
    return;
  }
  try {
    const data = await api("/api/library/likes/" + encodeURIComponent(songId), { method: "PUT" });
    state.likedSongs = Array.isArray(data.songs) ? data.songs : [];
    renderSongs(state.songs);
    renderLikes();
    await refreshRecommendations();
    if (state.currentSongId) {
      const current = findSong(state.currentSongId);
      if (current) setCurrentSong(current);
    }
    notify(data.liked ? "Added to your favourites." : "Removed from your favourites.");
  } catch (error) {
    notify(error.message);
  }
}

async function createPlaylist() {
  if (!state.user) {
    showAuth("login");
    return;
  }
  const name = window.prompt("Choose a name for your playlist:");
  if (name === null) return;
  if (!name.trim() || name.trim().length > 80) {
    notify("Playlist name must be 1–80 characters.");
    return;
  }
  try {
    const result = await api("/api/playlists", {
      method: "POST",
      body: JSON.stringify({ name: name.trim() })
    });
    state.playlists.unshift(result.playlist);
    renderPlaylists();
    notify("Playlist created and saved to your account.");
  } catch (error) {
    notify(error.message);
  }
}

async function addSongToPlaylist(songId) {
  if (!state.user) {
    showAuth("login");
    return;
  }
  if (!state.playlists.length) {
    notify("Create a playlist first.");
    return;
  }
  const menu = state.playlists.map((playlist, index) => (index + 1) + ". " + playlist.name).join("\n");
  const answer = window.prompt("Add this track to which playlist? Enter a number:\n" + menu);
  if (answer === null) return;
  const index = Number.parseInt(answer, 10) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= state.playlists.length) {
    notify("Choose a valid playlist number.");
    return;
  }
  const playlist = state.playlists[index];
  try {
    const result = await api("/api/playlists/" + encodeURIComponent(idOf(playlist)) + "/songs", {
      method: "POST",
      body: JSON.stringify({ songId })
    });
    state.playlists[index] = result.playlist;
    renderPlaylists();
    notify("Track saved to " + playlist.name + ".");
  } catch (error) {
    notify(error.message);
  }
}

async function removeSongFromPlaylist(playlistId, songId) {
  try {
    const result = await api("/api/playlists/" + encodeURIComponent(playlistId) + "/songs/" + encodeURIComponent(songId), { method: "DELETE" });
    state.playlists = state.playlists.map(playlist => idOf(playlist) === playlistId ? result.playlist : playlist);
    renderPlaylists();
    notify("Track removed from playlist.");
  } catch (error) { notify(error.message); }
}

async function deletePlaylist(playlistId) {
  const playlist = state.playlists.find(item => idOf(item) === playlistId);
  if (!playlist || !window.confirm('Delete playlist "' + playlist.name + '"?')) return;
  try {
    await api("/api/playlists/" + encodeURIComponent(playlistId), { method: "DELETE" });
    state.playlists = state.playlists.filter(item => idOf(item) !== playlistId);
    renderPlaylists();
    notify("Playlist deleted.");
  } catch (error) { notify(error.message); }
}

async function signOut() {
  if (!window.confirm("Sign out of SoundSphere?")) return;
  await savePlayback(true);
  try { await api("/api/auth/logout", { method: "POST" }); } catch (_error) {}
  audio.pause();
  state.user = null;
  state.likedSongs = [];
  state.playlists = [];
  state.history = [];
  state.recommendations = [];
  state.currentSongId = null;
  audio.removeAttribute("src");
  audio.load();
  el("currentTitle").textContent = "Choose a song";
  el("currentArtist").textContent = "SoundSphere";
  el("currentCover").src = fallbackCover;
  el("likeButton").textContent = "♡";
  el("likeButton").setAttribute("aria-pressed", "false");
  setButtonIcon(el("playButton"), "fa-solid fa-play");
  paintAccount();
  await loadSongs(searchInput.value);
  renderLikes();
  renderPlaylists();
  renderHistory();
  renderRecommendations();
  setPlayerStatus("Signed out. Your public catalogue is still available.");
  notify("You have signed out.");
}

el("authButton").addEventListener("click", () => {
  if (state.user) signOut();
  else showAuth("login");
});

el("closeAuth").addEventListener("click", closeAuth);
el("authDialog").addEventListener("click", event => {
  if (event.target === el("authDialog")) closeAuth();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeAuth();
});

el("toggleAuthMode").addEventListener("click", () => {
  showAuth(state.authMode === "login" ? "register" : "login");
});

el("authForm").addEventListener("submit", async event => {
  event.preventDefault();
  const registering = state.authMode === "register";
  const payload = {
    email: el("authEmail").value.trim(),
    password: el("authPassword").value
  };
  if (registering) payload.name = el("authName").value.trim();

  el("authSubmit").disabled = true;
  el("authError").textContent = "";
  try {
    const result = await api(registering ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    state.user = result.user;
    closeAuth();
    el("authForm").reset();
    paintAccount();
    await loadSongs(searchInput.value);
    await loadAccountData();
    notify(registering ? "Account created. Your music library is ready." : "Welcome back, " + state.user.name + ".");
  } catch (error) {
    el("authError").textContent = error.message;
  } finally {
    el("authSubmit").disabled = false;
  }
});

el("createPlaylist").addEventListener("click", createPlaylist);

el("playButton").addEventListener("click", async () => {
  if (!state.currentSongId) {
    if (state.songs.length) await playSong(idOf(state.songs[0]));
    return;
  }
  if (audio.paused) {
    try { await audio.play(); } catch (_error) { setPlayerStatus("This audio file could not be played."); }
  } else {
    audio.pause();
  }
});

el("nextButton").addEventListener("click", nextSong);
el("previousButton").addEventListener("click", previousSong);
el("shuffleButton").addEventListener("click", () => {
  state.shuffle = !state.shuffle;
  el("shuffleButton").setAttribute("aria-pressed", String(state.shuffle));
});
el("repeatButton").addEventListener("click", () => {
  state.repeat = !state.repeat;
  el("repeatButton").setAttribute("aria-pressed", String(state.repeat));
});
el("likeButton").addEventListener("click", () => {
  if (state.currentSongId) toggleLike(state.currentSongId);
  else notify("Choose a track first.");
});
el("volume").addEventListener("input", event => {
  audio.volume = Number(event.target.value);
});
audio.volume = Number(el("volume").value);

el("progress").addEventListener("input", event => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    audio.currentTime = (Number(event.target.value) / 100) * audio.duration;
    updateProgress();
  }
});

audio.addEventListener("play", () => {
  setButtonIcon(el("playButton"), "fa-solid fa-pause");
  setPlayerStatus("");
  recordHistory();
});
audio.addEventListener("pause", () => {
  setButtonIcon(el("playButton"), "fa-solid fa-play");
  savePlayback(true);
});
audio.addEventListener("timeupdate", () => {
  updateProgress();
  savePlayback(false);
});
audio.addEventListener("loadedmetadata", updateProgress);
audio.addEventListener("ended", () => {
  if (state.repeat) {
    audio.currentTime = 0;
    audio.play().catch(() => setPlayerStatus("Could not replay this track."));
  } else {
    nextSong();
  }
});
audio.addEventListener("error", () => {
  if (state.currentSongId) setPlayerStatus("Audio unavailable. Check that the file exists on the server.");
});

searchInput.addEventListener("input", () => {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => loadSongs(searchInput.value), 250);
});

el("uploadForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!state.user) {
    showAuth("login");
    return;
  }
  const form = event.currentTarget;
  const status = el("uploadStatus");
  const submit = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  submit.disabled = true;
  status.textContent = "Uploading audio…";
  try {
    const result = await api("/api/songs/upload", { method: "POST", body: formData });
    state.songs.unshift(result.song);
    renderSongs(state.songs);
    form.reset();
    status.textContent = "Upload complete.";
    el("uploadDetails").open = false;
    notify("Track uploaded to your library.");
  } catch (error) {
    status.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

async function init() {
  await loadSongs();
  paintAccount();
  renderLikes();
  renderPlaylists();
  renderHistory();
  try {
    const result = await api("/api/auth/me");
    state.user = result.user;
    paintAccount();
    await loadSongs(searchInput.value);
    await loadAccountData();
  } catch (_error) {
    state.user = null;
    paintAccount();
    renderLikes();
    renderPlaylists();
    renderHistory();
  }
}

init();
