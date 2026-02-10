ALTER TABLE courts
MODIFY public_id CHAR(36) NOT NULL,
ADD UNIQUE KEY uq_courts_public_id (public_id);