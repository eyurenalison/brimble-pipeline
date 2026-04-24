CREATE TABLE IF NOT EXISTS deployments (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  source_type   TEXT NOT NULL CHECK(source_type IN ('git', 'upload')),
  source_ref    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','building','deploying','running','failed')),
  image_tag     TEXT,
  container_id  TEXT,
  url           TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS deployment_logs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id  TEXT NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  level          TEXT NOT NULL DEFAULT 'info' CHECK(level IN ('info','error','system')),
  message        TEXT NOT NULL,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_deployment
  ON deployment_logs(deployment_id, created_at);

