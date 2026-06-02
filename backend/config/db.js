require('dotenv').config()
const bcrypt = require('bcryptjs')

const IS_PG = !!process.env.DATABASE_URL

let _pool = null
let _db   = null

// ── API PostgreSQL (async) ────────────────────────────────────────────────────
async function query(sql, params = []) {
  if (IS_PG) {
    const upper = sql.trimStart().toUpperCase()
    // Para INSERT añadimos RETURNING id si no lo tiene, así lastInsertRowid siempre funciona
    let execSql = sql
    if (upper.startsWith('INSERT') && !upper.includes('RETURNING')) {
      execSql = sql + ' RETURNING id'
    }
    const res = await _pool.query(execSql, params)
    const rawId = res.rows[0]?.id
    const lastInsertRowid = rawId != null ? parseInt(rawId) : null
    return { rows: res.rows, rowCount: res.rowCount, lastInsertRowid }
  } else {
    // SQLite sync envuelto en Promise
    let n = 0
    const sqliteSql = sql.replace(/\$\d+/g, () => '?').replace(/NOW\(\)::text/g, "datetime('now')")
    const stmt = _db.prepare(sqliteSql)
    const upper = sqliteSql.trim().toUpperCase()
    if (upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('PRAGMA')) {
      const rows = stmt.all(...params)
      return { rows, rowCount: rows.length, lastInsertRowid: null }
    } else {
      const r = stmt.run(...params)
      return { rows: r.lastInsertRowid ? [{ id: r.lastInsertRowid }] : [], rowCount: r.changes, lastInsertRowid: r.lastInsertRowid }
    }
  }
}

async function queryOne(sql, params = []) {
  const { rows } = await query(sql, params)
  return rows[0] || null
}

async function exec(sql) {
  if (IS_PG) { await _pool.query(sql) }
  else { _db.exec(sql) }
}

// ── Inicializar ───────────────────────────────────────────────────────────────
async function init() {
  if (IS_PG) {
    const { Pool } = require('pg')
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
    })
    // Crear schema + migraciones idempotentes
    const { PG_SCHEMA, PG_MIGRATIONS } = require('./db-schema')
    for (const stmt of PG_SCHEMA)      await _pool.query(stmt)
    for (const stmt of PG_MIGRATIONS)  await _pool.query(stmt)

    // Seed admin
    const { rows } = await _pool.query("SELECT id FROM users WHERE email='admin@jugarlapelota.com'")
    if (!rows.length) {
      const hash = bcrypt.hashSync('Admin1234!', 10)
      await _pool.query(
        "INSERT INTO users (name,email,password,role,is_active) VALUES ($1,$2,$3,'admin',1)",
        ['Administrador', 'admin@jugarlapelota.com', hash]
      )
      console.log('✅ Admin creado: admin@jugarlapelota.com / Admin1234!')
    }
  } else {
    const Database = require('better-sqlite3')
    const path = require('path'), fs = require('fs')
    const DB_PATH = path.join(__dirname, '..', 'data', 'jugarlapelota.db')
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    require('./db-sqlite-init')(_db, bcrypt)
  }
}

// ── Standings (async) ─────────────────────────────────────────────────────────
async function recalculateStandings(tournamentId, categoryId, phaseId, groupId = null) {
  let sql = `SELECT * FROM matches WHERE tournament_id=$1 AND category_id=$2 AND status='finished'`
  const params = [tournamentId, categoryId]
  if (groupId)    { sql += ' AND group_id=$3';  params.push(groupId) }
  else if (phaseId) { sql += ' AND phase_id=$3'; params.push(phaseId) }
  const { rows: matches } = await query(sql, params)
  const stats = {}
  for (const m of matches) {
    for (const [tid, gf, ga] of [[m.home_team,m.home_score,m.away_score],[m.away_team,m.away_score,m.home_score]]) {
      if (!stats[tid]) stats[tid] = {played:0,won:0,drawn:0,lost:0,gf:0,ga:0,pts:0}
      const s = stats[tid]
      s.played++; s.gf+=gf; s.ga+=ga
      if (gf>ga){s.won++;s.pts+=3} else if(gf===ga){s.drawn++;s.pts++} else s.lost++
    }
  }
  const teamIds = Object.keys(stats)
  if (!teamIds.length) return

  if (groupId) {
    await query('DELETE FROM standings WHERE group_id=$1', [groupId])
    for (const [tid, s] of Object.entries(stats))
      await query('INSERT INTO standings (tournament_id,category_id,phase_id,group_id,team_id,played,won,drawn,lost,goals_for,goals_against,points) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [tournamentId,categoryId,phaseId||null,groupId,tid,s.played,s.won,s.drawn,s.lost,s.gf,s.ga,s.pts])
  } else {
    for (const [tid, s] of Object.entries(stats)) {
      if (phaseId) {
        await query('DELETE FROM standings WHERE tournament_id=$1 AND category_id=$2 AND phase_id=$3 AND team_id=$4 AND group_id IS NULL',[tournamentId,categoryId,phaseId,tid])
        await query('INSERT INTO standings (tournament_id,category_id,phase_id,group_id,team_id,played,won,drawn,lost,goals_for,goals_against,points) VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$8,$9,$10,$11)',
          [tournamentId,categoryId,phaseId,tid,s.played,s.won,s.drawn,s.lost,s.gf,s.ga,s.pts])
      } else {
        await query('DELETE FROM standings WHERE tournament_id=$1 AND category_id=$2 AND phase_id IS NULL AND group_id IS NULL AND team_id=$3',[tournamentId,categoryId,tid])
        await query('INSERT INTO standings (tournament_id,category_id,phase_id,group_id,team_id,played,won,drawn,lost,goals_for,goals_against,points) VALUES ($1,$2,NULL,NULL,$3,$4,$5,$6,$7,$8,$9,$10)',
          [tournamentId,categoryId,tid,s.played,s.won,s.drawn,s.lost,s.gf,s.ga,s.pts])
      }
    }
  }
}

async function recalculateAllStandings(tournamentId) {
  const { rows: combos } = await query(
    "SELECT DISTINCT category_id, phase_id FROM matches WHERE tournament_id=$1 AND category_id IS NOT NULL",[tournamentId])
  for (const {category_id,phase_id} of combos) await recalculateStandings(tournamentId,category_id,phase_id)
  const { rows: gc } = await query(
    `SELECT DISTINCT category_id, phase_id, group_id FROM matches WHERE tournament_id=$1 AND group_id IS NOT NULL AND category_id IS NOT NULL`,[tournamentId])
  for (const {category_id,phase_id,group_id} of gc) await recalculateStandings(tournamentId,category_id,phase_id,group_id)
}

module.exports = { query, queryOne, exec, init, IS_PG, recalculateStandings, recalculateAllStandings }
