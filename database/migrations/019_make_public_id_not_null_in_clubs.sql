ALTER TABLE clubs
MODIFY public_id CHAR(36) NOT NULL,
ADD UNIQUE KEY uq_clubs_public_id (public_id);