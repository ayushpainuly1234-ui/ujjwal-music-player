import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AuthRequest extends Request { userId?: string; }

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: "echotune-api",
      audience: "echotune-client"
    }) as jwt.JwtPayload;
    if (typeof payload.sub !== "string") throw new Error("Invalid token subject");
    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Session expired. Please sign in again." } });
  }
}
