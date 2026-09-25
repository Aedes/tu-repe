INSERT INTO video_ingestion_jobs
  (public_id, file_path, file_name, club_id, court_id, start_time, end_time, status, attempts_count, error_message)
SELECT
  public_id,
  file_path,
  file_name,
  club_id,
  court_id,
  DATE_SUB(end_time, INTERVAL 15 MINUTE),
  end_time,
  CASE
    WHEN status = 'failed_permanently' THEN 'failed_permanently'
    WHEN status = 'retrying' THEN 'retrying'
    ELSE 'pending'
  END,
  attempts_count,
  error_message
FROM failed_uploads
ON DUPLICATE KEY UPDATE file_name = VALUES(file_name);
