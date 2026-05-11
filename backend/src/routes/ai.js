const express = require("express");
const router  = express.Router();

const MODEL      = "claude-sonnet-4-20250514";
const ANTHROPIC  = "https://api.anthropic.com/v1/messages";

// ── Helper: call Anthropic API ────────────────────────────────
async function callAnthropic(system, userMsg, maxTokens = 1200) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set in .env");
  }

  const response = await fetch(ANTHROPIC, {
    method: "POST",
    headers: {
      "Content-Type":         "application/json",
      "x-api-key":            process.env.ANTHROPIC_API_KEY,
      "anthropic-version":    "2023-06-01",
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Anthropic API error");
  return data.content.map((b) => b.text || "").join("");
}

// ── POST /api/ai/complete ─────────────────────────────────────
// Generic endpoint for all AI tasks
router.post("/complete", async (req, res) => {
  try {
    const { system, user: userMsg, maxTokens = 1200 } = req.body;

    if (!system || !userMsg)
      return res.status(400).json({ error: "system and user fields are required" });

    const text = await callAnthropic(system, userMsg, maxTokens);
    res.json({ text });
  } catch (err) {
    console.error("[AI] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/analyze-jd ───────────────────────────────────
router.post("/analyze-jd", async (req, res) => {
  try {
    const { jd } = req.body;
    if (!jd) return res.status(400).json({ error: "jd field is required" });

    const system = "You are an expert ATS analyst. Extract structured data from job descriptions. Return ONLY valid JSON with no markdown fences.";
    const prompt = `Analyze this job description and return:\n{\n  "role": "...",\n  "company": "...",\n  "seniority": "...",\n  "requiredSkills": [...],\n  "preferredSkills": [...],\n  "keywords": [...],\n  "responsibilities": [...],\n  "experienceRequired": "...",\n  "educationRequired": "...",\n  "atsKeywords": [...],\n  "industryTerms": [...]\n}\n\nJD:\n${jd}`;

    const raw  = await callAnthropic(system, prompt, 1500);
    const data = JSON.parse(raw.replace(/```json\n?|```/g, "").trim());
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/score-resume ─────────────────────────────────
router.post("/score-resume", async (req, res) => {
  try {
    const { resumeText, jdAnalysis } = req.body;
    if (!resumeText || !jdAnalysis)
      return res.status(400).json({ error: "resumeText and jdAnalysis are required" });

    const system = "You are an ATS scoring expert. Return ONLY valid JSON, no markdown.";
    const prompt = `Score this resume against the job description analysis.\n\nReturn:\n{\n  "overallScore": (0-100),\n  "skillsScore": (0-100),\n  "experienceScore": (0-100),\n  "keywordsScore": (0-100),\n  "educationScore": (0-100),\n  "matchedKeywords": [...],\n  "missingKeywords": [...],\n  "strengths": [...],\n  "gaps": [...],\n  "suggestions": [...]\n}\n\nResume:\n${resumeText}\n\nJD Analysis:\n${JSON.stringify(jdAnalysis)}`;

    const raw    = await callAnthropic(system, prompt, 1500);
    const result = JSON.parse(raw.replace(/```json\n?|```/g, "").trim());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/rewrite-bullet ───────────────────────────────
router.post("/rewrite-bullet", async (req, res) => {
  try {
    const { bullet, context, keywords } = req.body;
    if (!bullet) return res.status(400).json({ error: "bullet is required" });

    const system = "You are an expert resume coach. Return ONLY the improved bullet point — no quotes, no explanation.";
    const prompt = `Rewrite this resume bullet to start with a strong action verb, include quantifiable metrics where inferable, and maximize ATS impact:\n\nOriginal: "${bullet}"\nContext (role/company): ${context || "Not specified"}\nJob Description Keywords: ${keywords?.join(", ") || "Not provided"}\n\nReturn only the improved bullet point.`;

    const text = await callAnthropic(system, prompt, 400);
    res.json({ text: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/generate-summary ────────────────────────────
router.post("/generate-summary", async (req, res) => {
  try {
    const { resumeText, targetRole, requiredSkills } = req.body;
    if (!resumeText) return res.status(400).json({ error: "resumeText is required" });

    const system = "You are an expert resume writer. Return ONLY the summary text — no labels, no markdown, no quotes.";
    const prompt = `Generate an ATS-optimized professional summary.\n\nResume Data:\n${resumeText}\nTarget Role: ${targetRole || "Not specified"}\nKey Requirements: ${requiredSkills?.join(", ") || "Not specified"}\n\nWrite 3-4 sentences. Be specific, avoid clichés.`;

    const text = await callAnthropic(system, prompt, 500);
    res.json({ text: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/suggest-skills ───────────────────────────────
router.post("/suggest-skills", async (req, res) => {
  try {
    const { currentSkills, requiredSkills, preferredSkills } = req.body;

    const system = "You are a career advisor. Return ONLY valid JSON, no markdown.";
    const prompt = `Suggest additional skills based on job requirements.\n\nCurrent skills: ${currentSkills?.join(", ") || "None"}\nRequired: ${requiredSkills?.join(", ")}\nPreferred: ${preferredSkills?.join(", ")}\n\nReturn: { "missingRequired": [...], "recommended": [...], "bonus": [...] }`;

    const raw    = await callAnthropic(system, prompt, 600);
    const result = JSON.parse(raw.replace(/```json\n?|```/g, "").trim());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/cover-letter ─────────────────────────────────
router.post("/cover-letter", async (req, res) => {
  try {
    const { resumeText, role, company, tone, extraContext, requirements, responsibilities } = req.body;
    if (!resumeText) return res.status(400).json({ error: "resumeText is required" });

    const system = "You are an expert cover letter writer. Use proper letter formatting.";
    const prompt = `Write a ${tone || "professional"} cover letter.\n\nRole: ${role || "the position"} at ${company || "the company"}\nResume: ${resumeText}\nKey Requirements: ${requirements?.join(", ") || "Not specified"}\nResponsibilities: ${responsibilities?.join("; ") || "Not specified"}\nCandidate notes: ${extraContext || "None"}\n\nWrite 3-4 compelling paragraphs. Include specific examples. End with a strong call to action.`;

    const text = await callAnthropic(system, prompt, 1500);
    res.json({ text: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
