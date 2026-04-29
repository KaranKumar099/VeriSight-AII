import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "verisight-dev-secret-2026";
const TOKEN_TTL = "7d";

export function authRouter({ store }) {
  const router = express.Router();

  // POST /api/auth/register
  router.post("/register", async (req, res, next) => {
    try {
      const { userId, name, email, password, role = "student" } = req.body || {};
      if (!userId || !name || !email || !password) {
        return res.status(400).json({ error: "userId, name, email and password are required" });
      }

      // Check if user already exists
      const existing = await store.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }

      const existingById = await store.getUser(userId);
      if (existingById) {
        return res.status(409).json({ error: "User ID already taken. Please choose another." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await store.upsertUser({ id: userId, name, email, passwordHash, role });

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
      res.status(201).json({ token, user: sanitize(user) });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/auth/login
  router.post("/login", async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }

      const user = await store.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
      res.json({ token, user: sanitize(user) });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/auth/me  (verify token)
  router.get("/me", requireAuth, async (req, res, next) => {
    try {
      const user = await store.getUser(req.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ user: sanitize(user) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

// Middleware
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "verisight-dev-secret-2026");
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function sanitize(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
