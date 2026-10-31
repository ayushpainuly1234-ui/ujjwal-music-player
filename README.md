# EchoTune — Full-Stack Music Player

EchoTune is Ujjwal's evolving music-player project. The original browser music player is being upgraded in the **same repository** with an API, database-backed accounts and a track catalogue. The existing player, song assets and GitHub Pages demo are retained.

> **Live frontend demo:** https://ayushpainuly1234-ui.github.io/ujjwal-music-player/  
> **Repository:** https://github.com/ayushpainuly1234-ui/ujjwal-music-player

## Product direction

A personal music-streaming experience with a responsive player, searchable music catalogue and user accounts. This is a portfolio and learning project; it is not affiliated with Spotify or any commercial streaming service.

## Technology

| Layer | Technology |
|---|---|
| Existing frontend | HTML5, CSS3, Vanilla JavaScript, HTML Audio API |
| API | Node.js, Express 4, TypeScript |
| Database | MongoDB, Mongoose |
| Authentication | JWT access tokens, bcrypt password hashing |
| Validation | Zod |
| API protection | Helmet, CORS, request rate limiting |
| Current demo hosting | GitHub Pages for the static frontend |

## Current functionality

### Frontend
- Existing music player with play/pause, next/previous and track progress controls.
- Search/filter for the local playlist.
- Responsive layout and project/about sections.
- Sign-up and sign-in dialog connected to the API.
- Access token and signed-in display stored for the current browser tab only (sessionStorage).

### Backend API
- Health-check endpoint.
- User registration with input validation and bcrypt password hashing.
- Login with password verification and short-lived signed access tokens.
- Authenticated current-user endpoint.
- Track catalogue endpoint with text search and pagination.
- Track detail endpoint.
- Authenticated track creation endpoint.
- Central error response, security headers and rate limiting.

## Repository structure

```text
ujjwal-music-player/
├── index.html                 # Existing music-player interface + account dialog
├── style.css                  # Existing player styling + account UI
├── script.js                  # Player controls + account API integration
├── songs/                     # Existing local audio assets and experiments
├── fullstack/                 # Earlier frontend experiment, retained
└── server/
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── config/env.ts
        ├── index.ts
        ├── middleware/auth.ts
        ├── models/User.ts
        ├── models/Track.ts
        └── routes/
            ├── auth.ts
            └── tracks.ts
```

## Run locally

### Requirements
- Node.js 20 or newer
- MongoDB running locally, or a MongoDB Atlas connection string
- A static web server for the root frontend (for example VS Code Live Server)

### 1. Start the API

```bash
cd server
npm install
```

Copy .env.example to .env, then set a private MongoDB URI and a random JWT secret of at least 32 characters.

```bash
npm run dev
```

The API starts at http://localhost:4000. Check http://localhost:4000/api/v1/health.

### 2. Start the existing frontend

From the repository root, open index.html using VS Code Live Server at http://localhost:5500 (or update CLIENT_ORIGIN in the server environment to match your local frontend origin).

The frontend currently calls http://localhost:4000/api/v1. For a deployed frontend, configure the API URL and CORS origin for the deployed backend before enabling account features.

## API reference

Base URL: /api/v1

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | /health | Public | API health |
| POST | /auth/register | Public | Create an account |
| POST | /auth/login | Public | Sign in |
| GET | /auth/me | Bearer token | Get current user |
| GET | /tracks?q=&page=&limit= | Public | Search and paginate published tracks |
| GET | /tracks/:id | Public | Get one published track |
| POST | /tracks | Bearer token | Add a track |

### Register request

```json
{
  "displayName": "Ujjwal",
  "email": "ujjwal@example.com",
  "password": "use-a-strong-password"
}
```

### Authenticated request

Send the access token in the Authorization header using the Bearer scheme.

## Security notes

- Passwords are hashed with bcrypt; plaintext passwords are never stored.
- Request bodies are validated before database writes.
- Access tokens are short-lived (15 minutes).
- The frontend keeps the access token in session storage, not local storage. For production, consider an HttpOnly, Secure, SameSite refresh-token cookie and CSRF protection.
- Keep .env out of Git. Never commit real credentials or private keys.
- Only upload audio that you own or are licensed to distribute.

## Development status

This is an **active upgrade**, not a claim that every streaming feature is production-ready. The account UI and initial API foundation are present. The static player still uses its existing local song assets; the database catalogue is not yet wired into dynamic playback. Playlist persistence, favourites, listening history, admin moderation, automated tests, cloud audio storage and production deployment remain future milestones.

## Roadmap

- [x] Preserve the original player and local audio library.
- [x] Add API project structure and MongoDB models.
- [x] Add registration, login and current-user API routes.
- [x] Add track listing, search, pagination and detail APIs.
- [x] Connect the existing interface to account registration and login.
- [ ] Load and play database-backed tracks in the existing player.
- [ ] Add persistent playlists, favourites and listening history.
- [ ] Add admin-only track management and upload workflow.
- [ ] Add automated API and frontend tests.
- [ ] Deploy the API and database, then connect the public demo.
- [ ] Add CI checks and production monitoring.

## Author

Built and maintained by [Ujjwal Painuly](https://github.com/ayushpainuly1234-ui).

---

If you find a bug or have an idea, open a GitHub issue.