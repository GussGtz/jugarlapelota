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

module.exports = { PG_SCHEMA }
