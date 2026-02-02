ALTER TABLE courts
DROP COLUMN rtsp_username,
DROP COLUMN rtsp_password_encrypted,
DROP COLUMN camera_port,
ADD COLUMN stream_key VARCHAR(100) NOT NULL UNIQUE;
