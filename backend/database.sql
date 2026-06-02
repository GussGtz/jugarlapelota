-- ============================================================
-- JugarLaPelota — Esquema de Base de Datos MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS jugarlapelota CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jugarlapelota;

-- USERS
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('admin','editor','viewer') DEFAULT 'viewer',
  avatar     VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TOURNAMENTS
CREATE TABLE tournaments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  slug            VARCHAR(100) NOT NULL UNIQUE,
  description     TEXT,
  logo            VARCHAR(500),
  banner          VARCHAR(500),
  primary_color   VARCHAR(7) DEFAULT '#00C2FF',
  secondary_color VARCHAR(7) DEFAULT '#00FF95',
  location        VARCHAR(200),
  start_date      DATE,
  end_date        DATE,
  rules_pdf       VARCHAR(500),
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TEAMS
CREATE TABLE teams (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  logo          VARCHAR(500),
  coach         VARCHAR(100),
  captain       VARCHAR(100),
  description   TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PLAYERS
CREATE TABLE players (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  team_id      INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  photo        VARCHAR(500),
  number       TINYINT UNSIGNED,
  position     VARCHAR(50),
  goals        SMALLINT DEFAULT 0,
  assists      SMALLINT DEFAULT 0,
  yellow_cards TINYINT DEFAULT 0,
  red_cards    TINYINT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MATCHES
CREATE TABLE matches (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  home_team     INT NOT NULL REFERENCES teams(id),
  away_team     INT NOT NULL REFERENCES teams(id),
  home_score    TINYINT DEFAULT 0,
  away_score    TINYINT DEFAULT 0,
  date          DATETIME,
  location      VARCHAR(200),
  status        ENUM('scheduled','live','finished') DEFAULT 'scheduled',
  stream_id     INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STANDINGS (auto-calculated)
CREATE TABLE standings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id       INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  played        SMALLINT DEFAULT 0,
  won           SMALLINT DEFAULT 0,
  drawn         SMALLINT DEFAULT 0,
  lost          SMALLINT DEFAULT 0,
  goals_for     SMALLINT DEFAULT 0,
  goals_against SMALLINT DEFAULT 0,
  points        SMALLINT DEFAULT 0,
  UNIQUE KEY unique_standing (tournament_id, team_id)
);

-- STREAMS
CREATE TABLE streams (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id      INT REFERENCES matches(id) ON DELETE SET NULL,
  platform      VARCHAR(50),
  title         VARCHAR(200),
  url           VARCHAR(1000) NOT NULL,
  thumbnail     VARCHAR(500),
  is_live       TINYINT(1) DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GALLERIES
CREATE TABLE galleries (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
  title         VARCHAR(150),
  cover         VARCHAR(500),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GALLERY_IMAGES
CREATE TABLE gallery_images (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  gallery_id  INT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  image_url   VARCHAR(500) NOT NULL,
  description VARCHAR(300)
);

-- NEWS
CREATE TABLE news (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
  title         VARCHAR(250) NOT NULL,
  content       LONGTEXT,
  cover         VARCHAR(500),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SPONSORS
CREATE TABLE sponsors (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  logo          VARCHAR(500),
  url           VARCHAR(500),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Seed: admin user ──────────────────────────────────────
-- password: Admin1234! (bcrypt hash)
INSERT INTO users (name, email, password, role)
VALUES ('Administrador', 'admin@jugarlapelota.com',
  '$2a$10$rBV2JDeWW3.vKm4U5U5yDOzHiJRklXPxYC3Lk9KQmZv1GtTuK.bmy', 'admin');
