const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");

const router = express.Router();

// ── In-memory user store (replace with MongoDB/PostgreSQL in production) ──
const users = new Map();

// ── POST /api/auth/signup ─────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password are required" });

    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    if (users.has(email))
      return res.status(409).json({ error: "An account with this email already exists" });

    const hashed = await bcrypt.hash(password, 12);
    const user   = { id: Date.now().toString(), name, email, password: hashed, createdAt: new Date() };
    users.set(email, user);

    const token = signToken(user);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = users.get(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get("/me", require("../middleware/auth").authMiddleware, (req, res) => {
  const user = users.get(req.user.email);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: safeUser(user) });
});

// ── Helpers ───────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );
}

function safeUser(u) {
  const { password, ...rest } = u;
  return rest;
}

module.exports = router;
