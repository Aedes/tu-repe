ALTER TABLE courts
MODIFY name VARCHAR(50) NOT NULL,
DROP COLUMN rtsp_url,
ADD COLUMN camera_host VARCHAR(255) NOT NULL AFTER name,
ADD COLUMN camera_port INT NOT NULL DEFAULT 554 AFTER camera_host,
ADD COLUMN camera_path VARCHAR(255) NOT NULL AFTER camera_port,
ADD COLUMN rtsp_username VARCHAR(100) NOT NULL AFTER camera_path,
ADD COLUMN rtsp_password_encrypted VARCHAR(255) NOT NULL AFTER rtsp_username;
