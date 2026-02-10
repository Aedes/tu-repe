ALTER TABLE videos
MODIFY public_id CHAR(36) NOT NULL,
ADD UNIQUE KEY uq_videos_public_id (public_id);