const express = require("express");
const router  = express.Router();

// ── Per-user resume store: { userId -> Map(resumeId -> resume) } ──
const store = new Map();

function getUserResumes(userId) {
  if (!store.has(userId)) store.set(userId, new Map());
  return store.get(userId);
}

// ── GET /api/resumes ──────────────────────────────────────────
router.get("/", (req, res) => {
  const resumes = Array.from(getUserResumes(req.user.id).values());
  resumes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ resumes });
});

// ── POST /api/resumes ─────────────────────────────────────────
router.post("/", (req, res) => {
  const resume = {
    ...req.body,
    id: Date.now().toString(),
    userId: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  getUserResumes(req.user.id).set(resume.id, resume);
  res.status(201).json({ resume });
});

// ── GET /api/resumes/:id ──────────────────────────────────────
router.get("/:id", (req, res) => {
  const resume = getUserResumes(req.user.id).get(req.params.id);
  if (!resume) return res.status(404).json({ error: "Resume not found" });
  res.json({ resume });
});

// ── PUT /api/resumes/:id ──────────────────────────────────────
router.put("/:id", (req, res) => {
  const map = getUserResumes(req.user.id);
  if (!map.has(req.params.id)) return res.status(404).json({ error: "Resume not found" });

  const updated = { ...map.get(req.params.id), ...req.body, updatedAt: new Date().toISOString() };
  map.set(req.params.id, updated);
  res.json({ resume: updated });
});

// ── DELETE /api/resumes/:id ───────────────────────────────────
router.delete("/:id", (req, res) => {
  const map = getUserResumes(req.user.id);
  if (!map.has(req.params.id)) return res.status(404).json({ error: "Resume not found" });
  map.delete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
