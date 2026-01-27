CREATE TABLE club_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  club_id INT NOT NULL,
  role ENUM('OWNER') NOT NULL DEFAULT 'OWNER',

  UNIQUE KEY unique_user_club (user_id, club_id),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);
