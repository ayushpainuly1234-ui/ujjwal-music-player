const express = require("express");
const Playlist = require("../models/Playlist");
const Song = require("../models/Song");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ owner: req.user._id })
      .sort({ updatedAt: -1 })
      .populate("songs", "title artist album genre coverUrl audioUrl durationSeconds")
      .lean();
    res.json({ playlists });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    if (name.length < 1 || name.length > 80) return res.status(400).json({ error: "Playlist name must be 1–80 characters." });
    if (description.length > 300) return res.status(400).json({ error: "Description must be 300 characters or fewer." });
    const playlist = await Playlist.create({ name, description, owner: req.user._id });
    return res.status(201).json({ playlist });
  } catch (error) { next(error); }
});

router.post("/:id/songs", async (req, res, next) => {
  try {
    const songId = req.body.songId;
    if (!/^[a-f\d]{24}$/i.test(String(songId || ""))) return res.status(400).json({ error: "A valid songId is required." });
    const [playlist, song] = await Promise.all([
      Playlist.findOne({ _id: req.params.id, owner: req.user._id }),
      Song.findOne({ _id: songId, $or: [{ isPublic: true }, { uploadedBy: req.user._id }] }).select("_id")
    ]);
    if (!playlist) return res.status(404).json({ error: "Playlist not found." });
    if (!song) return res.status(404).json({ error: "Song not found." });
    await Playlist.updateOne({ _id: playlist._id, owner: req.user._id }, { $addToSet: { songs: song._id } });
    const updated = await Playlist.findById(playlist._id).populate("songs", "title artist album genre coverUrl audioUrl durationSeconds");
    return res.json({ playlist: updated });
  } catch (error) { next(error); }
});

router.delete("/:id/songs/:songId", async (req, res, next) => {
  try {
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $pull: { songs: req.params.songId } },
      { new: true }
    ).populate("songs", "title artist album genre coverUrl audioUrl durationSeconds");
    if (!playlist) return res.status(404).json({ error: "Playlist not found." });
    return res.json({ playlist });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Playlist.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!deleted) return res.status(404).json({ error: "Playlist not found." });
    return res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
