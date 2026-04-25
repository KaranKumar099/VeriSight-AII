CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS behavior_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_behavior_logs_user_time ON behavior_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_type ON behavior_logs(event_type);

CREATE TABLE IF NOT EXISTS risk_scores (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  level TEXT NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  anomaly JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
