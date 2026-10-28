# SoundSphere — Personal Music Library

SoundSphere is an upgrade of Ujjwal's original music player into a full-stack application. It focuses on a practical problem: keeping your own tracks, favourites, playlists, and playback progress organized in one place.

## What it does

- **Accounts:** register and sign in with a password hash, JWT session, and HTTP-only cookie.
- **Personal uploads:** upload audio you created or have permission to store. Uploaded tracks are private to their owner by default; the backend checks ownership when listing and streaming them.
- **Music catalogue:** searchable public demo tracks plus your own private tracks while signed in.
- **Persistent playlists and favourites:** saved in MongoDB rather than only in browser storage.
- **Listening history and playback recovery:** remembers recent tracks and the last saved playback position for your account.
- **Player controls:** play/pause, seek, volume, previous/next, shuffle, repeat, and responsive layouts.
- **Security basics:** input validation, password hashing, request-size limits, login rate limiting, security headers, protected playlist APIs, audio-upload allowlist, private upload routes, and automated checks.

## Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express
- Database: MongoDB + Mongoose
- Auth: bcryptjs + JWT in an HTTP-only, SameSite cookie
- Tests: Node's built-in test runner; GitHub Actions checks JavaScript syntax and validation tests

## Run locally

Requirements: Node.js 20+ and a reachable MongoDB instance (local MongoDB or MongoDB Atlas).

1. Open a terminal in the repository and enter the API folder:

   ```bash
   cd server
   npm install
   ```

2. Copy the example environment file to `.env`.

   macOS/Linux:
   ```bash
   cp .env.example .env
   ```

   Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `server/.env`. Set `MONGO_URI` to your own database and replace `JWT_SECRET` with a long, random secret of at least 32 characters. Do not commit `.env`.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open **http://localhost:4000**. The API seeds three demo tracks from the existing `songs/` folder when the database has no matching entries. Sign up, create a playlist, save a favourite, and try playback recovery.

To run tests:

```bash
cd server
npm test
```

Health endpoint: `GET /api/health`. It reports API status and whether MongoDB is connected.

## Main API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Clear the session cookie |
| GET | `/api/auth/me` | Current account |
| GET | `/api/songs?q=...` | Search public and owned tracks |
| POST | `/api/songs/upload` | Upload an audio file (signed in) |
| GET | `/api/songs/:id/stream` | Stream public audio or your own private upload |
| GET/POST | `/api/playlists` | List/create private playlists |
| POST | `/api/playlists/:id/songs` | Add a track to an owned playlist |
| PUT | `/api/library/likes/:songId` | Toggle a favourite |
| GET/POST | `/api/library/history` | Read/record listening history |
| GET/PUT | `/api/library/playback` | Read/save playback progress |

All playlist and personal library endpoints require a valid session. Uploaded files are stored in `server/uploads/`, which is intentionally excluded from Git.

## Important limitations before public deployment

This is a substantial learning/MVP project, not a verified production streaming service. Local uploads live on the server's disk and would need persistent storage or an object-storage service for many cloud hosts. Before exposing it publicly, expand end-to-end coverage, inspect audio-file contents rather than relying only on extension/MIME, configure HTTPS and secrets in the host, add account recovery/CSRF strategy appropriate to the deployment, and decide whether public sharing/moderation is supported. Only upload music you own or have permission to store and stream.

## Project layout

```text
fullstack/             Existing player UI upgraded to use the API
server/src/server.js    Express server, MongoDB connection, demo seed
server/src/models/      User, Song, and Playlist schemas
server/src/routes/      Auth, catalogue/uploads, playlists, personal library
server/src/middleware/  Session authentication
server/test/            Validation tests
songs/                  Bundled demo audio tracks
.github/workflows/      CI syntax and test checks
```

Built by Ujjwal Painuly.
