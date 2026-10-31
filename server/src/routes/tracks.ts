import { Router } from "express";
import { z } from "zod";
import { Track } from "../models/Track.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const trackRouter = Router();

trackRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const filter = { isPublished: true, ...(q ? { $text: { $search: q } } : {}) };
    const [items, total] = await Promise.all([
      Track.find(filter)
        .select("-__v")
        .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Track.countDocuments(filter)
    ]);
    return res.json({ data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

trackRouter.get("/:id", async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID" } });
    const track = await Track.findOne({ _id: req.params.id, isPublished: true }).lean();
    if (!track) return res.status(404).json({ error: { code: "TRACK_NOT_FOUND" } });
    return res.json({ data: track });
  } catch (error) { return next(error); }
});

const trackSchema = z.object({
  title: z.string().trim().min(1).max(160),
  artist: z.string().trim().min(1).max(120),
  album: z.string().trim().max(160).optional(),
  audioUrl: z.string().url(),
  coverUrl: z.string().url().optional(),
  durationSeconds: z.number().min(0).max(86400).optional(),
  genre: z.string().trim().max(60).optional()
});

trackRouter.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const parsed = trackSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } });
    const track = await Track.create({ ...parsed.data, createdBy: req.userId });
    return res.status(201).json({ data: track });
  } catch (error) { return next(error); }
});
