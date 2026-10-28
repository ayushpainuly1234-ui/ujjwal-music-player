const allowedAudio = new Map([
  [".mp3", new Set(["audio/mpeg", "audio/mp3"])],
  [".m4a", new Set(["audio/mp4", "audio/x-m4a"])],
  [".mp4", new Set(["audio/mp4"])],
  [".wav", new Set(["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"])],
  [".ogg", new Set(["audio/ogg", "application/ogg"])],
  [".webm", new Set(["audio/webm"])],
  [".flac", new Set(["audio/flac", "audio/x-flac", "application/octet-stream"])]
]);

function escapeRegex(value) {
  return String(value).replace(/[.*+?^\x24{}()|[\]\\]/g, "\\$&");
}

function validateRegistration({ name, email, password }) {
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPassword = typeof password === "string" ? password : "";
  if (cleanName.length < 2 || cleanName.length > 60) return "Name must contain 2–60 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) return "Enter a valid email address.";
  if (cleanPassword.length < 10 || cleanPassword.length > 128) return "Password must be 10–128 characters long.";
  return null;
}

function validateSongMetadata({ title, artist, album = "", genre = "", coverUrl = "" }) {
  if (typeof title !== "string" || title.trim().length < 1 || title.trim().length > 160) return "Title (1–160 chars) is required.";
  if (typeof artist !== "string" || artist.trim().length < 1 || artist.trim().length > 120) return "Artist (1–120 chars) is required.";
  if (typeof album !== "string" || album.trim().length > 160) return "Album must be 160 characters or fewer.";
  if (typeof genre !== "string" || genre.trim().length > 60) return "Genre must be 60 characters or fewer.";
  if (typeof coverUrl !== "string" || coverUrl.trim().length > 1000) return "Cover URL must be 1000 characters or fewer.";
  if (coverUrl.trim() && !/^https:\/\//i.test(coverUrl.trim())) return "Cover URL must use HTTPS.";
  return null;
}

function isAllowedAudioFile(file) {
  if (!file || typeof file.originalname !== "string" || typeof file.mimetype !== "string") return false;
  const dot = file.originalname.lastIndexOf(".");
  const extension = dot < 0 ? "" : file.originalname.slice(dot).toLowerCase();
  return allowedAudio.has(extension) && allowedAudio.get(extension).has(file.mimetype.toLowerCase());
}

module.exports = { escapeRegex, validateRegistration, validateSongMetadata, isAllowedAudioFile };
