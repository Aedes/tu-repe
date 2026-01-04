CREATE TABLE IF NOT EXISTS failed_uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  club_id INT NOT NULL,
  court_id INT NOT NULL,
  error_message TEXT,
  attempts_count INT DEFAULT 0,
  last_attempt_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'retrying', 'failed_permanently') DEFAULT 'pending',
  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
);

