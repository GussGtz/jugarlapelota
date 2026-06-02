/**
 * Wrapper síncrono sobre pg para producción (Neon/PostgreSQL)
 * Usa deasync para bloquear el event loop y emular la API de better-sqlite3.
 * Esto permite mantener las rutas Express exactamente como están (síncronas).
 */
const { Pool } = require('pg')
const deasync  = require('deasync')
const bcrypt   = require('bcryptjs')

let _pool = null

// ── Ejecutar query de forma síncrona ─────────────────────────────────────────
function syncQuery(sql, params = []) {
  // Convertir ? a $1, $2... (por si alguna query quedó con ?)
  let n = 0
  const pgSql = sql.replace(/\?/g, () => `$${++n}`)

  let done = false, result = null, err = null
  _pool.query(pgSql, params)
    .then(r => { result = r; done = true })
    .catch(e => { err = e; done = true })
  deasync.loopWhile(() => !done)
  if (err) throw err
  return result
}

// ── API compatible con better-sqlite3 ────────────────────────────────────────
const db = {
  prepare(sql) {
    return {
      run(...params) {
        const p = params.flat()
        const sqlWithRet = sql.trim().toUpperCase().startsWith('INSERT') && !sql.toUpperCase().includes('RETURNING')
          ? sql.replace(/;?\s*$/, '') + ' RETURNING id'
          : sql
        const result = syncQuery(sqlWithRet, p)
        return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id ?? null }
      },
      get(...params) {
        const result = syncQuery(sql, params.flat())
        return result.rows[0] || null
      },
      all(...params) {
        const result = syncQuery(sql, params.flat())
        return result.rows
      }
    }
  },
  exec(sql) {
    syncQuery(sql, [])
  },
  transaction(fn) {
    return () => {
      syncQuery('BEGIN', [])
      try {
        fn()
        syncQuery('COMMIT', [])
      } catch (e) {
        syncQuery('ROLLBACK', [])
        throw e
      }
    }
  },
  pragma() {} // no-op en PostgreSQL
}

// ── Inicializar pool ──────────────────────────────────────────────────────────
async function init() {
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  })

  // Crear schema
  const { PG_SCHEMA } = require('./db-schema')
  for (const stmt of PG_SCHEMA) {
    await _pool.query(stmt)
  }

  // Seed superadmin
  const { rows } = await _pool.query("SELECT id FROM users WHERE email='admin@jugarlapelota.com'")
  if (!rows.length) {
    const hash = bcrypt.hashSync('Admin1234!', 10)
    await _pool.query(
      "INSERT INTO users (name,email,password,role,is_active) VALUES ($1,$2,$3,'admin',1)",
      ['Administrador', 'admin@jugarlapelota.com', hash]
    )
    console.log('✅ Admin creado: admin@jugarlapelota.com / Admin1234!')
  }
}

// ── Recalcular standings (síncrono via db.prepare) ───────────────────────────
function recalculateStandings(tournamentId, categoryId, phaseId, groupId = null) {
  let sql = `SELECT * FROM matches WHERE tournament_id=$1 AND category_id=$2 AND status='finished'`
  const params = [tournamentId, categoryId]
  if (groupId)    { sql += ' AND group_id=$3';  params.push(groupId) }
  else if (phaseId) { sql += ' AND phase_id=$3'; params.push(phaseId) }

  const matches = syncQuery(sql, params).rows
  const stats = {}
  for (const m of matches) {
    for (const [teamId, gf, ga] of [[m.home_team,m.home_score,m.away_score],[m.away_team,m.away_score,m.home_score]]) {
      if (!stats[teamId]) stats[teamId] = {played:0,won:0,drawn:0,lost:0,gf:0,ga:0,pts:0}
      const s = stats[teamId]
      s.played++; s.gf+=gf; s.ga+=ga
      if (gf>ga){s.won++;s.pts+=3} else if(gf===ga){s.drawn++;s.pts++} else s.lost++
    }
  }

  const teamIds = Object.keys(stats)
  if (!teamIds.length) return

  if (groupId) {
    syncQuery('DELETE FROM standings WHERE group_id=$1', [groupId])
    for (const [tid, s] of Object.entries(stats)) {
      syncQuery('INSERT INTO standings (tournament_id,category_id,phase_id,group_id,team_id,played,won,drawn,lost,goals_for,goals_against,points) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [tournamentId,categoryId,phaseId||null,groupId,tid,s.played,s.won,s.drawn,s.lost,s.gf,s.ga,s.pts])
    }
  } else {
    for (const [tid, s] of Object.entries(stats)) {
      if (phaseId) {
        syncQuery('DELETE FROM standings WHERE tournament_id=$1 AND category_id=$2 AND phase_id=$3 AND team_id=$4 AND group_id IS NULL',
          [tournamentId,categoryId,phaseId,tid])
        syncQuery('INSERT INTO standings (tournament_id,category_id,phase_id,group_id,team_id,played,won,drawn,lost,goals_for,goals_against,points) VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$8,$9,$10,$11)',
          [tournamentId,categoryId,phaseId,tid,s.played,s.won,s.drawn,s.lost,s.gf,s.ga,s.pts])
      } else {
        syncQuery('DELETE FROM standings WHERE tournament_id=$1 AND category_id=$2 AND phase_id IS NULL AND group_id IS NULL AND team_id=$3',
          [tournamentId,categoryId,tid])
        syncQuery('INSERT INTO standings (tournament_id,category_id,phase_id,group_id,team_id,played,won,drawn,lost,goals_for,goals_against,points) VALUES ($1,$2,NULL,NULL,$3,$4,$5,$6,$7,$8,$9,$10)',
          [tournamentId,categoryId,tid,s.played,s.won,s.drawn,s.lost,s.gf,s.ga,s.pts])
      }
    }
  }
}

function recalculateAllStandings(tournamentId) {
  const combos = syncQuery(
    "SELECT DISTINCT category_id, phase_id FROM matches WHERE tournament_id=$1 AND category_id IS NOT NULL", [tournamentId]
  ).rows
  for (const { category_id, phase_id } of combos) recalculateStandings(tournamentId, category_id, phase_id)
  const groupCombos = syncQuery(
    `SELECT DISTINCT m.category_id, m.phase_id, m.group_id FROM matches m WHERE m.tournament_id=$1 AND m.group_id IS NOT NULL AND m.category_id IS NOT NULL`,
    [tournamentId]
  ).rows
  for (const { category_id, phase_id, group_id } of groupCombos) {
    recalculateStandings(tournamentId, category_id, phase_id, group_id)
  }
}

module.exports = { db, init, recalculateStandings, recalculateAllStandings }
