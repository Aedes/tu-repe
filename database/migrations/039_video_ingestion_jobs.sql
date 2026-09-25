CREATE TABLE IF NOT EXISTS video_ingestion_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL UNIQUE,
  file_path VARCHAR(500) NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  club_id INT NOT NULL,
  court_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  b2_file_path VARCHAR(500) NULL UNIQUE,
  status ENUM('pending', 'uploading', 'uploaded', 'completed', 'retrying', 'failed_permanently') NOT NULL DEFAULT 'pending',
  attempts_count INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  locked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id),
  FOREIGN KEY (court_id) REFERENCES courts(id)
);
