ALTER TABLE failed_uploads
MODIFY public_id CHAR(36) NOT NULL,
ADD UNIQUE KEY uq_failed_uploads_public_id (public_id);