const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const mongoose = require("mongoose");
const Song = require("../models/Song");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { escapeRegex, validateSongMetadata, isAllowedAudioFile } = require("../utils/validation");

const router = express.Router();
const uploadDirectory = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });
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
    if (!isAllowedAudioFile(file)) {
      return callback(new Error("Unsupported audio type. Upload MP3, M4A, WAV, OGG, WebM or FLAC."));
    }
    callback(null, true);
  }
});

router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const genre = typeof req.query.genre === "string" ? req.query.genre.trim().slice(0, 60) : "";
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const clauses = [req.user
      ? { $or: [{ isPublic: true }, { uploadedBy: req.user._id }] }
      : { isPublic: true }];

    if (genre && genre.toLowerCase() !== "all") {
      clauses.push({ genre: new RegExp("^" + escapeRegex(genre) + "$", "i") });
    }
    if (query) {
      const safeQuery = new RegExp(escapeRegex(query), "i");
      clauses.push({ $or: [{ title: safeQuery }, { artist: safeQuery }, { album: safeQuery }, { genre: safeQuery }] });
    }

    const filter = clauses.length === 1 ? clauses[0] : { $and: clauses };
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
      const metadata = {
        title: typeof req.body.title === "string" ? req.body.title.trim() : "",
        artist: typeof req.body.artist === "string" ? req.body.artist.trim() : "",
        album: typeof req.body.album === "string" ? req.body.album.trim() : "Singles",
        genre: typeof req.body.genre === "string" ? req.body.genre.trim() : "Other",
        coverUrl: typeof req.body.coverUrl === "string" ? req.body.coverUrl.trim() : ""
      };
      const validationError = validateSongMetadata(metadata);
      if (validationError) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: validationError });
      }

      const song = new Song({
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album || "Singles",
        genre: metadata.genre || "Other",
        coverUrl: metadata.coverUrl,
        audioFileName: req.file.filename,
        uploadedBy: req.user._id,
        isPublic: false,
        source: "upload"
      });
      song.audioUrl = "/api/songs/" + song._id.toString() + "/stream";
      await song.save();

      const safeSong = song.toObject();
      delete safeSong.audioFileName;
      return res.status(201).json({ song: safeSong });
    } catch (saveError) {
      fs.unlink(req.file.path, () => {});
      next(saveError);
    }
  });
});

// Uploads are private by default: only their owner can stream them.
// Express sendFile supports Range requests so the HTML audio player can seek.
router.get("/:id/stream", optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid song id." });
    const song = await Song.findById(req.params.id).select("+audioFileName isPublic uploadedBy source");
    if (!song) return res.status(404).json({ error: "Audio not found." });

    const isOwner = req.user && song.uploadedBy && song.uploadedBy.toString() === req.user._id.toString();
    if (!song.isPublic && !isOwner) return res.status(404).json({ error: "Audio not found." });
    if (song.source !== "upload" || !song.audioFileName) {
      return res.status(404).json({ error: "Audio file not found." });
    }

    const safeFilename = path.basename(song.audioFileName);
    const filePath = path.resolve(uploadDirectory, safeFilename);
    if (!filePath.startsWith(uploadDirectory + path.sep) || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Audio file not found on the server." });
    }
    return res.sendFile(filePath, {
      headers: { "Cache-Control": "private, no-store" }
    }, error => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) { next(error); }
});

router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid song id." });
    const clauses = [{ _id: req.params.id }];
    if (req.user) clauses.push({ $or: [{ isPublic: true }, { uploadedBy: req.user._id }] });
    else clauses.push({ isPublic: true });
    const song = await Song.findOne({ $and: clauses }).lean();
    if (!song) return res.status(404).json({ error: "Song not found." });
    res.json({ song });
  } catch (error) { next(error); }
});

module.exports = router;
