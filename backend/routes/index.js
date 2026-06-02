const express = require('express')
const router  = express.Router()
const path    = require('path')
const multer  = require('multer')
const { db, recalculateStandings, recalculateAllStandings } = require('../config/db')
const { authMiddleware, adminOnly, optionalAuth, refereeOrAdmin, superAdminOnly } = require('../middleware/auth')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const authCtrl        = require('../controllers/auth.controller')
const tournamentsCtrl = require('../controllers/tournaments.controller')

// ── File upload ───────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../data/uploads'),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase()
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    cb(null, name)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.webp','.gif','.svg']
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()))
  }
})

router.post('/upload', authMiddleware, adminOnly, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo no válido o muy grande (máx 5 MB)' })
  const host = `${req.protocol}://${req.get('host')}`
  res.json({ url: `${host}/uploads/${req.file.filename}` })
})

// ── Helpers ───────────────────────────────────────────────────────────────
const getTournament = (slug) => db.prepare('SELECT * FROM tournaments WHERE slug=?').get(slug)
const notFound = (res, msg='No encontrado') => res.status(404).json({ error: msg })

// ── Auth ──────────────────────────────────────────────────────────────────
router.post('/auth/login',   authCtrl.login)
router.post('/auth/google',  authCtrl.googleLogin)
router.get('/auth/me',      authMiddleware, authCtrl.me)

// ── Ownership helper ──────────────────────────────────────────────────────
const { checkOwnerById, ownSlugGuard } = tournamentsCtrl

// Verifica que el admin sea dueño del torneo al que pertenece el recurso
function checkOwnerByTournamentId(req, res, tournamentId) {
  if (req.user?.role === 'superadmin') return true
  const t = db.prepare('SELECT created_by FROM tournaments WHERE id=?').get(tournamentId)
  if (!t) { res.status(404).json({ error: 'Torneo no encontrado' }); return false }
  if (t.created_by !== req.user.id) {
    res.status(403).json({ error: 'No tienes permiso para gestionar este torneo' }); return false
  }
  return true
}

// ── Tournaments ───────────────────────────────────────────────────────────
router.get('/tournaments',        optionalAuth, tournamentsCtrl.getAll)
router.get('/tournaments/:slug',  tournamentsCtrl.getBySlug)
router.post('/tournaments',       authMiddleware, adminOnly, tournamentsCtrl.create)
router.put('/tournaments/:id',    authMiddleware, adminOnly, tournamentsCtrl.update)
router.delete('/tournaments/:id', authMiddleware, adminOnly, tournamentsCtrl.remove)

// ── Categories ────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/categories', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  res.json(db.prepare('SELECT * FROM categories WHERE tournament_id=? ORDER BY order_index,name').all(t.id))
})
router.post('/categories', authMiddleware, adminOnly, (req,res) => {
  const {tournamentId,name,gender,group_name,order_index} = req.body
  if (!checkOwnerByTournamentId(req, res, tournamentId)) return
  try {
    const r = db.prepare('INSERT INTO categories (tournament_id,name,gender,group_name,order_index) VALUES (?,?,?,?,?)').run(tournamentId,name,gender||'varonil',group_name||'libre',order_index||0)
    res.status(201).json(db.prepare('SELECT * FROM categories WHERE id=?').get(r.lastInsertRowid))
  } catch { res.status(400).json({error:'La categoría ya existe'}) }
})
router.put('/categories/:id', authMiddleware, adminOnly, (req,res) => {
  const cat = db.prepare('SELECT tournament_id FROM categories WHERE id=?').get(req.params.id)
  if (cat && !checkOwnerByTournamentId(req, res, cat.tournament_id)) return
  const {name,gender,group_name,order_index} = req.body
  db.prepare('UPDATE categories SET name=?,gender=?,group_name=?,order_index=? WHERE id=?').run(name,gender,group_name,order_index||0,req.params.id)
  res.json(db.prepare('SELECT * FROM categories WHERE id=?').get(req.params.id))
})
router.delete('/categories/:id', authMiddleware, adminOnly, (req,res) => {
  const cat = db.prepare('SELECT tournament_id FROM categories WHERE id=?').get(req.params.id)
  if (cat && !checkOwnerByTournamentId(req, res, cat.tournament_id)) return
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id); res.status(204).end()
})

// ── Phases ────────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/phases', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const rows = catId
    ? db.prepare('SELECT p.*,c.name AS categoryName FROM phases p LEFT JOIN categories c ON p.category_id=c.id WHERE p.tournament_id=? AND p.category_id=? ORDER BY p.order_index').all(t.id,catId)
    : db.prepare('SELECT p.*,c.name AS categoryName FROM phases p LEFT JOIN categories c ON p.category_id=c.id WHERE p.tournament_id=? ORDER BY c.order_index,p.order_index').all(t.id)
  const phases = rows.map(p => {
    const rounds   = db.prepare('SELECT * FROM rounds WHERE phase_id=? ORDER BY order_index').all(p.id)
    const groupRows = db.prepare(`
      SELECT pg.*, COUNT(pgt.team_id) AS teamCount
      FROM phase_groups pg
      LEFT JOIN phase_group_teams pgt ON pg.id = pgt.group_id
      WHERE pg.phase_id = ? GROUP BY pg.id ORDER BY pg.order_index
    `).all(p.id)
    const groups = groupRows.map(g => ({
      ...g,
      matches: db.prepare(`
        SELECT m.id, m.round_id, m.status, m.home_score, m.away_score,
               ht.name AS homeTeam, ht.logo AS homeLogo,
               at.name AS awayTeam, at.logo AS awayLogo
        FROM matches m
        JOIN teams ht ON m.home_team = ht.id
        JOIN teams at ON m.away_team = at.id
        WHERE m.group_id = ? ORDER BY m.round_id ASC, m.id ASC
      `).all(g.id)
    }))
    const matchStats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='finished' THEN 1 ELSE 0 END) AS finished,
        SUM(CASE WHEN status='live'     THEN 1 ELSE 0 END) AS live,
        SUM(CASE WHEN status='scheduled' THEN 1 ELSE 0 END) AS scheduled
      FROM matches WHERE phase_id=?
    `).get(p.id)
    return { ...p, rounds, groups, matchStats }
  })
  res.json(phases)
})
router.post('/phases', authMiddleware, adminOnly, (req,res) => {
  const {tournamentId,categoryId,name,type,order_index} = req.body
  if (!checkOwnerByTournamentId(req, res, tournamentId)) return
  const r = db.prepare('INSERT INTO phases (tournament_id,category_id,name,type,order_index) VALUES (?,?,?,?,?)').run(tournamentId,categoryId||null,name,type||'league',order_index||0)
  res.status(201).json(db.prepare('SELECT * FROM phases WHERE id=?').get(r.lastInsertRowid))
})
router.put('/phases/:id', authMiddleware, adminOnly, (req,res) => {
  const phase = db.prepare('SELECT tournament_id FROM phases WHERE id=?').get(req.params.id)
  if (phase && !checkOwnerByTournamentId(req, res, phase.tournament_id)) return
  const {name,type,order_index,is_active} = req.body
  db.prepare('UPDATE phases SET name=?,type=?,order_index=?,is_active=? WHERE id=?').run(name,type,order_index||0,is_active?1:0,req.params.id)
  res.json(db.prepare('SELECT * FROM phases WHERE id=?').get(req.params.id))
})
router.delete('/phases/:id', authMiddleware, adminOnly, (req,res) => {
  const id = req.params.id
  const phase = db.prepare('SELECT tournament_id FROM phases WHERE id=?').get(id)
  if (phase && !checkOwnerByTournamentId(req, res, phase.tournament_id)) return
  db.prepare('DELETE FROM matches WHERE phase_id=?').run(id)
  db.prepare('DELETE FROM rounds  WHERE phase_id=?').run(id)
  db.prepare('DELETE FROM phase_groups WHERE phase_id=?').run(id)
  db.prepare('DELETE FROM standings WHERE phase_id=?').run(id)
  db.prepare('DELETE FROM phases  WHERE id=?').run(id)
  res.status(204).end()
})

// ── Recomendaciones del wizard ────────────────────────────────────────────
router.get('/tournaments/:slug/wizard-recommend', authMiddleware, adminOnly, (req, res) => {
  const t = getTournament(req.params.slug)
  if (!t) return notFound(res)

  const catId    = req.query.cat ? parseInt(req.query.cat) : null
  const modality = t.modality || 'copa'

  // Contar equipos reales
  const teamCount = catId
    ? db.prepare('SELECT COUNT(*) AS c FROM teams WHERE tournament_id=? AND category_id=?').get(t.id, catId).c
    : db.prepare('SELECT COUNT(*) AS c FROM teams WHERE tournament_id=?').get(t.id).c

  // Validaciones mínimas por modalidad
  const MIN = { copa: 2, liga: 3, mixto: 4, grupos_eliminacion: 4 }
  const min = MIN[modality] || 2
  const valid  = teamCount >= min
  const errors = []
  if (teamCount === 0) errors.push('No hay equipos registrados en esta categoría.')
  else if (!valid)     errors.push(`Se necesitan al menos ${min} equipos para la modalidad "${modality}". Actualmente hay ${teamCount}.`)

  // Recomendaciones inteligentes por modalidad
  let rec = {}

  if (modality === 'copa') {
    rec = { teamCount, valid, errors,
      options: { thirdPlace: teamCount >= 4 },
      notes: [`El bracket se ajustará a ${teamCount} equipos automáticamente.`,
              teamCount < 4 ? 'Con menos de 4 equipos solo se puede jugar la Final.' : '']
    }
  }

  else if (modality === 'liga') {
    const jornadas = teamCount % 2 === 0 ? teamCount - 1 : teamCount
    rec = { teamCount, valid, errors,
      options: { legsOptions: [1, 2] },
      notes: [
        `Con ${teamCount} equipos: ${jornadas} jornadas de ida${teamCount > 2 ? ` / ${jornadas*2} en ida y vuelta` : ''}.`,
        `Cada equipo jugará ${teamCount - 1} partido${teamCount > 2 ? 's' : ''} por vuelta.`
      ]
    }
  }

  else if (modality === 'mixto') {
    const jornadas = teamCount % 2 === 0 ? teamCount - 1 : teamCount
    const advOptions = [2, 4, 6, 8].filter(n => n < teamCount)
    const recAdv = advOptions.length ? advOptions[Math.min(1, advOptions.length - 1)] : 2
    rec = { teamCount, valid, errors,
      options: { legsOptions: [1, 2], advancingOptions: advOptions, recommendedAdvancing: recAdv },
      notes: [
        `Fase regular: ${jornadas} jornadas con ${teamCount} equipos.`,
        `Recomendado: los mejores ${recAdv} avanzan a la liguilla.`
      ]
    }
  }

  else if (modality === 'grupos_eliminacion') {
    // Calcular opciones de grupos válidas
    const groupOptions = []
    for (let g = 2; g <= Math.min(8, Math.floor(teamCount / 2)); g++) {
      const tpg = Math.ceil(teamCount / g)
      if (tpg >= 3) groupOptions.push({ groups: g, teamsPerGroup: tpg, guaranteed: tpg - 1 })
    }
    // Recomendación: grupos de 4 si es posible
    const recGroup = groupOptions.find(o => o.teamsPerGroup === 4) || groupOptions[0] || { groups: 2, teamsPerGroup: Math.ceil(teamCount/2), guaranteed: 2 }
    const advOptions = [1, 2, 3].filter(a => a < recGroup.teamsPerGroup)
    const recAdv = advOptions.includes(2) ? 2 : advOptions[0] || 1

    rec = { teamCount, valid, errors,
      options: { groupOptions, recommendedGroups: recGroup.groups, advanceOptions: advOptions, recommendedAdvance: recAdv },
      notes: [
        groupOptions.length
          ? `Con ${teamCount} equipos: ${recGroup.groups} grupos de ${recGroup.teamsPerGroup} → ${recGroup.guaranteed} partidos garantizados.`
          : 'No hay suficientes equipos para formar grupos válidos (mínimo 3 por grupo).',
        recGroup ? `Recomendado: ${recAdv} equipo${recAdv > 1 ? 's' : ''} avanzan por grupo → ${recGroup.groups * recAdv} en eliminatoria.` : ''
      ]
    }
  }

  res.json({ modality, ...rec })
})

// ── Auto-setup: genera fases + rondas según modalidad ────────────────────
router.post('/tournaments/:slug/auto-setup', authMiddleware, adminOnly, (req, res) => {
  const t = getTournament(req.params.slug)
  if (!t) return notFound(res)

  const { categoryId, teamCount, options = {} } = req.body
  const modality = t.modality || 'copa'
  const n = Math.max(2, parseInt(teamCount) || 2)

  // Validaciones mínimas
  const MIN = { copa: 2, liga: 3, mixto: 4, grupos_eliminacion: 4 }
  if (n < (MIN[modality] || 2)) {
    return res.status(400).json({
      error: `Se necesitan al menos ${MIN[modality]} equipos para la modalidad "${modality}". Actualmente hay ${n}.`
    })
  }

  const insPhase = db.prepare('INSERT INTO phases (tournament_id,category_id,name,type,order_index,is_active) VALUES (?,?,?,?,?,1)')
  const insRound = db.prepare('INSERT INTO rounds (phase_id,name,order_index) VALUES (?,?,?)')

  function knockoutRounds(n, withThird = false) {
    const rounds = []
    if (n > 16) rounds.push('Ronda de 32')
    if (n > 8)  rounds.push('Octavos de Final')
    if (n > 4)  rounds.push('Cuartos de Final')
    if (n > 2)  rounds.push('Semifinales')
    rounds.push('Final')
    if (withThird && n >= 4) rounds.push('Tercer Lugar')
    return rounds
  }

  function leagueRounds(n, legs = 1) {
    const jornadas = n % 2 === 0 ? n - 1 : n
    const total    = jornadas * legs
    return Array.from({ length: total }, (_, i) => `Jornada ${i + 1}`)
  }

  const created = []

  try {
    db.transaction(() => {
      if (modality === 'copa') {
        const p      = insPhase.run(t.id, categoryId || null, 'Eliminatoria', 'knockout', 0)
        const rounds = knockoutRounds(n, !!options.thirdPlace)
        rounds.forEach((name, i) => insRound.run(p.lastInsertRowid, name, i))
        created.push({ name: 'Eliminatoria', type: 'knockout', rounds })

      } else if (modality === 'liga') {
        const legs   = Math.max(1, parseInt(options.legs) || 1)
        const p      = insPhase.run(t.id, categoryId || null, 'Fase Regular', 'league', 0)
        const rounds = leagueRounds(n, legs)
        rounds.forEach((name, i) => insRound.run(p.lastInsertRowid, name, i))
        created.push({ name: 'Fase Regular', type: 'league', rounds })

      } else if (modality === 'mixto') {
        const legs     = Math.max(1, parseInt(options.legs) || 1)
        const advancing = Math.max(2, Math.min(parseInt(options.advancing) || Math.floor(n / 2), n - 1))
        const p1     = insPhase.run(t.id, categoryId || null, 'Fase Regular', 'league', 0)
        const r1     = leagueRounds(n, legs)
        r1.forEach((name, i) => insRound.run(p1.lastInsertRowid, name, i))
        created.push({ name: 'Fase Regular', type: 'league', rounds: r1 })

        const p2 = insPhase.run(t.id, categoryId || null, 'Liguilla', 'knockout', 1)
        const r2 = knockoutRounds(advancing, !!options.thirdPlace)
        r2.forEach((name, i) => insRound.run(p2.lastInsertRowid, name, i))
        created.push({ name: 'Liguilla', type: 'knockout', rounds: r2 })

      } else if (modality === 'grupos_eliminacion') {
        const groupCount    = Math.max(2, parseInt(options.groupCount)   || Math.max(2, Math.round(n / 4)))
        const advanceCount  = Math.max(1, parseInt(options.advanceCount) || 2)
        const teamsPerGroup = Math.ceil(n / groupCount)

        if (teamsPerGroup < 2) throw new Error('Demasiados grupos para los equipos disponibles.')

        const p1 = insPhase.run(t.id, categoryId || null, 'Fase de Grupos', 'groups', 0)
        const r1 = leagueRounds(teamsPerGroup, 1)
        r1.forEach((name, i) => insRound.run(p1.lastInsertRowid, name, i))
        created.push({ name: 'Fase de Grupos', type: 'groups', rounds: r1 })

        const advancing = groupCount * advanceCount
        const p2 = insPhase.run(t.id, categoryId || null, 'Eliminatoria', 'knockout', 1)
        const r2 = knockoutRounds(advancing)
        r2.forEach((name, i) => insRound.run(p2.lastInsertRowid, name, i))
        created.push({ name: 'Eliminatoria', type: 'knockout', rounds: r2 })
      }
    })()
    res.status(201).json({ modality, created })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || 'Error al generar estructura' })
  }
})

// ── Rounds ────────────────────────────────────────────────────────────────
router.get('/phases/:id/rounds', (req,res) => {
  res.json(db.prepare('SELECT * FROM rounds WHERE phase_id=? ORDER BY order_index').all(req.params.id))
})
router.post('/rounds', authMiddleware, adminOnly, (req,res) => {
  const {phaseId,name,order_index} = req.body
  const r = db.prepare('INSERT INTO rounds (phase_id,name,order_index) VALUES (?,?,?)').run(phaseId,name,order_index||0)
  res.status(201).json(db.prepare('SELECT * FROM rounds WHERE id=?').get(r.lastInsertRowid))
})
router.put('/rounds/:id', authMiddleware, adminOnly, (req,res) => {
  const {name,order_index} = req.body
  db.prepare('UPDATE rounds SET name=?,order_index=? WHERE id=?').run(name,order_index||0,req.params.id)
  res.json(db.prepare('SELECT * FROM rounds WHERE id=?').get(req.params.id))
})
router.delete('/rounds/:id', authMiddleware, adminOnly, (req,res) => {
  db.prepare('DELETE FROM rounds WHERE id=?').run(req.params.id); res.status(204).end()
})

// ── Teams ─────────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/teams', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const rows = catId
    ? db.prepare('SELECT t.*,c.name AS categoryName,c.gender,c.group_name FROM teams t LEFT JOIN categories c ON t.category_id=c.id WHERE t.tournament_id=? AND t.category_id=? ORDER BY t.name').all(t.id,catId)
    : db.prepare('SELECT t.*,c.name AS categoryName,c.gender,c.group_name FROM teams t LEFT JOIN categories c ON t.category_id=c.id WHERE t.tournament_id=? ORDER BY c.order_index,t.name').all(t.id)
  res.json(rows)
})
router.get('/teams', (_,res) => res.json(db.prepare('SELECT t.*,c.name AS categoryName,tr.slug AS tournamentSlug,tr.name AS tournamentName FROM teams t LEFT JOIN categories c ON t.category_id=c.id LEFT JOIN tournaments tr ON t.tournament_id=tr.id ORDER BY t.name').all()))

router.get('/matches/live', (_,res) => {
  const rows = db.prepare(`
    SELECT m.id, m.home_score, m.away_score, m.date, m.status, m.started_at,
           ht.name AS homeTeam, ht.logo AS homeLogo,
           at.name AS awayTeam, at.logo AS awayLogo,
           t.name AS tournamentName, t.slug AS tournamentSlug,
           c.name AS categoryName
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id
    JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.status='live'
    ORDER BY m.started_at DESC
  `).all()
  res.json(rows)
})
router.post('/teams', authMiddleware, adminOnly, (req,res) => {
  const {tournamentId, categoryId, name, logo, coach, captain, description} = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre del equipo es requerido' })
  if (!checkOwnerByTournamentId(req, res, tournamentId)) return
  const dup = db.prepare(
    'SELECT id FROM teams WHERE tournament_id=? AND LOWER(TRIM(name))=LOWER(TRIM(?)) AND (category_id=? OR (category_id IS NULL AND ? IS NULL))'
  ).get(tournamentId, name.trim(), categoryId || null, categoryId || null)
  if (dup) return res.status(409).json({ error: `Ya existe un equipo llamado "${name.trim()}" en esta categoría.` })
  const r = db.prepare('INSERT INTO teams (tournament_id,category_id,name,logo,coach,captain,description) VALUES (?,?,?,?,?,?,?)')
    .run(tournamentId, categoryId || null, name.trim(), logo || null, coach || null, captain || null, description || null)
  res.status(201).json(db.prepare('SELECT t.*,c.name AS categoryName FROM teams t LEFT JOIN categories c ON t.category_id=c.id WHERE t.id=?').get(r.lastInsertRowid))
})

router.put('/teams/:id', authMiddleware, adminOnly, (req,res) => {
  const {name, logo, coach, captain, description, categoryId, tournamentId} = req.body
  const id = parseInt(req.params.id)
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
  const tid = tournamentId || db.prepare('SELECT tournament_id FROM teams WHERE id=?').get(id)?.tournament_id
  if (!checkOwnerByTournamentId(req, res, tid)) return

  // Duplicado al renombrar: mismo nombre en el torneo y categoría, excluyendo el equipo actual
  const dup = db.prepare(
    'SELECT id FROM teams WHERE tournament_id=? AND LOWER(TRIM(name))=LOWER(TRIM(?)) AND (category_id=? OR (category_id IS NULL AND ? IS NULL)) AND id!=?'
  ).get(tid, name.trim(), categoryId || null, categoryId || null, id)
  if (dup) return res.status(409).json({ error: `Ya existe un equipo llamado "${name.trim()}" en esta categoría.` })

  db.prepare('UPDATE teams SET name=?,logo=?,coach=?,captain=?,description=?,category_id=? WHERE id=?')
    .run(name.trim(), logo || null, coach || null, captain || null, description || null, categoryId || null, id)
  res.json(db.prepare('SELECT * FROM teams WHERE id=?').get(id))
})
router.get('/teams/:id/players', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM players WHERE team_id=? ORDER BY number ASC, name ASC'
  ).all(req.params.id)
  res.json(rows)
})
router.delete('/teams/:id', authMiddleware, adminOnly, (req,res) => {
  const team = db.prepare('SELECT tournament_id FROM teams WHERE id=?').get(req.params.id)
  if (team && !checkOwnerByTournamentId(req, res, team.tournament_id)) return
  db.prepare('DELETE FROM teams WHERE id=?').run(req.params.id); res.status(204).end()
})

// ── Players ───────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/players', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const rows = catId
    ? db.prepare(`SELECT p.*,te.name AS teamName,te.category_id,c.name AS categoryName FROM players p JOIN teams te ON p.team_id=te.id LEFT JOIN categories c ON te.category_id=c.id WHERE te.tournament_id=? AND te.category_id=? ORDER BY p.goals DESC,p.assists DESC,p.name`).all(t.id,catId)
    : db.prepare(`SELECT p.*,te.name AS teamName,te.category_id,c.name AS categoryName FROM players p JOIN teams te ON p.team_id=te.id LEFT JOIN categories c ON te.category_id=c.id WHERE te.tournament_id=? ORDER BY p.goals DESC,p.assists DESC,p.name`).all(t.id)
  res.json(rows)
})

// ── Stats de fase regular (groups/league) — para reconocimientos ──────────
// Goles/asistencias solo de fases tipo groups o league, NO knockout.
// Esto determina premios individuales: el goleador/asistidor de la fase inicial.
router.get('/tournaments/:slug/players/phase-stats', (req, res) => {
  const t = getTournament(req.params.slug)
  if (!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null

  // Fases válidas: preferir league/groups; si no existen (ej. copa), usar todas
  let validPhases = catId
    ? db.prepare(`SELECT id FROM phases WHERE tournament_id=? AND category_id=? AND type IN ('league','groups')`).all(t.id, catId)
    : db.prepare(`SELECT id FROM phases WHERE tournament_id=? AND type IN ('league','groups')`).all(t.id)

  if (!validPhases.length) {
    validPhases = catId
      ? db.prepare(`SELECT id FROM phases WHERE tournament_id=? AND category_id=?`).all(t.id, catId)
      : db.prepare(`SELECT id FROM phases WHERE tournament_id=?`).all(t.id)
    if (!validPhases.length) return res.json([])
  }

  const phaseIds = validPhases.map(p => p.id)
  const placeholders = phaseIds.map(() => '?').join(',')

  // Calcular goles/asistencias desde match_events filtrados a esas fases
  const stats = db.prepare(`
    SELECT
      p.id, p.name, p.photo, p.number, p.position, p.team_id,
      t.name AS teamName, t.logo AS teamLogo,
      COALESCE(SUM(CASE WHEN e.type='goal' THEN 1 ELSE 0 END), 0) AS goals,
      COALESCE(SUM(CASE WHEN e.type='assist' THEN 1 ELSE 0 END), 0) AS assists,
      COALESCE(SUM(CASE WHEN e.type='own_goal' THEN 1 ELSE 0 END), 0) AS own_goals,
      COALESCE(SUM(CASE WHEN e.type='yellow_card' THEN 1 ELSE 0 END), 0) AS yellow_cards,
      COALESCE(SUM(CASE WHEN e.type='red_card' THEN 1 ELSE 0 END), 0) AS red_cards,
      COUNT(DISTINCT m.id) AS matches_played
    FROM players p
    JOIN teams t ON t.id = p.team_id
    LEFT JOIN match_events e ON e.player_id = p.id
    LEFT JOIN matches m ON m.id = e.match_id AND m.phase_id IN (${placeholders})
    WHERE t.tournament_id = ?
    ${catId ? 'AND t.category_id = ?' : ''}
    GROUP BY p.id
    ORDER BY goals DESC, assists DESC, p.name ASC
  `).all(...phaseIds, t.id, ...(catId ? [catId] : []))

  res.json(stats)
})

// ── Helper: mismo nombre en la misma categoría = duplicado
function checkPlayerDuplicate(teamId, name, excludePlayerId = null) {
  if (!name || !name.trim()) return null
  const team = db.prepare('SELECT tournament_id, category_id FROM teams WHERE id=?').get(teamId)
  if (!team) return null

  const sql = excludePlayerId
    ? `SELECT p.*, t.name AS teamName FROM players p
       JOIN teams t ON p.team_id = t.id
       WHERE t.tournament_id = ? AND t.category_id = ?
         AND LOWER(TRIM(p.name)) = LOWER(TRIM(?))
         AND p.id != ? AND p.team_id != ?`
    : `SELECT p.*, t.name AS teamName FROM players p
       JOIN teams t ON p.team_id = t.id
       WHERE t.tournament_id = ? AND t.category_id = ?
         AND LOWER(TRIM(p.name)) = LOWER(TRIM(?))
         AND p.team_id != ?`

  const args = excludePlayerId
    ? [team.tournament_id, team.category_id, name.trim(), excludePlayerId, teamId]
    : [team.tournament_id, team.category_id, name.trim(), teamId]

  return db.prepare(sql).get(...args) || null
}

router.post('/players', authMiddleware, adminOnly, (req, res) => {
  const { teamId, name, photo, number, position } = req.body
  if (!teamId || !name) return res.status(400).json({ error: 'Nombre y equipo son requeridos' })
  const teamTournament = db.prepare('SELECT tournament_id FROM teams WHERE id=?').get(teamId)
  if (teamTournament && !checkOwnerByTournamentId(req, res, teamTournament.tournament_id)) return

  const dup = checkPlayerDuplicate(teamId, name)
  if (dup) {
    return res.status(409).json({
      error: `"${name}" ya está registrado en el equipo "${dup.teamName}" en esta categoría. No se puede registrar el mismo jugador en dos equipos.`,
      duplicate: dup
    })
  }

  const r = db.prepare('INSERT INTO players (team_id,name,photo,number,position) VALUES (?,?,?,?,?)')
    .run(teamId, name.trim(), photo || null, number || null, position || null)
  res.status(201).json(db.prepare('SELECT * FROM players WHERE id=?').get(r.lastInsertRowid))
})

router.put('/players/:id', authMiddleware, adminOnly, (req, res) => {
  const { name, photo, number, position, goals, assists, yellow_cards, red_cards, teamId, minutes_played, matches_played } = req.body
  const pid = parseInt(req.params.id)

  const dup = checkPlayerDuplicate(teamId, name, pid)
  if (dup) {
    return res.status(409).json({
      error: `"${name}" ya está registrado en el equipo "${dup.teamName}" en esta categoría.`,
      duplicate: dup
    })
  }

  db.prepare(`UPDATE players SET name=?,photo=?,number=?,position=?,goals=?,assists=?,
    yellow_cards=?,red_cards=?,team_id=?,minutes_played=?,matches_played=? WHERE id=?`)
    .run(name.trim(), photo, number, position, goals||0, assists||0, yellow_cards||0,
         red_cards||0, teamId, minutes_played||0, matches_played||0, pid)
  res.json(db.prepare('SELECT * FROM players WHERE id=?').get(pid))
})

// Chequeo en vivo desde el frontend
router.post('/players/check-duplicate', authMiddleware, adminOnly, (req, res) => {
  const { teamId, name, excludePlayerId } = req.body
  const dup = checkPlayerDuplicate(teamId, name, excludePlayerId || null)
  res.json({ duplicate: dup || null })
})
router.delete('/players/:id', authMiddleware, adminOnly, (req,res) => {
  db.prepare('DELETE FROM players WHERE id=?').run(req.params.id); res.status(204).end()
})

// ── Matches ───────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/matches', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  const catId   = req.query.cat   ? parseInt(req.query.cat)   : null
  const phaseId = req.query.phase ? parseInt(req.query.phase) : null
  const roundId = req.query.round ? parseInt(req.query.round) : null
  let sql = `SELECT m.*,
    CASE WHEN m.home_is_tbd=1 THEN NULL ELSE ht.name END AS homeTeam,
    CASE WHEN m.home_is_tbd=1 THEN NULL ELSE ht.logo END AS homeLogo,
    CASE WHEN m.away_is_tbd=1 THEN NULL ELSE at.name END AS awayTeam,
    CASE WHEN m.away_is_tbd=1 THEN NULL ELSE at.logo END AS awayLogo,
    c.name AS categoryName, ph.name AS phaseName, ph.type AS phaseType, r.name AS roundName,
    u.name AS refereeName, u.id AS refereeId
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    LEFT JOIN categories c ON m.category_id=c.id LEFT JOIN phases ph ON m.phase_id=ph.id LEFT JOIN rounds r ON m.round_id=r.id
    LEFT JOIN users u ON m.referee_id=u.id
    WHERE m.tournament_id=?`
  const params = [t.id]
  if (catId)   { sql += ' AND m.category_id=?';   params.push(catId) }
  if (phaseId) { sql += ' AND m.phase_id=?';     params.push(phaseId) }
  if (roundId) { sql += ' AND m.round_id=?';     params.push(roundId) }
  sql += ' ORDER BY m.date ASC'
  res.json(db.prepare(sql).all(...params))
})
router.get('/matches/:id', (req,res) => {
  const row = db.prepare(`SELECT m.*,
    CASE WHEN m.home_is_tbd=1 THEN NULL ELSE ht.name END AS homeTeam,
    CASE WHEN m.home_is_tbd=1 THEN NULL ELSE ht.logo END AS homeLogo,
    CASE WHEN m.away_is_tbd=1 THEN NULL ELSE at.name END AS awayTeam,
    CASE WHEN m.away_is_tbd=1 THEN NULL ELSE at.logo END AS awayLogo,
    c.name AS categoryName, ph.name AS phaseName, r.name AS roundName,
    u.name AS refereeName, u.id AS refereeId
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    LEFT JOIN categories c ON m.category_id=c.id LEFT JOIN phases ph ON m.phase_id=ph.id LEFT JOIN rounds r ON m.round_id=r.id
    LEFT JOIN users u ON m.referee_id=u.id
    WHERE m.id=?`).get(req.params.id)
  if(!row) return notFound(res,'Partido no encontrado')
  res.json(row)
})
router.post('/matches', authMiddleware, adminOnly, (req,res) => {
  const {tournamentId,categoryId,phaseId,roundId,homeTeam,awayTeam,date,location} = req.body
  if (!checkOwnerByTournamentId(req, res, tournamentId)) return
  const r = db.prepare(`INSERT INTO matches (tournament_id,category_id,phase_id,round_id,home_team,away_team,date,location,status) VALUES (?,?,?,?,?,?,?,?,'scheduled')`).run(tournamentId,categoryId||null,phaseId||null,roundId||null,homeTeam,awayTeam,date,location)
  res.status(201).json(db.prepare('SELECT * FROM matches WHERE id=?').get(r.lastInsertRowid))
})
router.put('/matches/:id', authMiddleware, adminOnly, (req,res) => {
  const {categoryId,phaseId,roundId,homeTeam,awayTeam,home_score,away_score,date,location,status,match_notes} = req.body
  db.prepare('UPDATE matches SET category_id=?,phase_id=?,round_id=?,home_team=?,away_team=?,home_score=?,away_score=?,date=?,location=?,status=?,match_notes=? WHERE id=?')
    .run(categoryId||null,phaseId||null,roundId||null,homeTeam,awayTeam,home_score||0,away_score||0,date,location,status||'scheduled',match_notes||null,req.params.id)
  const m = db.prepare(`SELECT m.*,ht.name AS homeTeam,at.name AS awayTeam,ht.logo AS homeLogo,at.logo AS awayLogo,c.name AS categoryName,ph.type AS phaseType,u.name AS refereeName FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id LEFT JOIN categories c ON m.category_id=c.id LEFT JOIN phases ph ON m.phase_id=ph.id LEFT JOIN users u ON m.referee_id=u.id WHERE m.id=?`).get(req.params.id)
  if (m.status === 'finished') {
    if (m.category_id) recalculateStandings(m.tournament_id, m.category_id, m.phase_id, m.group_id||null)
    advanceBracketWinner(m.id, req.io)
    checkPhaseCompletion(m.phase_id, req.io)
    req.io?.emit('standings:update', { tournamentId: m.tournament_id, categoryId: m.category_id, phaseId: m.phase_id })
  }
  req.io?.emit('match:update', m)
  res.json(m)
})
router.patch('/matches/:id/score', authMiddleware, refereeOrAdmin, (req,res) => {
  const { homeScore, awayScore, finish } = req.body
  const newStatus = finish ? 'finished' : undefined
  if (newStatus) {
    const now = new Date().toISOString()
    db.prepare('UPDATE matches SET home_score=?,away_score=?,status=?,finished_at=? WHERE id=?')
      .run(homeScore, awayScore, newStatus, now, req.params.id)
  } else {
    db.prepare('UPDATE matches SET home_score=?,away_score=? WHERE id=?').run(homeScore, awayScore, req.params.id)
  }
  const m = db.prepare(`SELECT m.*,ht.name AS homeTeam,at.name AS awayTeam,ht.logo AS homeLogo,at.logo AS awayLogo,c.name AS categoryName,ph.type AS phaseType,u.name AS refereeName FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id LEFT JOIN categories c ON m.category_id=c.id LEFT JOIN phases ph ON m.phase_id=ph.id LEFT JOIN users u ON m.referee_id=u.id WHERE m.id=?`).get(req.params.id)
  if (m.status === 'finished') {
    if (m.category_id) recalculateStandings(m.tournament_id, m.category_id, m.phase_id, m.group_id||null)
    advanceBracketWinner(m.id, req.io)
    checkPhaseCompletion(m.phase_id, req.io)
    req.io?.emit('standings:update', { tournamentId: m.tournament_id, categoryId: m.category_id, phaseId: m.phase_id })
  }
  req.io?.emit('match:update', m)
  res.json(m)
})
router.patch('/matches/:id/status', authMiddleware, adminOnly, (req,res) => {
  const { status } = req.body
  db.prepare('UPDATE matches SET status=? WHERE id=?').run(status, req.params.id)
  const m = db.prepare(`SELECT m.*,ht.name AS homeTeam,at.name AS awayTeam FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id WHERE m.id=?`).get(req.params.id)
  if (status === 'finished') {
    if (m.category_id) recalculateStandings(m.tournament_id, m.category_id, m.phase_id, m.group_id||null)
    advanceBracketWinner(m.id, req.io)
    checkPhaseCompletion(m.phase_id, req.io)
    req.io?.emit('standings:update', { tournamentId: m.tournament_id, categoryId: m.category_id, phaseId: m.phase_id })
    global.sendPushToTeams?.([m.home_team, m.away_team], {
      type: 'match:finished', title: 'Resultado final',
      body: `${m.homeTeam} ${m.home_score} - ${m.away_score} ${m.awayTeam}`, url: `/partidos`
    })
  }
  if (status === 'live') {
    global.sendPushToTeams?.([m.home_team, m.away_team], {
      type: 'match:live', title: 'Partido en vivo',
      body: `${m.homeTeam} vs ${m.awayTeam} ha comenzado`, url: `/partidos`
    })
  }
  req.io?.emit(status === 'live' ? 'match:live' : 'match:update', m)
  res.json(m)
})
router.delete('/matches/:id', authMiddleware, adminOnly, (req,res) => {
  db.prepare('DELETE FROM matches WHERE id=?').run(req.params.id); res.status(204).end()
})

// ── Match events (árbitro) ────────────────────────────────────────────────
router.get('/matches/:id/events', (req, res) => {
  const events = db.prepare(`
    SELECT e.*, p.name AS playerName, p.number AS playerNumber,
           t.name AS teamName
    FROM match_events e
    LEFT JOIN players p ON e.player_id = p.id
    LEFT JOIN teams   t ON e.team_id   = t.id
    WHERE e.match_id = ? ORDER BY e.minute ASC, e.second ASC, e.id ASC
  `).all(req.params.id)
  res.json(events)
})

router.post('/matches/:id/events', authMiddleware, refereeOrAdmin, (req, res) => {
  const { type, playerId, teamId, minute, second, note } = req.body
  const matchId = parseInt(req.params.id)
  const match   = db.prepare('SELECT * FROM matches WHERE id=?').get(matchId)
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' })

  // Validaciones de negocio
  if (!type) return res.status(400).json({ error: 'El tipo de evento es requerido' })
  if (!teamId) return res.status(400).json({ error: 'El equipo es requerido' })
  if (match.status === 'finished') return res.status(400).json({ error: 'El partido ya ha finalizado' })
  const allowedTeams = [match.home_team, match.away_team]
  if (!allowedTeams.includes(parseInt(teamId))) return res.status(400).json({ error: 'Equipo no pertenece al partido' })

  const r = db.prepare(
    'INSERT INTO match_events (match_id,type,player_id,team_id,minute,second,note) VALUES (?,?,?,?,?,?,?)'
  ).run(matchId, type, playerId || null, teamId || null, minute ?? null, second ?? 0, note || null)

  // Normalizar teamId a número para comparaciones (viene como string del body JSON)
  const teamIdNum  = parseInt(teamId)
  const homeTeamId = match.home_team   // número en BD
  const awayTeamId = match.away_team   // número en BD

  if (type === 'goal' || type === 'own_goal') {
    let home = match.home_score
    let away = match.away_score
    if (type === 'goal') {
      if (teamIdNum === homeTeamId) home++
      else away++
    } else { // own_goal: suma al contrario
      if (teamIdNum === homeTeamId) away++
      else home++
    }
    db.prepare('UPDATE matches SET home_score=?,away_score=? WHERE id=?').run(home, away, matchId)
    if (playerId) db.prepare('UPDATE players SET goals=goals+1 WHERE id=?').run(playerId)
  }
  if (type === 'assist'      && playerId) db.prepare('UPDATE players SET assists=assists+1 WHERE id=?').run(playerId)
  if (type === 'yellow_card' && playerId) db.prepare('UPDATE players SET yellow_cards=yellow_cards+1 WHERE id=?').run(playerId)
  if (type === 'red_card'    && playerId) db.prepare('UPDATE players SET red_cards=red_cards+1 WHERE id=?').run(playerId)

  // Leer datos enriquecidos del evento para el ticker en vivo
  const richEvent = db.prepare(`
    SELECT e.*, p.name AS playerName, p.number AS playerNumber,
           t.name AS teamName, t.logo AS teamLogo
    FROM match_events e
    LEFT JOIN players p ON e.player_id = p.id
    LEFT JOIN teams   t ON e.team_id   = t.id
    WHERE e.id = ?
  `).get(r.lastInsertRowid)

  // Partido con nombres de equipos para el socket
  const updatedMatch = db.prepare(`
    SELECT m.*, ht.name AS homeTeam, at.name AS awayTeam,
           ht.logo AS homeLogo, at.logo AS awayLogo
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    WHERE m.id=?
  `).get(matchId)

  // Emitir evento enriquecido para el ticker instantáneo
  req.io?.emit('match:event', { matchId, event: richEvent, match: updatedMatch })
  req.io?.emit('match:update', updatedMatch)

  res.status(201).json({ id: r.lastInsertRowid, event: richEvent, match: updatedMatch })
})

router.delete('/match-events/:id', authMiddleware, adminOnly, (req, res) => {
  const ev = db.prepare('SELECT * FROM match_events WHERE id=?').get(req.params.id)
  if (!ev) return res.status(404).json({ error: 'Evento no encontrado' })

  const match = db.prepare('SELECT * FROM matches WHERE id=?').get(ev.match_id)

  // Revertir score y stats
  if ((ev.type === 'goal' || ev.type === 'own_goal') && match) {
    let home = match.home_score
    let away = match.away_score
    if (ev.type === 'goal') {
      if (ev.team_id === match.home_team) home = Math.max(0, home - 1)
      else away = Math.max(0, away - 1)
    } else {
      if (ev.team_id === match.home_team) away = Math.max(0, away - 1)
      else home = Math.max(0, home - 1)
    }
    db.prepare('UPDATE matches SET home_score=?,away_score=? WHERE id=?').run(home, away, ev.match_id)
    if (ev.player_id) db.prepare('UPDATE players SET goals=MAX(0,goals-1) WHERE id=?').run(ev.player_id)
  }
  if (ev.type === 'assist'      && ev.player_id) db.prepare('UPDATE players SET assists=MAX(0,assists-1) WHERE id=?').run(ev.player_id)
  if (ev.type === 'yellow_card' && ev.player_id) db.prepare('UPDATE players SET yellow_cards=MAX(0,yellow_cards-1) WHERE id=?').run(ev.player_id)
  if (ev.type === 'red_card'    && ev.player_id) db.prepare('UPDATE players SET red_cards=MAX(0,red_cards-1) WHERE id=?').run(ev.player_id)

  db.prepare('DELETE FROM match_events WHERE id=?').run(ev.id)

  const updatedMatch = db.prepare('SELECT * FROM matches WHERE id=?').get(ev.match_id)
  req.io?.emit('match:update', updatedMatch)
  res.json({ ok: true, match: updatedMatch })
})

// Iniciar partido (guarda started_at + árbitro)
router.patch('/matches/:id/start', authMiddleware, refereeOrAdmin, (req, res) => {
  const now = new Date().toISOString()
  const refereeId = req.user?.id || null
  db.prepare("UPDATE matches SET status='live', started_at=?, referee_id=COALESCE(referee_id,?) WHERE id=?")
    .run(now, refereeId, req.params.id)
  const m = db.prepare(`SELECT m.*,ht.name AS homeTeam,at.name AS awayTeam FROM matches m
    JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id WHERE m.id=?`).get(req.params.id)
  global.sendPushToTeams?.([m.home_team, m.away_team], {
    type:'match:live', title:'🔴 ¡Partido en vivo!',
    body:`${m.homeTeam} vs ${m.awayTeam} ha comenzado`, url:`/partidos`
  })
  req.io?.emit('match:live', m)
  res.json(m)
})

// ── Smart bracket: auto-advance winner to next round ─────────────────────
function advanceBracketWinner(matchId, io) {
  const match = db.prepare('SELECT * FROM matches WHERE id=?').get(matchId)
  if (!match || match.status !== 'finished' || !match.phase_id) return null

  const phase = db.prepare('SELECT * FROM phases WHERE id=?').get(match.phase_id)
  if (!phase || phase.type !== 'knockout') return null

  // Determine winner (draw = no auto-advance, admin decides)
  const winnerId = match.home_score > match.away_score ? match.home_team
    : match.away_score > match.home_score ? match.away_team
    : null
  if (!winnerId) return { draw: true, message: 'Empate — avance manual requerido' }

  // Position of this match within its round (0-indexed by id order)
  const siblings = db.prepare('SELECT id FROM matches WHERE round_id=? ORDER BY id ASC').all(match.round_id)
  const myIndex  = siblings.findIndex(m => m.id === matchId)
  const nextSlot = Math.floor(myIndex / 2)
  const isHome   = myIndex % 2 === 0  // even → home, odd → away

  const currRound = db.prepare('SELECT * FROM rounds WHERE id=?').get(match.round_id)
  const nextRound = db.prepare(
    "SELECT * FROM rounds WHERE phase_id=? AND order_index>? AND name != 'Tercer Lugar' ORDER BY order_index ASC LIMIT 1"
  ).get(match.phase_id, currRound.order_index)

  // Cuando este partido alimenta la Final, verificar si todas las semis terminaron
  // para crear automáticamente el partido de Tercer Lugar
  if (nextRound && /^final$/i.test(nextRound.name)) {
    const pendingInRound = db.prepare(
      "SELECT COUNT(*) as c FROM matches WHERE round_id=? AND status != 'finished'"
    ).get(match.round_id).c

    if (pendingInRound === 0) {
      // Todas las semis terminaron — recolectar los dos perdedores
      const semiMatches = db.prepare(
        'SELECT * FROM matches WHERE round_id=? AND status=\'finished\' ORDER BY id ASC'
      ).all(match.round_id)
      const losers = semiMatches.map(m =>
        m.home_score > m.away_score ? m.away_team : m.home_team
      ).filter(Boolean)

      if (losers.length >= 2) {
        // Buscar o crear el round "Tercer Lugar"
        let tercerRound = db.prepare(
          "SELECT * FROM rounds WHERE phase_id=? AND name='Tercer Lugar' LIMIT 1"
        ).get(match.phase_id)

        if (!tercerRound) {
          // Insertar Tercer Lugar ANTES de Final:
          // Mover Final al siguiente order_index y poner Tercer Lugar en el actual
          const tercerIdx = nextRound.order_index
          db.prepare('UPDATE rounds SET order_index=order_index+1 WHERE phase_id=? AND order_index>=?')
            .run(match.phase_id, tercerIdx)
          const r = db.prepare(
            'INSERT INTO rounds (phase_id, name, order_index) VALUES (?,?,?)'
          ).run(match.phase_id, 'Tercer Lugar', tercerIdx)
          tercerRound = db.prepare('SELECT * FROM rounds WHERE id=?').get(r.lastInsertRowid)
        }

        // Solo crear el partido si aún no existe en ese round
        const existing = db.prepare(
          'SELECT COUNT(*) as c FROM matches WHERE round_id=?'
        ).get(tercerRound.id).c

        if (!existing) {
          db.prepare(`
            INSERT INTO matches (tournament_id,category_id,phase_id,round_id,home_team,away_team,bracket_slot,location,status,home_is_tbd,away_is_tbd)
            VALUES (?,?,?,?,?,?,0,?,\'scheduled\',0,0)
          `).run(
            match.tournament_id, match.category_id, match.phase_id, tercerRound.id,
            losers[0], losers[1], null  /* fecha/cancha se asignan manualmente */
          )
          io?.to(`tournament:${match.tournament_id}`).emit('bracket:third_place_created', {
            phaseId: match.phase_id
          })
        }
      }
    }
  }

  if (!nextRound) {
    // Final — emit champion
    const champion = db.prepare('SELECT * FROM teams WHERE id=?').get(winnerId)
    io?.to(`tournament:${match.tournament_id}`).emit('bracket:champion', {
      team: champion, phaseId: match.phase_id, phaseName: phase.name
    })
    return { champion: champion.name }
  }

  // Find the target TBD match in next round at nextSlot (ordered by id/slot)
  const nextMatches = db.prepare(
    'SELECT * FROM matches WHERE round_id=? ORDER BY COALESCE(bracket_slot, id) ASC'
  ).all(nextRound.id)

  let targetMatch = nextMatches[nextSlot]
  if (targetMatch) {
    // El partido ya existe — actualizar solo el equipo correspondiente y limpiar flag TBD
    const col    = isHome ? 'home_team'    : 'away_team'
    const tbdCol = isHome ? 'home_is_tbd'  : 'away_is_tbd'
    db.prepare(`UPDATE matches SET ${col}=?, ${tbdCol}=0 WHERE id=?`).run(winnerId, targetMatch.id)
    targetMatch = db.prepare('SELECT * FROM matches WHERE id=?').get(targetMatch.id)
  } else {
    // Crear el partido placeholder.
    // home_team y away_team son NOT NULL → se usa winnerId en ambos slots
    // pero se marca el slot opuesto como TBD para que el frontend lo muestre correctamente.
    const homeTbd = isHome ? 0 : 1   // si el ganador va a home, away está TBD
    const awayTbd = isHome ? 1 : 0   // si el ganador va a away, home está TBD
    const r = db.prepare(`
      INSERT INTO matches (tournament_id,category_id,phase_id,round_id,home_team,away_team,bracket_slot,location,status,home_is_tbd,away_is_tbd)
      VALUES (?,?,?,?,?,?,?,?,'scheduled',?,?)
    `).run(
      match.tournament_id, match.category_id, match.phase_id, nextRound.id,
      winnerId, winnerId, nextSlot, null /* fecha/cancha se asignan manualmente */, homeTbd, awayTbd
    )
    targetMatch = db.prepare('SELECT * FROM matches WHERE id=?').get(r.lastInsertRowid)
  }

  // Emit realtime bracket update
  io?.to(`tournament:${match.tournament_id}`).emit('bracket:advance', {
    phaseId: match.phase_id, updatedMatch: targetMatch, winnerId
  })

  // Check if whole round is done → emit round_complete
  const allDone = db.prepare(
    "SELECT COUNT(*) as c FROM matches WHERE round_id=? AND status!='finished'"
  ).get(match.round_id).c === 0
  if (allDone) {
    io?.to(`tournament:${match.tournament_id}`).emit('bracket:round_complete', {
      roundId: match.round_id, roundName: currRound.name, nextRoundId: nextRound.id
    })
  }
  return { advanced: winnerId, nextMatchId: targetMatch.id }
}

// ── Check if phase is fully complete ─────────────────────────────────────
function checkPhaseCompletion(phaseId, io) {
  const phase = db.prepare('SELECT * FROM phases WHERE id=?').get(phaseId)
  if (!phase) return

  let isComplete = false

  if (phase.type === 'knockout') {
    // Para knockout: la fase está "completa para premios" cuando el partido Final termina.
    // No esperar el Tercer Lugar (puede no jugarse o ser posterior).
    const finalRound = db.prepare(
      "SELECT * FROM rounds WHERE phase_id=? AND name != 'Tercer Lugar' ORDER BY order_index DESC LIMIT 1"
    ).get(phaseId)
    if (finalRound) {
      const total    = db.prepare("SELECT COUNT(*) as c FROM matches WHERE round_id=?").get(finalRound.id).c
      const finished = db.prepare("SELECT COUNT(*) as c FROM matches WHERE round_id=? AND status='finished'").get(finalRound.id).c
      isComplete = total > 0 && total === finished
    }
  } else {
    const total    = db.prepare("SELECT COUNT(*) as c FROM matches WHERE phase_id=?").get(phaseId).c
    const finished = db.prepare("SELECT COUNT(*) as c FROM matches WHERE phase_id=? AND status='finished'").get(phaseId).c
    isComplete = total > 0 && total === finished
  }

  if (isComplete) {
    autoGenerateAwardsForPhase(phaseId)
    io?.to(`tournament:${phase.tournament_id}`).emit('phase:complete', {
      phaseId, phaseName: phase.name, type: phase.type
    })
  }
}

// ── Auto-generate awards when a phase completes ───────────────────────────
function autoGenerateAwardsForPhase(phaseId) {
  const phase = db.prepare('SELECT * FROM phases WHERE id=?').get(phaseId)
  if (!phase) return

  // Idempotencia por tipo: no duplicar un award del mismo tipo para la misma fase
  const existingTypes = new Set(
    db.prepare("SELECT type FROM awards WHERE phase_id=? AND auto_generated=1").all(phaseId).map(r => r.type)
  )

  // Si la fase no tiene category_id, inferirlo desde los equipos de sus partidos
  let categoryId = phase.category_id
  if (!categoryId) {
    const inferred = db.prepare(`
      SELECT t.category_id FROM matches m
      JOIN teams t ON m.home_team = t.id
      WHERE m.phase_id = ? AND t.category_id IS NOT NULL LIMIT 1
    `).get(phaseId)
    categoryId = inferred?.category_id || null
  }

  const ins = db.prepare(
    'INSERT INTO awards (tournament_id,category_id,phase_id,type,player_id,team_id,description,auto_generated) VALUES (?,?,?,?,?,?,?,1)'
  )
  // Usar categoryId inferido en lugar de phase.category_id
  const cat = categoryId

  if (phase.type === 'league' || phase.type === 'groups') {
    // Goleador
    if (!existingTypes.has('top_scorer')) {
      const topScorer = db.prepare(`
        SELECT p.id AS player_id, t.id AS team_id, COUNT(*) AS goals
        FROM match_events e
        JOIN matches m ON e.match_id = m.id
        JOIN players p ON e.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        WHERE m.phase_id = ? AND e.type = 'goal'
        GROUP BY p.id ORDER BY goals DESC LIMIT 1
      `).get(phaseId)
      if (topScorer) {
        ins.run(phase.tournament_id, cat, phaseId, 'top_scorer',
          topScorer.player_id, topScorer.team_id,
          `${topScorer.goals} gol${topScorer.goals !== 1 ? 'es' : ''} en la fase`)
      }
    }

    // MVP / Asistidor
    if (!existingTypes.has('mvp')) {
      const topAssist = db.prepare(`
        SELECT p.id AS player_id, t.id AS team_id, COUNT(*) AS assists
        FROM match_events e
        JOIN matches m ON e.match_id = m.id
        JOIN players p ON e.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        WHERE m.phase_id = ? AND e.type = 'assist'
        GROUP BY p.id ORDER BY assists DESC LIMIT 1
      `).get(phaseId)
      if (topAssist && topAssist.assists > 0) {
        ins.run(phase.tournament_id, cat, phaseId, 'mvp',
          topAssist.player_id, topAssist.team_id,
          `${topAssist.assists} asistencia${topAssist.assists !== 1 ? 's' : ''} en la fase`)
      }
    }

    // Mejor Portero: equipo con menos goles recibidos (mín. 1 partido)
    if (!existingTypes.has('best_keeper')) {
      const bestKeeper = db.prepare(`
        SELECT t.id AS team_id,
               SUM(CASE WHEN m.home_team=t.id THEN m.away_score ELSE m.home_score END) AS goals_against,
               COUNT(m.id) AS played
        FROM teams t
        JOIN matches m ON (m.home_team=t.id OR m.away_team=t.id)
        WHERE m.phase_id=? AND m.status='finished'
        GROUP BY t.id
        HAVING played > 0
        ORDER BY goals_against ASC, played DESC LIMIT 1
      `).get(phaseId)
      if (bestKeeper) {
        const keeper = db.prepare(
          "SELECT id FROM players WHERE team_id=? AND LOWER(COALESCE(position,'')) LIKE '%port%' LIMIT 1"
        ).get(bestKeeper.team_id)
        ins.run(phase.tournament_id, cat, phaseId, 'best_keeper',
          keeper?.id || null, bestKeeper.team_id,
          `${bestKeeper.goals_against} goles recibidos · ${bestKeeper.played} PJ`)
      }
    }

  } else if (phase.type === 'knockout') {
    // Campeón
    if (!existingTypes.has('best_team')) {
      const finalRound = db.prepare(
        "SELECT * FROM rounds WHERE phase_id=? AND name != 'Tercer Lugar' ORDER BY order_index DESC LIMIT 1"
      ).get(phaseId)
      if (finalRound) {
        const finalMatch = db.prepare(
          "SELECT * FROM matches WHERE round_id=? AND status='finished' ORDER BY id DESC LIMIT 1"
        ).get(finalRound.id)
        if (finalMatch) {
          const championId = finalMatch.home_score > finalMatch.away_score
            ? finalMatch.home_team
            : finalMatch.away_score > finalMatch.home_score
            ? finalMatch.away_team : null
          if (championId) {
            ins.run(phase.tournament_id, cat, phaseId, 'best_team',
              null, championId, `Campeón de ${phase.name}`)
          }
        }
      }
    }

    // Goleador de la eliminatoria
    if (!existingTypes.has('top_scorer')) {
      const topKnockout = db.prepare(`
        SELECT p.id AS player_id, t.id AS team_id, COUNT(*) AS goals
        FROM match_events e
        JOIN matches m ON e.match_id=m.id
        JOIN players p ON e.player_id=p.id
        JOIN teams t ON p.team_id=t.id
        WHERE m.phase_id=? AND e.type='goal'
        GROUP BY p.id ORDER BY goals DESC LIMIT 1
      `).get(phaseId)
      if (topKnockout && topKnockout.goals > 0) {
        ins.run(phase.tournament_id, cat, phaseId, 'top_scorer',
          topKnockout.player_id, topKnockout.team_id,
          `${topKnockout.goals} gol${topKnockout.goals !== 1 ? 'es' : ''} en la eliminatoria`)
      }
    }
  }
}

// ── Match Generator ───────────────────────────────────────────────────────
router.post('/matches/generate', authMiddleware, adminOnly, (req,res) => {
  const {tournamentId,categoryId,phaseId,teamIds,type,startDate,location,roundMinutes} = req.body
  if(!teamIds?.length) return res.status(400).json({error:'Se requieren equipos'})
  const generated = []
  const insMatch = db.prepare(`
    INSERT INTO matches (tournament_id,category_id,phase_id,round_id,home_team,away_team,bracket_slot,date,location,status)
    VALUES (?,?,?,?,?,?,?,?,?,'scheduled')
  `)
  // NOTA: fecha y cancha NUNCA se asignan automáticamente — deben ser gestionadas manualmente

  if (type === 'round_robin') {
    let teams = [...teamIds]
    if (teams.length % 2 !== 0) teams.push(null)
    const n = teams.length, fixed = teams[0], rotating = teams.slice(1)

    for (let ri = 0; ri < n - 1; ri++) {
      const roundTeams = [fixed, ...rotating]
      const pairs = []
      for (let i = 0; i < n / 2; i++) {
        const h = roundTeams[i], a = roundTeams[n - 1 - i]
        if (h !== null && a !== null) pairs.push([h, a])
      }
      if (!pairs.length) { rotating.unshift(rotating.pop()); continue }

      const rr = db.prepare('INSERT INTO rounds (phase_id,name,order_index) VALUES (?,?,?)').run(phaseId, `Jornada ${ri+1}`, ri)
      pairs.forEach(([h, a], slot) => {
        // Fecha y cancha NULL — el admin las asigna manualmente
        const r = insMatch.run(tournamentId, categoryId||null, phaseId||null, rr.lastInsertRowid, h, a, slot, null, null)
        generated.push(r.lastInsertRowid)
      })
      rotating.unshift(rotating.pop())
    }

  } else if (type === 'knockout') {
    let pow2 = 1; while (pow2 < teamIds.length) pow2 *= 2
    const allRounds = []
    let roundSize = pow2, roundIdx = 0
    while (roundSize >= 2) {
      const name = roundSize===2?'Final': roundSize===4?'Semifinal': roundSize===8?'Cuartos de Final': roundSize===16?'Octavos de Final': `Ronda ${roundIdx+1}`
      const rr = db.prepare('INSERT INTO rounds (phase_id,name,order_index) VALUES (?,?,?)').run(phaseId, name, roundIdx)
      allRounds.push({ id: rr.lastInsertRowid, size: roundSize, idx: roundIdx })
      roundSize /= 2; roundIdx++
    }

    const seeded = [...teamIds]; while (seeded.length < pow2) seeded.push(null)
    for (let slot = 0; slot < pow2/2; slot++) {
      const home = seeded[slot*2], away = seeded[slot*2+1]
      if (!home && !away) continue
      // Fecha y cancha NULL — el admin las asigna manualmente
      const r = insMatch.run(tournamentId, categoryId||null, phaseId||null, allRounds[0].id,
        home || away, away || home, slot, null, null)
      generated.push(r.lastInsertRowid)
      if (!home || !away) {
        db.prepare("UPDATE matches SET status='finished',home_score=1,away_score=0 WHERE id=?").run(r.lastInsertRowid)
      }
    }

    for (let ri = 1; ri < allRounds.length; ri++) {
      const { id: rid, size } = allRounds[ri]
      for (let slot = 0; slot < size/2; slot++) {
        // Fecha y cancha NULL — el admin las asigna manualmente
        insMatch.run(tournamentId, categoryId||null, phaseId||null, rid, null, null, slot, null, null)
      }
    }

    // Process any byes from round 1 so their winners appear in round 2
    const byeMatches = db.prepare("SELECT id FROM matches WHERE round_id=? AND status='finished' ORDER BY id ASC").all(allRounds[0].id)
    for (const m of byeMatches) advanceBracketWinner(m.id, null)
  }

  res.status(201).json({ generated: generated.length, matchIds: generated })
})

// ── Standings ─────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/standings', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  const catId   = req.query.cat   ? parseInt(req.query.cat)   : null
  const phaseId = req.query.phase ? parseInt(req.query.phase) : null

  // Si se pide una fase específica de tipo 'league', calcular en vivo con desempate completo
  if (phaseId) {
    const phase = db.prepare('SELECT * FROM phases WHERE id=?').get(phaseId)
    if (phase?.type === 'league') {
      const rows = getPhaseStandings(phaseId)
      return res.json(rows.map(r => ({
        ...r, goalDiff: r.goals_for - r.goals_against,
        goalsFor: r.goals_for, goalsAgainst: r.goals_against
      })))
    }
  }

  // Para categoría sin fase: calcular desde todas las fases de liga activas
  if (catId && !phaseId) {
    const phases = db.prepare(`SELECT * FROM phases WHERE tournament_id=? AND category_id=? AND type='league' ORDER BY order_index`).all(t.id, catId)
    if (phases.length) {
      const allRows = []
      for (const p of phases) {
        const rows = getPhaseStandings(p.id)
        allRows.push(...rows.map(r => ({ ...r, phaseName: p.name, goalDiff: r.goals_for - r.goals_against, goalsFor: r.goals_for, goalsAgainst: r.goals_against })))
      }
      return res.json(allRows)
    }
  }

  // Fallback: standings tabla (para compatibilidad)
  let sql = `SELECT s.*,te.name AS teamName,te.logo,(s.goals_for-s.goals_against) AS goalDiff,c.name AS categoryName
    FROM standings s JOIN teams te ON s.team_id=te.id LEFT JOIN categories c ON s.category_id=c.id
    WHERE s.tournament_id=? AND s.group_id IS NULL`
  const params = [t.id]
  if (catId)   { sql+=' AND s.category_id=?';  params.push(catId) }
  if (phaseId) { sql+=' AND s.phase_id=?';     params.push(phaseId) }
  sql += ' ORDER BY s.points DESC,(s.goals_for-s.goals_against) DESC,s.goals_for DESC'
  res.json(db.prepare(sql).all(...params))
})

// ── Streams ───────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/streams', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const rows = catId
    ? db.prepare('SELECT s.*,c.name AS categoryName FROM streams s LEFT JOIN categories c ON s.category_id=c.id WHERE s.tournament_id=? AND (s.category_id=? OR s.category_id IS NULL) ORDER BY s.is_live DESC,s.id DESC').all(t.id,catId)
    : db.prepare('SELECT s.*,c.name AS categoryName FROM streams s LEFT JOIN categories c ON s.category_id=c.id WHERE s.tournament_id=? ORDER BY s.is_live DESC,s.id DESC').all(t.id)
  res.json(rows)
})
router.post('/streams', authMiddleware, adminOnly, (req,res) => {
  const {tournamentId,categoryId,matchId,platform,title,url,thumbnail} = req.body
  const r = db.prepare('INSERT INTO streams (tournament_id,category_id,match_id,platform,title,url,thumbnail,is_live) VALUES (?,?,?,?,?,?,?,0)').run(tournamentId,categoryId||null,matchId,platform,title,url,thumbnail)
  res.status(201).json(db.prepare('SELECT * FROM streams WHERE id=?').get(r.lastInsertRowid))
})
router.patch('/streams/:id/live', authMiddleware, adminOnly, (req,res) => {
  const {isLive} = req.body
  db.prepare('UPDATE streams SET is_live=? WHERE id=?').run(isLive?1:0,req.params.id)
  const s = db.prepare('SELECT * FROM streams WHERE id=?').get(req.params.id)
  req.io?.emit('stream:update',s); res.json(s)
})
router.delete('/streams/:id', authMiddleware, adminOnly, (req,res) => {
  db.prepare('DELETE FROM streams WHERE id=?').run(req.params.id); res.status(204).end()
})

// ── News ──────────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/news', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  res.json(db.prepare('SELECT * FROM news WHERE tournament_id=? ORDER BY created_at DESC').all(t.id))
})
router.get('/news/:id', (req,res) => {
  const row = db.prepare('SELECT * FROM news WHERE id=?').get(req.params.id)
  if(!row) return notFound(res); res.json(row)
})
router.post('/news', authMiddleware, adminOnly, (req,res) => {
  const {tournamentId,title,content,cover} = req.body
  const r = db.prepare('INSERT INTO news (tournament_id,title,content,cover) VALUES (?,?,?,?)').run(tournamentId,title,content,cover)
  // Notify followers of any team in this tournament
  const teamIds = db.prepare('SELECT id FROM teams WHERE tournament_id=?').all(tournamentId).map(t => t.id)
  global.sendPushToTeams?.(teamIds, { type:'news', title:'📰 Nueva noticia', body: title, url:'/noticias' })
  res.status(201).json(db.prepare('SELECT * FROM news WHERE id=?').get(r.lastInsertRowid))
})
router.put('/news/:id', authMiddleware, adminOnly, (req,res) => {
  const {title,content,cover} = req.body
  db.prepare('UPDATE news SET title=?,content=?,cover=? WHERE id=?').run(title,content,cover,req.params.id)
  res.json(db.prepare('SELECT * FROM news WHERE id=?').get(req.params.id))
})
router.delete('/news/:id', authMiddleware, adminOnly, (req,res) => {
  db.prepare('DELETE FROM news WHERE id=?').run(req.params.id); res.status(204).end()
})

// ── Sponsors ──────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/sponsors', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  res.json(db.prepare('SELECT * FROM sponsors WHERE tournament_id=? ORDER BY id').all(t.id))
})
router.post('/sponsors', authMiddleware, adminOnly, (req,res) => {
  const {tournamentId,name,logo,url} = req.body
  const r = db.prepare('INSERT INTO sponsors (tournament_id,name,logo,url) VALUES (?,?,?,?)').run(tournamentId,name,logo,url)
  res.status(201).json(db.prepare('SELECT * FROM sponsors WHERE id=?').get(r.lastInsertRowid))
})
router.put('/sponsors/:id', authMiddleware, adminOnly, (req,res) => {
  const {name,logo,url} = req.body
  db.prepare('UPDATE sponsors SET name=?,logo=?,url=? WHERE id=?').run(name,logo,url,req.params.id)
  res.json(db.prepare('SELECT * FROM sponsors WHERE id=?').get(req.params.id))
})
router.delete('/sponsors/:id', authMiddleware, adminOnly, (req,res) => {
  db.prepare('DELETE FROM sponsors WHERE id=?').run(req.params.id); res.status(204).end()
})

// ── Banners ───────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/banners', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  const pos = req.query.position
  const rows = pos
    ? db.prepare("SELECT * FROM banners WHERE tournament_id=? AND position=? AND is_active=1 AND (ends_at IS NULL OR ends_at >= date('now')) ORDER BY id").all(t.id,pos)
    : db.prepare("SELECT * FROM banners WHERE tournament_id=? ORDER BY position,id").all(t.id)
  res.json(rows)
})
router.post('/banners', authMiddleware, adminOnly, (req,res) => {
  const {tournamentId,position,image_url,link_url,alt_text,starts_at,ends_at} = req.body
  const r = db.prepare('INSERT INTO banners (tournament_id,position,image_url,link_url,alt_text,starts_at,ends_at,is_active) VALUES (?,?,?,?,?,?,?,1)').run(tournamentId,position,image_url,link_url,alt_text,starts_at||null,ends_at||null)
  res.status(201).json(db.prepare('SELECT * FROM banners WHERE id=?').get(r.lastInsertRowid))
})
router.put('/banners/:id', authMiddleware, adminOnly, (req,res) => {
  const {position,image_url,link_url,alt_text,starts_at,ends_at,is_active} = req.body
  db.prepare('UPDATE banners SET position=?,image_url=?,link_url=?,alt_text=?,starts_at=?,ends_at=?,is_active=? WHERE id=?').run(position,image_url,link_url,alt_text,starts_at||null,ends_at||null,is_active?1:0,req.params.id)
  res.json(db.prepare('SELECT * FROM banners WHERE id=?').get(req.params.id))
})
router.delete('/banners/:id', authMiddleware, adminOnly, (req,res) => {
  db.prepare('DELETE FROM banners WHERE id=?').run(req.params.id); res.status(204).end()
})

// ── Galleries ─────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/galleries', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const galleries = catId
    ? db.prepare('SELECT * FROM galleries WHERE tournament_id=? AND (category_id=? OR category_id IS NULL) ORDER BY created_at DESC').all(t.id, catId)
    : db.prepare('SELECT * FROM galleries WHERE tournament_id=? ORDER BY created_at DESC').all(t.id)
  res.json(galleries.map(g => ({...g, images: db.prepare('SELECT * FROM gallery_images WHERE gallery_id=?').all(g.id)})))
})
router.post('/galleries', authMiddleware, adminOnly, (req,res) => {
  const {tournamentId,title,cover,categoryId} = req.body
  const r = db.prepare('INSERT INTO galleries (tournament_id,category_id,title,cover) VALUES (?,?,?,?)').run(tournamentId,categoryId||null,title,cover)
  res.status(201).json(db.prepare('SELECT * FROM galleries WHERE id=?').get(r.lastInsertRowid))
})
router.delete('/galleries/:id', authMiddleware, adminOnly, (req,res) => {
  db.prepare('DELETE FROM galleries WHERE id=?').run(req.params.id); res.status(204).end()
})
router.post('/gallery-images', authMiddleware, adminOnly, (req,res) => {
  const {galleryId,imageUrl,description} = req.body
  const r = db.prepare('INSERT INTO gallery_images (gallery_id,image_url,description) VALUES (?,?,?)').run(galleryId,imageUrl,description||'')
  res.status(201).json(db.prepare('SELECT * FROM gallery_images WHERE id=?').get(r.lastInsertRowid))
})
router.delete('/gallery-images/:id', authMiddleware, adminOnly, (req,res) => {
  db.prepare('DELETE FROM gallery_images WHERE id=?').run(req.params.id); res.status(204).end()
})

// ── Inscriptions ──────────────────────────────────────────────────────────
router.get('/tournaments/:slug/inscriptions', authMiddleware, adminOnly, (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  const rows = db.prepare(`SELECT i.*,c.name AS categoryName FROM inscriptions i LEFT JOIN categories c ON i.category_id=c.id WHERE i.tournament_id=? ORDER BY i.created_at DESC`).all(t.id)
  const result = rows.map(r => ({...r, players: db.prepare('SELECT * FROM inscription_players WHERE inscription_id=?').all(r.id)}))
  res.json(result)
})
router.post('/inscriptions', (req,res) => {  // Public — no auth
  const {tournamentId,categoryId,team_name,contact_name,contact_email,contact_phone,players_count,notes,players} = req.body
  if(!team_name||!contact_name||!contact_email) return res.status(400).json({error:'Campos requeridos faltantes'})
  const r = db.prepare('INSERT INTO inscriptions (tournament_id,category_id,team_name,contact_name,contact_email,contact_phone,players_count,notes,status) VALUES (?,?,?,?,?,?,?,?,\'pending\')').run(tournamentId,categoryId||null,team_name,contact_name,contact_email,contact_phone||null,players_count||0,notes||null)
  const id = r.lastInsertRowid
  if(players?.length) {
    const insP = db.prepare('INSERT INTO inscription_players (inscription_id,name,number,position,birth_date) VALUES (?,?,?,?,?)')
    for(const p of players) insP.run(id,p.name,p.number||null,p.position||null,p.birth_date||null)
  }
  res.status(201).json({id, message:'Solicitud enviada correctamente'})
})
router.patch('/inscriptions/:id/status', authMiddleware, adminOnly, (req,res) => {
  const {status} = req.body
  db.prepare('UPDATE inscriptions SET status=? WHERE id=?').run(status,req.params.id)
  const insc = db.prepare('SELECT * FROM inscriptions WHERE id=?').get(req.params.id)
  // Auto-create team when approved — sin categoría para que el admin la asigne
  if (status === 'approved' && insc) {
    const existing = db.prepare('SELECT id FROM teams WHERE name=? AND tournament_id=?').get(insc.team_name, insc.tournament_id)
    if (!existing) {
      // category_id = null: el admin asignará la categoría desde el panel de Equipos
      const teamR = db.prepare('INSERT INTO teams (tournament_id,category_id,name,inscription_id) VALUES (?,?,?,?)')
        .run(insc.tournament_id, null, insc.team_name, insc.id)
      const players = db.prepare('SELECT * FROM inscription_players WHERE inscription_id=?').all(insc.id)
      const insPlayer = db.prepare('INSERT INTO players (team_id,name,number,position) VALUES (?,?,?,?)')
      for (const p of players) insPlayer.run(teamR.lastInsertRowid, p.name, p.number, p.position)
    }
  }
  res.json(insc)
})
// Alias sin /status — el panel admin hace PATCH /inscriptions/:id directamente
router.patch('/inscriptions/:id', authMiddleware, adminOnly, (req,res) => {
  const {status, notes} = req.body
  if (status) db.prepare('UPDATE inscriptions SET status=? WHERE id=?').run(status, req.params.id)
  if (notes !== undefined) db.prepare('UPDATE inscriptions SET notes=? WHERE id=?').run(notes, req.params.id)
  const insc = db.prepare('SELECT * FROM inscriptions WHERE id=?').get(req.params.id)
  if (!insc) return res.status(404).json({error:'Inscripción no encontrada'})
  if (status === 'approved') {
    const existing = db.prepare('SELECT id FROM teams WHERE name=? AND tournament_id=?').get(insc.team_name, insc.tournament_id)
    if (!existing) {
      const teamR = db.prepare('INSERT INTO teams (tournament_id,category_id,name,inscription_id) VALUES (?,?,?,?)')
        .run(insc.tournament_id, null, insc.team_name, insc.id)
      const players = db.prepare('SELECT * FROM inscription_players WHERE inscription_id=?').all(insc.id)
      const insPlayer = db.prepare('INSERT INTO players (team_id,name,number,position) VALUES (?,?,?,?)')
      for (const p of players) insPlayer.run(teamR.lastInsertRowid, p.name, p.number, p.position)
    }
  }
  res.json(insc)
})
router.delete('/inscriptions/:id', authMiddleware, adminOnly, (req,res) => {
  db.prepare('DELETE FROM inscriptions WHERE id=?').run(req.params.id); res.status(204).end()
})

// ── Awards ────────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/awards', (req,res) => {
  const t = getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const base = `SELECT a.*,p.name AS playerName,p.photo AS playerPhoto,te.name AS teamName,te.logo AS teamLogo,c.name AS categoryName FROM awards a LEFT JOIN players p ON a.player_id=p.id LEFT JOIN teams te ON a.team_id=te.id LEFT JOIN categories c ON a.category_id=c.id`
  const rows = catId
    ? db.prepare(`${base} WHERE a.tournament_id=? AND a.category_id=? ORDER BY a.id`).all(t.id,catId)
    : db.prepare(`${base} WHERE a.tournament_id=? ORDER BY a.id`).all(t.id)
  res.json(rows)
})
router.post('/awards', authMiddleware, adminOnly, (req,res) => {
  const {tournamentId,categoryId,phaseId,type,playerId,teamId,description} = req.body
  const r = db.prepare('INSERT INTO awards (tournament_id,category_id,phase_id,type,player_id,team_id,description,auto_generated) VALUES (?,?,?,?,?,?,?,0)').run(tournamentId,categoryId||null,phaseId||null,type,playerId||null,teamId||null,description||null)
  res.status(201).json(db.prepare('SELECT * FROM awards WHERE id=?').get(r.lastInsertRowid))
})
router.put('/awards/:id', authMiddleware, adminOnly, (req,res) => {
  const {type,playerId,teamId,description} = req.body
  db.prepare('UPDATE awards SET type=?,player_id=?,team_id=?,description=? WHERE id=?').run(type,playerId||null,teamId||null,description||null,req.params.id)
  res.json(db.prepare(`SELECT a.*,p.name AS playerName,p.photo AS playerPhoto,te.name AS teamName,te.logo AS teamLogo,c.name AS categoryName FROM awards a LEFT JOIN players p ON a.player_id=p.id LEFT JOIN teams te ON a.team_id=te.id LEFT JOIN categories c ON a.category_id=c.id WHERE a.id=?`).get(req.params.id))
})
router.delete('/awards/:id', authMiddleware, adminOnly, (req,res) => {
  db.prepare('DELETE FROM awards WHERE id=?').run(req.params.id); res.status(204).end()
})
// Escanear todas las fases completas y generar premios faltantes (one-shot)
router.post('/admin/awards/scan-all', authMiddleware, adminOnly, (req, res) => {
  // Fases non-knockout: completas cuando todos los partidos están terminados
  const regularCompleted = db.prepare(`
    SELECT ph.id FROM phases ph
    WHERE ph.type != 'knockout'
      AND NOT EXISTS (SELECT 1 FROM awards a WHERE a.phase_id = ph.id AND a.auto_generated = 1)
      AND (SELECT COUNT(*) FROM matches m WHERE m.phase_id = ph.id) > 0
      AND (SELECT COUNT(*) FROM matches m WHERE m.phase_id = ph.id) =
          (SELECT COUNT(*) FROM matches m WHERE m.phase_id = ph.id AND m.status = 'finished')
  `).all()

  // Fases knockout: completas cuando el Final round (sin Tercer Lugar) tiene todos sus partidos terminados
  // Incluir fases con category_id NULL (pueden no tener categoría asignada)
  const knockoutPhases = db.prepare(
    "SELECT id FROM phases WHERE type = 'knockout' AND NOT EXISTS (SELECT 1 FROM awards a WHERE a.phase_id = phases.id AND a.auto_generated = 1)"
  ).all()

  const knockoutCompleted = []
  for (const ph of knockoutPhases) {
    const finalRound = db.prepare(
      "SELECT * FROM rounds WHERE phase_id=? AND name != 'Tercer Lugar' ORDER BY order_index DESC LIMIT 1"
    ).get(ph.id)
    if (!finalRound) continue
    const total    = db.prepare("SELECT COUNT(*) as c FROM matches WHERE round_id=?").get(finalRound.id).c
    const finished = db.prepare("SELECT COUNT(*) as c FROM matches WHERE round_id=? AND status='finished'").get(finalRound.id).c
    if (total > 0 && total === finished) knockoutCompleted.push(ph)
  }

  // Corregir awards auto-generados que tienen category_id NULL (por fases sin categoría asignada)
  const nullCatAwards = db.prepare(`
    SELECT a.id, m.phase_id, t.category_id
    FROM awards a
    JOIN phases ph ON a.phase_id = ph.id
    JOIN matches m ON m.phase_id = ph.id
    JOIN teams t ON m.home_team = t.id AND t.category_id IS NOT NULL
    WHERE a.auto_generated = 1 AND a.category_id IS NULL
    GROUP BY a.id
  `).all()
  for (const row of nullCatAwards) {
    db.prepare('UPDATE awards SET category_id=? WHERE id=?').run(row.category_id, row.id)
  }

  const allCompleted = [...regularCompleted, ...knockoutCompleted]
  for (const p of allCompleted) autoGenerateAwardsForPhase(p.id)
  res.json({ scanned: allCompleted.length, fixed: nullCatAwards.length })
})

// Re-generar premios de una fase manualmente (sobreescribe los auto-generados)
router.post('/phases/:id/awards/regenerate', authMiddleware, adminOnly, (req,res) => {
  const phaseId = parseInt(req.params.id)
  db.prepare('DELETE FROM awards WHERE phase_id=? AND auto_generated=1').run(phaseId)
  autoGenerateAwardsForPhase(phaseId)
  const awards = db.prepare(`SELECT a.*,p.name AS playerName,te.name AS teamName,c.name AS categoryName FROM awards a LEFT JOIN players p ON a.player_id=p.id LEFT JOIN teams te ON a.team_id=te.id LEFT JOIN categories c ON a.category_id=c.id WHERE a.phase_id=?`).all(phaseId)
  res.json({ ok:true, awards })
})
// Categorías con fases completadas sin premios (para el dashboard)
router.get('/admin/pending-awards', authMiddleware, adminOnly, (req,res) => {
  const rows = db.prepare(`
    SELECT ph.id AS phase_id, ph.name AS phase_name, ph.type AS phase_type,
           t.id AS tournament_id, t.name AS tournament_name, t.slug,
           c.id AS category_id, c.name AS category_name,
           COUNT(m.id) AS total_matches,
           SUM(CASE WHEN m.status='finished' THEN 1 ELSE 0 END) AS finished_matches
    FROM phases ph
    JOIN tournaments t ON ph.tournament_id = t.id
    LEFT JOIN categories c ON ph.category_id = c.id
    LEFT JOIN matches m ON m.phase_id = ph.id
    WHERE NOT EXISTS (SELECT 1 FROM awards a WHERE a.phase_id = ph.id AND a.auto_generated=1)
    GROUP BY ph.id
    HAVING total_matches > 0 AND total_matches = finished_matches
    ORDER BY t.name, c.name, ph.order_index
  `).all()
  res.json(rows)
})

// ── Phase Groups ─────────────────────────────────────────────────────────

// Get groups of a phase (with teams + standings)
router.get('/phases/:id/groups', (req, res) => {
  const phaseId = req.params.id
  const groups  = db.prepare('SELECT * FROM phase_groups WHERE phase_id=? ORDER BY order_index').all(phaseId)
  const result  = groups.map(g => {
    const teams   = db.prepare(`
      SELECT t.* FROM teams t JOIN phase_group_teams pgt ON t.id=pgt.team_id WHERE pgt.group_id=?
    `).all(g.id)
    // Usar cálculo en vivo (no la tabla standings que puede estar vacía)
    const standing = getGroupStandings(g.id).map(r => ({ ...r, goalDiff: r.goals_for - r.goals_against }))
    return { ...g, teams, standing }
  })
  res.json(result)
})

// Get group standings (en vivo con desempate completo)
router.get('/phase-groups/:id/standings', (req, res) => {
  const rows = getGroupStandings(parseInt(req.params.id))
  res.json(rows.map(r => ({ ...r, goalDiff: r.goals_for - r.goals_against })))
})

// Get standings de una fase (para ligas)
router.get('/phases/:id/standings', (req, res) => {
  const phase = db.prepare('SELECT * FROM phases WHERE id=?').get(req.params.id)
  if (!phase) return notFound(res)
  if (phase.type === 'groups') {
    // Devolver standings de todos los grupos
    const groups = db.prepare('SELECT * FROM phase_groups WHERE phase_id=? ORDER BY order_index').all(phase.id)
    const result = groups.map((g, gi) => ({
      groupId: g.id, groupName: g.name, advanceCount: g.advance_count,
      standings: getGroupStandings(g.id).map(r => ({ ...r, goalDiff: r.goals_for - r.goals_against }))
    }))
    return res.json(result)
  }
  const rows = getPhaseStandings(phase.id)
  res.json(rows.map(r => ({ ...r, goalDiff: r.goals_for - r.goals_against })))
})

// Get all matches for a phase (used by bracket admin view)
router.get('/phases/:id/matches', (req, res) => {
  const rows = db.prepare(`
    SELECT m.*,
      CASE WHEN COALESCE(m.home_is_tbd,0)=1 THEN NULL ELSE ht.name END AS homeTeam,
      CASE WHEN COALESCE(m.home_is_tbd,0)=1 THEN NULL ELSE ht.logo END AS homeLogo,
      CASE WHEN COALESCE(m.away_is_tbd,0)=1 THEN NULL ELSE at.name END AS awayTeam,
      CASE WHEN COALESCE(m.away_is_tbd,0)=1 THEN NULL ELSE at.logo END AS awayLogo,
      r.name AS roundName
    FROM matches m
    LEFT JOIN teams ht ON m.home_team = ht.id
    LEFT JOIN teams at ON m.away_team = at.id
    LEFT JOIN rounds r ON m.round_id = r.id
    WHERE m.phase_id = ?
    ORDER BY r.order_index ASC, COALESCE(m.bracket_slot,0) ASC, m.id ASC
  `).all(req.params.id)
  const rounds = db.prepare('SELECT * FROM rounds WHERE phase_id=? ORDER BY order_index').all(req.params.id)
  res.json({ matches: rows, rounds })
})

// Get matches for a group
router.get('/phase-groups/:id/matches', (req, res) => {
  const rows = db.prepare(`
    SELECT m.*,ht.name AS homeTeam,at.name AS awayTeam,r.name AS roundName
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    LEFT JOIN rounds r ON m.round_id=r.id WHERE m.group_id=? ORDER BY m.date ASC
  `).all(req.params.id)
  res.json(rows)
})

// Auto-generate groups for a phase
router.post('/phases/:id/groups/generate', authMiddleware, adminOnly, (req, res) => {
  const phaseId = req.params.id
  const { teamIds, groupCount, advanceCount = 2, startDate, location, daysPerRound = 7 } = req.body
  if (!teamIds?.length || !groupCount) return res.status(400).json({ error: 'teamIds y groupCount requeridos' })

  // Eliminar en orden correcto: primero los hijos (matches, rounds) antes que los grupos
  // para evitar FOREIGN KEY constraint (matches.group_id → phase_groups.id sin CASCADE)
  db.prepare('DELETE FROM matches WHERE phase_id=?').run(phaseId)
  db.prepare('DELETE FROM rounds WHERE phase_id=?').run(phaseId)
  db.prepare('DELETE FROM phase_groups WHERE phase_id=?').run(phaseId)

  const phase = db.prepare('SELECT * FROM phases WHERE id=?').get(phaseId)
  if (!phase) return res.status(404).json({ error: 'Fase no encontrada' })

  const groupNames = ['A','B','C','D','E','F','G','H']

  // Snake-draft seeding
  const groupTeams = Array.from({ length: groupCount }, () => [])
  let direction = 1, groupIdx = 0
  for (let i = 0; i < teamIds.length; i++) {
    groupTeams[groupIdx].push(teamIds[i])
    if (direction === 1) {
      if (groupIdx === groupCount - 1) { direction = -1 }
      else groupIdx++
    } else {
      if (groupIdx === 0) { direction = 1 }
      else groupIdx--
    }
  }

  const insGroup = db.prepare('INSERT INTO phase_groups (phase_id,name,order_index,advance_count) VALUES (?,?,?,?)')
  const insGroupTeam = db.prepare('INSERT INTO phase_group_teams (group_id,team_id) VALUES (?,?)')
  const insRound = db.prepare('INSERT INTO rounds (phase_id,name,order_index) VALUES (?,?,?)')
  const insMatch = db.prepare(`INSERT INTO matches (tournament_id,category_id,phase_id,round_id,group_id,home_team,away_team,date,location,status) VALUES (?,?,?,?,?,?,?,?,?,'scheduled')`)

  // NOTA: fecha y cancha NUNCA se auto-asignan — el admin las gestiona manualmente
  const createdGroups = []

  for (let gi = 0; gi < groupCount; gi++) {
    const groupR = insGroup.run(phaseId, `Grupo ${groupNames[gi]}`, gi, advanceCount)
    const groupId = groupR.lastInsertRowid
    const gTeams = groupTeams[gi]

    for (const tid of gTeams) insGroupTeam.run(groupId, tid)

    let teams = [...gTeams]
    if (teams.length % 2 !== 0) teams.push(null)
    const numRounds = teams.length - 1
    const fixed = teams[0]
    const rotating = teams.slice(1)

    for (let ri = 0; ri < numRounds; ri++) {
      const roundTeams = [fixed, ...rotating]
      const roundPairs = []
      for (let i = 0; i < teams.length / 2; i++) {
        const home = roundTeams[i], away = roundTeams[teams.length - 1 - i]
        if (home !== null && away !== null) roundPairs.push([home, away])
      }
      if (!roundPairs.length) { rotating.push(rotating.shift()); continue }

      const rName = `Grupo ${groupNames[gi]} — Jornada ${ri + 1}`
      const roundR = insRound.run(phaseId, rName, gi * 10 + ri)
      const roundId = roundR.lastInsertRowid

      for (const [h, a] of roundPairs) {
        // Fecha NULL y cancha NULL — el admin las asigna en el panel de partidos
        insMatch.run(phase.tournament_id, phase.category_id||null, phaseId, roundId, groupId, h, a, null, null)
      }
      rotating.unshift(rotating.pop())
    }

    createdGroups.push({ groupId, name: `Grupo ${groupNames[gi]}`, teams: gTeams })
  }

  const totalMatches = db.prepare('SELECT COUNT(*) AS c FROM matches WHERE phase_id=?').get(phaseId).c
  res.status(201).json({ groups: createdGroups, totalMatches })
})

// ── Helper: busca la fase knockout siguiente (SQLite-compatible) ──────────
function findNextKnockout(tournamentId, categoryId, orderIndex) {
  // SQLite no soporta IS NOT DISTINCT FROM — manejamos NULL explícitamente
  return categoryId != null
    ? db.prepare(`SELECT * FROM phases WHERE tournament_id=? AND category_id=? AND type='knockout' AND order_index>? ORDER BY order_index LIMIT 1`).get(tournamentId, categoryId, orderIndex)
    : db.prepare(`SELECT * FROM phases WHERE tournament_id=? AND category_id IS NULL AND type='knockout' AND order_index>? ORDER BY order_index LIMIT 1`).get(tournamentId, orderIndex)
}

// ── Helper: calcula standings de un grupo con desempate completo ──────────
function getGroupStandings(groupId) {
  const teams = db.prepare(`
    SELECT t.* FROM teams t
    JOIN phase_group_teams pgt ON t.id=pgt.team_id
    WHERE pgt.group_id=?
  `).all(groupId)

  if (!teams.length) {
    // Fallback de emergencia si no hay phase_group_teams
    return db.prepare(`
      SELECT s.*, t.name AS teamName, t.logo
      FROM standings s JOIN teams t ON s.team_id=t.id
      WHERE s.group_id=?
      ORDER BY s.points DESC, (s.goals_for-s.goals_against) DESC, s.goals_for DESC
    `).all(groupId)
  }

  const matches = db.prepare(`SELECT * FROM matches WHERE group_id=? AND status='finished'`).all(groupId)

  // Tarjetas por equipo en este grupo (desde match_events)
  const cards = db.prepare(`
    SELECT e.team_id,
      SUM(CASE WHEN e.type='red_card'    THEN 1 ELSE 0 END) AS reds,
      SUM(CASE WHEN e.type='yellow_card' THEN 1 ELSE 0 END) AS yellows
    FROM match_events e
    JOIN matches m ON e.match_id=m.id
    WHERE m.group_id=? AND e.team_id IS NOT NULL
    GROUP BY e.team_id
  `).all(groupId)
  const cardMap = {}
  for (const c of cards) cardMap[c.team_id] = { reds: c.reds, yellows: c.yellows }

  const stats = {}
  for (const t of teams) {
    stats[t.id] = {
      team_id: t.id, teamName: t.name, logo: t.logo,
      played: 0, won: 0, drawn: 0, lost: 0,
      goals_for: 0, goals_against: 0, points: 0,
      red_cards: cardMap[t.id]?.reds || 0,
      yellow_cards: cardMap[t.id]?.yellows || 0
    }
  }

  for (const m of matches) {
    const h = stats[m.home_team], a = stats[m.away_team]
    if (!h || !a) continue
    h.played++; a.played++
    h.goals_for += m.home_score; h.goals_against += m.away_score
    a.goals_for += m.away_score; a.goals_against += m.home_score
    if (m.home_score > m.away_score)      { h.won++; h.points += 3; a.lost++ }
    else if (m.home_score < m.away_score) { a.won++; a.points += 3; h.lost++ }
    else                                  { h.drawn++; h.points++; a.drawn++; a.points++ }
  }

  const rows = Object.values(stats)

  // Función de desempate cabeza a cabeza entre un grupo de equipos empatados
  function headToHeadSort(group) {
    if (group.length < 2) return group
    const ids = new Set(group.map(r => r.team_id))
    const h2h = {}
    for (const id of ids) h2h[id] = { pts: 0, gf: 0, ga: 0 }
    for (const m of matches) {
      if (!ids.has(m.home_team) || !ids.has(m.away_team)) continue
      const hs = m.home_score, as_ = m.away_score
      h2h[m.home_team].gf += hs; h2h[m.home_team].ga += as_
      h2h[m.away_team].gf += as_; h2h[m.away_team].ga += hs
      if (hs > as_)       { h2h[m.home_team].pts += 3 }
      else if (hs < as_)  { h2h[m.away_team].pts += 3 }
      else                { h2h[m.home_team].pts++; h2h[m.away_team].pts++ }
    }
    return [...group].sort((a, b) => {
      const ha = h2h[a.team_id], hb = h2h[b.team_id]
      return (hb.pts - ha.pts) ||
             ((hb.gf - hb.ga) - (ha.gf - ha.ga)) ||
             (hb.gf - ha.gf)
    })
  }

  // Ordenamiento principal
  rows.sort((a, b) =>
    (b.points - a.points) ||
    ((b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)) ||
    (b.goals_for - a.goals_for) ||
    (a.red_cards - b.red_cards) ||
    (a.yellow_cards - b.yellow_cards)
  )

  // Resolver empates entre grupos de equipos con mismos puntos, DG y GF usando H2H
  const result = []
  let i = 0
  while (i < rows.length) {
    let j = i + 1
    while (j < rows.length &&
      rows[j].points === rows[i].points &&
      (rows[j].goals_for - rows[j].goals_against) === (rows[i].goals_for - rows[i].goals_against) &&
      rows[j].goals_for === rows[i].goals_for) {
      j++
    }
    const tiedGroup = rows.slice(i, j)
    const sorted = headToHeadSort(tiedGroup)
    result.push(...sorted)
    i = j
  }

  return result
}

// ── Helper: calcula standings de una fase (liga/mixto) con desempate ──────
function getPhaseStandings(phaseId) {
  const matches = db.prepare(`SELECT * FROM matches WHERE phase_id=? AND status='finished' AND group_id IS NULL`).all(phaseId)
  if (!matches.length) return []

  const teamIds = [...new Set(matches.flatMap(m => [m.home_team, m.away_team]))]
  const teams = db.prepare(`SELECT id, name, logo FROM teams WHERE id IN (${teamIds.map(()=>'?').join(',')})`).all(...teamIds)

  const cards = db.prepare(`
    SELECT e.team_id,
      SUM(CASE WHEN e.type='red_card' THEN 1 ELSE 0 END) AS reds,
      SUM(CASE WHEN e.type='yellow_card' THEN 1 ELSE 0 END) AS yellows
    FROM match_events e
    JOIN matches m ON e.match_id=m.id
    WHERE m.phase_id=? AND m.group_id IS NULL AND e.team_id IS NOT NULL
    GROUP BY e.team_id
  `).all(phaseId)
  const cardMap = {}
  for (const c of cards) cardMap[c.team_id] = { reds: c.reds, yellows: c.yellows }

  const stats = {}
  for (const t of teams) {
    stats[t.id] = {
      team_id: t.id, teamName: t.name, logo: t.logo,
      played: 0, won: 0, drawn: 0, lost: 0,
      goals_for: 0, goals_against: 0, points: 0,
      red_cards: cardMap[t.id]?.reds || 0,
      yellow_cards: cardMap[t.id]?.yellows || 0
    }
  }

  for (const m of matches) {
    const h = stats[m.home_team], a = stats[m.away_team]
    if (!h || !a) continue
    h.played++; a.played++
    h.goals_for += m.home_score; h.goals_against += m.away_score
    a.goals_for += m.away_score; a.goals_against += m.home_score
    if (m.home_score > m.away_score)      { h.won++; h.points += 3; a.lost++ }
    else if (m.home_score < m.away_score) { a.won++; a.points += 3; h.lost++ }
    else                                  { h.drawn++; h.points++; a.drawn++; a.points++ }
  }

  return Object.values(stats).sort((a, b) =>
    (b.points - a.points) ||
    ((b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)) ||
    (b.goals_for - a.goals_for) ||
    (a.red_cards - b.red_cards) ||
    (a.yellow_cards - b.yellow_cards)
  )
}

// ── Preview: qué equipos clasifican y cómo se enfrentarían ──────────────
router.get('/phases/:id/knockout-preview', authMiddleware, adminOnly, (req, res) => {
  const phaseId = req.params.id
  const phase   = db.prepare('SELECT * FROM phases WHERE id=?').get(phaseId)
  if (!phase) return notFound(res)

  const groups     = db.prepare('SELECT * FROM phase_groups WHERE phase_id=? ORDER BY order_index').all(phaseId)
  const groupNames = ['A','B','C','D','E','F','G','H']

  const pending = db.prepare("SELECT COUNT(*) AS c FROM matches WHERE phase_id=? AND status!='finished'").get(phaseId).c
  const total   = db.prepare("SELECT COUNT(*) AS c FROM matches WHERE phase_id=?").get(phaseId).c

  const groupStandings = groups.map((g, gi) => {
    const rows = getGroupStandings(g.id)
    return {
      groupId:      g.id,
      groupName:    `Grupo ${groupNames[gi]}`,
      advanceCount: g.advance_count,
      teams: rows.map((r, pos) => ({ ...r, position: pos + 1, advances: pos < g.advance_count }))
    }
  })

  const advancing = []
  for (const gs of groupStandings) {
    for (let pos = 0; pos < gs.advanceCount; pos++) {
      const t = gs.teams[pos]
      if (t) advancing.push({ teamId: t.team_id, teamName: t.teamName, logo: t.logo, groupName: gs.groupName, position: pos + 1, groupIdx: groupStandings.indexOf(gs) })
    }
  }

  const seeded   = crossSeed(advancing, groups.length)
  const matchups = []
  for (let i = 0; i < seeded.length; i += 2) {
    if (seeded[i] && seeded[i+1]) matchups.push({ home: seeded[i], away: seeded[i+1] })
  }

  const nextPhase = findNextKnockout(phase.tournament_id, phase.category_id, phase.order_index)
  res.json({ pending, total, groupStandings, matchups, nextPhase: nextPhase || null })
})

// ── Avanzar clasificados a la fase eliminatoria ──────────────────────────
router.post('/phases/:id/advance-to-knockout', authMiddleware, adminOnly, (req, res) => {
  const phaseId = req.params.id
  const { nextPhaseId } = req.body

  const phase = db.prepare('SELECT * FROM phases WHERE id=?').get(phaseId)
  if (!phase) return notFound(res)

  const groups  = db.prepare('SELECT * FROM phase_groups WHERE phase_id=? ORDER BY order_index').all(phaseId)
  const pending = db.prepare("SELECT COUNT(*) AS c FROM matches WHERE phase_id=? AND status!='finished'").get(phaseId).c
  if (pending > 0) {
    return res.status(400).json({ error: `Hay ${pending} partido(s) pendientes. Todos los partidos de la fase de grupos deben terminar antes de generar la eliminatoria.`, pending })
  }

  if (!groups.length) return res.status(400).json({ error: 'Esta fase no tiene grupos configurados. Genera los partidos de grupos primero.' })

  // Buscar la fase knockout destino y verificar que no tenga partidos iniciados
  const destPhase = nextPhaseId
    ? db.prepare('SELECT * FROM phases WHERE id=?').get(nextPhaseId)
    : findNextKnockout(phase.tournament_id, phase.category_id, phase.order_index)
  if (destPhase) {
    const knockoutStarted = db.prepare(
      "SELECT COUNT(*) AS c FROM matches WHERE phase_id=? AND status IN ('live','finished')"
    ).get(destPhase.id).c
    if (knockoutStarted > 0) {
      return res.status(400).json({ error: 'Ya hay partidos de eliminatoria iniciados o finalizados. No se puede regenerar el bracket.' })
    }
  }

  // Obtener clasificados de cada grupo usando helper robusto
  const advancing = []
  for (let gi = 0; gi < groups.length; gi++) {
    const g    = groups[gi]
    const rows = getGroupStandings(g.id)
    console.log(`[advance-to-knockout] Grupo ${gi} (id=${g.id}): ${rows.length} equipos en standings, advance_count=${g.advance_count}`)
    for (let pos = 0; pos < g.advance_count; pos++) {
      if (rows[pos]) {
        console.log(`  → clasificado pos=${pos}: team_id=${rows[pos].team_id} ${rows[pos].teamName}`)
        advancing.push({ teamId: rows[pos].team_id, teamName: rows[pos].teamName, groupIdx: gi, position: pos })
      }
    }
  }
  console.log(`[advance-to-knockout] advancing.length=${advancing.length}`)

  if (!advancing.length) return res.status(400).json({ error: 'No se encontraron equipos clasificados. Asegúrate de que los partidos de grupo estén generados y finalizados.' })

  const seeded = crossSeed(advancing, groups.length)
  console.log(`[advance-to-knockout] seeded.length=${seeded.length}`)

  if (!seeded.length) return res.status(400).json({ error: 'No se pudo determinar el orden de clasificación. Verifica que los partidos estén registrados correctamente.' })

  // Encontrar o crear automáticamente la fase knockout
  let nextPhase = nextPhaseId
    ? db.prepare('SELECT * FROM phases WHERE id=?').get(nextPhaseId)
    : findNextKnockout(phase.tournament_id, phase.category_id, phase.order_index)

  if (!nextPhase) {
    // Auto-crear la fase eliminatoria
    const r = db.prepare(
      'INSERT INTO phases (tournament_id, category_id, name, type, order_index, is_active) VALUES (?,?,?,?,?,1)'
    ).run(phase.tournament_id, phase.category_id || null, 'Eliminatoria', 'knockout', phase.order_index + 1)
    nextPhase = db.prepare('SELECT * FROM phases WHERE id=?').get(r.lastInsertRowid)
  }

  try {
    db.transaction(() => {
      // Limpiar la fase knockout
      db.prepare('DELETE FROM rounds WHERE phase_id=?').run(nextPhase.id)
      db.prepare('DELETE FROM matches WHERE phase_id=?').run(nextPhase.id)

      const insRound = db.prepare('INSERT INTO rounds (phase_id,name,order_index) VALUES (?,?,?)')
      const insMatch = db.prepare(`INSERT INTO matches (tournament_id,category_id,phase_id,round_id,home_team,away_team,bracket_slot,status) VALUES (?,?,?,?,?,?,?,'scheduled')`)

      // Construir todas las rondas vacías primero (para que advanceBracketWinner tenga slots donde avanzar)
      const teamIds = seeded.map(s => s.teamId)
      let pow2 = 1; while (pow2 < teamIds.length) pow2 *= 2
      const allRoundIds = []
      let roundSize = pow2, roundIdx = 0
      while (roundSize >= 2) {
        const rName = roundSize <= 2 ? 'Final' : roundSize <= 4 ? 'Semifinales' : roundSize <= 8 ? 'Cuartos de Final' : roundSize <= 16 ? 'Octavos de Final' : `Ronda de ${roundSize}`
        const rr = insRound.run(nextPhase.id, rName, roundIdx)
        allRoundIds.push({ id: rr.lastInsertRowid, size: roundSize })
        roundSize = Math.floor(roundSize / 2); roundIdx++
      }

      // Primera ronda: insertar los enfrentamientos reales con equipos clasificados
      const firstRoundId = allRoundIds[0].id
      const seededPadded = [...teamIds]
      while (seededPadded.length < pow2) seededPadded.push(null)

      for (let slot = 0; slot < pow2 / 2; slot++) {
        const home = seededPadded[slot * 2]
        const away = seededPadded[slot * 2 + 1]
        if (!home && !away) continue
        // Si hay bye (un equipo vs null), insertar solo si hay equipo real en ambos lados
        // Los byes se manejan automáticamente con home_score=1, away_score=0
        if (!home || !away) {
          const r = insMatch.run(nextPhase.tournament_id, nextPhase.category_id || null, nextPhase.id, firstRoundId, home || away, away || home, slot)
          // Auto-finish bye
          db.prepare("UPDATE matches SET status='finished',home_score=1,away_score=0 WHERE id=?").run(r.lastInsertRowid)
        } else {
          insMatch.run(nextPhase.tournament_id, nextPhase.category_id || null, nextPhase.id, firstRoundId, home, away, slot)
        }
      }

      // Rondas siguientes: crear slots placeholder con equipos TBD
      // Usamos IDs de equipos de la primera ronda como placeholders temporales para evitar NOT NULL
      // advanceBracketWinner los actualizará correctamente cuando avancen equipos
      for (let ri = 1; ri < allRoundIds.length; ri++) {
        const { id: rid, size } = allRoundIds[ri]
        // No crear matches aquí — advanceBracketWinner los creará dinámicamente
        // al finalizar cada partido de la ronda anterior
        void rid; void size
      }
    })()
  } catch (e) {
    console.error('advance-to-knockout error:', e)
    return res.status(500).json({ error: 'Error al generar la eliminatoria: ' + e.message })
  }

  // Procesar byes si los hay (para que ganadores del bye avancen automáticamente)
  const byeMatches = db.prepare(`
    SELECT id FROM matches
    WHERE phase_id=? AND status='finished'
    ORDER BY id ASC
  `).all(nextPhase.id)
  for (const m of byeMatches) advanceBracketWinner(m.id, null)

  res.json({
    ok: true,
    advanced: seeded.length,
    nextPhase: nextPhase.name,
    message: `${seeded.length} equipos clasificados a "${nextPhase.name}"`
  })
})

function crossSeed(advancing, numGroups) {
  // Organizar por grupo y posición
  const byGroup = {}
  for (const a of advancing) {
    if (!byGroup[a.groupIdx]) byGroup[a.groupIdx] = []
    byGroup[a.groupIdx].push(a)
  }
  const groupKeys = Object.keys(byGroup).sort((a, b) => Number(a) - Number(b))
  const numPositions = Math.max(...Object.values(byGroup).map(g => g.length))

  // Cross: 1°GrupoA vs 2°GrupoB, 1°GrupoB vs 2°GrupoA, ...
  const seeded = []
  const n = groupKeys.length

  if (n === 2) {
    // 2 grupos: cruza directamente
    const [gA, gB] = groupKeys.map(k => byGroup[k])
    for (let pos = 0; pos < numPositions; pos++) {
      seeded.push(gA[pos])                 // 1°A, 2°A
      seeded.push(gB[numPositions - 1 - pos]) // 2°B, 1°B  ← posición opuesta
    }
  } else {
    // Múltiples grupos: intercala 1°s y 2°s cruzados
    const winners   = groupKeys.map(k => byGroup[k][0]).filter(Boolean)
    const runnerUps = groupKeys.map(k => byGroup[k][1]).filter(Boolean)
    // 1A vs 2B, 1C vs 2D, 1B vs 2A, 1D vs 2C...
    for (let i = 0; i < Math.ceil(n / 2); i++) {
      seeded.push(winners[i])
      seeded.push(runnerUps[n - 1 - i])
    }
    for (let i = Math.ceil(n / 2); i < n; i++) {
      seeded.push(winners[i])
      seeded.push(runnerUps[n - 1 - i])
    }
  }
  return seeded.filter(Boolean)
}

// ── Team Profile ──────────────────────────────────────────────────────────
router.get('/teams/:id/profile', (req, res) => {
  const teamId = req.params.id

  const team = db.prepare(`
    SELECT t.*, c.name AS categoryName, c.gender, c.group_name, tour.name AS tournamentName, tour.slug
    FROM teams t
    LEFT JOIN categories c ON t.category_id=c.id
    LEFT JOIN tournaments tour ON t.tournament_id=tour.id
    WHERE t.id=?
  `).get(teamId)
  if (!team) return res.status(404).json({ error: 'Equipo no encontrado' })

  const players = db.prepare(`SELECT * FROM players WHERE team_id=? ORDER BY number ASC, name ASC`).all(teamId)

  const standings = db.prepare(`
    SELECT s.*, p.name AS phaseName, p.type AS phaseType, pg.name AS groupName, c.name AS catName
    FROM standings s
    LEFT JOIN phases p ON s.phase_id=p.id
    LEFT JOIN phase_groups pg ON s.group_id=pg.id
    LEFT JOIN categories c ON s.category_id=c.id
    WHERE s.team_id=?
    ORDER BY s.category_id, p.order_index
  `).all(teamId)

  const recentMatches = db.prepare(`
    SELECT m.*, ht.name AS homeTeam, at.name AS awayTeam, r.name AS roundName, p.name AS phaseName
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    LEFT JOIN rounds r ON m.round_id=r.id LEFT JOIN phases p ON m.phase_id=p.id
    WHERE (m.home_team=? OR m.away_team=?) AND m.status='finished'
    ORDER BY m.date DESC LIMIT 8
  `).all(teamId, teamId)

  const upcomingMatches = db.prepare(`
    SELECT m.*, ht.name AS homeTeam, at.name AS awayTeam, r.name AS roundName, p.name AS phaseName
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    LEFT JOIN rounds r ON m.round_id=r.id LEFT JOIN phases p ON m.phase_id=p.id
    WHERE (m.home_team=? OR m.away_team=?) AND m.status='scheduled'
    ORDER BY m.date ASC LIMIT 5
  `).all(teamId, teamId)

  const liveMatch = db.prepare(`
    SELECT m.*, ht.name AS homeTeam, at.name AS awayTeam
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    WHERE (m.home_team=? OR m.away_team=?) AND m.status='live' LIMIT 1
  `).get(teamId, teamId)

  const awards = db.prepare(`
    SELECT a.*, p.name AS playerName FROM awards a LEFT JOIN players p ON a.player_id=p.id
    WHERE a.team_id=? OR p.team_id=? ORDER BY a.id
  `).all(teamId, teamId)

  const teamIdInt = parseInt(teamId)
  const stats = {
    totalGoals:   db.prepare('SELECT COALESCE(SUM(goals),0) AS v FROM players WHERE team_id=?').get(teamId).v,
    totalAssists: db.prepare('SELECT COALESCE(SUM(assists),0) AS v FROM players WHERE team_id=?').get(teamId).v,
    totalYellow:  db.prepare('SELECT COALESCE(SUM(yellow_cards),0) AS v FROM players WHERE team_id=?').get(teamId).v,
    totalRed:     db.prepare('SELECT COALESCE(SUM(red_cards),0) AS v FROM players WHERE team_id=?').get(teamId).v,
    matchesPlayed: recentMatches.length,
    wins:   recentMatches.filter(m => (m.home_team===teamIdInt&&m.home_score>m.away_score)||(m.away_team===teamIdInt&&m.away_score>m.home_score)).length,
    draws:  recentMatches.filter(m => m.home_score===m.away_score).length,
    losses: recentMatches.filter(m => (m.home_team===teamIdInt&&m.home_score<m.away_score)||(m.away_team===teamIdInt&&m.away_score<m.home_score)).length,
  }

  res.json({ team, players, standings, recentMatches, upcomingMatches, liveMatch, awards, stats })
})

// ══════════════════════════════════════════════════════════════════════════
// ── Gestión de árbitros (solo admin) ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

// Genera contraseña segura: 16 chars, mayús + minús + números + símbolos
function generateSecurePassword() {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const symbols = '@#$%&!?'
  const all     = upper + lower + digits + symbols
  const bytes   = crypto.randomBytes(16)
  let pass = ''
  // Garantizar al menos 1 de cada clase
  pass += upper[bytes[0]  % upper.length]
  pass += lower[bytes[1]  % lower.length]
  pass += digits[bytes[2] % digits.length]
  pass += symbols[bytes[3] % symbols.length]
  for (let i = 4; i < 16; i++) pass += all[bytes[i] % all.length]
  // Mezclar
  return pass.split('').sort(() => Math.random() - 0.5).join('')
}

// Genera username: ref_[nombre_slug]_[4 hex]
function generateUsername(name) {
  const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 12)
  const rand = crypto.randomBytes(2).toString('hex')
  return `ref_${slug}_${rand}`
}

// GET /referees — listar árbitros
router.get('/referees', authMiddleware, adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.username, u.is_active, u.created_at,
           u.tournament_id,
           t.name AS tournamentName,
           COUNT(DISTINCT m.id) AS matches_refereed
    FROM users u
    LEFT JOIN matches m ON m.referee_id = u.id
    LEFT JOIN tournaments t ON t.id = u.tournament_id
    WHERE u.role = 'referee'
    GROUP BY u.id
    ORDER BY u.name ASC
  `).all()
  res.json(rows)
})

// GET /referees/:id/matches — historial de partidos arbitrados
router.get('/referees/:id/matches', authMiddleware, adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT m.*, ht.name AS homeTeam, at.name AS awayTeam,
           ht.logo AS homeLogo, at.logo AS awayLogo,
           t.name AS tournamentName, c.name AS categoryName
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.referee_id=?
    ORDER BY m.date DESC LIMIT 50
  `).all(req.params.id)
  res.json(rows)
})

// POST /referees — crear árbitro (contraseña puede venir del cliente o se auto-genera)
router.post('/referees', authMiddleware, adminOnly, async (req, res) => {
  const { name, email, password: clientPassword, tournamentId } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
  if (!email?.trim()) return res.status(400).json({ error: 'El correo es requerido' })

  // Verificar email único
  const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email.trim().toLowerCase())
  if (existing) return res.status(400).json({ error: 'El correo ya está registrado' })

  // Usar contraseña del cliente o generar una
  const plainPassword = (clientPassword?.trim() && clientPassword.trim().length >= 8)
    ? clientPassword.trim()
    : generateSecurePassword()
  const username      = generateUsername(name)
  const hash          = await bcrypt.hash(plainPassword, 12)

  const r = db.prepare(`
    INSERT INTO users (name, email, username, password, role, is_active, tournament_id)
    VALUES (?, ?, ?, ?, 'referee', 1, ?)
  `).run(name.trim(), email.trim().toLowerCase(), username, hash, tournamentId || null)

  // Devolver datos completos con nombre del torneo si aplica
  const created = db.prepare(`
    SELECT u.id, u.name, u.email, u.username, u.role, u.is_active, u.tournament_id,
           t.name AS tournamentName
    FROM users u LEFT JOIN tournaments t ON t.id = u.tournament_id
    WHERE u.id = ?
  `).get(r.lastInsertRowid)

  res.status(201).json({ ...created, plainPassword })
})

// PUT /referees/:id — editar árbitro (nombre, email, nueva contraseña, torneo)
router.put('/referees/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name, email, resetPassword, newPassword, tournamentId } = req.body
  const ref = db.prepare("SELECT * FROM users WHERE id=? AND role='referee'").get(req.params.id)
  if (!ref) return res.status(404).json({ error: 'Árbitro no encontrado' })

  let plainPassword = null
  let hash = ref.password

  // Prioridad: contraseña manual > reset auto
  if (newPassword?.trim() && newPassword.trim().length >= 6) {
    plainPassword = newPassword.trim()
    hash = await bcrypt.hash(plainPassword, 12)
  } else if (resetPassword) {
    plainPassword = generateSecurePassword()
    hash = await bcrypt.hash(plainPassword, 12)
  }

  if (email && email !== ref.email) {
    const dup = db.prepare("SELECT id FROM users WHERE email=? AND id!=?").get(email, ref.id)
    if (dup) return res.status(400).json({ error: 'El correo ya está en uso' })
  }

  // tournament_id usa valor directo (no COALESCE) para permitir desasignar con null
  const newName = name?.trim() || ref.name
  const newEmail = email?.trim()?.toLowerCase() || ref.email
  // tournamentId puede ser null explícitamente para "Sin asignar"
  // undefined significa "no se envió en el body → no tocar"
  const newTournamentId = tournamentId !== undefined ? (tournamentId || null) : ref.tournament_id

  db.prepare("UPDATE users SET name=?, email=?, password=?, tournament_id=? WHERE id=?")
    .run(newName, newEmail, hash, newTournamentId, ref.id)

  // Retornar datos completos con nombre del torneo
  const updated = db.prepare(`
    SELECT u.id, u.name, u.email, u.username, u.role, u.is_active, u.tournament_id,
           t.name AS tournamentName
    FROM users u LEFT JOIN tournaments t ON t.id = u.tournament_id
    WHERE u.id = ?
  `).get(ref.id)
  res.json({ ...updated, plainPassword }) // plainPassword es null si no se reseteó
})

// PATCH /referees/:id/toggle — activar/desactivar
router.patch('/referees/:id/toggle', authMiddleware, adminOnly, (req, res) => {
  const ref = db.prepare("SELECT * FROM users WHERE id=? AND role='referee'").get(req.params.id)
  if (!ref) return res.status(404).json({ error: 'Árbitro no encontrado' })
  const newActive = ref.is_active ? 0 : 1
  db.prepare("UPDATE users SET is_active=? WHERE id=?").run(newActive, ref.id)
  res.json({ id: ref.id, is_active: newActive })
})

// DELETE /referees/:id
router.delete('/referees/:id', authMiddleware, adminOnly, (req, res) => {
  const ref = db.prepare("SELECT id FROM users WHERE id=? AND role='referee'").get(req.params.id)
  if (!ref) return res.status(404).json({ error: 'Árbitro no encontrado' })
  // Desasignar de partidos (no eliminar historial, solo quitar referencia)
  db.prepare("UPDATE matches SET referee_id=NULL WHERE referee_id=?").run(ref.id)
  db.prepare("DELETE FROM users WHERE id=?").run(ref.id)
  res.status(204).end()
})

// ── Árbitro: partidos asignables ─────────────────────────────────────────
// GET /referee/matches — partidos del torneo asignado al árbitro (solo 'scheduled')
router.get('/referee/matches', authMiddleware, (req, res) => {
  if (req.user?.role !== 'referee' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' })
  }
  // Obtener el torneo asignado al árbitro
  const referee = db.prepare('SELECT tournament_id FROM users WHERE id=?').get(req.user.id)
  const tournamentId = referee?.tournament_id

  let sql = `
    SELECT m.*, ht.name AS homeTeam, at.name AS awayTeam,
           ht.logo AS homeLogo, at.logo AS awayLogo,
           t.name AS tournamentName, t.slug AS tournamentSlug,
           c.name AS categoryName,
           u.name AS refereeName
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    LEFT JOIN users u ON m.referee_id=u.id
    WHERE m.status = 'scheduled'
    AND COALESCE(m.home_is_tbd, 0) = 0
    AND COALESCE(m.away_is_tbd, 0) = 0
  `
  const params = []
  if (tournamentId) {
    sql += ' AND m.tournament_id=?'
    params.push(tournamentId)
  }
  sql += ' ORDER BY m.date ASC LIMIT 100'

  const rows = db.prepare(sql).all(...params)

  // También devolver las categorías del torneo para el filtro
  const categories = tournamentId
    ? db.prepare('SELECT id, name FROM categories WHERE tournament_id=? ORDER BY name ASC').all(tournamentId)
    : []

  res.json({ matches: rows, categories, tournamentId, tournamentName: rows[0]?.tournamentName || null })
})

// ── Admin stats ───────────────────────────────────────────────────────────
// Todos los partidos para el panel de árbitros
router.get('/admin/all-matches', authMiddleware, adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT m.*, ht.name AS homeTeam, at.name AS awayTeam,
           ht.logo AS homeLogo, at.logo AS awayLogo,
           t.name AS tournamentName, t.slug AS tournamentSlug,
           c.name AS categoryName,
           u.name AS refereeName, u.id AS refereeId
    FROM matches m
    JOIN teams ht ON m.home_team = ht.id
    JOIN teams at ON m.away_team = at.id
    JOIN tournaments t ON m.tournament_id = t.id
    LEFT JOIN categories c ON m.category_id = c.id
    LEFT JOIN users u ON m.referee_id = u.id
    ORDER BY
      CASE m.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
      m.date ASC
    LIMIT 100
  `).all()
  res.json(rows)
})

router.get('/admin/stats', authMiddleware, adminOnly, (req,res) => {
  const today = new Date().toISOString().slice(0, 10)

  const liveMatches = db.prepare(`
    SELECT m.*, ht.name AS homeTeam, at.name AS awayTeam,
           ht.logo AS homeLogo, at.logo AS awayLogo,
           t.name AS tournamentName, t.slug AS tournamentSlug,
           c.name AS categoryName
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id
    JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.status='live'
    ORDER BY m.started_at DESC
  `).all()

  const todayMatches = db.prepare(`
    SELECT m.*, ht.name AS homeTeam, at.name AS awayTeam,
           ht.logo AS homeLogo, at.logo AS awayLogo,
           t.name AS tournamentName, t.slug AS tournamentSlug,
           c.name AS categoryName
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id
    JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.status='scheduled' AND substr(m.date,1,10)=?
    ORDER BY m.date ASC
  `).all(today)

  const nextMatches = db.prepare(`
    SELECT m.*, ht.name AS homeTeam, at.name AS awayTeam,
           ht.logo AS homeLogo, at.logo AS awayLogo,
           t.name AS tournamentName, t.slug AS tournamentSlug,
           c.name AS categoryName
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id
    JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.status='scheduled' AND (m.date IS NULL OR m.date > datetime('now'))
    ORDER BY m.date ASC LIMIT 5
  `).all()

  const teamsNoCat = db.prepare("SELECT COUNT(*) AS c FROM teams WHERE category_id IS NULL").get().c

  // Partidos sin horario o sin cancha — usar TRIM para ignorar strings vacíos también
  const matchesNoSchedule = db.prepare(`
    SELECT COUNT(*) AS c FROM matches
    WHERE status IN ('scheduled','live')
    AND (NULLIF(TRIM(COALESCE(date,'')),''     ) IS NULL
      OR NULLIF(TRIM(COALESCE(location,'')),'' ) IS NULL)
    AND home_is_tbd = 0 AND away_is_tbd = 0
  `).get().c

  const matchesNoScheduleList = db.prepare(`
    SELECT m.id, m.date, m.location,
           ht.name AS homeTeam, at.name AS awayTeam,
           t.name AS tournamentName, t.slug AS tournamentSlug,
           c.name AS categoryName
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.status IN ('scheduled','live')
    AND (NULLIF(TRIM(COALESCE(m.date,'')),''     ) IS NULL
      OR NULLIF(TRIM(COALESCE(m.location,'')),'' ) IS NULL)
    AND m.home_is_tbd = 0 AND m.away_is_tbd = 0
    ORDER BY m.id ASC
    LIMIT 5
  `).all()

  res.json({
    tournaments:  db.prepare('SELECT COUNT(*) AS c FROM tournaments').get().c,
    categories:   db.prepare('SELECT COUNT(*) AS c FROM categories').get().c,
    teams:        db.prepare('SELECT COUNT(*) AS c FROM teams').get().c,
    players:      db.prepare('SELECT COUNT(*) AS c FROM players').get().c,
    matches:      db.prepare('SELECT COUNT(*) AS c FROM matches').get().c,
    live:         liveMatches.length,
    inscriptions: db.prepare("SELECT COUNT(*) AS c FROM inscriptions WHERE status='pending'").get().c,
    teamsNoCat,
    matchesNoSchedule,
    matchesNoScheduleList,
    liveMatches,
    todayMatches,
    nextMatches,
  })
})

// ── Push Notifications ────────────────────────────────────────────────────
const webpush = require('web-push')
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@jugarlapelota.com',
  process.env.PUBLIC_VAPID_KEY,
  process.env.PRIVATE_VAPID_KEY
)

// Get VAPID public key (needed by frontend to subscribe)
router.get('/push/vapid-public-key', (_req, res) => {
  res.json({ publicKey: process.env.PUBLIC_VAPID_KEY })
})

// Save push subscription (optionally link to logged-in user)
router.post('/push/subscribe', optionalAuth, (req, res) => {
  const { endpoint, keys } = req.body
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Suscripción inválida' })
  try {
    const userId = req.user?.id || null
    db.prepare(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent, user_id)
      VALUES (?,?,?,?,?)
      ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth, user_id=COALESCE(excluded.user_id, user_id)
    `).run(endpoint, keys.p256dh, keys.auth, req.headers['user-agent']?.slice(0,200) || '', userId)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Unsubscribe + remove all follows for this endpoint
router.post('/push/unsubscribe', (req, res) => {
  const { endpoint } = req.body
  db.prepare('DELETE FROM team_follows WHERE endpoint=?').run(endpoint)
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').run(endpoint)
  res.json({ ok: true })
})

// ── Team follows (by push endpoint) ───────────────────────────────────────
// Get followed team IDs for an endpoint
router.post('/follows', (req, res) => {
  const { endpoint } = req.body
  if (!endpoint) return res.json([])
  const rows = db.prepare('SELECT team_id FROM team_follows WHERE endpoint=?').all(endpoint)
  res.json(rows.map(r => r.team_id))
})

// Follow a team
router.post('/follows/add', (req, res) => {
  const { endpoint, teamId } = req.body
  if (!endpoint || !teamId) return res.status(400).json({ error: 'Faltan datos' })
  try {
    db.prepare('INSERT OR IGNORE INTO team_follows (endpoint, team_id) VALUES (?,?)').run(endpoint, teamId)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Unfollow a team
router.post('/follows/remove', (req, res) => {
  const { endpoint, teamId } = req.body
  if (!endpoint || !teamId) return res.status(400).json({ error: 'Faltan datos' })
  db.prepare('DELETE FROM team_follows WHERE endpoint=? AND team_id=?').run(endpoint, teamId)
  res.json({ ok: true })
})

// ── Push helpers ──────────────────────────────────────────────────────────

function sendPush(subs, payload) {
  const data = JSON.stringify(payload)
  for (const sub of subs) {
    webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, data)
      .catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').run(sub.endpoint)
        }
      })
  }
}

// Send only to subscribers following at least one of the given team IDs
function sendPushToTeams(teamIds, payload) {
  if (!teamIds?.length) return
  const placeholders = teamIds.map(() => '?').join(',')
  const endpoints = db.prepare(
    `SELECT DISTINCT ps.endpoint, ps.p256dh, ps.auth
     FROM push_subscriptions ps
     INNER JOIN team_follows tf ON tf.endpoint = ps.endpoint
     WHERE tf.team_id IN (${placeholders})`
  ).all(...teamIds)
  sendPush(endpoints, payload)
}

// Send to ALL subscribers — only for admin-triggered announcements
function sendPushToAll(payload) {
  const subs = db.prepare('SELECT * FROM push_subscriptions').all()
  sendPush(subs, payload)
}

global.sendPushToAll   = sendPushToAll
global.sendPushToTeams = sendPushToTeams

// ══════════════════════════════════════════════════════════
//  SOLICITUDES DE ADMIN
// ══════════════════════════════════════════════════════════

// Enviar solicitud (público)
router.post('/admin-requests', (req, res) => {
  const { name, email, phone, org, message } = req.body
  if (!name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Nombre y email son requeridos' })
  const r = db.prepare('INSERT INTO admin_requests (name,email,phone,org,message) VALUES (?,?,?,?,?)')
    .run(name.trim(), email.trim().toLowerCase(), phone?.trim()||null, org?.trim()||null, message?.trim()||null)
  res.status(201).json({ ok: true, id: r.lastInsertRowid })
})

// Listar solicitudes (solo superadmin)
router.get('/admin-requests', authMiddleware, superAdminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM admin_requests ORDER BY created_at DESC').all()
  res.json(rows)
})

// Cambiar estado (solo superadmin)
router.patch('/admin-requests/:id/status', authMiddleware, superAdminOnly, (req, res) => {
  const { status, notes } = req.body
  if (!['pending','approved','rejected'].includes(status)) return res.status(400).json({ error: 'Estado inválido' })
  db.prepare('UPDATE admin_requests SET status=?, notes=? WHERE id=?').run(status, notes||null, req.params.id)
  res.json(db.prepare('SELECT * FROM admin_requests WHERE id=?').get(req.params.id))
})

// Eliminar solicitud (solo superadmin)
router.delete('/admin-requests/:id', authMiddleware, superAdminOnly, (req, res) => {
  db.prepare('DELETE FROM admin_requests WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// ══════════════════════════════════════════════════════════
//  SUPER ADMIN — Gestión de administradores
// ══════════════════════════════════════════════════════════
const bcryptSA = require('bcryptjs')

// Listar todos los admins
router.get('/superadmin/admins', authMiddleware, superAdminOnly, (req, res) => {
  const admins = db.prepare(`
    SELECT id, name, email, role, is_active, created_at,
           (SELECT COUNT(*) FROM tournaments WHERE 1=1) as _pad
    FROM users
    WHERE role IN ('admin','superadmin')
    ORDER BY role DESC, name ASC
  `).all()
  res.json(admins)
})

// Crear admin
router.post('/superadmin/admins', authMiddleware, superAdminOnly, (req, res) => {
  const { name, email, password, role = 'admin' } = req.body
  if (!name?.trim() || !email?.trim() || !password?.trim())
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' })
  if (!['admin','superadmin'].includes(role))
    return res.status(400).json({ error: 'Rol inválido' })
  const exists = db.prepare('SELECT id FROM users WHERE email=?').get(email.trim().toLowerCase())
  if (exists) return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
  const hash = bcryptSA.hashSync(password, 10)
  const r = db.prepare('INSERT INTO users (name,email,password,role,is_active) VALUES (?,?,?,?,1)')
    .run(name.trim(), email.trim().toLowerCase(), hash, role)
  const created = db.prepare('SELECT id,name,email,role,is_active,created_at FROM users WHERE id=?').get(r.lastInsertRowid)
  res.status(201).json(created)
})

// Actualizar admin (nombre, email, rol)
router.put('/superadmin/admins/:id', authMiddleware, superAdminOnly, (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'No puedes modificar tu propia cuenta desde aquí' })
  const { name, email, role } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(id)
  if (!user) return res.status(404).json({ error: 'Admin no encontrado' })
  if (email) {
    const dup = db.prepare('SELECT id FROM users WHERE email=? AND id!=?').get(email.trim().toLowerCase(), id)
    if (dup) return res.status(409).json({ error: 'Email ya en uso' })
  }
  db.prepare('UPDATE users SET name=COALESCE(?,name), email=COALESCE(?,email), role=COALESCE(?,role) WHERE id=?')
    .run(name?.trim() || null, email?.trim().toLowerCase() || null, role || null, id)
  res.json(db.prepare('SELECT id,name,email,role,is_active,created_at FROM users WHERE id=?').get(id))
})

// Cambiar contraseña
router.patch('/superadmin/admins/:id/password', authMiddleware, superAdminOnly, (req, res) => {
  const id = Number(req.params.id)
  const { password } = req.body
  if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  const user = db.prepare('SELECT id FROM users WHERE id=?').get(id)
  if (!user) return res.status(404).json({ error: 'Admin no encontrado' })
  const hash = bcryptSA.hashSync(password, 10)
  db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, id)
  res.json({ ok: true })
})

// Activar / desactivar
router.patch('/superadmin/admins/:id/status', authMiddleware, superAdminOnly, (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' })
  const { is_active } = req.body
  const user = db.prepare('SELECT id FROM users WHERE id=?').get(id)
  if (!user) return res.status(404).json({ error: 'Admin no encontrado' })
  db.prepare('UPDATE users SET is_active=? WHERE id=?').run(is_active ? 1 : 0, id)
  res.json(db.prepare('SELECT id,name,email,role,is_active FROM users WHERE id=?').get(id))
})

// Eliminar admin
router.delete('/superadmin/admins/:id', authMiddleware, superAdminOnly, (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' })
  const user = db.prepare('SELECT id,role FROM users WHERE id=?').get(id)
  if (!user) return res.status(404).json({ error: 'Admin no encontrado' })
  db.prepare('DELETE FROM users WHERE id=?').run(id)
  res.json({ ok: true })
})

module.exports = router
