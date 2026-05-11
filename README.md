# ResumeAI — AI-Powered Resume Builder & ATS Optimizer

Full-stack web app: React frontend + Node.js/Express backend + Claude AI.

---

## Prerequisites

- Node.js 18+ (https://nodejs.org)
- An Anthropic API key (https://console.anthropic.com)

---

## Setup (5 minutes)

### 1. Backend

```bash
cd backend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Open `backend/.env` and fill in:

```
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
JWT_SECRET=any-long-random-string-here
PORT=3001
CLIENT_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev       # development (auto-restarts on changes)
# OR
npm start         # production
```

You should see:
```
✅  ResumeAI backend running on http://localhost:3001
📋  API key set: true
```

---

### 2. Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open your browser at **http://localhost:5173**

---

## Project Structure

```
resume-ai/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry point
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT auth middleware
│   │   └── routes/
│   │       ├── auth.js           # POST /api/auth/signup, /login, GET /me
│   │       ├── resumes.js        # CRUD /api/resumes
│   │       └── ai.js             # AI proxy routes /api/ai/*
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.jsx               # Full React app (all views)
    │   ├── main.jsx              # React entry
    │   └── index.css             # Tailwind + global styles
    ├── index.html
    ├── vite.config.js            # Vite + /api proxy to :3001
    ├── tailwind.config.js
    └── package.json
```

---

## Features

| Feature | Status |
|---|---|
| JWT Authentication (signup/login) | ✅ |
| Resume Builder (8 sections) | ✅ |
| 3 Resume Templates (Modern/Classic/Minimal) | ✅ |
| Live Preview | ✅ |
| PDF Export (browser print) | ✅ |
| JD Analyzer — extracts keywords, skills, responsibilities | ✅ |
| ATS Score Calculator with breakdown | ✅ |
| Bullet Point Rewriter | ✅ |
| AI Summary Generator | ✅ |
| Skill Gap Analyzer | ✅ |
| Cover Letter Generator | ✅ |
| Dashboard with stats | ✅ |

---

## API Endpoints

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user (JWT required) |

### Resumes (JWT required)
| Method | Route | Description |
|---|---|---|
| GET | `/api/resumes` | List all resumes |
| POST | `/api/resumes` | Create resume |
| GET | `/api/resumes/:id` | Get one resume |
| PUT | `/api/resumes/:id` | Update resume |
| DELETE | `/api/resumes/:id` | Delete resume |

### AI (JWT required)
| Method | Route | Description |
|---|---|---|
| POST | `/api/ai/analyze-jd` | Analyze job description |
| POST | `/api/ai/score-resume` | ATS score against JD |
| POST | `/api/ai/rewrite-bullet` | Rewrite bullet point |
| POST | `/api/ai/generate-summary` | Generate summary |
| POST | `/api/ai/suggest-skills` | Skill gap analysis |
| POST | `/api/ai/cover-letter` | Generate cover letter |
| POST | `/api/ai/complete` | Generic AI completion |

---

## Production Build

```bash
# Build frontend
cd frontend && npm run build

# Serve the dist/ folder with any static host (Vercel, Netlify, nginx)
# Point your reverse proxy to backend on :3001
```

---

## Swap to a Real Database

The current backend uses in-memory Maps (data resets on server restart).
To persist data, replace the Maps in `backend/src/routes/auth.js` and `resumes.js`
with your preferred ORM:

- **MongoDB**: Mongoose — `npm install mongoose`
- **PostgreSQL**: Prisma — `npm install prisma @prisma/client`

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens |
| `PORT` | Optional | Backend port (default: 3001) |
| `CLIENT_URL` | Optional | Frontend origin for CORS (default: http://localhost:5173) |
