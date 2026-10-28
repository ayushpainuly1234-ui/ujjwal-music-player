const jwt = require("jsonwebtoken");
const User = require("../models/User");

function tokenFromRequest(req) {
  const authHeader = req.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return req.cookies && req.cookies.token;
}

async function optionalAuth(req, _res, next) {
  try {
    const token = tokenFromRequest(req);
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("_id name email likedSongs recentlyPlayed");
    if (user) req.user = user;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") return next();
    return next(error);
  }
}

async function requireAuth(req, res, next) {
  try {
    const token = tokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "Sign in to continue." });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("_id name email likedSongs recentlyPlayed");
    if (!user) return res.status(401).json({ error: "Account not found. Sign in again." });

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
    }
    return next(error);
  }
}

module.exports = { requireAuth, optionalAuth };
