ALTER TABLE failed_uploads
  ADD CONSTRAINT fk_failed_uploads_club
  FOREIGN KEY (club_id) REFERENCES clubs(id);
