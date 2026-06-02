require('dotenv').config()
const bcrypt = require('bcryptjs')

const IS_PG = !!process.env.DATABASE_URL

let _exports = null

async function init() {
  if (IS_PG) {
    const pgSync = require('./db-pg-sync')
    await pgSync.init()
    _exports = pgSync
  } else {
    // SQLite local
    const Database = require('better-sqlite3')
    const path = require('path')
    const fs   = require('fs')
    const DB_PATH = path.join(__dirname, '..', 'data', 'jugarlapelota.db')
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    const _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    require('./db-sqlite-init')(_db, bcrypt)

    // Standings helpers SQLite (síncronos)
    function recalculateStandings(tournamentId, categoryId, phaseId, groupId = null) {
      let sql = `SELECT * FROM matches WHERE tournament_id=? AND category_id=? AND status='finished'`
      const params = [tournamentId, categoryId]
      if (groupId)    { sql += ' AND group_id=?';  params.push(groupId) }
      else if (phaseId) { sql += ' AND phase_id=?'; params.push(phaseId) }
      const matches = _db.prepare(sql).all(...params)
      const stats = {}
      for (const m of matches) {
        for (const [tid, gf, ga] of [[m.home_team,m.home_score,m.away_score],[m.away_team,m.away_score,m.home_score]]) {
          if (!stats[tid]) stats[tid] = {played:0,won:0,drawn:0,lost:0,gf:0,ga:0,pts:0}
          const s = stats[tid]
          s.played++; s.gf+=gf; s.ga+=ga
          if (gf>ga){s.won++;s.pts+=3} else if(gf===ga){s.drawn++;s.pts++} else s.lost++
        }
      }
      if (!Object.keys(stats).length) return
      if (groupId) {
        _db.prepare('DELETE FROM standings WHERE group_id=?').run(groupId)
        const ins = _db.prepare('INSERT INTO standings (tournament_id,category_id,phase_id,group_id,team_id,played,won,drawn,lost,goals_for,goals_against,points) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        for (const [tid,s] of Object.entries(stats)) ins.run(tournamentId,categoryId,phaseId||null,groupId,tid,s.played,s.won,s.drawn,s.lost,s.gf,s.ga,s.pts)
      } else {
        const upsert = _db.prepare(`INSERT OR REPLACE INTO standings (tournament_id,category_id,phase_id,group_id,team_id,played,won,drawn,lost,goals_for,goals_against,points) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        for (const [tid,s] of Object.entries(stats)) {
          if (!phaseId) {
            const ids = Object.keys(stats)
            if (ids.length) {
              _db.prepare(`DELETE FROM standings WHERE tournament_id=? AND category_id=? AND phase_id IS NULL AND group_id IS NULL AND team_id IN (${ids.map(()=>'?').join(',')})`)
                .run(tournamentId, categoryId, ...ids)
            }
            _db.prepare('INSERT INTO standings (tournament_id,category_id,phase_id,group_id,team_id,played,won,drawn,lost,goals_for,goals_against,points) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
              .run(tournamentId,categoryId,null,null,tid,s.played,s.won,s.drawn,s.lost,s.gf,s.ga,s.pts)
          } else {
            upsert.run(tournamentId,categoryId,phaseId,null,tid,s.played,s.won,s.drawn,s.lost,s.gf,s.ga,s.pts)
          }
          break // solo primera iteración para el delete-all approach
        }
        // Re-insertar todos
        if (!phaseId) {
          for (const [tid,s] of Object.entries(stats))
            _db.prepare('INSERT OR IGNORE INTO standings (tournament_id,category_id,phase_id,group_id,team_id,played,won,drawn,lost,goals_for,goals_against,points) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
              .run(tournamentId,categoryId,null,null,tid,s.played,s.won,s.drawn,s.lost,s.gf,s.ga,s.pts)
        } else {
          for (const [tid,s] of Object.entries(stats))
            upsert.run(tournamentId,categoryId,phaseId,null,tid,s.played,s.won,s.drawn,s.lost,s.gf,s.ga,s.pts)
        }
      }
    }

    function recalculateAllStandings(tournamentId) {
      const combos = _db.prepare("SELECT DISTINCT category_id, phase_id FROM matches WHERE tournament_id=? AND category_id IS NOT NULL").all(tournamentId)
      for (const {category_id,phase_id} of combos) recalculateStandings(tournamentId,category_id,phase_id)
      const gc = _db.prepare(`SELECT DISTINCT m.category_id, m.phase_id, m.group_id FROM matches m WHERE m.tournament_id=? AND m.group_id IS NOT NULL AND m.category_id IS NOT NULL`).all(tournamentId)
      for (const {category_id,phase_id,group_id} of gc) recalculateStandings(tournamentId,category_id,phase_id,group_id)
    }

    _exports = { db: _db, recalculateStandings, recalculateAllStandings }
  }
}

// Proxy que delega a _exports después de init()
const handler = {
  get(_, prop) {
    if (prop === 'init') return init
    if (prop === 'IS_PG') return IS_PG
    if (!_exports) throw new Error('DB not initialized. Call await init() first.')
    return _exports[prop]
  }
}

module.exports = new Proxy({}, handler)
