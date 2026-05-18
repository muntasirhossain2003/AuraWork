# AuraWork

> Location-aware AI productivity app — detects where you are and generates a smart work plan for that context.

## What it does

AuraWork uses your phone/browser's GPS to detect which work zone you're in (home, office, café, client site) and instantly generates an AI-powered, time-blocked work plan tailored to that location. It also shows your teammates' live locations on a real-time presence board.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, Framer Motion |
| Backend | Node.js, Express.js |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime (postgres_changes) |
| Geofencing | Browser Geolocation API + @turf/turf |
| AI | Groq API (LLaMA 3 8B) |
| Animations | Framer Motion (spring physics, AnimatePresence) |
| Charts | Recharts |
| Deployment | Vercel (frontend) + Render (backend) |

## Architecture

```
┌─────────────────────────────────┐
│      React Frontend (Vercel)    │
│  Login / Register               │
│  Dashboard (AI Plan + Tasks)    │
│  Zone Setup (Geofencing)        │
│  Team Presence Board            │
│  Insights (Charts + AI)         │
└──────────────┬──────────────────┘
               │ REST API + Supabase Realtime
┌──────────────▼──────────────────┐
│    Express Backend (Render)     │
│  JWT Auth (bcrypt)              │
│  Zones / Tasks CRUD             │
│  Groq AI integration            │
│  Session lifecycle              │
└───────┬────────────┬────────────┘
        │            │
┌───────▼───┐  ┌─────▼──────────────┐
│ Supabase  │  │ Supabase Realtime  │
│ PostgreSQL│  │ Live presence feed │
└───────────┘  └────────────────────┘
```

## Features

- **Zone Detection** — GPS + turf.js circle math detects your current work location
- **AI Work Plan** — Groq LLaMA 3 generates a time-blocked plan based on your zone + pending tasks
- **Live Presence Board** — Real-time team status updates via Supabase Realtime
- **Handoff Notes** — AI-generated session summary when you leave a zone
- **Insights** — Pattern analysis across 30 sessions with bar/line charts
- **Animated UI** — Framer Motion animations throughout (page transitions, zone changes, card reveals)

## Local Setup

```bash
# Clone the repo
git clone https://github.com/muntasirhossain2003/AuraWork.git
cd AuraWork

# Server setup
cd server
cp .env.example .env    # fill in your keys
npm install
npm run dev             # runs on port 5000

# Client setup (new terminal)
cd client
cp .env.example .env    # fill in VITE_ keys
npm install
npm run dev             # runs on port 5173
```

## Environment Variables

**Server** (`server/.env`):
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
JWT_SECRET=
PORT=5000
ALLOWED_ORIGIN=http://localhost:5173
```

**Client** (`client/.env`):
```
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Database

Run `server/db/schema.sql` in your Supabase SQL editor to create all tables.
Enable Realtime on the `presence` table in Supabase dashboard.
