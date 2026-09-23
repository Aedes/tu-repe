CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_name VARCHAR(64) PRIMARY KEY,
  last_seen DATETIME NOT NULL,
  meta JSON NULL
);
