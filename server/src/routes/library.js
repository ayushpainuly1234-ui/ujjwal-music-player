const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Song = require("../models/Song");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function visibleSongFilter(songId, userId) {
  return { _id: songId, $or: [{ isPublic: true }, { uploadedBy: userId }] };
}

router.get("/likes", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("likedSongs", "title artist album genre coverUrl audioUrl durationSeconds").lean();
    res.json({ songs: user.likedSongs || [] });
  } catch (error) { next(error); }
});

router.put("/likes/:songId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.songId)) return res.status(400).json({ error: "Invalid song id." });
    const song = await Song.findOne(visibleSongFilter(req.params.songId, req.user._id)).select("_id");
    if (!song) return res.status(404).json({ error: "Song not found." });
    const alreadyLiked = req.user.likedSongs.some(id => id.toString() === song._id.toString());
    const update = alreadyLiked ? { $pull: { likedSongs: song._id } } : { $addToSet: { likedSongs: song._id } };
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
      .populate("likedSongs", "title artist album genre coverUrl audioUrl durationSeconds");
    res.json({ liked: !alreadyLiked, songs: user.likedSongs });
  } catch (error) { next(error); }
});

router.get("/history", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("recentlyPlayed.song", "title artist album genre coverUrl audioUrl durationSeconds")
      .lean();
    const history = (user.recentlyPlayed || []).filter(item => item.song).slice(0, 30);
    res.json({ history });
  } catch (error) { next(error); }
});

router.post("/history", async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { songId } = body;
    if (!mongoose.isValidObjectId(songId)) return res.status(400).json({ error: "A valid songId is required." });
    const song = await Song.findOne(visibleSongFilter(songId, req.user._id)).select("_id");
    if (!song) return res.status(404).json({ error: "Song not found." });
    await User.updateOne({ _id: req.user._id }, { $pull: { recentlyPlayed: { song: song._id } } });
    await User.updateOne({ _id: req.user._id }, {
      $push: { recentlyPlayed: { $each: [{ song: song._id, playedAt: new Date(), positionSeconds: 0 }], $position: 0, $slice: 30 } }
    });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get("/playback", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("lastPlayback.song", "title artist album genre coverUrl audioUrl durationSeconds")
      .lean();
    res.json({ playback: user.lastPlayback || null });
  } catch (error) { next(error); }
});

router.put("/playback", async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const songId = body.songId;
    const positionSeconds = Number(body.positionSeconds);
    if (!mongoose.isValidObjectId(songId)) return res.status(400).json({ error: "A valid songId is required." });
    if (!Number.isFinite(positionSeconds) || positionSeconds < 0 || positionSeconds > 86400) {
      return res.status(400).json({ error: "Playback position must be a valid number of seconds." });
    }
    const song = await Song.findOne(visibleSongFilter(songId, req.user._id)).select("_id");
    if (!song) return res.status(404).json({ error: "Song not found." });
    await User.updateOne({ _id: req.user._id }, {
      $set: { lastPlayback: { song: song._id, positionSeconds, updatedAt: new Date() } }
    });
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
