const mongoose = require("mongoose");

const recentPlaySchema = new mongoose.Schema({
  song: { type: mongoose.Schema.Types.ObjectId, ref: "Song", required: true },
  playedAt: { type: Date, default: Date.now },
  positionSeconds: { type: Number, min: 0, default: 0 }
}, { _id: false });

const playbackSchema = new mongoose.Schema({
  song: { type: mongoose.Schema.Types.ObjectId, ref: "Song", default: null },
  positionSeconds: { type: Number, min: 0, default: 0 },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
    maxlength: 254
  },
  passwordHash: { type: String, required: true, select: false },
  likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
  recentlyPlayed: { type: [recentPlaySchema], default: [] },
  lastPlayback: { type: playbackSchema, default: () => ({}) }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
