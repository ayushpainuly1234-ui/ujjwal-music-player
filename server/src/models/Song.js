const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160, index: true },
  artist: { type: String, required: true, trim: true, maxlength: 120, index: true },
  album: { type: String, trim: true, maxlength: 160, default: "Singles", index: true },
  genre: { type: String, trim: true, maxlength: 60, default: "Other", index: true },
  coverUrl: { type: String, trim: true, maxlength: 1000, default: "" },
  audioUrl: { type: String, required: true, trim: true, maxlength: 1000 },
  audioFileName: { type: String, select: false, default: null },
  durationSeconds: { type: Number, min: 0, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  isPublic: { type: Boolean, default: true, index: true },
  source: { type: String, enum: ["demo", "upload"], default: "demo" }
}, { timestamps: true });

songSchema.index({ title: "text", artist: "text", album: "text", genre: "text" });

module.exports = mongoose.model("Song", songSchema);
