// Schema PostgreSQL — CREATE TABLE IF NOT EXISTS para cada tabla
const PG_SCHEMA = [
`CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL, role TEXT DEFAULT 'viewer', avatar TEXT,
  google_id TEXT, username TEXT, is_active INTEGER DEFAULT 1,
  tournament_id BIGINT, created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS tournaments (
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  description TEXT, logo TEXT, banner TEXT,
  primary_color TEXT DEFAULT '#00C2FF', secondary_color TEXT DEFAULT '#00FF95',
  location TEXT, start_date TEXT, end_date TEXT, rules_pdf TEXT,
  modality TEXT DEFAULT 'copa', created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL, gender TEXT DEFAULT 'varonil', group_name TEXT DEFAULT 'libre',
  order_index INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, name))`,

`CREATE TABLE IF NOT EXISTS phases (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE, name TEXT NOT NULL,
  type TEXT DEFAULT 'league', order_index INTEGER DEFAULT 0, is_active INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS rounds (
  id BIGSERIAL PRIMARY KEY, phase_id BIGINT NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL, order_index INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS phase_groups (
  id BIGSERIAL PRIMARY KEY, phase_id BIGINT NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL, order_index INTEGER DEFAULT 0, advance_count INTEGER DEFAULT 2)`,

`CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL, logo TEXT, coach TEXT, captain TEXT, description TEXT,
  inscription_id BIGINT, created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS phase_group_teams (
  group_id BIGINT NOT NULL REFERENCES phase_groups(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, team_id))`,

`CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY, team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL, photo TEXT, number INTEGER, position TEXT,
  goals INTEGER DEFAULT 0, assists INTEGER DEFAULT 0, yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0, minutes_played INTEGER DEFAULT 0, matches_played INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  phase_id BIGINT REFERENCES phases(id) ON DELETE SET NULL,
  round_id BIGINT REFERENCES rounds(id) ON DELETE SET NULL,
  group_id BIGINT REFERENCES phase_groups(id),
  home_team BIGINT NOT NULL REFERENCES teams(id), away_team BIGINT NOT NULL REFERENCES teams(id),
  home_score INTEGER DEFAULT 0, away_score INTEGER DEFAULT 0,
  date TEXT, location TEXT, status TEXT DEFAULT 'scheduled', match_notes TEXT, stream_id BIGINT,
  bracket_slot INTEGER, next_match_id BIGINT, home_is_tbd INTEGER DEFAULT 0, away_is_tbd INTEGER DEFAULT 0,
  referee_id BIGINT REFERENCES users(id) ON DELETE SET NULL, started_at TEXT, finished_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS match_events (
  id BIGSERIAL PRIMARY KEY, match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  type TEXT NOT NULL, player_id BIGINT REFERENCES players(id) ON DELETE SET NULL,
  team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
  minute INTEGER, second INTEGER DEFAULT 0, note TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS standings (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  phase_id BIGINT REFERENCES phases(id) ON DELETE CASCADE,
  group_id BIGINT REFERENCES phase_groups(id),
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  played INTEGER DEFAULT 0, won INTEGER DEFAULT 0, drawn INTEGER DEFAULT 0, lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0, goals_against INTEGER DEFAULT 0, points INTEGER DEFAULT 0)`,

`CREATE TABLE IF NOT EXISTS streams (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  match_id BIGINT REFERENCES matches(id) ON DELETE SET NULL,
  platform TEXT, title TEXT, url TEXT NOT NULL, thumbnail TEXT, is_live INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS galleries (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT, cover TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS gallery_images (
  id BIGSERIAL PRIMARY KEY, gallery_id BIGINT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL, description TEXT)`,

`CREATE TABLE IF NOT EXISTS news (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT REFERENCES tournaments(id) ON DELETE CASCADE,
  title TEXT NOT NULL, content TEXT, cover TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS sponsors (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL, logo TEXT, url TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS banners (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT REFERENCES tournaments(id) ON DELETE CASCADE,
  position TEXT NOT NULL, image_url TEXT NOT NULL, link_url TEXT, alt_text TEXT,
  starts_at TEXT, ends_at TEXT, is_active INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS inscriptions (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  team_name TEXT NOT NULL, contact_name TEXT NOT NULL, contact_email TEXT NOT NULL,
  contact_phone TEXT, players_count INTEGER DEFAULT 0, notes TEXT,
  status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS inscription_players (
  id BIGSERIAL PRIMARY KEY, inscription_id BIGINT NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
  name TEXT NOT NULL, number INTEGER, position TEXT, birth_date TEXT)`,

`CREATE TABLE IF NOT EXISTS awards (
  id BIGSERIAL PRIMARY KEY, tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  phase_id BIGINT REFERENCES phases(id) ON DELETE SET NULL, type TEXT NOT NULL,
  player_id BIGINT REFERENCES players(id) ON DELETE SET NULL,
  team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
  description TEXT, auto_generated INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS team_follows (
  endpoint TEXT NOT NULL, team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY (endpoint, team_id))`,

`CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY, endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL, auth TEXT NOT NULL, user_agent TEXT,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ DEFAULT NOW())`,

`CREATE TABLE IF NOT EXISTS admin_requests (
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
  phone TEXT, org TEXT, message TEXT, status TEXT DEFAULT 'pending',
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`
]

// Migraciones: columnas añadidas después del deploy inicial.
// ADD COLUMN IF NOT EXISTS es idempotente — no falla si ya existe.
const PG_MIGRATIONS = [
  `ALTER TABLE phases  ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 0`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS bracket_slot  INTEGER`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS next_match_id BIGINT`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_is_tbd   INTEGER DEFAULT 0`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_is_tbd   INTEGER DEFAULT 0`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS started_at    TEXT`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS finished_at   TEXT`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_notes   TEXT`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS stream_id     BIGINT`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS referee_id    BIGINT REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS reminder_sent INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS minutes_played  INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS matches_played  INTEGER DEFAULT 0`,
  `ALTER TABLE teams   ADD COLUMN IF NOT EXISTS inscription_id BIGINT`,
  `ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS categories_json TEXT`,
  `ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS logo TEXT`,
  `ALTER TABLE users   ADD COLUMN IF NOT EXISTS google_id TEXT`,
  `ALTER TABLE users   ADD COLUMN IF NOT EXISTS username  TEXT`,
  `ALTER TABLE users   ADD COLUMN IF NOT EXISTS tournament_id BIGINT`,
  `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS rules_pdf TEXT`,
  `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'copa'`,
  // Portada de patrocinadores — imagen fija arriba del feed de la pestaña Media
  `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS sponsors_banner TEXT`,
  // Redes sociales del torneo — se muestran del lado del aficionado (ej. debajo del banner de patrocinadores en Media)
  `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS social_facebook TEXT`,
  `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS social_instagram TEXT`,
  `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS social_tiktok TEXT`,
  `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS social_youtube TEXT`,
  `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS social_whatsapp TEXT`,
  // Token para el link privado de "rol de juegos" compartido con delegados
  `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS schedule_share_token TEXT`,
  // CURP & auto-approve features
  `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS auto_approve_inscriptions INTEGER DEFAULT 0`,
  `ALTER TABLE categories ADD COLUMN IF NOT EXISTS min_birth_year INTEGER`,
  `ALTER TABLE categories ADD COLUMN IF NOT EXISTS max_birth_year INTEGER`,
  `ALTER TABLE categories ADD COLUMN IF NOT EXISTS min_birth_year_girls INTEGER`,
  `ALTER TABLE inscription_players ADD COLUMN IF NOT EXISTS curp TEXT`,
  `ALTER TABLE inscription_players ADD COLUMN IF NOT EXISTS category_id BIGINT`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS curp TEXT`,
  `ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS registration_token TEXT`,
  `ALTER TABLE categories ADD COLUMN IF NOT EXISTS max_players_per_team INTEGER`,
  `ALTER TABLE inscription_players ADD COLUMN IF NOT EXISTS photo TEXT`,
  `ALTER TABLE inscription_players ADD COLUMN IF NOT EXISTS documento_oficial TEXT`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS documento_oficial TEXT`,
  // Responsables por categoría en inscripción
  `CREATE TABLE IF NOT EXISTS inscription_responsables (
    id BIGSERIAL PRIMARY KEY,
    inscription_id BIGINT NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
    category_id    BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    nombre         TEXT NOT NULL,
    apellidos      TEXT NOT NULL,
    curp           TEXT,
    foto           TEXT,
    orden          INTEGER DEFAULT 1,
    created_at     TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS tournament_follows (
    endpoint      TEXT NOT NULL,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (endpoint, tournament_id)
  )`,
  // Follows atados a la cuenta (user_id), no al dispositivo — persisten entre sesiones/dispositivos
  `CREATE TABLE IF NOT EXISTS user_team_follows (
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id    BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, team_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_tournament_follows (
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, tournament_id)
  )`,
  // Seguir jugadores individuales — mismo patrón de dos capas que equipos/torneos
  `CREATE TABLE IF NOT EXISTS player_follows (
    endpoint  TEXT NOT NULL,
    player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (endpoint, player_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_player_follows (
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_id  BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, player_id)
  )`,
  // Reacciones rápidas a partidos — voter_id es un id anónimo de dispositivo
  // (localStorage, ver src/utils/anon.js), no requiere cuenta ni push.
  `CREATE TABLE IF NOT EXISTS match_reactions (
    id BIGSERIAL PRIMARY KEY,
    match_id  BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    emoji     TEXT NOT NULL,
    voter_id  TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, emoji, voter_id)
  )`,
  // Contador de vistas en noticias y galerías
  `ALTER TABLE news ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0`,
  `ALTER TABLE galleries ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0`,
  // Vincula un dispositivo (endpoint, aunque nunca haya activado push) con la
  // cuenta con la que se logueó en ese dispositivo — evita que el conteo de
  // seguidores cuente 2 veces a la misma persona (fila por-dispositivo +
  // fila por-cuenta) cuando push_subscriptions no tiene ese endpoint.
  `CREATE TABLE IF NOT EXISTS device_accounts (
    endpoint TEXT PRIMARY KEY,
    user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  // Distingue a cuál de los (posiblemente varios) equipos de una misma
  // categoría, dentro de una misma inscripción, pertenece cada jugador
  // propuesto — permite que un club inscriba "Club X A" y "Club X B" en la
  // misma categoría desde un solo formulario. Backfill abajo para que las
  // filas viejas (una sola categoría = un solo equipo) queden con un valor
  // no-NULL y el índice único de dorsal (uq_inscplayers_insc_cat_number)
  // siga detectando duplicados en esas filas — NULL nunca choca consigo
  // mismo en un índice único, así que dejar NULL rompería esa protección.
  `ALTER TABLE inscription_players ADD COLUMN IF NOT EXISTS team_name TEXT`,
  `UPDATE inscription_players SET team_name = (SELECT team_name FROM inscriptions WHERE id = inscription_players.inscription_id) WHERE team_name IS NULL`,
  // Identidad de club estable — evita que admin/Teams.vue fusione equipos NO
  // relacionados que coinciden por nombre (ver repair-team-inscriptions.js,
  // que rellena esta columna en equipos ya existentes).
  `ALTER TABLE teams ADD COLUMN IF NOT EXISTS club_key TEXT`,
]

module.exports = { PG_SCHEMA, PG_MIGRATIONS }
