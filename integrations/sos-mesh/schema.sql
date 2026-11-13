CREATE TABLE IF NOT EXISTS mesh_tokens (
  jti_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  google_sub TEXT NOT NULL,
  email TEXT NOT NULL,
  scopes TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  rotated_to TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mesh_tokens_subject ON mesh_tokens(subject, expires_at);
CREATE TABLE IF NOT EXISTS mesh_jobs (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  envelope TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','claimed','completed','failed')),
  created_at INTEGER NOT NULL,
  claimed_at INTEGER,
  completed_at INTEGER,
  result TEXT
);
CREATE INDEX IF NOT EXISTS mesh_jobs_queue ON mesh_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS mesh_jobs_subject ON mesh_jobs(subject, created_at);
CREATE TABLE IF NOT EXISTS mesh_nonces (
  nonce_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mesh_nonces_expiry ON mesh_nonces(expires_at);
CREATE TABLE IF NOT EXISTS mesh_audit (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  subject TEXT,
  outcome TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mesh_audit_created ON mesh_audit(created_at);
CREATE TABLE IF NOT EXISTS mesh_rate (
  rate_key TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  hits INTEGER NOT NULL,
  PRIMARY KEY(rate_key, bucket)
);
