require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const authRoutes    = require("./routes/auth");
const resumeRoutes  = require("./routes/resumes");
const aiRoutes      = require("./routes/ai");
const { authMiddleware } = require("./middleware/auth");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "2mb" }));

// ── Health check ──────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────
app.use("/api/auth",    authRoutes);
app.use("/api/resumes", authMiddleware, resumeRoutes);
app.use("/api/ai",      authMiddleware, aiRoutes);

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n  ✅  ResumeAI backend running on http://localhost:${PORT}`);
  console.log(`  📋  API key set: ${!!process.env.ANTHROPIC_API_KEY}\n`);
});
