import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72)
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72)
});

function createAccessToken(userId: string) {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: "15m",
    issuer: "echotune-api",
    audience: "echotune-client"
  });
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } });

    const email = parsed.data.email.toLowerCase();
    if (await User.exists({ email })) {
      return res.status(409).json({ error: { code: "EMAIL_EXISTS", message: "An account with this email already exists." } });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({ displayName: parsed.data.displayName, email, passwordHash });
    return res.status(201).json({
      user: { id: user.id, displayName: user.displayName, email: user.email },
      accessToken: createAccessToken(user.id)
    });
  } catch (error) { return next(error); }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } });

    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
    }

    return res.json({
      user: { id: user.id, displayName: user.displayName, email: user.email },
      accessToken: createAccessToken(user.id)
    });
  } catch (error) { return next(error); }
});

authRouter.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findById(req.userId).select("displayName email role");
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND" } });
    return res.json({ user: { id: user.id, displayName: user.displayName, email: user.email, role: user.role } });
  } catch (error) { return next(error); }
});
