ALTER TABLE clubs
ADD COLUMN public_id CHAR(36);

UPDATE clubs SET public_id = UUID() WHERE public_id IS NULL;

ALTER TABLE clubs
MODIFY public_id CHAR(36) NOT NULL,
ADD UNIQUE KEY uq_clubs_public_id (public_id);

ALTER TABLE courts
ADD COLUMN public_id CHAR(36);

UPDATE courts SET public_id = UUID() WHERE public_id IS NULL;

ALTER TABLE courts
MODIFY public_id CHAR(36) NOT NULL,
ADD UNIQUE KEY uq_courts_public_id (public_id);

ALTER TABLE videos
ADD COLUMN public_id CHAR(36);

UPDATE videos SET public_id = UUID() WHERE public_id IS NULL;

ALTER TABLE videos
MODIFY public_id CHAR(36) NOT NULL,
ADD UNIQUE KEY uq_videos_public_id (public_id);

ALTER TABLE users
ADD COLUMN public_id CHAR(36);

UPDATE users SET public_id = UUID() WHERE public_id IS NULL;

ALTER TABLE users
MODIFY public_id CHAR(36) NOT NULL,
ADD UNIQUE KEY uq_users_public_id (public_id);

ALTER TABLE failed_uploads
ADD COLUMN public_id CHAR(36);

UPDATE failed_uploads SET public_id = UUID() WHERE public_id IS NULL;

ALTER TABLE failed_uploads
MODIFY public_id CHAR(36) NOT NULL,
ADD UNIQUE KEY uq_failed_uploads_public_id (public_id);
