import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { trackRouter } from "./routes/tracks.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: "draft-7", legacyHeaders: false }));

app.get("/api/v1/health", (_req, res) => res.json({ status: "ok", service: "echotune-api" }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/tracks", trackRouter);
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
});

await mongoose.connect(env.MONGODB_URI);
app.listen(env.PORT, () => console.log(`EchoTune API listening on port ${env.PORT}`));
