-- AuraWork Database Schema
-- Run this in your Supabase SQL editor

-- Workspaces (teams share a workspace)
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT UNIQUE NOT NULL,  -- invite code for teammates
  created_at  TIMESTAMP DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password      TEXT NOT NULL,
  name          TEXT,
  avatar_url    TEXT,
  workspace_id  UUID REFERENCES workspaces(id),
  created_at    TIMESTAMP DEFAULT now()
);

-- Work Zones (geographic boundaries)
CREATE TABLE IF NOT EXISTS zones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  latitude      FLOAT NOT NULL,
  longitude     FLOAT NOT NULL,
  radius_m      INTEGER DEFAULT 200,
  zone_type     TEXT CHECK(zone_type IN ('home','office','cafe','client','other')),
  focus_hours   TEXT,
  availability  TEXT,
  task_types    TEXT[],
  created_at    TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zones_user_id ON zones(user_id);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  priority    TEXT CHECK(priority IN ('high','medium','low')) DEFAULT 'medium',
  status      TEXT CHECK(status IN ('pending','done','deferred')) DEFAULT 'pending',
  due_date    DATE,
  created_at  TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Work Sessions (each zone visit)
CREATE TABLE IF NOT EXISTS sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  zone_id           UUID REFERENCES zones(id),
  entered_at        TIMESTAMP NOT NULL,
  exited_at         TIMESTAMP,
  tasks_completed   INTEGER DEFAULT 0,
  tasks_total       INTEGER DEFAULT 0,
  handoff_note      TEXT,
  created_at        TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Live Presence (one row per user, upserted on zone change)
CREATE TABLE IF NOT EXISTS presence (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  zone_id       UUID REFERENCES zones(id),
  zone_name     TEXT,
  zone_type     TEXT,
  status_label  TEXT,
  updated_at    TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_presence_user_id ON presence(user_id);

-- Enable Supabase Realtime on presence table
ALTER TABLE presence REPLICA IDENTITY FULL;
