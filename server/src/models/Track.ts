import { Schema, model } from "mongoose";

const trackSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160, index: true },
  artist: { type: String, required: true, trim: true, maxlength: 120, index: true },
  album: { type: String, trim: true, maxlength: 160, default: "" },
  audioUrl: { type: String, required: true },
  coverUrl: { type: String, default: "" },
  durationSeconds: { type: Number, min: 0, default: 0 },
  genre: { type: String, trim: true, maxlength: 60, default: "Unknown", index: true },
  isPublished: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

trackSchema.index({ title: "text", artist: "text", album: "text" });
export const Track = model("Track", trackSchema);
