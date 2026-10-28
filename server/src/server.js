require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const Song = require("./models/Song");

const app = express();
const port = Number(process.env.PORT) || 4000;
const projectRoot = path.resolve(__dirname, "../..");
const clientDirectory = path.join(projectRoot, "fullstack");
const uploadDirectory = path.resolve(__dirname, "../uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured in server/.env and contain at least 32 characters.");
}

app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:4000",
  credentials: true
}));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Wait a little and try again." }
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/songs", require("./routes/songs"));
app.use("/api/playlists", require("./routes/playlists"));
app.use("/api/library", require("./routes/library"));

app.use("/uploads", express.static(uploadDirectory, {
  fallthrough: false,
  dotfiles: "deny",
  index: false,
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));
app.use("/songs", express.static(path.join(projectRoot, "songs"), {
  dotfiles: "deny",
  index: false,
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));
app.use(express.static(clientDirectory, { index: "index.html" }));

app.use((err, _req, res, _next) => {
  if (res.headersSent) return;
  if (err && err.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "Audio file is larger than the configured upload limit."
      : "Upload could not be processed.";
    return res.status(400).json({ error: message });
  }
  if (err && /Unsupported audio type/.test(err.message || "")) {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large." });
  if (err && err.name === "ValidationError") return res.status(400).json({ error: "Some song or account details are invalid." });
  if (err && err.name === "CastError") return res.status(400).json({ error: "Invalid identifier." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

async function seedDemoSongs() {
  const demoSongs = [
    {
      title: "The Fat Rat", artist: "TheFatRat", album: "Electronic Mix", genre: "Electronic",
      coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
      audioUrl: "/songs/song.mp3", source: "demo", isPublic: true
    },
    {
      title: "Infinity", artist: "Chill Collection", album: "Late Night", genre: "Chill",
      coverUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=500&auto=format&fit=crop&q=80",
      audioUrl: "/songs/song2.mp3", source: "demo", isPublic: true
    },
    {
      title: "Middle of the Night", artist: "Night Drive", album: "After Hours", genre: "Pop",
      coverUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=500&auto=format&fit=crop&q=80",
      audioUrl: "/songs/song3.mp3", source: "demo", isPublic: true
    }
  ];
  for (const song of demoSongs) {
    await Song.updateOne({ audioUrl: song.audioUrl }, { $setOnInsert: song }, { upsert: true });
  }
}

async function start() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGO_URI is required. Configure it in server/.env.");
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  await seedDemoSongs();
  const server = app.listen(port, () => {
    console.log("SoundSphere running at http://localhost:" + port);
  });
  const shutdown = async () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (require.main === module) {
  start().catch(error => {
    console.error("Startup failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, seedDemoSongs };
