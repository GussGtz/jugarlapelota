// Inicialización SQLite para desarrollo local
module.exports = function initSQLite(db, bcrypt) {

  // Migrations idempotentes
  const safe = (sql) => { try { db.exec(sql) } catch (_) {} }
  safe('ALTER TABLE matches ADD COLUMN bracket_slot INTEGER')
  safe('ALTER TABLE matches ADD COLUMN next_match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL')
  safe('ALTER TABLE matches ADD COLUMN group_id INTEGER REFERENCES phase_groups(id)')
  safe('ALTER TABLE standings ADD COLUMN group_id INTEGER REFERENCES phase_groups(id)')
  safe('ALTER TABLE galleries ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL')
  safe("ALTER TABLE tournaments ADD COLUMN modality TEXT DEFAULT 'copa'")
  safe('ALTER TABLE users ADD COLUMN google_id TEXT')
  safe('ALTER TABLE users ADD COLUMN avatar TEXT')
  safe('ALTER TABLE push_subscriptions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL')
  safe('ALTER TABLE teams ADD COLUMN inscription_id INTEGER REFERENCES inscriptions(id) ON DELETE SET NULL')
  safe('ALTER TABLE matches ADD COLUMN started_at TEXT')
  safe('ALTER TABLE match_events ADD COLUMN second INTEGER DEFAULT 0')
  safe('ALTER TABLE matches ADD COLUMN referee_id INTEGER REFERENCES users(id) ON DELETE SET NULL')
  safe('ALTER TABLE matches ADD COLUMN finished_at TEXT')
  safe('ALTER TABLE users ADD COLUMN username TEXT')
  safe("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1")
  safe('ALTER TABLE users ADD COLUMN tournament_id INTEGER REFERENCES tournaments(id) ON DELETE SET NULL')
  safe('ALTER TABLE awards ADD COLUMN auto_generated INTEGER DEFAULT 0')
  safe('ALTER TABLE matches ADD COLUMN home_is_tbd INTEGER DEFAULT 0')
  safe('ALTER TABLE matches ADD COLUMN away_is_tbd INTEGER DEFAULT 0')
  safe('ALTER TABLE tournaments ADD COLUMN sponsors_banner TEXT')
  // Paridad con PG_MIGRATIONS (backend/config/db-schema.js) — columnas que faltaban en SQLite
  safe('ALTER TABLE phases ADD COLUMN is_active INTEGER DEFAULT 0')
  safe('ALTER TABLE matches ADD COLUMN match_notes TEXT')
  safe('ALTER TABLE matches ADD COLUMN stream_id INTEGER REFERENCES streams(id) ON DELETE SET NULL')
  safe('ALTER TABLE matches ADD COLUMN reminder_sent INTEGER DEFAULT 0')
  safe('ALTER TABLE players ADD COLUMN minutes_played INTEGER DEFAULT 0')
  safe('ALTER TABLE players ADD COLUMN matches_played INTEGER DEFAULT 0')
  safe('ALTER TABLE inscriptions ADD COLUMN categories_json TEXT')
  safe('ALTER TABLE inscriptions ADD COLUMN logo TEXT')
  safe('ALTER TABLE tournaments ADD COLUMN rules_pdf TEXT')
  safe('ALTER TABLE tournaments ADD COLUMN auto_approve_inscriptions INTEGER DEFAULT 0')
  safe('ALTER TABLE categories ADD COLUMN min_birth_year INTEGER')
  safe('ALTER TABLE categories ADD COLUMN max_birth_year INTEGER')
  safe('ALTER TABLE categories ADD COLUMN min_birth_year_girls INTEGER')
  safe('ALTER TABLE categories ADD COLUMN max_players_per_team INTEGER')
  safe('ALTER TABLE inscription_players ADD COLUMN curp TEXT')
  safe('ALTER TABLE inscription_players ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL')
  safe('ALTER TABLE inscription_players ADD COLUMN photo TEXT')
  safe('ALTER TABLE inscription_players ADD COLUMN documento_oficial TEXT')
  safe('ALTER TABLE players ADD COLUMN curp TEXT')
  safe('ALTER TABLE players ADD COLUMN documento_oficial TEXT')
  safe('ALTER TABLE inscriptions ADD COLUMN registration_token TEXT')
  safe('ALTER TABLE news ADD COLUMN view_count INTEGER DEFAULT 0')
  safe('ALTER TABLE galleries ADD COLUMN view_count INTEGER DEFAULT 0')

  db.exec(`
    CREATE TABLE IF NOT EXISTS phase_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
      name TEXT NOT NULL, order_index INTEGER DEFAULT 0, advance_count INTEGER DEFAULT 2
    );
    CREATE TABLE IF NOT EXISTS phase_group_teams (
      group_id INTEGER NOT NULL REFERENCES phase_groups(id) ON DELETE CASCADE,
      team_id  INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      PRIMARY KEY (group_id, team_id)
    );
    CREATE TABLE IF NOT EXISTS team_follows (
      endpoint TEXT NOT NULL, team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (endpoint, team_id)
    );
    CREATE TABLE IF NOT EXISTS tournament_follows (
      endpoint TEXT NOT NULL, tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (endpoint, tournament_id)
    );
    CREATE TABLE IF NOT EXISTS user_team_follows (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (user_id, team_id)
    );
    CREATE TABLE IF NOT EXISTS user_tournament_follows (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (user_id, tournament_id)
    );
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL, auth TEXT NOT NULL, user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS device_accounts (
      endpoint TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL, role TEXT DEFAULT 'viewer', avatar TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      description TEXT, logo TEXT, banner TEXT,
      primary_color TEXT DEFAULT '#00C2FF', secondary_color TEXT DEFAULT '#00FF95',
      location TEXT, start_date TEXT, end_date TEXT, rules_pdf TEXT,
      created_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      name TEXT NOT NULL, gender TEXT DEFAULT 'varonil',
      group_name TEXT DEFAULT 'libre', order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')), UNIQUE(tournament_id, name)
    );
    CREATE TABLE IF NOT EXISTS phases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL, type TEXT DEFAULT 'league', order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
      name TEXT NOT NULL, order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL, logo TEXT, coach TEXT, captain TEXT, description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      name TEXT NOT NULL, photo TEXT, number INTEGER, position TEXT,
      goals INTEGER DEFAULT 0, assists INTEGER DEFAULT 0,
      yellow_cards INTEGER DEFAULT 0, red_cards INTEGER DEFAULT 0,
      minutes_played INTEGER DEFAULT 0, matches_played INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      phase_id INTEGER REFERENCES phases(id) ON DELETE SET NULL,
      round_id INTEGER REFERENCES rounds(id) ON DELETE SET NULL,
      home_team INTEGER NOT NULL REFERENCES teams(id),
      away_team INTEGER NOT NULL REFERENCES teams(id),
      home_score INTEGER DEFAULT 0, away_score INTEGER DEFAULT 0,
      date TEXT, location TEXT, status TEXT DEFAULT 'scheduled', match_notes TEXT, stream_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS standings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      phase_id INTEGER REFERENCES phases(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      played INTEGER DEFAULT 0, won INTEGER DEFAULT 0, drawn INTEGER DEFAULT 0, lost INTEGER DEFAULT 0,
      goals_for INTEGER DEFAULT 0, goals_against INTEGER DEFAULT 0, points INTEGER DEFAULT 0,
      UNIQUE(tournament_id, category_id, phase_id, team_id)
    );
    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL,
      platform TEXT, title TEXT, url TEXT NOT NULL, thumbnail TEXT, is_live INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS galleries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
      title TEXT, cover TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gallery_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gallery_id INTEGER NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL, description TEXT
    );
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
      title TEXT NOT NULL, content TEXT, cover TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sponsors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
      name TEXT NOT NULL, logo TEXT, url TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
      position TEXT NOT NULL, image_url TEXT NOT NULL, link_url TEXT, alt_text TEXT,
      starts_at TEXT, ends_at TEXT, is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS inscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      team_name TEXT NOT NULL, contact_name TEXT NOT NULL, contact_email TEXT NOT NULL,
      contact_phone TEXT, players_count INTEGER DEFAULT 0, notes TEXT,
      status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS inscription_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscription_id INTEGER NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
      name TEXT NOT NULL, number INTEGER, position TEXT, birth_date TEXT
    );
    CREATE TABLE IF NOT EXISTS inscription_responsables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscription_id INTEGER NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
      category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      nombre         TEXT NOT NULL,
      apellidos      TEXT NOT NULL,
      curp           TEXT,
      foto           TEXT,
      orden          INTEGER DEFAULT 1,
      created_at     TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      phase_id INTEGER REFERENCES phases(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
      team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
      description TEXT, auto_generated INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS match_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
      team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
      minute INTEGER, note TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS admin_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
      org TEXT, message TEXT, status TEXT DEFAULT 'pending', notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS player_follows (
      endpoint TEXT NOT NULL, player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (endpoint, player_id)
    );
    CREATE TABLE IF NOT EXISTS user_player_follows (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (user_id, player_id)
    );
    CREATE TABLE IF NOT EXISTS match_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL, voter_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')), UNIQUE(match_id, emoji, voter_id)
    );
  `)

  // Seed admin
  const adminExists = db.prepare("SELECT id FROM users WHERE email='admin@jugarlapelota.com'").get()
  if (!adminExists) {
    db.prepare("INSERT INTO users (name,email,password,role) VALUES (?,?,?,'admin')")
      .run('Administrador', 'admin@jugarlapelota.com', bcrypt.hashSync('Admin1234!', 10))
    console.log('✅ Admin: admin@jugarlapelota.com / Admin1234!')
  }
}
