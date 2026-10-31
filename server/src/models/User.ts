import { Schema, model } from "mongoose";

const userSchema = new Schema({
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["user", "admin"], default: "user" },
}, { timestamps: true });

export const User = model("User", userSchema);
