process.env.JWT_SECRET = process.env.JWT_SECRET || "local-test-secret-not-for-production-123456";
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { app, seedDemoSongs } = require("../src/server");

test("account, catalogue, private uploads, playlists, favourites and playback recovery work end to end", {
  skip: !process.env.MONGO_URI
}, async t => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  await mongoose.connection.dropDatabase();
  await seedDemoSongs();

  const httpServer = await new Promise(resolve => {
    const listener = app.listen(0, () => resolve(listener));
  });
  const base = "http://127.0.0.1:" + httpServer.address().port;
  let cookie = "";

  t.after(async () => {
    await new Promise(resolve => httpServer.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  async function request(path, options = {}, signedIn = true) {
    const headers = new Headers(options.headers || {});
    if (signedIn && cookie) headers.set("cookie", cookie);
    return fetch(base + path, { ...options, headers });
  }

  let response = await request("/api/health", {}, false);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).database, "connected");

  response = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Test Listener", email: "listener@example.com", password: "long-test-password-123" })
  }, false);
  assert.equal(response.status, 201);
  cookie = (response.headers.get("set-cookie") || "").split(";")[0];
  assert.match(cookie, /^token=/);
  assert.equal((await response.json()).user.email, "listener@example.com");

  response = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Test Listener", email: "listener@example.com", password: "long-test-password-123" })
  });
  assert.equal(response.status, 409, "duplicate emails must be rejected");

  response = await request("/api/songs?limit=50");
  assert.equal(response.status, 200);
  const catalogue = (await response.json()).songs;
  assert.equal(catalogue.length, 3, "demo catalogue is seeded");
  const demoSong = catalogue[0];

  response = await request("/api/playlists", {
    method: "POST",
    body: JSON.stringify({ name: "Focus Mix" }),
    headers: { "content-type": "application/json" }
  });
  assert.equal(response.status, 201);
  const playlist = (await response.json()).playlist;

  response = await request("/api/playlists/" + playlist._id + "/songs", {
    method: "POST",
    body: JSON.stringify({ songId: demoSong._id }),
    headers: { "content-type": "application/json" }
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).playlist.songs.length, 1);

  response = await request("/api/library/likes/" + demoSong._id, { method: "PUT" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).liked, true);

  response = await request("/api/library/history", {
    method: "POST",
    body: JSON.stringify({ songId: demoSong._id }),
    headers: { "content-type": "application/json" }
  });
  assert.equal(response.status, 204);

  response = await request("/api/library/playback", {
    method: "PUT",
    body: JSON.stringify({ songId: demoSong._id, positionSeconds: 37 }),
    headers: { "content-type": "application/json" }
  });
  assert.equal(response.status, 204);
  response = await request("/api/library/playback");
  assert.equal((await response.json()).playback.positionSeconds, 37);

  const form = new FormData();
  form.set("title", "Private Test Track");
  form.set("artist", "Test Listener");
  form.set("genre", "Test");
  form.set("audio", new Blob([Buffer.from("ID3-test-audio")], { type: "audio/mpeg" }), "private-test.mp3");
  response = await request("/api/songs/upload", { method: "POST", body: form });
  assert.equal(response.status, 201);
  const privateSong = (await response.json()).song;
  assert.match(privateSong.audioUrl, /^\/api\/songs\/[a-f\d]{24}\/stream$/i);

  response = await request("/api/songs?limit=50");
  assert.equal((await response.json()).songs.length, 4, "owner can see private uploaded tracks");
  response = await request("/api/songs?limit=50", {}, false);
  assert.equal((await response.json()).songs.length, 3, "guests cannot discover private uploads");

  response = await request(privateSong.audioUrl, {}, false);
  assert.equal(response.status, 404, "private audio must not stream without a session");
  response = await request(privateSong.audioUrl);
  assert.equal(response.status, 200, "owner should be allowed to stream uploaded audio");
  assert.equal(await response.text(), "ID3-test-audio");

  response = await request("/api/auth/logout", { method: "POST" });
  assert.equal(response.status, 204);
  response = await request(privateSong.audioUrl, {}, false);
  assert.equal(response.status, 404, "private audio must stop streaming after sign out");
});
