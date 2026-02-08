ALTER TABLE users
MODIFY public_id CHAR(36) NOT NULL,
ADD UNIQUE KEY uq_users_public_id (public_id);