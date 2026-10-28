const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const mongoose = require("mongoose");
const Song = require("../models/Song");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const uploadDirectory = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a",
  "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/flac"
]);
const allowedExtensions = new Set([".mp3", ".m4a", ".mp4", ".wav", ".ogg", ".webm", ".flac"]);
const maxUploadBytes = Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 25) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    callback(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({
  storage,
  limits: { fileSize: maxUploadBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
      return callback(new Error("Unsupported audio type. Upload MP3, M4A, WAV, OGG, WebM or FLAC."));
    }
    callback(null, true);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const genre = typeof req.query.genre === "string" ? req.query.genre.trim().slice(0, 60) : "";
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const filter = { isPublic: true };

    if (genre && genre.toLowerCase() !== "all") {
      filter.genre = new RegExp("^" + escapeRegex(genre) + "$", "i");
    }
    if (query) {
      const safeQuery = new RegExp(escapeRegex(query), "i");
      filter.$or = [{ title: safeQuery }, { artist: safeQuery }, { album: safeQuery }, { genre: safeQuery }];
    }

    const [songs, total] = await Promise.all([
      Song.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Song.countDocuments(filter)
    ]);
    res.json({ songs, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
});

router.post("/upload", requireAuth, (req, res, next) => {
  upload.single("audio")(req, res, async error => {
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ error: "Choose an audio file to upload." });

    try {
      const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
      const artist = typeof req.body.artist === "string" ? req.body.artist.trim() : "";
      const album = typeof req.body.album === "string" ? req.body.album.trim() : "Singles";
      const genre = typeof req.body.genre === "string" ? req.body.genre.trim() : "Other";
      const coverUrl = typeof req.body.coverUrl === "string" ? req.body.coverUrl.trim() : "";

      if (title.length < 1 || title.length > 160 || artist.length < 1 || artist.length > 120) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "Title (1–160 chars) and artist (1–120 chars) are required." });
      }
      if (album.length > 160 || genre.length > 60 || coverUrl.length > 1000) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "Album, genre or cover URL is too long." });
      }
      if (coverUrl && !/^https:\/\//i.test(coverUrl)) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "Cover URL must use HTTPS." });
      }

      const song = await Song.create({
        title, artist, album: album || "Singles", genre: genre || "Other",
        coverUrl, audioUrl: "/uploads/" + req.file.filename,
        uploadedBy: req.user._id, isPublic: true, source: "upload"
      });
      return res.status(201).json({ song });
    } catch (saveError) {
      fs.unlink(req.file.path, () => {});
      next(saveError);
    }
  });
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid song id." });
    const song = await Song.findOne({ _id: req.params.id, isPublic: true }).lean();
    if (!song) return res.status(404).json({ error: "Song not found." });
    res.json({ song });
  } catch (error) { next(error); }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^\u0024{}()|[\]\\]/g, "\\$&");
}

module.exports = router;
