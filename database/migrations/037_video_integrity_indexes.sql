-- Preflight in migrate.ts aborts if duplicates exist before this file runs.
ALTER TABLE videos
  ADD UNIQUE KEY uq_videos_b2_file_path (b2_file_path),
  ADD UNIQUE KEY uq_videos_court_file (court_id, file_name),
  ADD INDEX idx_videos_overlap (court_id, start_time, end_time, status, expires_at);
