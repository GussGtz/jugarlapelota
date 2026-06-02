const { db, recalculateStandings } = require('../config/db')

function getOne(req, res) {
  const row = db.prepare(`
    SELECT m.*, ht.name AS homeTeam, ht.logo AS homeLogo, at.name AS awayTeam, at.logo AS awayLogo,
      c.name AS categoryName
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.id=?
  `).get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Partido no encontrado' })
  res.json(row)
}

function create(req, res) {
  const { tournamentId, categoryId, homeTeam, awayTeam, date, location } = req.body
  const r = db.prepare(`
    INSERT INTO matches (tournament_id,category_id,home_team,away_team,date,location,status)
    VALUES (?,?,?,?,?,?,'scheduled')
  `).run(tournamentId, categoryId||null, homeTeam, awayTeam, date, location)
  res.status(201).json(db.prepare('SELECT * FROM matches WHERE id=?').get(r.lastInsertRowid))
}

module.exports = { getOne, create }
