CREATE TABLE IF NOT EXISTS debates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debate_comments (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  reply_to TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS debate_comments_debate_id_idx
  ON debate_comments (debate_id, created_at);

CREATE TABLE IF NOT EXISTS debate_reports (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS debate_reports_debate_id_idx
  ON debate_reports (debate_id, created_at);