CREATE TABLE IF NOT EXISTS video_deletion_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL UNIQUE,
  video_id INT NULL,
  court_id INT NULL,
  club_id INT NULL,
  b2_file_path VARCHAR(500) NOT NULL UNIQUE,
  status ENUM('pending', 'in_progress', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  attempts_count INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  locked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
