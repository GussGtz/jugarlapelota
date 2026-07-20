require('dotenv').config()
const bcrypt = require('bcryptjs')

const IS_PG = !!process.env.DATABASE_URL

let _pool = null
let _db   = null

// ── API PostgreSQL (async) ────────────────────────────────────────────────────
async function query(sql, params = []) {
  if (IS_PG) {
    const upper = sql.trimStart().toUpperCase()
    const needsId = upper.startsWith('INSERT') && !upper.includes('RETURNING')
    const execSql = needsId ? sql + ' RETURNING id' : sql
    try {
      const res = await _pool.query(execSql, params)
      const rawId = res.rows[0]?.id
      const lastInsertRowid = rawId != null ? parseInt(rawId) : null
      return { rows: res.rows, rowCount: res.rowCount, lastInsertRowid }
    } catch (e) {
      // Tablas sin columna id (junction tables): reintentar sin RETURNING
      if (needsId && e.code === '42703') {
        const res = await _pool.query(sql, params)
        return { rows: res.rows, rowCount: res.rowCount, lastInsertRowid: null }
      }
      throw e
    }
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

// ── Transacciones reales ──────────────────────────────────────────────────────
// Necesario para operaciones que hacen DELETE + varios INSERT que deben
// aplicarse todos juntos o ninguno — sin esto, dos requests concurrentes para
// la misma fase (ej. un doble clic/doble-tap del admin) podían pisarse entre
// sí a medio camino y dejar un estado parcial (un grupo vacío + un error de
// "registro duplicado" al chocar con la llave primaria de phase_group_teams).
// En Postgres se usa un client dedicado del pool (no el pool mismo, que
// reparte cada query a una conexión distinta) con BEGIN/COMMIT/ROLLBACK reales
// — así Postgres serializa cualquier segunda transacción concurrente sobre las
// mismas filas en vez de dejarlas correr en paralelo. En SQLite no hace falta
// una serialización real (better-sqlite3 es síncrono: cada operación bloquea
// el hilo único de Node, así que dos "requests" nunca pueden interleavear de
// verdad), pero se envuelve igual en BEGIN/COMMIT/ROLLBACK por atomicidad.
async function withTransaction(fn) {
  if (IS_PG) {
    const client = await _pool.connect()
    try {
      await client.query('BEGIN')
      // A diferencia de query() suelto (auto-commit por consulta: un error en
      // un intento especulativo no afecta a las demás consultas), aquí SÍ
      // estamos dentro de una transacción real — intentar adivinar solo con
      // "RETURNING id" y reintentar sin él si falla (como hace query() para
      // tablas de unión sin columna id, ej. phase_group_teams) NO funciona:
      // en Postgres, CUALQUIER error dentro de una transacción la marca como
      // abortada, y hasta el reintento "correcto" fallaría con "current
      // transaction is aborted...". Por eso aquí NO se adivina: cada INSERT
      // debe pedir "RETURNING id" explícitamente en su propio SQL si necesita
      // el id de vuelta (ver insGroup/insRound en groups/generate).
      const txQuery = async (sql, params = []) => {
        const res = await client.query(sql, params)
        const rawId = res.rows[0]?.id
        return { rows: res.rows, rowCount: res.rowCount, lastInsertRowid: rawId != null ? parseInt(rawId) : null }
      }
      const txQueryOne = async (sql, params = []) => (await txQuery(sql, params)).rows[0] || null
      const result = await fn({ query: txQuery, queryOne: txQueryOne })
      await client.query('COMMIT')
      return result
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      throw e
    } finally {
      client.release()
    }
  } else {
    await exec('BEGIN')
    try {
      const result = await fn({ query, queryOne })
      await exec('COMMIT')
      return result
    } catch (e) {
      await exec('ROLLBACK').catch(() => {})
      throw e
    }
  }
}

// ── Detección de choques de constraint UNIQUE (Postgres y SQLite) ──────────────
// Sirve para distinguir un "ya existe" (condición de carrera: dos requests
// pasaron el SELECT-check antes de que cualquiera insertara) de un error real
// de servidor. Postgres usa el código SQLSTATE 23505; better-sqlite3 expone
// SQLITE_CONSTRAINT_UNIQUE (o, en versiones más viejas, sólo el mensaje).
function isUniqueViolation(e) {
  if (!e) return false
  if (e.code === '23505') return true
  if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') return true
  if (typeof e.message === 'string' && /unique constraint/i.test(e.message)) return true
  return false
}

// Adivina qué columna disparó el choque (para dar un mensaje de error más
// específico) mirando el nombre del índice (Postgres: e.constraint) o el
// texto "tabla.columna" que SQLite incluye en el mensaje.
function uniqueViolationColumn(e, candidates) {
  const haystack = `${e.constraint || ''} ${e.message || ''}`.toLowerCase()
  return candidates.find(c => haystack.includes(c.toLowerCase())) || null
}

// ── Inicializar ───────────────────────────────────────────────────────────────
async function init() {
  if (IS_PG) {
    const { Pool } = require('pg')
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })

    // Solo ejecutar schema/migraciones si la tabla users no existe (primera vez)
    const { PG_SCHEMA, PG_MIGRATIONS } = require('./db-schema')
    const { rows } = await _pool.query("SELECT to_regclass('public.users') AS t")
    const needsInit = !rows[0]?.t
    if (needsInit) {
      console.log('🔧  Inicializando schema...')
      for (const stmt of PG_SCHEMA)     await _pool.query(stmt)
      for (const stmt of PG_MIGRATIONS) await _pool.query(stmt)
      console.log('✅  Schema listo')
    } else {
      // Solo migraciones rápidas (ADD COLUMN IF NOT EXISTS es muy rápido)
      for (const stmt of PG_MIGRATIONS) await _pool.query(stmt).catch(() => {})
    }

    // Seed admin
    const adminCheck = await _pool.query("SELECT id FROM users WHERE email='admin@jugarlapelota.com'")
    if (!adminCheck.rows.length) {
      const hash = bcrypt.hashSync('Admin1234!', 10)
      await _pool.query(
        "INSERT INTO users (name,email,password,role,is_active) VALUES ($1,$2,$3,'admin',1)",
        ['Administrador', 'admin@jugarlapelota.com', hash]
      )
      console.log('✅ Admin creado: admin@jugarlapelota.com / Admin1234!')
    }

    // Índices únicos de saneamiento (protegen contra condiciones de carrera en
    // registro de jugadores/equipos) — se revisan en cada arranque, ver db-unique-guards.js
    await require('./db-unique-guards').applyUniqueGuards({ query, exec })
    await require('./repair-team-inscriptions').repairTeamInscriptions({ query })
    await require('./repair-team-inscriptions').backfillClubKeys({ query })
    await require('./repair-team-inscriptions').fixLegacyInscriptionClubKeys({ query })
    await require('./repair-team-inscriptions').recoverVenadosFilialCancun({ query })
  } else {
    const Database = require('better-sqlite3')
    const path = require('path'), fs = require('fs')
    const DB_PATH = path.join(__dirname, '..', 'data', 'jugarlapelota.db')
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    require('./db-sqlite-init')(_db, bcrypt)

    await require('./db-unique-guards').applyUniqueGuards({ query, exec })
    await require('./repair-team-inscriptions').repairTeamInscriptions({ query })
    await require('./repair-team-inscriptions').backfillClubKeys({ query })
    await require('./repair-team-inscriptions').fixLegacyInscriptionClubKeys({ query })
  }
}

// ── Standings (async) ─────────────────────────────────────────────────────────
async function recalculateStandings(tournamentId, categoryId, phaseId, groupId = null) {
  // Por EQUIPO (no por match.group_id) cuando se pide un grupo: un partido
  // "cruzado" entre grupos disparejos (ver groups/generate) solo guarda UN
  // group_id en la fila de matches, así que filtrar por group_id=$N dejaba
  // fuera del cálculo al equipo del otro grupo (nunca se le sumaba ese
  // partido en SU tabla) y de paso lo colaba, incorrecto, en la tabla del
  // grupo ajeno — provocando un choque de UNIQUE (tournament,category,
  // phase,team) contra la fila real que ya tenía en su propio grupo.
  let matches, memberSet = null
  if (groupId) {
    const memberRows = (await query('SELECT team_id FROM phase_group_teams WHERE group_id=$1', [groupId])).rows
    const teamIdList = [...new Set(memberRows.map(r => r.team_id))]
    if (!teamIdList.length) return
    memberSet = new Set(teamIdList)
    const n = teamIdList.length
    const phHome = teamIdList.map((_, i) => `$${i + 1}`).join(',')
    const phAway = teamIdList.map((_, i) => `$${i + 1 + n}`).join(',')
    matches = (await query(`SELECT * FROM matches WHERE status='finished' AND (home_team IN (${phHome}) OR away_team IN (${phAway}))`, [...teamIdList, ...teamIdList])).rows
  } else {
    let sql = `SELECT * FROM matches WHERE tournament_id=$1 AND category_id=$2 AND status='finished'`
    const params = [tournamentId, categoryId]
    if (phaseId) { sql += ' AND phase_id=$3'; params.push(phaseId) }
    matches = (await query(sql, params)).rows
  }
  const stats = {}
  for (const m of matches) {
    for (const [tid, gf, ga] of [
      [m.home_team, m.home_score, m.away_score],
      [m.away_team, m.away_score, m.home_score]
    ]) {
      if (memberSet && !memberSet.has(tid)) continue
      if (!stats[tid]) stats[tid] = {played:0,won:0,drawn:0,lost:0,gf:0,ga:0,pts:0}
      const s  = stats[tid]
      const gfN = parseInt(gf) || 0   // convertir a número siempre
      const gaN = parseInt(ga) || 0
      s.played++; s.gf += gfN; s.ga += gaN
      if      (gfN > gaN) { s.won++;   s.pts += 3 }  // victoria: 3 pts
      else if (gfN === gaN) { s.drawn++; s.pts += 1 } // empate: 1 pt
      else                  { s.lost++ }               // derrota: 0 pts
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

module.exports = { query, queryOne, exec, init, IS_PG, recalculateStandings, recalculateAllStandings, isUniqueViolation, uniqueViolationColumn, withTransaction }
