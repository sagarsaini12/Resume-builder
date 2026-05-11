import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import {
  FileText, User, Briefcase, GraduationCap, Code, Award, Star,
  LogOut, Plus, Download, Trash2, Edit2, Eye, Zap, Target,
  TrendingUp, CheckCircle, X, BarChart2, Loader2, RefreshCw,
  Brain, Sparkles, Copy, Medal, AlertTriangle,
  LayoutTemplate, PenLine, AlignLeft, ChevronRight, BookOpen,
  Settings, Info, Lightbulb, BarChart, List, Home,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   API CLIENT
══════════════════════════════════════════════════════════════ */
const api = axios.create({ baseURL: "/api" });

// Attach JWT on every request
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// AI helpers — all routes hit the backend proxy
const AI = {
  complete:       (system, user, maxTokens) => api.post("/ai/complete",        { system, user, maxTokens }).then(r => r.data.text),
  analyzeJd:      (jd)                       => api.post("/ai/analyze-jd",      { jd }).then(r => r.data),
  scoreResume:    (resumeText, jdAnalysis)   => api.post("/ai/score-resume",    { resumeText, jdAnalysis }).then(r => r.data),
  rewriteBullet:  (bullet, context, keywords)=> api.post("/ai/rewrite-bullet",  { bullet, context, keywords }).then(r => r.data.text),
  generateSummary:(resumeText, targetRole, requiredSkills) => api.post("/ai/generate-summary", { resumeText, targetRole, requiredSkills }).then(r => r.data.text),
  suggestSkills:  (payload)                  => api.post("/ai/suggest-skills",  payload).then(r => r.data),
  coverLetter:    (payload)                  => api.post("/ai/cover-letter",    payload).then(r => r.data.text),
};

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
const NAV = [
  { id: "dashboard", icon: Home,          label: "Dashboard"       },
  { id: "builder",   icon: PenLine,       label: "Resume Builder"  },
  { id: "preview",   icon: Eye,           label: "Live Preview"    },
  { id: "analyzer",  icon: Target,        label: "JD Analyzer"     },
  { id: "optimizer", icon: Zap,           label: "AI Optimizer"    },
  { id: "cover",     icon: BookOpen,      label: "Cover Letter"    },
  { id: "settings",  icon: Settings,      label: "Settings"        },
];

const BUILDER_TABS = [
  { id: "personal",     label: "Personal",       icon: User           },
  { id: "summary",      label: "Summary",        icon: AlignLeft      },
  { id: "experience",   label: "Experience",     icon: Briefcase      },
  { id: "education",    label: "Education",      icon: GraduationCap  },
  { id: "skills",       label: "Skills",         icon: Code           },
  { id: "projects",     label: "Projects",       icon: LayoutTemplate },
  { id: "certs",        label: "Certifications", icon: Medal          },
  { id: "achievements", label: "Achievements",   icon: Star           },
];

const TEMPLATES = ["Modern", "Classic", "Minimal"];

/* ══════════════════════════════════════════════════════════════
   FACTORIES
══════════════════════════════════════════════════════════════ */
const uid = () => Math.random().toString(36).slice(2, 10);

function freshResume(name = "Untitled Resume") {
  return {
    id: uid(), name, template: "Modern",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    atsScore: null, atsBreakdown: null,
    personal: { fullName: "", title: "", email: "", phone: "", location: "", linkedin: "", github: "", website: "" },
    summary: "",
    experience: [],
    education: [],
    skills: { technical: [], soft: [], tools: [] },
    projects: [],
    certifications: [],
    achievements: [],
  };
}

const freshExp  = () => ({ id: uid(), company: "", role: "", location: "", startDate: "", endDate: "", current: false, bullets: [""] });
const freshEdu  = () => ({ id: uid(), institution: "", degree: "", field: "", startYear: "", endYear: "", gpa: "" });
const freshProj = () => ({ id: uid(), name: "", tech: [], link: "", bullets: [""] });
const freshCert = () => ({ id: uid(), name: "", issuer: "", date: "", link: "" });

function resumeToText(r) {
  if (!r) return "";
  const parts = [];
  const p = r.personal;
  parts.push(`NAME: ${p.fullName}\nTITLE: ${p.title}\nLOCATION: ${p.location}`);
  if (r.summary) parts.push(`SUMMARY:\n${r.summary}`);
  if (r.experience?.length) {
    parts.push("EXPERIENCE:\n" + r.experience.map(e =>
      `${e.role} at ${e.company} (${e.startDate}–${e.current ? "Present" : e.endDate})\n` +
      e.bullets.filter(Boolean).map(b => `• ${b}`).join("\n")
    ).join("\n\n"));
  }
  if (r.education?.length) {
    parts.push("EDUCATION:\n" + r.education.map(e =>
      `${e.degree} in ${e.field} — ${e.institution} (${e.endYear})`
    ).join("\n"));
  }
  const allSkills = [...(r.skills?.technical || []), ...(r.skills?.tools || []), ...(r.skills?.soft || [])];
  if (allSkills.length) parts.push(`SKILLS: ${allSkills.join(", ")}`);
  if (r.projects?.length) {
    parts.push("PROJECTS:\n" + r.projects.map(pr =>
      `${pr.name} [${pr.tech.join(", ")}]\n` + pr.bullets.filter(Boolean).map(b => `• ${b}`).join("\n")
    ).join("\n\n"));
  }
  return parts.join("\n\n");
}

/* ══════════════════════════════════════════════════════════════
   SHARED ATOMS
══════════════════════════════════════════════════════════════ */
function Btn({ children, onClick, variant = "primary", disabled, className = "", icon: Icon, loading, size = "md" }) {
  const base = "inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2", lg: "text-sm px-5 py-2.5" };
  const variants = {
    primary:   "bg-violet-600 hover:bg-violet-500 text-white",
    secondary: "bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border border-zinc-600",
    ghost:     "bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200",
    danger:    "bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800/50",
    ai:        "bg-violet-950 hover:bg-violet-900 text-violet-300 border border-violet-700/50",
    success:   "bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/50",
  };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {loading ? <Loader2 size={13} className="animate-spin" /> : Icon && <Icon size={13} />}
      {children}
    </button>
  );
}

function Field({ label, type = "text", value, onChange, placeholder = "", rows, className = "", hint, disabled }) {
  const cls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 placeholder-zinc-600 transition-all disabled:opacity-50";
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs text-zinc-400 font-medium tracking-wider uppercase">{label}</label>}
      {type === "textarea"
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows || 3} className={`${cls} resize-none`} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className={cls} />
      }
      {hint && <p className="text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

function TagInput({ tags, onChange, placeholder = "" }) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setVal("");
  };
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 flex flex-wrap gap-1.5 min-h-[44px] focus-within:border-violet-500 transition-all">
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 bg-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded-md">
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))} className="text-zinc-500 hover:text-zinc-100"><X size={9} /></button>
        </span>
      ))}
      <input value={val} onChange={e => setVal(e.target.value)} placeholder={tags.length === 0 ? placeholder : ""}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        className="bg-transparent text-sm text-zinc-100 outline-none flex-1 min-w-[80px] placeholder-zinc-600"
      />
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 ${className}`}>{children}</div>;
}

function SecHead({ icon: Icon, title, count, onAdd, badge }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={15} className="text-violet-400" />}
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">{title}</h3>
        {count !== undefined && <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">{count}</span>}
        {badge && <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      {onAdd && (
        <button onClick={onAdd} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
          <Plus size={12} /> Add
        </button>
      )}
    </div>
  );
}

function AiBtn({ onClick, loading, children }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 text-xs text-violet-300 bg-violet-950/60 hover:bg-violet-900/50 border border-violet-700/40 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
      {children}
    </button>
  );
}

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null;
  const color = score >= 80 ? "text-emerald-400 bg-emerald-950/60 border-emerald-800/40"
    : score >= 60 ? "text-amber-400 bg-amber-950/60 border-amber-800/40"
    : "text-red-400 bg-red-950/60 border-red-800/40";
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${color}`}>{score}% ATS</span>;
}

function Empty({ icon: Icon, text, action, actionLabel }) {
  return (
    <div className="text-center py-10 border border-dashed border-zinc-700 rounded-xl">
      {Icon && <Icon size={28} className="text-zinc-600 mx-auto mb-2.5" />}
      <p className="text-zinc-500 text-sm mb-3">{text}</p>
      {action && <Btn icon={Plus} onClick={action} size="sm">{actionLabel}</Btn>}
    </div>
  );
}

function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 mb-4 p-3 bg-red-950/50 border border-red-800/40 rounded-lg text-sm text-red-400">
      <AlertTriangle size={13} /> {msg}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AUTH PAGE
══════════════════════════════════════════════════════════════ */
function AuthPage({ onLogin }) {
  const [mode, setMode]   = useState("login");
  const [form, setForm]   = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState("");

  const submit = async () => {
    setErr("");
    if (!form.email || !form.password) { setErr("Email and password are required."); return; }
    if (mode === "signup" && !form.name) { setErr("Name is required."); return; }
    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/auth/signup" : "/auth/login";
      const { data } = await api.post(endpoint, form);
      localStorage.setItem("token", data.token);
      onLogin(data.user);
    } catch (e) {
      setErr(e.response?.data?.error || "Authentication failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-600 to-violet-800 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/50">
              <FileText size={21} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>ResumeAI</span>
          </div>
          <p className="text-zinc-400 text-sm">AI-powered resume builder & ATS optimizer</p>
        </div>
        <Card className="p-6">
          <div className="flex mb-5 bg-zinc-800 rounded-lg p-1">
            {[["login", "Sign In"], ["signup", "Create Account"]].map(([m, l]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm rounded-md font-medium transition-all ${mode === m ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
                {l}
              </button>
            ))}
          </div>
          <ErrBanner msg={err} />
          <div className="flex flex-col gap-4">
            {mode === "signup" && <Field label="Full Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Jane Smith" />}
            <Field label="Email" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="jane@example.com" />
            <Field label="Password" type="password" value={form.password} onChange={v => setForm(p => ({ ...p, password: v }))} placeholder="••••••••" />
          </div>
          <Btn className="w-full mt-5 justify-center" onClick={submit} loading={loading} size="lg">
            {mode === "login" ? "Sign In" : "Create Account"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════════ */
function Sidebar({ view, setView, user, onLogout }) {
  return (
    <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen flex-shrink-0">
      <div className="px-4 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText size={15} className="text-white" />
          </div>
          <span className="font-bold text-white text-base" style={{ fontFamily: "'Syne',sans-serif" }}>ResumeAI</span>
        </div>
      </div>
      <div className="px-3 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-full bg-violet-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-200 truncate">{user.name}</div>
            <div className="text-xs text-zinc-500 truncate">{user.email}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all w-full text-left ${
              view === id ? "bg-violet-900/50 text-violet-300 border border-violet-800/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </nav>
      <div className="px-2 py-3 border-t border-zinc-800">
        <button onClick={onLogout} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 w-full transition-all">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════ */
function DashboardView({ resumes, setView, setActiveId, onDelete, onNew, jdData }) {
  const scored   = resumes.filter(r => r.atsScore !== null);
  const avgScore = scored.length ? Math.round(scored.reduce((a, r) => a + r.atsScore, 0) / scored.length) : null;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-zinc-100 mb-0.5" style={{ fontFamily: "'Syne',sans-serif" }}>Dashboard</h1>
        <p className="text-zinc-500 text-sm mb-6">Your resume workspace</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: FileText, label: "Resumes", value: resumes.length, color: "violet" },
            { icon: Target, label: "Avg ATS Score", value: avgScore !== null ? `${avgScore}%` : "—", color: "emerald" },
            { icon: Zap, label: "JD Analyses", value: jdData ? "Active" : "None", color: "amber" },
          ].map(({ icon: Icon, label, value, color }) => {
            const cols = {
              violet: { border: "border-violet-800/30", bg: "bg-violet-950/40", ic: "text-violet-400", val: "text-violet-300" },
              emerald: { border: "border-emerald-800/30", bg: "bg-emerald-950/40", ic: "text-emerald-400", val: "text-emerald-300" },
              amber: { border: "border-amber-800/30", bg: "bg-amber-950/40", ic: "text-amber-400", val: "text-amber-300" },
            };
            const c = cols[color];
            return (
              <div key={label} className={`border rounded-xl p-4 ${c.border} ${c.bg}`}>
                <div className="flex items-center gap-2 mb-2"><Icon size={14} className={c.ic} /><span className="text-xs text-zinc-500">{label}</span></div>
                <div className={`text-2xl font-bold ${c.val}`} style={{ fontFamily: "'Syne',sans-serif" }}>{value || "0"}</div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-200" style={{ fontFamily: "'Syne',sans-serif" }}>Your Resumes</h2>
          <Btn icon={Plus} onClick={onNew} size="sm">New Resume</Btn>
        </div>

        {resumes.length === 0 ? (
          <Empty icon={FileText} text="No resumes yet. Build your first one!" action={onNew} actionLabel="Create Resume" />
        ) : (
          <div className="flex flex-col gap-2.5">
            {[...resumes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map(r => (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex items-center gap-3 transition-all">
                <div className="w-9 h-9 bg-violet-900/40 border border-violet-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-200 text-sm truncate">{r.name}</div>
                  <div className="text-xs text-zinc-500">{r.template} · {r.experience?.length || 0} roles · {new Date(r.updatedAt).toLocaleDateString()}</div>
                </div>
                <ScoreBadge score={r.atsScore} />
                <div className="flex gap-1">
                  <button onClick={() => { setActiveId(r.id); setView("preview"); }} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-all"><Eye size={13} /></button>
                  <button onClick={() => { setActiveId(r.id); setView("builder"); }} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-all"><Edit2 size={13} /></button>
                  <button onClick={() => onDelete(r.id)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:border-zinc-700 transition-all" onClick={() => setView("analyzer")}>
            <div className="flex items-center gap-2 mb-2"><Target size={16} className="text-emerald-400" /><span className="text-sm font-medium text-zinc-200">JD Analyzer</span></div>
            <p className="text-xs text-zinc-500">Paste a job description to extract ATS keywords and score your resume match.</p>
          </Card>
          <Card className="cursor-pointer hover:border-zinc-700 transition-all" onClick={() => setView("optimizer")}>
            <div className="flex items-center gap-2 mb-2"><Zap size={16} className="text-violet-400" /><span className="text-sm font-medium text-zinc-200">AI Optimizer</span></div>
            <p className="text-xs text-zinc-500">Rewrite bullets, generate summaries, and improve your resume with AI.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BUILDER SECTION TABS
══════════════════════════════════════════════════════════════ */
function PersonalTab({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Full Name" value={data.fullName} onChange={v => u("fullName", v)} placeholder="Jane Smith" className="col-span-2" />
      <Field label="Professional Title" value={data.title} onChange={v => u("title", v)} placeholder="Senior Software Engineer" className="col-span-2" />
      <Field label="Email" type="email" value={data.email} onChange={v => u("email", v)} placeholder="jane@example.com" />
      <Field label="Phone" value={data.phone} onChange={v => u("phone", v)} placeholder="+1 (555) 123-4567" />
      <Field label="Location" value={data.location} onChange={v => u("location", v)} placeholder="San Francisco, CA" className="col-span-2" />
      <Field label="LinkedIn URL" value={data.linkedin} onChange={v => u("linkedin", v)} placeholder="linkedin.com/in/janesmith" />
      <Field label="GitHub URL" value={data.github} onChange={v => u("github", v)} placeholder="github.com/janesmith" />
      <Field label="Website / Portfolio" value={data.website} onChange={v => u("website", v)} placeholder="janesmith.dev" className="col-span-2" />
    </div>
  );
}

function SummaryTab({ data, onChange, resume }) {
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true);
    try {
      const text = await AI.generateSummary(resumeToText(resume), resume?.personal?.title, resume?.skills?.technical?.slice(0, 8));
      onChange(text);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">Professional Summary</h3>
          <p className="text-xs text-zinc-500 mt-0.5">3–4 sentences · Start with your strongest value</p>
        </div>
        <AiBtn onClick={generate} loading={loading}>AI Generate</AiBtn>
      </div>
      <Field type="textarea" rows={5} value={data} onChange={onChange} placeholder="Results-driven engineer with 5+ years..." />
      <p className="text-xs text-zinc-600">{data.length} chars · Recommended: 300–500</p>
    </div>
  );
}

function BulletList({ bullets, onUpdate, onAdd, onRemove, placeholder }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Bullet Points</span>
        <button onClick={onAdd} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
          <Plus size={11} /> Add
        </button>
      </div>
      {bullets.map((b, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-zinc-600 text-xs mt-3">•</span>
          <textarea value={b} onChange={e => onUpdate(i, e.target.value)} rows={2}
            placeholder={placeholder || "Achieved X by doing Y, resulting in Z% improvement..."}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 resize-none placeholder-zinc-600 transition-all"
          />
          <button onClick={() => onRemove(i)} className="mt-2 text-zinc-600 hover:text-red-400 flex-shrink-0"><X size={12} /></button>
        </div>
      ))}
    </div>
  );
}

function ExperienceTab({ data, onChange }) {
  const add = () => onChange([...data, freshExp()]);
  const rm  = id => onChange(data.filter(e => e.id !== id));
  const upd = (id, k, v) => onChange(data.map(e => e.id === id ? { ...e, [k]: v } : e));
  const updB = (id, i, v) => { const e = data.find(x => x.id === id); const b = [...e.bullets]; b[i] = v; upd(id, "bullets", b); };
  const addB = id => { const e = data.find(x => x.id === id); upd(id, "bullets", [...e.bullets, ""]); };
  const rmB  = (id, i) => { const e = data.find(x => x.id === id); upd(id, "bullets", e.bullets.filter((_, j) => j !== i)); };
  return (
    <div className="flex flex-col gap-4">
      <SecHead icon={Briefcase} title="Work Experience" count={data.length} onAdd={add} />
      {data.length === 0 && <Empty icon={Briefcase} text="No experience added yet." />}
      {data.map(exp => (
        <Card key={exp.id} className="relative pt-4">
          <button onClick={() => rm(exp.id)} className="absolute top-3 right-3 p-1 text-zinc-600 hover:text-red-400"><X size={13} /></button>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Company" value={exp.company} onChange={v => upd(exp.id, "company", v)} placeholder="Google" />
            <Field label="Job Title" value={exp.role} onChange={v => upd(exp.id, "role", v)} placeholder="Senior Engineer" />
            <Field label="Location" value={exp.location} onChange={v => upd(exp.id, "location", v)} placeholder="Mountain View, CA" />
            <div className="flex gap-2">
              <Field label="Start" value={exp.startDate} onChange={v => upd(exp.id, "startDate", v)} placeholder="Jan 2022" />
              <Field label="End" value={exp.current ? "Present" : exp.endDate} onChange={v => upd(exp.id, "endDate", v)} placeholder="Dec 2023" disabled={exp.current} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-400 mb-3 cursor-pointer">
            <input type="checkbox" checked={exp.current} onChange={e => upd(exp.id, "current", e.target.checked)} className="accent-violet-600" />
            Currently working here
          </label>
          <BulletList bullets={exp.bullets} onUpdate={(i, v) => updB(exp.id, i, v)} onAdd={() => addB(exp.id)} onRemove={i => rmB(exp.id, i)} />
        </Card>
      ))}
    </div>
  );
}

function EducationTab({ data, onChange }) {
  const add = () => onChange([...data, freshEdu()]);
  const rm  = id => onChange(data.filter(e => e.id !== id));
  const upd = (id, k, v) => onChange(data.map(e => e.id === id ? { ...e, [k]: v } : e));
  return (
    <div className="flex flex-col gap-4">
      <SecHead icon={GraduationCap} title="Education" count={data.length} onAdd={add} />
      {data.length === 0 && <Empty icon={GraduationCap} text="No education added yet." />}
      {data.map(edu => (
        <Card key={edu.id} className="relative pt-4">
          <button onClick={() => rm(edu.id)} className="absolute top-3 right-3 p-1 text-zinc-600 hover:text-red-400"><X size={13} /></button>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Institution" value={edu.institution} onChange={v => upd(edu.id, "institution", v)} placeholder="MIT" className="col-span-2" />
            <Field label="Degree" value={edu.degree} onChange={v => upd(edu.id, "degree", v)} placeholder="Bachelor of Science" />
            <Field label="Field of Study" value={edu.field} onChange={v => upd(edu.id, "field", v)} placeholder="Computer Science" />
            <Field label="Start Year" value={edu.startYear} onChange={v => upd(edu.id, "startYear", v)} placeholder="2018" />
            <Field label="End Year" value={edu.endYear} onChange={v => upd(edu.id, "endYear", v)} placeholder="2022" />
            <Field label="GPA (optional)" value={edu.gpa} onChange={v => upd(edu.id, "gpa", v)} placeholder="3.9 / 4.0" className="col-span-2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function SkillsTab({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="flex flex-col gap-6">
      <div>
        <SecHead icon={Code} title="Technical Skills" />
        <p className="text-xs text-zinc-500 mb-2">Languages, frameworks, databases, cloud — press Enter to add</p>
        <TagInput tags={data.technical} onChange={v => u("technical", v)} placeholder="Python, React, AWS… (Enter to add)" />
      </div>
      <div>
        <SecHead icon={Settings} title="Tools & Technologies" />
        <p className="text-xs text-zinc-500 mb-2">Dev tools, CI/CD, design tools</p>
        <TagInput tags={data.tools} onChange={v => u("tools", v)} placeholder="Git, Docker, Figma… (Enter to add)" />
      </div>
      <div>
        <SecHead icon={Star} title="Soft Skills" />
        <p className="text-xs text-zinc-500 mb-2">Leadership, communication, collaboration</p>
        <TagInput tags={data.soft} onChange={v => u("soft", v)} placeholder="Leadership, Mentoring… (Enter to add)" />
      </div>
    </div>
  );
}

function ProjectsTab({ data, onChange }) {
  const add = () => onChange([...data, freshProj()]);
  const rm  = id => onChange(data.filter(p => p.id !== id));
  const upd = (id, k, v) => onChange(data.map(p => p.id === id ? { ...p, [k]: v } : p));
  const updB = (id, i, v) => { const p = data.find(x => x.id === id); const b = [...p.bullets]; b[i] = v; upd(id, "bullets", b); };
  const addB = id => { const p = data.find(x => x.id === id); upd(id, "bullets", [...p.bullets, ""]); };
  const rmB  = (id, i) => { const p = data.find(x => x.id === id); upd(id, "bullets", p.bullets.filter((_, j) => j !== i)); };
  return (
    <div className="flex flex-col gap-4">
      <SecHead icon={LayoutTemplate} title="Projects" count={data.length} onAdd={add} />
      {data.length === 0 && <Empty icon={LayoutTemplate} text="No projects added yet." />}
      {data.map(proj => (
        <Card key={proj.id} className="relative pt-4">
          <button onClick={() => rm(proj.id)} className="absolute top-3 right-3 p-1 text-zinc-600 hover:text-red-400"><X size={13} /></button>
          <div className="flex flex-col gap-3 mb-3">
            <Field label="Project Name" value={proj.name} onChange={v => upd(proj.id, "name", v)} placeholder="E-Commerce Microservices Platform" />
            <Field label="Project Link (optional)" value={proj.link} onChange={v => upd(proj.id, "link", v)} placeholder="github.com/you/project" />
          </div>
          <div className="mb-3">
            <label className="text-xs text-zinc-400 font-medium tracking-wider uppercase mb-1.5 block">Technologies</label>
            <TagInput tags={proj.tech} onChange={v => upd(proj.id, "tech", v)} placeholder="React, Node.js… (Enter to add)" />
          </div>
          <BulletList bullets={proj.bullets} onUpdate={(i, v) => updB(proj.id, i, v)} onAdd={() => addB(proj.id)} onRemove={i => rmB(proj.id, i)} placeholder="Built X that enabled Y, reducing latency by Z%..." />
        </Card>
      ))}
    </div>
  );
}

function CertsTab({ data, onChange }) {
  const add = () => onChange([...data, freshCert()]);
  const rm  = id => onChange(data.filter(c => c.id !== id));
  const upd = (id, k, v) => onChange(data.map(c => c.id === id ? { ...c, [k]: v } : c));
  return (
    <div className="flex flex-col gap-4">
      <SecHead icon={Medal} title="Certifications" count={data.length} onAdd={add} />
      {data.length === 0 && <Empty icon={Medal} text="No certifications added yet." />}
      {data.map(cert => (
        <Card key={cert.id} className="relative pt-4">
          <button onClick={() => rm(cert.id)} className="absolute top-3 right-3 p-1 text-zinc-600 hover:text-red-400"><X size={13} /></button>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Certification Name" value={cert.name} onChange={v => upd(cert.id, "name", v)} placeholder="AWS Certified Solutions Architect" className="col-span-2" />
            <Field label="Issuing Organization" value={cert.issuer} onChange={v => upd(cert.id, "issuer", v)} placeholder="Amazon Web Services" />
            <Field label="Issue Date" value={cert.date} onChange={v => upd(cert.id, "date", v)} placeholder="June 2024" />
            <Field label="Credential URL (optional)" value={cert.link} onChange={v => upd(cert.id, "link", v)} placeholder="https://..." className="col-span-2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function AchievementsTab({ data, onChange }) {
  const add = () => onChange([...data, { id: uid(), text: "" }]);
  const rm  = id => onChange(data.filter(a => a.id !== id));
  const upd = (id, v) => onChange(data.map(a => a.id === id ? { ...a, text: v } : a));
  return (
    <div className="flex flex-col gap-4">
      <SecHead icon={Star} title="Achievements & Awards" count={data.length} onAdd={add} />
      {data.length === 0 && <Empty icon={Star} text="No achievements added yet." />}
      {data.map(a => (
        <div key={a.id} className="flex gap-2 items-start">
          <span className="text-amber-400 mt-2.5 text-sm flex-shrink-0">★</span>
          <textarea value={a.text} onChange={e => upd(a.id, e.target.value)} rows={2}
            placeholder="1st place at HackNYU 2024 (500+ participants) — built real-time flood prediction system"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 resize-none placeholder-zinc-600 transition-all"
          />
          <button onClick={() => rm(a.id)} className="mt-2 text-zinc-600 hover:text-red-400 flex-shrink-0"><X size={12} /></button>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BUILDER VIEW
══════════════════════════════════════════════════════════════ */
function BuilderView({ resume, updateResume, setView }) {
  const [tab, setTab] = useState("personal");
  if (!resume) return (
    <div className="flex-1 flex items-center justify-center bg-zinc-950">
      <div className="text-center">
        <FileText size={32} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm mb-4">No resume selected. Go to the dashboard to create one.</p>
        <Btn onClick={() => setView("dashboard")}>Go to Dashboard</Btn>
      </div>
    </div>
  );
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between bg-zinc-900/50 flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-100" style={{ fontFamily: "'Syne',sans-serif" }}>{resume.name}</h1>
          <p className="text-xs text-zinc-500">Last saved {new Date(resume.updatedAt).toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" icon={Eye} onClick={() => setView("preview")} size="sm">Preview</Btn>
          <Btn icon={Target} onClick={() => setView("analyzer")} size="sm">ATS Check</Btn>
        </div>
      </div>
      <div className="flex gap-1 px-4 py-2 border-b border-zinc-800 overflow-x-auto flex-shrink-0 bg-zinc-900/30">
        {BUILDER_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              tab === id ? "bg-violet-900/50 text-violet-300 border border-violet-800/40" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
            }`}>
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl">
          {tab === "personal"     && <PersonalTab     data={resume.personal}       onChange={v => updateResume(r => ({ ...r, personal: v }))} />}
          {tab === "summary"      && <SummaryTab      data={resume.summary}        onChange={v => updateResume(r => ({ ...r, summary: v }))} resume={resume} />}
          {tab === "experience"   && <ExperienceTab   data={resume.experience}     onChange={v => updateResume(r => ({ ...r, experience: v }))} />}
          {tab === "education"    && <EducationTab    data={resume.education}      onChange={v => updateResume(r => ({ ...r, education: v }))} />}
          {tab === "skills"       && <SkillsTab       data={resume.skills}         onChange={v => updateResume(r => ({ ...r, skills: v }))} />}
          {tab === "projects"     && <ProjectsTab     data={resume.projects}       onChange={v => updateResume(r => ({ ...r, projects: v }))} />}
          {tab === "certs"        && <CertsTab        data={resume.certifications} onChange={v => updateResume(r => ({ ...r, certifications: v }))} />}
          {tab === "achievements" && <AchievementsTab data={resume.achievements}   onChange={v => updateResume(r => ({ ...r, achievements: v }))} />}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   RESUME TEMPLATES (print-safe HTML)
══════════════════════════════════════════════════════════════ */
function ModernTemplate({ resume }) {
  const { personal: p, summary, experience, education, skills, projects, certifications, achievements } = resume;
  const allSkills = [...(skills?.technical || []), ...(skills?.tools || [])];
  const S = { fontFamily: "'Arial','Helvetica',sans-serif", color: "#111827", background: "#fff", padding: "40px 44px", fontSize: "10pt", lineHeight: "1.45", maxWidth: "720px", margin: "0 auto" };
  return (
    <div style={S}>
      <div style={{ borderBottom: "2.5px solid #5B21B6", paddingBottom: "14px", marginBottom: "18px" }}>
        <div style={{ fontSize: "22pt", fontWeight: "700", color: "#1F2937", marginBottom: "3px" }}>{p.fullName || "Your Name"}</div>
        {p.title && <div style={{ fontSize: "11pt", color: "#7C3AED", fontWeight: "600", marginBottom: "8px" }}>{p.title}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "8.5pt", color: "#4B5563" }}>
          {p.email && <span>✉ {p.email}</span>}
          {p.phone && <span>📞 {p.phone}</span>}
          {p.location && <span>📍 {p.location}</span>}
          {p.linkedin && <span>🔗 {p.linkedin}</span>}
          {p.github && <span>⌥ {p.github}</span>}
        </div>
      </div>
      {summary && <TplSection title="Professional Summary" color="#7C3AED"><p style={{ margin: 0, color: "#374151", lineHeight: "1.55" }}>{summary}</p></TplSection>}
      {experience?.length > 0 && (
        <TplSection title="Experience" color="#7C3AED">
          {experience.map((e, i) => (
            <div key={i} style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "10.5pt" }}>{e.role}</div>
                  <div style={{ color: "#6D28D9", fontWeight: "600", fontSize: "9.5pt" }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                </div>
                <div style={{ fontSize: "8.5pt", color: "#6B7280" }}>{e.startDate}{e.startDate && " – "}{e.current ? "Present" : e.endDate}</div>
              </div>
              {e.bullets?.filter(Boolean).length > 0 && <ul style={{ paddingLeft: "16px", margin: "5px 0 0" }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j} style={{ marginBottom: "2px", color: "#374151" }}>{b}</li>)}</ul>}
            </div>
          ))}
        </TplSection>
      )}
      {projects?.length > 0 && (
        <TplSection title="Projects" color="#7C3AED">
          {projects.map((pr, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "700" }}>{pr.name}</span>
                {pr.tech?.length > 0 && <span style={{ fontSize: "8pt", color: "#6B7280" }}>{pr.tech.join(" · ")}</span>}
              </div>
              {pr.bullets?.filter(Boolean).length > 0 && <ul style={{ paddingLeft: "16px", margin: "4px 0 0" }}>{pr.bullets.filter(Boolean).map((b, j) => <li key={j} style={{ marginBottom: "2px", color: "#374151", fontSize: "9.5pt" }}>{b}</li>)}</ul>}
            </div>
          ))}
        </TplSection>
      )}
      {education?.length > 0 && (
        <TplSection title="Education" color="#7C3AED">
          {education.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div>
                <div style={{ fontWeight: "700" }}>{e.institution}</div>
                <div style={{ color: "#6B7280", fontSize: "9.5pt" }}>{e.degree}{e.field ? ` in ${e.field}` : ""}{e.gpa ? ` · GPA: ${e.gpa}` : ""}</div>
              </div>
              <div style={{ fontSize: "8.5pt", color: "#6B7280" }}>{e.startYear && `${e.startYear}–`}{e.endYear}</div>
            </div>
          ))}
        </TplSection>
      )}
      {allSkills.length > 0 && (
        <TplSection title="Skills" color="#7C3AED">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: skills?.soft?.length ? "8px" : "0" }}>
            {allSkills.map((s, i) => <span key={i} style={{ background: "#EDE9FE", color: "#5B21B6", padding: "2px 8px", borderRadius: "10px", fontSize: "8.5pt", fontWeight: "500" }}>{s}</span>)}
          </div>
          {skills?.soft?.length > 0 && <div style={{ fontSize: "8.5pt", color: "#6B7280" }}><strong>Soft Skills:</strong> {skills.soft.join(", ")}</div>}
        </TplSection>
      )}
      {certifications?.length > 0 && (
        <TplSection title="Certifications" color="#7C3AED">
          {certifications.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", fontSize: "9.5pt" }}>
              <span><strong>{c.name}</strong>{c.issuer ? ` · ${c.issuer}` : ""}</span>
              <span style={{ color: "#6B7280" }}>{c.date}</span>
            </div>
          ))}
        </TplSection>
      )}
      {achievements?.filter(a => a.text).length > 0 && (
        <TplSection title="Achievements" color="#7C3AED">
          {achievements.filter(a => a.text).map((a, i) => <div key={i} style={{ marginBottom: "3px", fontSize: "9.5pt" }}>• {a.text}</div>)}
        </TplSection>
      )}
    </div>
  );
}

function ClassicTemplate({ resume }) {
  const { personal: p, summary, experience, education, skills, projects, certifications } = resume;
  const S = { fontFamily: "'Georgia','Times New Roman',serif", color: "#111827", background: "#fff", padding: "40px 44px", fontSize: "10pt", lineHeight: "1.5", maxWidth: "720px", margin: "0 auto" };
  return (
    <div style={S}>
      <div style={{ textAlign: "center", marginBottom: "18px", paddingBottom: "14px", borderBottom: "1px solid #374151" }}>
        <div style={{ fontSize: "20pt", fontWeight: "700", letterSpacing: "2px", fontFamily: "'Arial',sans-serif", marginBottom: "4px" }}>{(p.fullName || "YOUR NAME").toUpperCase()}</div>
        {p.title && <div style={{ fontSize: "10pt", color: "#4B5563", fontStyle: "italic", marginBottom: "6px" }}>{p.title}</div>}
        <div style={{ fontSize: "8.5pt", color: "#6B7280", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
          {p.email && <span>{p.email}</span>}{p.phone && <><span>|</span><span>{p.phone}</span></>}
          {p.location && <><span>|</span><span>{p.location}</span></>}
        </div>
      </div>
      {summary && <ClassicSec title="PROFESSIONAL SUMMARY"><p style={{ margin: 0, fontStyle: "italic", color: "#374151" }}>{summary}</p></ClassicSec>}
      {experience?.length > 0 && (
        <ClassicSec title="WORK EXPERIENCE">
          {experience.map((e, i) => (
            <div key={i} style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: "700", fontFamily: "'Arial',sans-serif" }}>{e.company.toUpperCase()}</div>
                <div style={{ fontSize: "8.5pt", color: "#6B7280" }}>{e.startDate}{e.startDate && " – "}{e.current ? "Present" : e.endDate}</div>
              </div>
              <div style={{ fontStyle: "italic", color: "#4B5563", marginBottom: "5px" }}>{e.role}{e.location ? ` | ${e.location}` : ""}</div>
              {e.bullets?.filter(Boolean).length > 0 && <ul style={{ paddingLeft: "16px", margin: 0 }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j} style={{ marginBottom: "2px" }}>{b}</li>)}</ul>}
            </div>
          ))}
        </ClassicSec>
      )}
      {education?.length > 0 && (
        <ClassicSec title="EDUCATION">
          {education.map((e, i) => (
            <div key={i} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: "700", fontFamily: "'Arial',sans-serif" }}>{e.institution}</div>
                <div style={{ color: "#4B5563", fontStyle: "italic", fontSize: "9.5pt" }}>{e.degree}{e.field ? ` in ${e.field}` : ""}{e.gpa ? ` · GPA: ${e.gpa}` : ""}</div>
              </div>
              <div style={{ fontSize: "8.5pt", color: "#6B7280" }}>{e.endYear}</div>
            </div>
          ))}
        </ClassicSec>
      )}
      {(skills?.technical?.length || skills?.tools?.length || skills?.soft?.length) ? (
        <ClassicSec title="SKILLS">
          {skills.technical?.length > 0 && <div style={{ marginBottom: "4px", fontSize: "9.5pt" }}><strong>Technical:</strong> {skills.technical.join(", ")}</div>}
          {skills.tools?.length > 0 && <div style={{ marginBottom: "4px", fontSize: "9.5pt" }}><strong>Tools:</strong> {skills.tools.join(", ")}</div>}
          {skills.soft?.length > 0 && <div style={{ fontSize: "9.5pt" }}><strong>Soft Skills:</strong> {skills.soft.join(", ")}</div>}
        </ClassicSec>
      ) : null}
      {projects?.length > 0 && (
        <ClassicSec title="PROJECTS">
          {projects.map((pr, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <span style={{ fontWeight: "700" }}>{pr.name}</span>
              {pr.tech?.length > 0 && <span style={{ fontSize: "9pt", color: "#6B7280" }}> ({pr.tech.join(", ")})</span>}
              {pr.bullets?.filter(Boolean).length > 0 && <ul style={{ paddingLeft: "16px", margin: "3px 0 0" }}>{pr.bullets.filter(Boolean).map((b, j) => <li key={j} style={{ fontSize: "9.5pt", marginBottom: "2px" }}>{b}</li>)}</ul>}
            </div>
          ))}
        </ClassicSec>
      )}
    </div>
  );
}

function MinimalTemplate({ resume }) {
  const { personal: p, summary, experience, education, skills, projects, certifications } = resume;
  const allSkills = [...(skills?.technical || []), ...(skills?.tools || []), ...(skills?.soft || [])];
  const S = { fontFamily: "'Helvetica Neue','Arial',sans-serif", color: "#1F2937", background: "#fff", padding: "44px 50px", fontSize: "9.5pt", lineHeight: "1.5", maxWidth: "720px", margin: "0 auto" };
  return (
    <div style={S}>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "20pt", fontWeight: "300", color: "#111827", marginBottom: "4px" }}>{p.fullName || "Your Name"}</div>
        {p.title && <div style={{ fontSize: "10pt", color: "#6B7280", marginBottom: "8px" }}>{p.title}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "8pt", color: "#6B7280" }}>
          {p.email && <span>{p.email}</span>}{p.phone && <><span>·</span><span>{p.phone}</span></>}
          {p.location && <><span>·</span><span>{p.location}</span></>}
          {p.github && <><span>·</span><span>{p.github}</span></>}
        </div>
      </div>
      <div style={{ height: "0.5px", background: "#E5E7EB", marginBottom: "18px" }} />
      {summary && <MinSec title="About"><p style={{ margin: 0, color: "#374151", lineHeight: "1.6" }}>{summary}</p></MinSec>}
      {experience?.length > 0 && (
        <MinSec title="Experience">
          {experience.map((e, i) => (
            <div key={i} style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: "600" }}>{e.company} · {e.role}</div>
                <div style={{ fontSize: "8pt", color: "#9CA3AF" }}>{e.startDate}{e.startDate && "–"}{e.current ? "Present" : e.endDate}</div>
              </div>
              {e.bullets?.filter(Boolean).length > 0 && <ul style={{ paddingLeft: "14px", margin: "4px 0 0" }}>{e.bullets.filter(Boolean).map((b, j) => <li key={j} style={{ marginBottom: "2px", color: "#4B5563" }}>{b}</li>)}</ul>}
            </div>
          ))}
        </MinSec>
      )}
      {projects?.length > 0 && (
        <MinSec title="Projects">
          {projects.map((pr, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "600" }}>{pr.name}</span>
                {pr.tech?.length > 0 && <span style={{ fontSize: "8pt", color: "#9CA3AF" }}>{pr.tech.join(", ")}</span>}
              </div>
              {pr.bullets?.filter(Boolean).length > 0 && <ul style={{ paddingLeft: "14px", margin: "3px 0 0" }}>{pr.bullets.filter(Boolean).map((b, j) => <li key={j} style={{ marginBottom: "2px", color: "#4B5563", fontSize: "9pt" }}>{b}</li>)}</ul>}
            </div>
          ))}
        </MinSec>
      )}
      {education?.length > 0 && (
        <MinSec title="Education">
          {education.map((e, i) => (
            <div key={i} style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontWeight: "600" }}>{e.institution}</span>
                <div style={{ fontSize: "8.5pt", color: "#6B7280" }}>{e.degree}{e.field ? ` · ${e.field}` : ""}{e.gpa ? ` · ${e.gpa}` : ""}</div>
              </div>
              <div style={{ fontSize: "8pt", color: "#9CA3AF" }}>{e.endYear}</div>
            </div>
          ))}
        </MinSec>
      )}
      {allSkills.length > 0 && <MinSec title="Skills"><div style={{ fontSize: "9.5pt", color: "#4B5563" }}>{allSkills.join(" · ")}</div></MinSec>}
    </div>
  );
}

// Template sub-helpers (plain HTML for PDF safety)
const TplSection = ({ title, color, children }) => (
  <div style={{ marginBottom: "18px" }}>
    <div style={{ fontSize: "8pt", fontWeight: "700", color, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px", borderBottom: `1px solid ${color}20`, paddingBottom: "3px" }}>{title}</div>
    {children}
  </div>
);
const ClassicSec = ({ title, children }) => (
  <div style={{ marginBottom: "16px" }}>
    <div style={{ fontFamily: "'Arial',sans-serif", fontSize: "9pt", fontWeight: "700", letterSpacing: "1px", borderBottom: "1px solid #374151", paddingBottom: "3px", marginBottom: "8px" }}>{title}</div>
    {children}
  </div>
);
const MinSec = ({ title, children }) => (
  <div style={{ marginBottom: "16px" }}>
    <div style={{ fontSize: "7.5pt", fontWeight: "600", color: "#9CA3AF", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>{title}</div>
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════════════
   PREVIEW VIEW
══════════════════════════════════════════════════════════════ */
function PreviewView({ resume, updateResume, setView }) {
  const [tmpl, setTmpl] = useState(resume?.template || "Modern");
  const changeTemplate = (t) => { setTmpl(t); if (resume) updateResume(r => ({ ...r, template: t })); };
  const exportPDF = () => {
    const html = `<!DOCTYPE html><html><head><title>${resume?.name}</title><style>body{margin:0;}@media print{@page{margin:0.5in}}</style></head><body></body><script>window.onload=()=>{document.body.innerHTML=document.querySelector('#resume').innerHTML;setTimeout(()=>window.print(),400)}<\/script></html>`;
    window.print();
  };
  if (!resume) return (
    <div className="flex-1 flex items-center justify-center bg-zinc-950">
      <div className="text-center">
        <Eye size={32} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm mb-4">No resume selected to preview</p>
        <Btn onClick={() => setView("dashboard")}>Go to Dashboard</Btn>
      </div>
    </div>
  );
  const TemplateComp = tmpl === "Classic" ? ClassicTemplate : tmpl === "Minimal" ? MinimalTemplate : ModernTemplate;
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-3 flex items-center justify-between bg-zinc-900/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ScoreBadge score={resume.atsScore} />
          <span className="text-xs text-zinc-500 font-medium">{resume.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
            {TEMPLATES.map(t => (
              <button key={t} onClick={() => changeTemplate(t)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${tmpl === t ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>
                {t}
              </button>
            ))}
          </div>
          <Btn icon={Edit2} variant="secondary" onClick={() => setView("builder")} size="sm">Edit</Btn>
          <Btn icon={Download} onClick={() => window.print()} size="sm">Export PDF</Btn>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
        <div className="max-w-3xl mx-auto">
          <div id="resume" className="bg-white rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
            <TemplateComp resume={resume} />
          </div>
          <p className="text-center text-xs text-zinc-600 mt-3">Click "Export PDF" → browser print dialog → Save as PDF · Set margins to None in print settings</p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   JD ANALYZER
══════════════════════════════════════════════════════════════ */
function JDAnalyzerView({ resume, updateResume, jdData, setJdData }) {
  const [jd, setJd]         = useState("");
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [err, setErr]       = useState("");

  const analyze = async () => {
    if (!jd.trim()) return;
    setLoading(true); setErr("");
    try { setJdData(await AI.analyzeJd(jd)); }
    catch (e) { setErr(e.response?.data?.error || "Analysis failed. Make sure ANTHROPIC_API_KEY is set."); }
    setLoading(false);
  };

  const calcScore = async () => {
    if (!jdData || !resume) return;
    setScoring(true); setErr("");
    try {
      const result = await AI.scoreResume(resumeToText(resume), jdData);
      updateResume(r => ({ ...r, atsScore: result.overallScore, atsBreakdown: result }));
    } catch (e) { setErr(e.response?.data?.error || "Scoring failed."); }
    setScoring(false);
  };

  const breakdown = resume?.atsBreakdown;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-zinc-100 mb-1" style={{ fontFamily: "'Syne',sans-serif" }}>JD Analyzer</h1>
        <p className="text-zinc-500 text-sm mb-6">Extract ATS keywords and score your resume against any job description</p>

        <Card className="mb-5">
          <SecHead icon={Target} title="Job Description" />
          <Field type="textarea" rows={8} value={jd} onChange={setJd} placeholder="Paste the full job description here..." />
          <ErrBanner msg={err} />
          <div className="flex gap-2 mt-3">
            <Btn icon={Brain} onClick={analyze} loading={loading}>Analyze JD</Btn>
            {jdData && resume && <Btn variant="ai" icon={Target} onClick={calcScore} loading={scoring}>Score My Resume</Btn>}
          </div>
        </Card>

        {jdData && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Card><div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-medium">Role</div><div className="text-sm font-semibold text-zinc-200">{jdData.role}</div>{jdData.company && <div className="text-xs text-zinc-400">{jdData.company}</div>}</Card>
              <Card><div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-medium">Seniority</div><div className="text-sm font-semibold text-zinc-200">{jdData.seniority || "Not specified"}</div><div className="text-xs text-zinc-400">{jdData.experienceRequired}</div></Card>
            </div>

            <Card>
              <SecHead icon={Code} title="Required Skills" badge={`${jdData.requiredSkills?.length || 0}`} />
              <div className="flex flex-wrap gap-2">
                {jdData.requiredSkills?.map((s, i) => {
                  const has = [...(resume?.skills?.technical || []), ...(resume?.skills?.tools || [])].some(sk => sk.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(sk.toLowerCase()));
                  return <span key={i} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${has ? "text-emerald-400 bg-emerald-950/50 border-emerald-800/40" : "text-zinc-300 bg-zinc-800 border-zinc-700"}`}>{has && "✓ "}{s}</span>;
                })}
              </div>
            </Card>

            <Card>
              <SecHead icon={List} title="ATS Keywords" badge={`${jdData.atsKeywords?.length || 0}`} />
              <div className="flex flex-wrap gap-1.5">
                {jdData.atsKeywords?.map((k, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-violet-950/50 text-violet-300 border border-violet-800/30 rounded-md">{k}</span>
                ))}
              </div>
            </Card>

            <Card>
              <SecHead icon={Briefcase} title="Key Responsibilities" badge={`${jdData.responsibilities?.length || 0}`} />
              <ul className="flex flex-col gap-1.5">
                {jdData.responsibilities?.slice(0, 8).map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs text-zinc-400">
                    <ChevronRight size={12} className="text-violet-500 mt-0.5 flex-shrink-0" />{r}
                  </li>
                ))}
              </ul>
            </Card>

            {breakdown && (
              <Card>
                <SecHead icon={BarChart} title="ATS Match Analysis" />
                <div className="text-center mb-5">
                  <div className={`text-4xl font-bold mb-1 ${breakdown.overallScore >= 80 ? "text-emerald-400" : breakdown.overallScore >= 60 ? "text-amber-400" : "text-red-400"}`} style={{ fontFamily: "'Syne',sans-serif" }}>
                    {breakdown.overallScore}%
                  </div>
                  <div className="text-xs text-zinc-500">Overall ATS Match Score</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[["Skills", breakdown.skillsScore, "violet"], ["Experience", breakdown.experienceScore, "blue"], ["Keywords", breakdown.keywordsScore, "emerald"], ["Education", breakdown.educationScore, "amber"]].map(([label, score, c]) => {
                    const cols = { violet: "text-violet-400", blue: "text-blue-400", emerald: "text-emerald-400", amber: "text-amber-400" };
                    return (
                      <div key={label} className="bg-zinc-800 rounded-lg p-3">
                        <div className="text-xs text-zinc-500 mb-1">{label}</div>
                        <div className={`text-xl font-bold ${cols[c]}`}>{score}%</div>
                        <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-current ${cols[c]}`} style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {breakdown.matchedKeywords?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1"><CheckCircle size={11} /> Matched Keywords</div>
                    <div className="flex flex-wrap gap-1.5">{breakdown.matchedKeywords.map((k, i) => <span key={i} className="text-xs px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-800/30 rounded-full">{k}</span>)}</div>
                  </div>
                )}
                {breakdown.missingKeywords?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-red-400 font-medium mb-2 flex items-center gap-1"><AlertTriangle size={11} /> Missing Keywords</div>
                    <div className="flex flex-wrap gap-1.5">{breakdown.missingKeywords.map((k, i) => <span key={i} className="text-xs px-2 py-0.5 bg-red-950/50 text-red-400 border border-red-800/30 rounded-full">{k}</span>)}</div>
                  </div>
                )}
                {breakdown.suggestions?.length > 0 && (
                  <div>
                    <div className="text-xs text-violet-400 font-medium mb-2 flex items-center gap-1"><Lightbulb size={11} /> AI Suggestions</div>
                    <ul className="flex flex-col gap-1.5">
                      {breakdown.suggestions.map((s, i) => <li key={i} className="text-xs text-zinc-400 flex gap-2"><ChevronRight size={11} className="text-violet-500 mt-0.5 flex-shrink-0" />{s}</li>)}
                    </ul>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AI OPTIMIZER
══════════════════════════════════════════════════════════════ */
function OptimizerView({ resume, updateResume, jdData }) {
  const [bullet, setBullet]               = useState("");
  const [context, setContext]             = useState("");
  const [improved, setImproved]           = useState("");
  const [loading, setLoading]             = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [skillLoading, setSkillLoading]   = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState(null);
  const [err, setErr]                     = useState("");

  const rewriteBullet = async () => {
    if (!bullet.trim()) return;
    setLoading(true); setErr(""); setImproved("");
    try { setImproved(await AI.rewriteBullet(bullet, context, jdData?.atsKeywords?.slice(0, 10))); }
    catch (e) { setErr(e.response?.data?.error || "Rewrite failed."); }
    setLoading(false);
  };

  const generateSummary = async () => {
    if (!resume) return;
    setSummaryLoading(true); setErr("");
    try {
      const text = await AI.generateSummary(resumeToText(resume), jdData?.role, jdData?.requiredSkills?.slice(0, 6));
      updateResume(r => ({ ...r, summary: text }));
    } catch (e) { setErr(e.response?.data?.error || "Summary generation failed."); }
    setSummaryLoading(false);
  };

  const suggestSkills = async () => {
    if (!jdData) return;
    setSkillLoading(true); setErr("");
    try {
      setSuggestedSkills(await AI.suggestSkills({
        currentSkills: [...(resume?.skills?.technical || []), ...(resume?.skills?.tools || [])],
        requiredSkills: jdData.requiredSkills,
        preferredSkills: jdData.preferredSkills,
      }));
    } catch (e) { setErr(e.response?.data?.error || "Skill suggestion failed."); }
    setSkillLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-zinc-100 mb-1" style={{ fontFamily: "'Syne',sans-serif" }}>AI Optimizer</h1>
        <p className="text-zinc-500 text-sm mb-6">Rewrite bullets, generate summaries, and identify skill gaps</p>

        {!jdData && <div className="flex items-center gap-2.5 p-3 bg-amber-950/40 border border-amber-800/30 rounded-xl mb-5"><Info size={14} className="text-amber-400 flex-shrink-0" /><p className="text-xs text-amber-300">Run a JD Analysis first to unlock keyword-targeted optimization.</p></div>}
        <ErrBanner msg={err} />

        <Card className="mb-4">
          <SecHead icon={PenLine} title="Bullet Rewriter" badge="AI" />
          <div className="flex flex-col gap-3">
            <Field type="textarea" rows={3} value={bullet} onChange={setBullet} label="Original Bullet" placeholder="Worked on database optimization that improved query speed" />
            <Field value={context} onChange={setContext} label="Context (optional)" placeholder="Backend Engineer at Stripe" />
            <Btn icon={Sparkles} onClick={rewriteBullet} loading={loading} className="self-start" variant="ai">Rewrite Bullet</Btn>
            {improved && (
              <div className="mt-1 p-3 bg-emerald-950/40 border border-emerald-800/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1"><CheckCircle size={11} /> Improved</span>
                  <button onClick={() => navigator.clipboard.writeText(improved)} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"><Copy size={10} /> Copy</button>
                </div>
                <p className="text-sm text-zinc-200">{improved}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="mb-4">
          <SecHead icon={AlignLeft} title="Professional Summary Generator" badge="AI" />
          {resume?.summary && <div className="mb-3 p-3 bg-zinc-800 rounded-lg"><div className="text-xs text-zinc-500 mb-1.5">Current</div><p className="text-xs text-zinc-300">{resume.summary}</p></div>}
          <p className="text-xs text-zinc-500 mb-3">Generates an ATS-optimized summary from your resume{jdData ? " + job analysis" : ""}.</p>
          <Btn icon={Sparkles} onClick={generateSummary} loading={summaryLoading} variant="ai">{resume?.summary ? "Regenerate" : "Generate Summary"}</Btn>
          {resume?.summary && summaryLoading === false && <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1"><CheckCircle size={11} /> Summary updated in resume</p>}
        </Card>

        {jdData && (
          <Card>
            <SecHead icon={TrendingUp} title="Skill Gap Analyzer" badge="AI" />
            <p className="text-xs text-zinc-500 mb-3">Compares your skills against job requirements to find gaps.</p>
            <Btn icon={Brain} onClick={suggestSkills} loading={skillLoading} variant="ai">Analyze Skill Gaps</Btn>
            {suggestedSkills && (
              <div className="mt-4 flex flex-col gap-3">
                <SkillGroup label="Missing Required Skills" color="red"    skills={suggestedSkills.missingRequired} />
                <SkillGroup label="Recommended to Add"      color="amber"  skills={suggestedSkills.recommended} />
                <SkillGroup label="Bonus / Differentiators" color="violet" skills={suggestedSkills.bonus} />
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function SkillGroup({ label, color, skills }) {
  if (!skills?.length) return null;
  const cols = {
    red:    { bg: "bg-red-950/40",    text: "text-red-400",    border: "border-red-800/30",    tag: "bg-red-950/60 text-red-300 border-red-800/40" },
    amber:  { bg: "bg-amber-950/40",  text: "text-amber-400",  border: "border-amber-800/30",  tag: "bg-amber-950/60 text-amber-300 border-amber-800/40" },
    violet: { bg: "bg-violet-950/40", text: "text-violet-400", border: "border-violet-800/30", tag: "bg-violet-950/60 text-violet-300 border-violet-800/40" },
  };
  const c = cols[color];
  return (
    <div className={`p-3 rounded-lg border ${c.bg} ${c.border}`}>
      <div className={`text-xs font-medium mb-2 ${c.text}`}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((s, i) => <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${c.tag}`}>{s}</span>)}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COVER LETTER
══════════════════════════════════════════════════════════════ */
function CoverLetterView({ resume, jdData }) {
  const [tone, setTone]     = useState("professional");
  const [extra, setExtra]   = useState("");
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!resume) return;
    setLoading(true); setLetter("");
    try {
      setLetter(await AI.coverLetter({
        resumeText:      resumeToText(resume),
        role:            jdData?.role,
        company:         jdData?.company,
        tone,
        extraContext:    extra,
        requirements:    jdData?.requiredSkills?.slice(0, 8),
        responsibilities:jdData?.responsibilities?.slice(0, 3),
      }));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-zinc-100 mb-1" style={{ fontFamily: "'Syne',sans-serif" }}>Cover Letter Generator</h1>
        <p className="text-zinc-500 text-sm mb-6">AI-personalized cover letters based on your resume and the JD</p>

        {!resume && <div className="flex items-center gap-2 p-3 bg-amber-950/40 border border-amber-800/30 rounded-xl mb-5 text-xs text-amber-300"><AlertTriangle size={13} /> Select a resume from dashboard first.</div>}

        <Card className="mb-5">
          <SecHead icon={BookOpen} title="Letter Options" />
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-zinc-400 font-medium tracking-wider uppercase mb-2 block">Tone</label>
              <div className="flex gap-2">
                {[["professional", "Professional"], ["enthusiastic", "Enthusiastic"], ["concise", "Concise"]].map(([v, l]) => (
                  <button key={v} onClick={() => setTone(v)}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${tone === v ? "bg-violet-900/50 text-violet-300 border-violet-700/50" : "text-zinc-500 border-zinc-700 hover:text-zinc-300"}`}>{l}</button>
                ))}
              </div>
            </div>
            <Field type="textarea" rows={3} label="Additional Context (optional)" value={extra} onChange={setExtra} placeholder="Why you're excited about this company, unique qualifications..." />
            <Btn icon={Sparkles} onClick={generate} loading={loading} disabled={!resume} variant="ai" className="self-start">Generate Cover Letter</Btn>
          </div>
        </Card>

        {letter && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <SecHead icon={FileText} title="Generated Cover Letter" />
              <div className="flex gap-2">
                <Btn icon={copied ? CheckCircle : Copy} onClick={() => { navigator.clipboard.writeText(letter); setCopied(true); setTimeout(() => setCopied(false), 2000); }} variant="ghost" size="sm">{copied ? "Copied!" : "Copy"}</Btn>
                <Btn icon={RefreshCw} onClick={generate} loading={loading} variant="secondary" size="sm">Regenerate</Btn>
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 text-sm text-gray-800 leading-relaxed font-serif whitespace-pre-wrap">{letter}</div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════════════════ */
function SettingsView({ user, resumes }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-bold text-zinc-100 mb-1" style={{ fontFamily: "'Syne',sans-serif" }}>Settings</h1>
        <p className="text-zinc-500 text-sm mb-6">Account and application info</p>
        <Card className="mb-4">
          <SecHead icon={User} title="Account" />
          <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-violet-800 flex items-center justify-center text-base font-bold text-white">{user.name[0].toUpperCase()}</div>
            <div><div className="text-sm font-medium text-zinc-200">{user.name}</div><div className="text-xs text-zinc-500">{user.email}</div></div>
          </div>
        </Card>
        <Card className="mb-4">
          <SecHead icon={BarChart2} title="Stats" />
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Resumes Created", resumes.length],
              ["Resumes Scored", resumes.filter(r => r.atsScore !== null).length],
              ["Avg ATS Score", resumes.filter(r => r.atsScore).length ? `${Math.round(resumes.filter(r => r.atsScore).reduce((a, r) => a + r.atsScore, 0) / resumes.filter(r => r.atsScore).length)}%` : "—"],
              ["Templates Used", [...new Set(resumes.map(r => r.template))].length],
            ].map(([label, val]) => (
              <div key={label} className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs text-zinc-500 mb-1">{label}</div>
                <div className="text-lg font-bold text-violet-300" style={{ fontFamily: "'Syne',sans-serif" }}>{val}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SecHead icon={Info} title="Tech Stack" />
          <div className="text-xs text-zinc-500 space-y-1.5">
            <p>Frontend: React 18 + Vite + Tailwind CSS + Axios</p>
            <p>Backend: Node.js + Express + bcryptjs + jsonwebtoken</p>
            <p>AI: Claude Sonnet via Anthropic API (all AI calls proxied through backend)</p>
            <p>Auth: JWT-based, passwords hashed with bcrypt (cost factor 12)</p>
            <p className="text-zinc-600 pt-1">Data is in-memory per session. Swap the in-memory store with MongoDB/PostgreSQL for production persistence.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser]         = useState(null);
  const [view, setView]         = useState("dashboard");
  const [resumes, setResumes]   = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [jdData, setJdData]     = useState(null);

  // Try to restore session
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.get("/auth/me")
        .then(r => setUser(r.data.user))
        .catch(() => localStorage.removeItem("token"));
    }
  }, []);

  const activeResume = resumes.find(r => r.id === activeId) ?? null;

  const updateResume = useCallback((updater) => {
    setResumes(prev => prev.map(r => r.id === activeId
      ? { ...updater(r), updatedAt: new Date().toISOString() }
      : r
    ));
  }, [activeId]);

  const newResume = () => {
    const r = freshResume(`Resume ${resumes.length + 1}`);
    setResumes(prev => [...prev, r]);
    setActiveId(r.id);
    setView("builder");
  };

  const deleteResume = (id) => {
    setResumes(prev => prev.filter(r => r.id !== id));
    if (activeId === id) { setActiveId(null); setView("dashboard"); }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setResumes([]);
    setActiveId(null);
    setJdData(null);
  };

  if (!user) return <AuthPage onLogin={setUser} />;

  const sharedProps = { resume: activeResume, updateResume, setView, jdData, setJdData };

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
      <Sidebar view={view} setView={setView} user={user} onLogout={logout} />
      <main className="flex-1 overflow-hidden flex flex-col">
        {view === "dashboard" && <DashboardView resumes={resumes} setView={setView} setActiveId={setActiveId} onDelete={deleteResume} onNew={newResume} jdData={jdData} />}
        {view === "builder"   && <BuilderView   {...sharedProps} />}
        {view === "preview"   && <PreviewView   resume={activeResume} updateResume={updateResume} setView={setView} />}
        {view === "analyzer"  && <JDAnalyzerView resume={activeResume} updateResume={updateResume} jdData={jdData} setJdData={setJdData} />}
        {view === "optimizer" && <OptimizerView  resume={activeResume} updateResume={updateResume} jdData={jdData} />}
        {view === "cover"     && <CoverLetterView resume={activeResume} jdData={jdData} />}
        {view === "settings"  && <SettingsView   user={user} resumes={resumes} />}
      </main>
    </div>
  );
}
