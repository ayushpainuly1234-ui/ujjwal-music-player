const test = require("node:test");
const assert = require("node:assert/strict");
const {
  escapeRegex,
  validateRegistration,
  validateSongMetadata,
  isAllowedAudioFile
} = require("../src/utils/validation");

test("escapes regular-expression metacharacters in search input", () => {
  const input = "a+b (demo) [live].mp3";
  const regex = new RegExp(escapeRegex(input), "i");
  assert.equal(regex.test(input), true);
  assert.equal(regex.test("ab demo live mp3"), false);
});

test("validates registration and rejects malformed credentials", () => {
  assert.equal(validateRegistration({ name: "Ujjwal", email: "u@example.com", password: "long-password-123" }), null);
  assert.match(validateRegistration({ name: "U", email: "u@example.com", password: "long-password-123" }), /Name/);
  assert.match(validateRegistration({ name: "Ujjwal", email: "not-an-email", password: "long-password-123" }), /email/i);
  assert.match(validateRegistration({ name: "Ujjwal", email: "u@example.com", password: "short" }), /Password/);
});

test("validates upload metadata and requires HTTPS cover URLs", () => {
  assert.equal(validateSongMetadata({ title: "Track", artist: "Artist" }), null);
  assert.match(validateSongMetadata({ title: "", artist: "Artist" }), /Title/);
  assert.match(validateSongMetadata({ title: "Track", artist: "Artist", coverUrl: "javascript:alert(1)" }), /HTTPS/);
  assert.match(validateSongMetadata({ title: "Track", artist: "Artist", genre: "g".repeat(61) }), /Genre/);
});

test("accepts only supported extension and MIME type pairs", () => {
  assert.equal(isAllowedAudioFile({ originalname: "song.mp3", mimetype: "audio/mpeg" }), true);
  assert.equal(isAllowedAudioFile({ originalname: "song.wav", mimetype: "audio/wav" }), true);
  assert.equal(isAllowedAudioFile({ originalname: "payload.exe", mimetype: "audio/mpeg" }), false);
  assert.equal(isAllowedAudioFile({ originalname: "song.mp3", mimetype: "text/html" }), false);
  assert.equal(isAllowedAudioFile({ originalname: "no-extension", mimetype: "audio/mpeg" }), false);
});
