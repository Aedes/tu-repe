ALTER TABLE videos
  ADD COLUMN status ENUM('available', 'deleting', 'deleted') NOT NULL DEFAULT 'available',
  ADD COLUMN expires_at DATETIME NULL,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE videos
SET expires_at = DATE_ADD(end_time, INTERVAL 72 HOUR)
WHERE expires_at IS NULL;
