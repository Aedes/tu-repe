CREATE TABLE IF NOT EXISTS appointment_video_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL UNIQUE,
  court_id INT NOT NULL,
  club_id INT NOT NULL,
  appointment_start DATETIME NOT NULL,
  appointment_end DATETIME NOT NULL,
  cache_key CHAR(64) NOT NULL UNIQUE,
  source_video_ids JSON NOT NULL,
  source_count INT NOT NULL,
  b2_file_path VARCHAR(500) NULL UNIQUE,
  status ENUM('pending', 'processing', 'completed', 'retrying', 'failed_permanently', 'deleting', 'deleted') NOT NULL DEFAULT 'pending',
  processing_step ENUM('downloading', 'validating', 'concatenating', 'uploading') NULL,
  attempts_count INT NOT NULL DEFAULT 0,
  error_code VARCHAR(64) NULL,
  error_message TEXT NULL,
  locked_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_appointment_video_jobs_status_created (status, created_at),
  INDEX idx_appointment_video_jobs_expires (status, expires_at),
  CONSTRAINT fk_appointment_video_jobs_court FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointment_video_jobs_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

ALTER TABLE video_deletion_jobs
  ADD COLUMN appointment_video_job_id INT NULL,
  ADD CONSTRAINT fk_deletion_appointment_video_job
    FOREIGN KEY (appointment_video_job_id) REFERENCES appointment_video_jobs(id) ON DELETE SET NULL;
