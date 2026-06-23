const express = require('express')
require('express-async-errors')  // captura errores de async handlers en Express 4
const router  = express.Router()
const path    = require('path')
const multer  = require('multer')
const { query, queryOne, recalculateStandings, recalculateAllStandings, IS_PG } = require('../config/db')
const { authMiddleware, adminOnly, optionalAuth, refereeOrAdmin, superAdminOnly } = require('../middleware/auth')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const authCtrl        = require('../controllers/auth.controller')
const tournamentsCtrl = require('../controllers/tournaments.controller')

// ── CURP utility ─────────────────────────────────────────────────────────────
function parseCURP(curp) {
  if (!curp || typeof curp !== 'string') return null
  const c = curp.trim().toUpperCase()
  if (c.length !== 18) return null
  const regex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/
  if (!regex.test(c)) return null
  const yy = parseInt(c.slice(4, 6))
  const mm = parseInt(c.slice(6, 8))
  const dd = parseInt(c.slice(8, 10))
  const sex = c[10] // H = hombre, M = mujer
  // position 16: digit = born 1900s, letter = born 2000s
  const centuryChar = c[16]
  const is2000s = /[A-Z]/.test(centuryChar)
  const fullYear = is2000s ? 2000 + yy : 1900 + yy
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  return { birthYear: fullYear, birthMonth: mm, birthDay: dd, sex }
}

function validateCURPAge(curpData, category) {
  if (!category.min_birth_year) return { valid: true }
  const { birthYear, sex } = curpData
  const isFemale = sex === 'M'
  const minBY = category.min_birth_year
  const maxBY = category.max_birth_year
  const minBYGirls = category.min_birth_year_girls
  // Effective minimum birth year for this player (girls may get exception)
  const effectiveMin = (isFemale && minBYGirls && minBYGirls < minBY) ? minBYGirls : minBY
  if (birthYear < effectiveMin) {
    return { valid: false, reason: `Jugador muy mayor para esta categoría. Nació en ${birthYear}, se requiere nacido en ${effectiveMin} o después.` }
  }
  if (maxBY && birthYear > maxBY) {
    return { valid: false, reason: `Jugador muy joven para esta categoría. Nació en ${birthYear}, el límite es ${maxBY}.` }
  }
  return { valid: true }
}

// ── Cloudinary config ─────────────────────────────────────────────────────────
const cloudinary = require('cloudinary').v2
cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME  || 'dok6cmxfp',
  api_key:     process.env.CLOUDINARY_API_KEY     || '533777788497876',
  api_secret:  process.env.CLOUDINARY_API_SECRET  || '46abylvaiBG_qQ_edxjASLrywLk',
})

// ── File upload → Cloudinary ──────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.webp','.gif','.svg','.mp4','.mov','.pdf']
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()))
  }
})

// Subida pública (para inscripciones sin auth)
async function uploadToCloudinary(buffer, mimetype) {
  return new Promise((resolve, reject) => {
    const isVideo = mimetype.startsWith('video/')
    const isPdf   = mimetype === 'application/pdf'
    const resourceType = isVideo ? 'video' : isPdf ? 'raw' : 'image'
    const opts = { folder: 'jugarlapelota', resource_type: resourceType }
    if (!isPdf && !isVideo) { opts.quality = 'auto'; opts.fetch_format = 'auto' }
    cloudinary.uploader.upload_stream(opts,
      (err, result) => err ? reject(err) : resolve(result.secure_url)
    ).end(buffer)
  })
}

router.post('/upload', authMiddleware, adminOnly, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo no válido o muy grande (máx 25 MB)' })
  try {
    const url = await uploadToCloudinary(req.file.buffer, req.file.mimetype)
    res.json({ url })
  } catch (e) {
    console.error('[upload]', e.message)
    res.status(500).json({ error: 'Error al subir imagen' })
  }
})

// Upload público (inscripciones)
router.post('/upload/public', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo no válido' })
  try {
    const url = await uploadToCloudinary(req.file.buffer, req.file.mimetype)
    res.json({ url })
  } catch (e) {
    res.status(500).json({ error: 'Error al subir imagen' })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────
const getTournament = async (slug) => (await queryOne('SELECT * FROM tournaments WHERE slug=$1', [slug]))
const notFound = (res, msg='No encontrado') => res.status(404).json({ error: msg })

// ── Auth ──────────────────────────────────────────────────────────────────
router.post('/auth/login',   authCtrl.login)
router.post('/auth/google',  authCtrl.googleLogin)
router.get('/auth/me',      authMiddleware, authCtrl.me)

// ── Ownership helper ──────────────────────────────────────────────────────
const { checkOwnerById, ownSlugGuard } = tournamentsCtrl

// Verifica que el admin sea dueño del torneo al que pertenece el recurso
async function checkOwnerByTournamentId(req, res, tournamentId) {
  if (req.user?.role === 'superadmin') return true
  const t = (await queryOne('SELECT created_by FROM tournaments WHERE id=$1', [tournamentId]))
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
router.get('/tournaments/:slug/categories', async (req, res) => {
  const t = await getTournament(req.params.slug); if(!t) return notFound(res)
  res.json((await query('SELECT * FROM categories WHERE tournament_id=$1 ORDER BY order_index,name', [t.id])).rows)
})
router.post('/categories', authMiddleware, adminOnly, async (req, res) => {
  const {tournamentId,name,gender,group_name,order_index} = req.body
  if (!await checkOwnerByTournamentId(req, res, tournamentId)) return
  try {
    const r = await query('INSERT INTO categories (tournament_id,name,gender,group_name,order_index) VALUES ($1,$2,$3,$4,$5) RETURNING id', [tournamentId,name,gender||'varonil',group_name||'libre',order_index||0])
    res.status(201).json((await queryOne('SELECT * FROM categories WHERE id=$1', [r.lastInsertRowid])))
  } catch { res.status(400).json({error:'La categoría ya existe'}) }
})
router.put('/categories/:id', authMiddleware, adminOnly, async (req, res) => {
  const cat = (await queryOne('SELECT tournament_id FROM categories WHERE id=$1', [req.params.id]))
  if (cat && !checkOwnerByTournamentId(req, res, cat.tournament_id)) return
  const {name,gender,group_name,order_index,min_birth_year,max_birth_year,min_birth_year_girls,max_players_per_team} = req.body
  await query(
    'UPDATE categories SET name=$1,gender=$2,group_name=$3,order_index=$4,min_birth_year=$5,max_birth_year=$6,min_birth_year_girls=$7,max_players_per_team=$8 WHERE id=$9',
    [name,gender,group_name,order_index||0,min_birth_year||null,max_birth_year||null,min_birth_year_girls||null,max_players_per_team||null,req.params.id]
  )
  res.json((await queryOne('SELECT * FROM categories WHERE id=$1', [req.params.id])))
})
// ── Tournament settings (auto-approve, etc.) ──────────────────────────────────
router.patch('/tournaments/:slug/settings', authMiddleware, adminOnly, async (req, res) => {
  const t = await getTournament(req.params.slug); if (!t) return notFound(res)
  if (!await checkOwnerByTournamentId(req, res, t.id)) return
  const { auto_approve_inscriptions } = req.body
  await query('UPDATE tournaments SET auto_approve_inscriptions=$1 WHERE id=$2', [auto_approve_inscriptions ? 1 : 0, t.id])
  res.json({ auto_approve_inscriptions: auto_approve_inscriptions ? 1 : 0 })
})

router.delete('/categories/:id', authMiddleware, adminOnly, async (req, res) => {
  const cat = (await queryOne('SELECT tournament_id FROM categories WHERE id=$1', [req.params.id]))
  if (cat && !checkOwnerByTournamentId(req, res, cat.tournament_id)) return
  await query('DELETE FROM categories WHERE id=$1', [req.params.id]); res.status(204).end()
})

// ── Phases ────────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/phases', async (req, res) => {
  const t = await getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const rows = catId
    ? (await query('SELECT p.*,c.name AS "categoryName" FROM phases p LEFT JOIN categories c ON p.category_id=c.id WHERE p.tournament_id=$1 AND p.category_id=$2 ORDER BY p.order_index', [t.id,catId])).rows
    : (await query('SELECT p.*,c.name AS "categoryName" FROM phases p LEFT JOIN categories c ON p.category_id=c.id WHERE p.tournament_id=$1 ORDER BY c.order_index,p.order_index', [t.id])).rows
  const phases = await Promise.all(rows.map(async p => {
    const rounds   = (await query('SELECT * FROM rounds WHERE phase_id=$1 ORDER BY order_index', [p.id])).rows
    const groupRows = (await query(`
      SELECT pg.*, COUNT(pgt.team_id) AS teamCount
      FROM phase_groups pg
      LEFT JOIN phase_group_teams pgt ON pg.id = pgt.group_id
      WHERE pg.phase_id = $1 GROUP BY pg.id ORDER BY pg.order_index
    `, [p.id])).rows
    const groups = await Promise.all(groupRows.map(async g => ({
      ...g,
      matches: (await query(`
        SELECT m.id, m.round_id, m.status, m.home_score, m.away_score,
               ht.name AS "homeTeam", ht.logo AS "homeLogo",
               at.name AS "awayTeam", at.logo AS "awayLogo"
        FROM matches m
        JOIN teams ht ON m.home_team = ht.id
        JOIN teams at ON m.away_team = at.id
        WHERE m.group_id = $1 ORDER BY m.round_id ASC, m.id ASC
      `, [g.id])).rows
    })))
    const matchStats = (await queryOne(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='finished' THEN 1 ELSE 0 END) AS finished,
        SUM(CASE WHEN status='live'     THEN 1 ELSE 0 END) AS live,
        SUM(CASE WHEN status='scheduled' THEN 1 ELSE 0 END) AS scheduled
      FROM matches WHERE phase_id=$1
    `, [p.id]))
    return { ...p, rounds, groups, matchStats }
  }))
  res.json(phases)
})
router.post('/phases', authMiddleware, adminOnly, async (req, res) => {
  const {tournamentId,categoryId,name,type,order_index} = req.body
  if (!await checkOwnerByTournamentId(req, res, tournamentId)) return
  const r = await query('INSERT INTO phases (tournament_id,category_id,name,type,order_index) VALUES ($1,$2,$3,$4,$5) RETURNING id', [tournamentId,categoryId||null,name,type||'league',order_index||0])
  res.status(201).json((await queryOne('SELECT * FROM phases WHERE id=$1', [r.lastInsertRowid])))
})
router.put('/phases/:id', authMiddleware, adminOnly, async (req, res) => {
  const phase = (await queryOne('SELECT tournament_id FROM phases WHERE id=$1', [req.params.id]))
  if (phase && !checkOwnerByTournamentId(req, res, phase.tournament_id)) return
  const {name,type,order_index,is_active} = req.body
  await query('UPDATE phases SET name=$1,type=$2,order_index=$3,is_active=$4 WHERE id=$5', [name,type,order_index||0,is_active?1:0,req.params.id])
  res.json((await queryOne('SELECT * FROM phases WHERE id=$1', [req.params.id])))
})
router.delete('/phases/:id', authMiddleware, adminOnly, async (req, res) => {
  const id = req.params.id
  const phase = (await queryOne('SELECT tournament_id FROM phases WHERE id=$1', [id]))
  if (phase && !checkOwnerByTournamentId(req, res, phase.tournament_id)) return
  await query('DELETE FROM matches WHERE phase_id=$1', [id])
  await query('DELETE FROM rounds  WHERE phase_id=$1', [id])
  await query('DELETE FROM phase_groups WHERE phase_id=$1', [id])
  await query('DELETE FROM standings WHERE phase_id=$1', [id])
  await query('DELETE FROM phases  WHERE id=$1', [id])
  res.status(204).end()
})

// ── Recomendaciones del wizard ────────────────────────────────────────────
router.get('/tournaments/:slug/wizard-recommend', authMiddleware, adminOnly, async (req, res) => {
  const t = await getTournament(req.params.slug)
  if (!t) return notFound(res)

  const catId    = req.query.cat ? parseInt(req.query.cat) : null
  const modality = t.modality || 'copa'

  // Contar equipos reales
  const teamCount = catId
    ? (await queryOne('SELECT COUNT(*) AS c FROM teams WHERE tournament_id=$1 AND category_id=$2', [t.id, catId])).c
    : (await queryOne('SELECT COUNT(*) AS c FROM teams WHERE tournament_id=$1', [t.id])).c

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
router.post('/tournaments/:slug/auto-setup', authMiddleware, adminOnly, async (req, res) => {
  const t = await getTournament(req.params.slug)
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

  const insPhase = async (tournamentId, categoryId, name, type, order_index) => {
    await query(
      'INSERT INTO phases (tournament_id,category_id,name,type,order_index,is_active) VALUES ($1,$2,$3,$4,$5,1)',
      [tournamentId, categoryId, name, type, order_index]
    )
    const row = await queryOne(
      'SELECT id FROM phases WHERE tournament_id=$1 AND name=$2 ORDER BY id DESC LIMIT 1',
      [tournamentId, name]
    )
    if (!row?.id) throw new Error(`No se pudo obtener el id de la fase "${name}"`)
    return row.id
  }
  const insRound = async (phaseId, name, order_index) => {
    await query(
      'INSERT INTO rounds (phase_id,name,order_index) VALUES ($1,$2,$3)',
      [phaseId, name, order_index]
    )
  }

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

  // Helper: inserta rondas en secuencia (pid ya es el id numérico/string de la fase)
  async function insertRounds(pid, names) {
    for (let i = 0; i < names.length; i++) await insRound(pid, names[i], i)
  }

  try {
    if (modality === 'copa') {
      const pid    = await insPhase(t.id, categoryId || null, 'Eliminatoria', 'knockout', 0)
      const rounds = knockoutRounds(n, !!options.thirdPlace)
      await insertRounds(pid, rounds)
      created.push({ name: 'Eliminatoria', type: 'knockout', rounds })

    } else if (modality === 'liga') {
      const legs   = Math.max(1, parseInt(options.legs) || 1)
      const pid    = await insPhase(t.id, categoryId || null, 'Fase Regular', 'league', 0)
      const rounds = leagueRounds(n, legs)
      await insertRounds(pid, rounds)
      created.push({ name: 'Fase Regular', type: 'league', rounds })

    } else if (modality === 'mixto') {
      const legs      = Math.max(1, parseInt(options.legs) || 1)
      const advancing = Math.max(2, Math.min(parseInt(options.advancing) || Math.floor(n / 2), n - 1))
      const pid1 = await insPhase(t.id, categoryId || null, 'Fase Regular', 'league', 0)
      const r1   = leagueRounds(n, legs)
      await insertRounds(pid1, r1)
      created.push({ name: 'Fase Regular', type: 'league', rounds: r1 })

      const pid2 = await insPhase(t.id, categoryId || null, 'Liguilla', 'knockout', 1)
      const r2   = knockoutRounds(advancing, !!options.thirdPlace)
      await insertRounds(pid2, r2)
      created.push({ name: 'Liguilla', type: 'knockout', rounds: r2 })

    } else if (modality === 'grupos_eliminacion') {
      const groupCount    = Math.max(2, parseInt(options.groupCount)   || Math.max(2, Math.round(n / 4)))
      const advanceCount  = Math.max(1, parseInt(options.advanceCount) || 2)
      const teamsPerGroup = Math.ceil(n / groupCount)

      if (teamsPerGroup < 2) throw new Error('Demasiados grupos para los equipos disponibles.')

      const pid1 = await insPhase(t.id, categoryId || null, 'Fase de Grupos', 'groups', 0)
      const r1   = leagueRounds(teamsPerGroup, 1)
      await insertRounds(pid1, r1)
      created.push({ name: 'Fase de Grupos', type: 'groups', rounds: r1 })

      const advancingTotal = groupCount * advanceCount
      const pid2 = await insPhase(t.id, categoryId || null, 'Eliminatoria', 'knockout', 1)
      const r2   = knockoutRounds(advancingTotal)
      await insertRounds(pid2, r2)
      created.push({ name: 'Eliminatoria', type: 'knockout', rounds: r2 })
    }

    res.status(201).json({ modality, created })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || 'Error al generar estructura' })
  }
})

// ── Rounds ────────────────────────────────────────────────────────────────
router.get('/phases/:id/rounds', async (req, res) => {
  res.json((await query('SELECT * FROM rounds WHERE phase_id=$1 ORDER BY order_index', [req.params.id])).rows)
})
router.post('/rounds', authMiddleware, adminOnly, async (req, res) => {
  const {phaseId,name,order_index} = req.body
  const r = await query('INSERT INTO rounds (phase_id,name,order_index) VALUES ($1,$2,$3) RETURNING id', [phaseId,name,order_index||0])
  res.status(201).json((await queryOne('SELECT * FROM rounds WHERE id=$1', [r.lastInsertRowid])))
})
router.put('/rounds/:id', authMiddleware, adminOnly, async (req, res) => {
  const {name,order_index} = req.body
  await query('UPDATE rounds SET name=$1,order_index=$2 WHERE id=$3', [name,order_index||0,req.params.id])
  res.json((await queryOne('SELECT * FROM rounds WHERE id=$1', [req.params.id])))
})
router.delete('/rounds/:id', authMiddleware, adminOnly, async (req, res) => {
  await query('DELETE FROM rounds WHERE id=$1', [req.params.id]); res.status(204).end()
})

// ── Teams ─────────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/teams', async (req, res) => {
  const t = await getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const rows = catId
    ? (await query('SELECT t.*,c.name AS "categoryName",c.gender,c.group_name FROM teams t LEFT JOIN categories c ON t.category_id=c.id WHERE t.tournament_id=$1 AND t.category_id=$2 ORDER BY t.name', [t.id,catId])).rows
    : (await query('SELECT t.*,c.name AS "categoryName",c.gender,c.group_name FROM teams t LEFT JOIN categories c ON t.category_id=c.id WHERE t.tournament_id=$1 ORDER BY c.order_index,t.name', [t.id])).rows
  res.json(rows)
})
router.get('/teams', async (_, res) => res.json((await query('SELECT t.*,c.name AS "categoryName",tr.slug AS "tournamentSlug",tr.name AS "tournamentName" FROM teams t LEFT JOIN categories c ON t.category_id=c.id LEFT JOIN tournaments tr ON t.tournament_id=tr.id ORDER BY t.name', [])).rows))

router.get('/matches/live', async (_, res) => {
  const rows = (await query(`
    SELECT m.id, m.home_score, m.away_score, m.date, m.status, m.started_at,
           ht.name AS "homeTeam", ht.logo AS "homeLogo",
           at.name AS "awayTeam", at.logo AS "awayLogo",
           t.name AS "tournamentName", t.slug AS "tournamentSlug",
           c.name AS "categoryName"
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id
    JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.status='live'
    ORDER BY m.started_at DESC
  `, [])).rows
  res.json(rows)
})
router.post('/teams', authMiddleware, adminOnly, async (req, res) => {
  const {tournamentId, categoryId, name, logo, coach, captain, description} = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre del equipo es requerido' })
  if (!await checkOwnerByTournamentId(req, res, tournamentId)) return
  const dup = (await queryOne('SELECT id FROM teams WHERE tournament_id=$1 AND LOWER(TRIM(name))=LOWER(TRIM($2)) AND category_id IS NOT DISTINCT FROM $3', [tournamentId, name.trim(), categoryId || null]))
  if (dup) return res.status(409).json({ error: `Ya existe un equipo llamado "${name.trim()}" en esta categoría.` })
  const r = await query('INSERT INTO teams (tournament_id,category_id,name,logo,coach,captain,description) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [tournamentId, categoryId || null, name.trim(), logo || null, coach || null, captain || null, description || null])
  res.status(201).json((await queryOne('SELECT t.*,c.name AS "categoryName" FROM teams t LEFT JOIN categories c ON t.category_id=c.id WHERE t.id=$1', [r.lastInsertRowid])))
})

router.put('/teams/:id', authMiddleware, adminOnly, async (req, res) => {
  const {name, logo, coach, captain, description, categoryId, tournamentId} = req.body
  const id = parseInt(req.params.id)
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
  const tid = tournamentId || (await queryOne('SELECT tournament_id FROM teams WHERE id=$1', [id]))?.tournament_id
  if (!await checkOwnerByTournamentId(req, res, tid)) return

  // Duplicado al renombrar: mismo nombre en el torneo y categoría, excluyendo el equipo actual
  const dup = (await queryOne('SELECT id FROM teams WHERE tournament_id=$1 AND LOWER(TRIM(name))=LOWER(TRIM($2)) AND category_id IS NOT DISTINCT FROM $3 AND id!=$4', [tid, name.trim(), categoryId || null, id]))
  if (dup) return res.status(409).json({ error: `Ya existe un equipo llamado "${name.trim()}" en esta categoría.` })

  await query('UPDATE teams SET name=$1,logo=$2,coach=$3,captain=$4,description=$5,category_id=$6 WHERE id=$7', [name.trim(), logo || null, coach || null, captain || null, description || null, categoryId || null, id])
  res.json((await queryOne('SELECT * FROM teams WHERE id=$1', [id])))
})
router.get('/teams/:id/players', async (req, res) => {
  const rows = (await query('SELECT * FROM players WHERE team_id=$1 ORDER BY number ASC, name ASC', [req.params.id])).rows
  res.json(rows)
})
router.delete('/teams/:id', authMiddleware, adminOnly, async (req, res) => {
  const team = (await queryOne('SELECT tournament_id FROM teams WHERE id=$1', [req.params.id]))
  if (team && !checkOwnerByTournamentId(req, res, team.tournament_id)) return
  await query('DELETE FROM teams WHERE id=$1', [req.params.id]); res.status(204).end()
})

// ── Players ───────────────────────────────────────────────────────────────
router.get('/players/:id', async (req, res) => {
  const row = await queryOne(
    `SELECT p.*,te.name AS "teamName",te.id AS "teamId",c.name AS "categoryName",t.slug AS "tournamentSlug"
     FROM players p
     JOIN teams te ON p.team_id=te.id
     JOIN tournaments t ON te.tournament_id=t.id
     LEFT JOIN categories c ON te.category_id=c.id
     WHERE p.id=$1`,
    [req.params.id]
  )
  if (!row) return notFound(res)
  res.json(row)
})

router.get('/tournaments/:slug/players', async (req, res) => {
  const t = await getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const rows = catId
    ? (await query(`SELECT p.*,te.name AS "teamName",te.category_id,c.name AS "categoryName" FROM players p JOIN teams te ON p.team_id=te.id LEFT JOIN categories c ON te.category_id=c.id WHERE te.tournament_id=$1 AND te.category_id=$2 ORDER BY p.goals DESC,p.assists DESC,p.name`, [t.id,catId])).rows
    : (await query(`SELECT p.*,te.name AS "teamName",te.category_id,c.name AS "categoryName" FROM players p JOIN teams te ON p.team_id=te.id LEFT JOIN categories c ON te.category_id=c.id WHERE te.tournament_id=$1 ORDER BY p.goals DESC,p.assists DESC,p.name`, [t.id])).rows
  res.json(rows)
})

// ── Stats de fase regular (groups/league) — para reconocimientos ──────────
// Goles/asistencias solo de fases tipo groups o league, NO knockout.
// Esto determina premios individuales: el goleador/asistidor de la fase inicial.
router.get('/tournaments/:slug/players/phase-stats', async (req, res) => {
  const t = await getTournament(req.params.slug)
  if (!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null

  // Fases válidas: preferir league/groups; si no existen (ej. copa), usar todas
  let validPhases = catId
    ? (await query(`SELECT id FROM phases WHERE tournament_id=$1 AND category_id=$2 AND type IN ('league','groups')`, [t.id, catId])).rows
    : (await query(`SELECT id FROM phases WHERE tournament_id=$1 AND type IN ('league','groups')`, [t.id])).rows

  if (!validPhases.length) {
    validPhases = catId
      ? (await query(`SELECT id FROM phases WHERE tournament_id=$1 AND category_id=$2`, [t.id, catId])).rows
      : (await query(`SELECT id FROM phases WHERE tournament_id=$1`, [t.id])).rows
    if (!validPhases.length) return res.json([])
  }

  const phaseIds = validPhases.map(p => p.id)
  // Usar ANY($N) para el IN dinámico de PostgreSQL
  const params = [phaseIds, t.id]
  if (catId) params.push(catId)
  const catFilter = catId ? `AND t.category_id = $${params.length}` : ''

  const stats = (await query(`
    SELECT
      p.id, p.name, p.photo, p.number, p.position, p.team_id,
      t.name AS "teamName", t.logo AS "teamLogo",
      COALESCE(SUM(CASE WHEN e.type='goal' THEN 1 ELSE 0 END), 0) AS goals,
      COALESCE(SUM(CASE WHEN e.type='assist' THEN 1 ELSE 0 END), 0) AS assists,
      COALESCE(SUM(CASE WHEN e.type='own_goal' THEN 1 ELSE 0 END), 0) AS own_goals,
      COALESCE(SUM(CASE WHEN e.type='yellow_card' THEN 1 ELSE 0 END), 0) AS yellow_cards,
      COALESCE(SUM(CASE WHEN e.type='red_card' THEN 1 ELSE 0 END), 0) AS red_cards,
      COUNT(DISTINCT m.id) AS matches_played
    FROM players p
    JOIN teams t ON t.id = p.team_id
    LEFT JOIN match_events e ON e.player_id = p.id
    LEFT JOIN matches m ON m.id = e.match_id AND m.phase_id = ANY($1::bigint[])
    WHERE t.tournament_id = $2
    ${catFilter}
    GROUP BY p.id, p.name, p.photo, p.number, p.position, p.team_id, t.name, t.logo
    ORDER BY goals DESC, assists DESC, p.name ASC
  `, params)).rows

  res.json(stats)
})

// ── Helper: mismo nombre en la misma categoría = duplicado
async function checkPlayerDuplicate(teamId, name, excludePlayerId = null) {
  if (!name || !name.trim()) return null
  const team = (await queryOne('SELECT tournament_id, category_id FROM teams WHERE id=$1', [teamId]))
  if (!team) return null

  const sql = excludePlayerId
    ? `SELECT p.*, t.name AS "teamName" FROM players p
       JOIN teams t ON p.team_id = t.id
       WHERE t.tournament_id = $1 AND t.category_id IS NOT DISTINCT FROM $2
         AND LOWER(TRIM(p.name)) = LOWER(TRIM($3))
         AND p.id != $4 AND p.team_id != $5`
    : `SELECT p.*, t.name AS "teamName" FROM players p
       JOIN teams t ON p.team_id = t.id
       WHERE t.tournament_id = $1 AND t.category_id IS NOT DISTINCT FROM $2
         AND LOWER(TRIM(p.name)) = LOWER(TRIM($3))
         AND p.team_id != $4`

  const args = excludePlayerId
    ? [team.tournament_id, team.category_id, name.trim(), excludePlayerId, teamId]
    : [team.tournament_id, team.category_id, name.trim(), teamId]

  return (await queryOne(sql, [...args])) || null
}

router.post('/players', authMiddleware, adminOnly, async (req, res) => {
  const { teamId, name, photo, number, position } = req.body
  if (!teamId || !name) return res.status(400).json({ error: 'Nombre y equipo son requeridos' })
  const teamTournament = (await queryOne('SELECT tournament_id FROM teams WHERE id=$1', [teamId]))
  if (teamTournament && !checkOwnerByTournamentId(req, res, teamTournament.tournament_id)) return

  const dup = await checkPlayerDuplicate(teamId, name)
  if (dup) {
    return res.status(409).json({
      error: `"${name}" ya está registrado en el equipo "${dup.teamName}" en esta categoría. No se puede registrar el mismo jugador en dos equipos.`,
      duplicate: dup
    })
  }

  const r = await query('INSERT INTO players (team_id,name,photo,number,position) VALUES ($1,$2,$3,$4,$5) RETURNING id', [teamId, name.trim(), photo || null, number || null, position || null])
  res.status(201).json((await queryOne('SELECT * FROM players WHERE id=$1', [r.lastInsertRowid])))
})

router.put('/players/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name, photo, number, position, goals, assists, yellow_cards, red_cards, teamId, minutes_played, matches_played } = req.body
  const pid = parseInt(req.params.id)

  const dup = await checkPlayerDuplicate(teamId, name, pid)
  if (dup) {
    return res.status(409).json({
      error: `"${name}" ya está registrado en el equipo "${dup.teamName}" en esta categoría.`,
      duplicate: dup
    })
  }

  await query(`UPDATE players SET name=$1,photo=$2,number=$3,position=$4,goals=$5,assists=$6,
    yellow_cards=$7,red_cards=$8,team_id=$9,minutes_played=$10,matches_played=$11 WHERE id=$12`, [name.trim(), photo, number, position, goals||0, assists||0, yellow_cards||0,
         red_cards||0, teamId, minutes_played||0, matches_played||0, pid])
  res.json((await queryOne('SELECT * FROM players WHERE id=$1', [pid])))
})

// Chequeo en vivo desde el frontend
router.post('/players/check-duplicate', authMiddleware, adminOnly, async (req, res) => {
  const { teamId, name, excludePlayerId } = req.body
  const dup = await checkPlayerDuplicate(teamId, name, excludePlayerId || null)
  res.json({ duplicate: dup || null })
})
router.delete('/players/:id', authMiddleware, adminOnly, async (req, res) => {
  await query('DELETE FROM players WHERE id=$1', [req.params.id]); res.status(204).end()
})

// ── Matches ───────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/matches', async (req, res) => {
  const t = await getTournament(req.params.slug); if(!t) return notFound(res)
  const catId   = req.query.cat   ? parseInt(req.query.cat)   : null
  const phaseId = req.query.phase ? parseInt(req.query.phase) : null
  const roundId = req.query.round ? parseInt(req.query.round) : null
  const params = [t.id]
  let sql = `SELECT m.*,
    CASE WHEN m.home_is_tbd=1 THEN NULL ELSE ht.name END AS "homeTeam",
    CASE WHEN m.home_is_tbd=1 THEN NULL ELSE ht.logo END AS "homeLogo",
    CASE WHEN m.away_is_tbd=1 THEN NULL ELSE at.name END AS "awayTeam",
    CASE WHEN m.away_is_tbd=1 THEN NULL ELSE at.logo END AS "awayLogo",
    c.name AS "categoryName", ph.name AS "phaseName", ph.type AS "phaseType", r.name AS "roundName",
    u.name AS "refereeName", u.id AS "refereeId"
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    LEFT JOIN categories c ON m.category_id=c.id LEFT JOIN phases ph ON m.phase_id=ph.id LEFT JOIN rounds r ON m.round_id=r.id
    LEFT JOIN users u ON m.referee_id=u.id
    WHERE m.tournament_id=$1`
  if (catId)   { params.push(catId);   sql += ` AND m.category_id=$${params.length}` }
  if (phaseId) { params.push(phaseId); sql += ` AND m.phase_id=$${params.length}` }
  if (roundId) { params.push(roundId); sql += ` AND m.round_id=$${params.length}` }
  sql += ' ORDER BY m.date ASC'
  res.json((await query(sql, params)).rows)
})
router.get('/matches/:id', async (req, res) => {
  const row = (await queryOne(`SELECT m.*,
    CASE WHEN m.home_is_tbd=1 THEN NULL ELSE ht.name END AS "homeTeam",
    CASE WHEN m.home_is_tbd=1 THEN NULL ELSE ht.logo END AS "homeLogo",
    CASE WHEN m.away_is_tbd=1 THEN NULL ELSE at.name END AS "awayTeam",
    CASE WHEN m.away_is_tbd=1 THEN NULL ELSE at.logo END AS "awayLogo",
    c.name AS "categoryName", ph.name AS "phaseName", r.name AS "roundName",
    u.name AS "refereeName", u.id AS "refereeId"
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    LEFT JOIN categories c ON m.category_id=c.id LEFT JOIN phases ph ON m.phase_id=ph.id LEFT JOIN rounds r ON m.round_id=r.id
    LEFT JOIN users u ON m.referee_id=u.id
    WHERE m.id=$1`, [req.params.id]))
  if(!row) return notFound(res,'Partido no encontrado')
  res.json(row)
})
router.post('/matches', authMiddleware, adminOnly, async (req, res) => {
  const {tournamentId,categoryId,phaseId,roundId,homeTeam,awayTeam,date,location} = req.body
  if (!await checkOwnerByTournamentId(req, res, tournamentId)) return
  const r = await query(`INSERT INTO matches (tournament_id,category_id,phase_id,round_id,home_team,away_team,date,location,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'scheduled') RETURNING id`, [tournamentId,categoryId||null,phaseId||null,roundId||null,homeTeam,awayTeam,date,location])
  res.status(201).json((await queryOne('SELECT * FROM matches WHERE id=$1', [r.lastInsertRowid])))
})
router.put('/matches/:id', authMiddleware, adminOnly, async (req, res) => {
  const {categoryId,phaseId,roundId,homeTeam,awayTeam,home_score,away_score,date,location,status,match_notes} = req.body
  await query('UPDATE matches SET category_id=$1,phase_id=$2,round_id=$3,home_team=$4,away_team=$5,home_score=$6,away_score=$7,date=$8,location=$9,status=$10,match_notes=$11 WHERE id=$12', [categoryId||null,phaseId||null,roundId||null,homeTeam,awayTeam,home_score||0,away_score||0,date,location,status||'scheduled',match_notes||null,req.params.id])
  const m = (await queryOne(`SELECT m.*,ht.name AS "homeTeam",at.name AS "awayTeam",ht.logo AS "homeLogo",at.logo AS "awayLogo",c.name AS "categoryName",ph.type AS "phaseType",u.name AS "refereeName" FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id LEFT JOIN categories c ON m.category_id=c.id LEFT JOIN phases ph ON m.phase_id=ph.id LEFT JOIN users u ON m.referee_id=u.id WHERE m.id=$1`, [req.params.id]))
  if (m.status === 'finished') {
    if (m.category_id) await recalculateStandings(m.tournament_id, m.category_id, m.phase_id, m.group_id||null).catch(e => console.error('[standings]', e.message))
    await advanceBracketWinner(m.id, req.io)
    await checkPhaseCompletion(m.phase_id, req.io)
    req.io?.emit('standings:update', { tournamentId: m.tournament_id, categoryId: m.category_id, phaseId: m.phase_id })
  }
  req.io?.emit('match:update', m)
  res.json(m)
})
router.patch('/matches/:id/score', authMiddleware, refereeOrAdmin, async (req, res) => {
  const { homeScore, awayScore, finish } = req.body
  const existing = await queryOne('SELECT status FROM matches WHERE id=$1', [req.params.id])
  const alreadyFinished = existing?.status === 'finished'

  if (finish && !alreadyFinished) {
    // Primer cierre: marcar como finalizado con timestamp
    await query('UPDATE matches SET home_score=$1,away_score=$2,status=$3,finished_at=$4 WHERE id=$5',
      [homeScore, awayScore, 'finished', new Date().toISOString(), req.params.id])
  } else {
    // Actualizar solo el score (partido en vivo o corrección de resultado finalizado)
    await query('UPDATE matches SET home_score=$1,away_score=$2 WHERE id=$3', [homeScore, awayScore, req.params.id])
  }

  const m = await queryOne(`SELECT m.*,ht.name AS "homeTeam",at.name AS "awayTeam",ht.logo AS "homeLogo",at.logo AS "awayLogo",c.name AS "categoryName",ph.type AS "phaseType",u.name AS "refereeName" FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id LEFT JOIN categories c ON m.category_id=c.id LEFT JOIN phases ph ON m.phase_id=ph.id LEFT JOIN users u ON m.referee_id=u.id WHERE m.id=$1`, [req.params.id])

  // Recalcular tabla y bracket si el partido está o queda finalizado
  if (m.status === 'finished') {
    if (m.category_id) await recalculateStandings(m.tournament_id, m.category_id, m.phase_id, m.group_id||null).catch(e => console.error('[standings]', e.message))
    await advanceBracketWinner(m.id, req.io)
    await checkPhaseCompletion(m.phase_id, req.io)
    req.io?.emit('standings:update', { tournamentId: m.tournament_id, categoryId: m.category_id, phaseId: m.phase_id })
  }
  req.io?.emit('match:update', m)
  res.json(m)
})
router.patch('/matches/:id/status', authMiddleware, adminOnly, async (req, res) => {
  const { status } = req.body
  await query('UPDATE matches SET status=$1 WHERE id=$2', [status, req.params.id])
  const m = (await queryOne(`SELECT m.*,ht.name AS "homeTeam",at.name AS "awayTeam" FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id WHERE m.id=$1`, [req.params.id]))
  if (status === 'finished') {
    if (m.category_id) await recalculateStandings(m.tournament_id, m.category_id, m.phase_id, m.group_id||null).catch(e => console.error('[standings]', e.message))
    await advanceBracketWinner(m.id, req.io)
    await checkPhaseCompletion(m.phase_id, req.io)
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
router.delete('/matches/:id', authMiddleware, adminOnly, async (req, res) => {
  await query('DELETE FROM matches WHERE id=$1', [req.params.id]); res.status(204).end()
})

// ── Match events (árbitro) ────────────────────────────────────────────────
router.get('/matches/:id/events', async (req, res) => {
  const events = (await query(`
    SELECT e.*, p.name AS "playerName", p.number AS "playerNumber",
           t.name AS "teamName"
    FROM match_events e
    LEFT JOIN players p ON e.player_id = p.id
    LEFT JOIN teams   t ON e.team_id   = t.id
    WHERE e.match_id = $1 ORDER BY e.minute ASC, e.second ASC, e.id ASC
  `, [req.params.id])).rows
  res.json(events)
})

router.post('/matches/:id/events', authMiddleware, refereeOrAdmin, async (req, res) => {
  const { type, playerId, teamId, minute, second, note } = req.body
  const matchId = parseInt(req.params.id)
  const match   = (await queryOne('SELECT * FROM matches WHERE id=$1', [matchId]))
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' })

  // Validaciones de negocio
  if (!type) return res.status(400).json({ error: 'El tipo de evento es requerido' })
  if (!teamId) return res.status(400).json({ error: 'El equipo es requerido' })
  if (match.status === 'finished') return res.status(400).json({ error: 'El partido ya ha finalizado' })
  // Comparar como strings para evitar mismatch number/string de PostgreSQL
  const allowedTeams = [String(match.home_team), String(match.away_team)]
  if (!allowedTeams.includes(String(teamId))) return res.status(400).json({ error: 'Equipo no pertenece al partido' })

  const r = await query('INSERT INTO match_events (match_id,type,player_id,team_id,minute,second,note) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [matchId, type, playerId || null, teamId || null, minute ?? null, second ?? 0, note || null])

  // Comparar como string para evitar mismatch number/string de PostgreSQL
  const isHomeTeam = String(teamId) === String(match.home_team)

  if (type === 'goal' || type === 'own_goal') {
    let home = match.home_score
    let away = match.away_score
    if (type === 'goal') {
      if (isHomeTeam) home++; else away++
    } else { // own_goal: suma al equipo contrario
      if (isHomeTeam) away++; else home++
    }
    await query('UPDATE matches SET home_score=$1,away_score=$2 WHERE id=$3', [home, away, matchId])
    if (playerId) await query('UPDATE players SET goals=goals+1 WHERE id=$1', [playerId])
  }
  if (type === 'assist'      && playerId) await query('UPDATE players SET assists=assists+1 WHERE id=$1', [playerId])
  if (type === 'yellow_card' && playerId) await query('UPDATE players SET yellow_cards=yellow_cards+1 WHERE id=$1', [playerId])
  if (type === 'red_card'    && playerId) await query('UPDATE players SET red_cards=red_cards+1 WHERE id=$1', [playerId])

  // Leer datos enriquecidos del evento para el ticker en vivo
  const richEvent = (await queryOne(`
    SELECT e.*, p.name AS "playerName", p.number AS "playerNumber",
           t.name AS "teamName", t.logo AS "teamLogo"
    FROM match_events e
    LEFT JOIN players p ON e.player_id = p.id
    LEFT JOIN teams   t ON e.team_id   = t.id
    WHERE e.id = $1
  `, [r.lastInsertRowid]))

  // Partido con nombres de equipos para el socket
  const updatedMatch = (await queryOne(`
    SELECT m.*, ht.name AS "homeTeam", at.name AS "awayTeam",
           ht.logo AS "homeLogo", at.logo AS "awayLogo"
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    WHERE m.id=$1
  `, [matchId]))

  // Emitir evento enriquecido para el ticker instantáneo
  req.io?.emit('match:event', { matchId, event: richEvent, match: updatedMatch })
  req.io?.emit('match:update', updatedMatch)

  res.status(201).json({ id: r.lastInsertRowid, event: richEvent, match: updatedMatch })
})

router.delete('/match-events/:id', authMiddleware, adminOnly, async (req, res) => {
  const ev = (await queryOne('SELECT * FROM match_events WHERE id=$1', [req.params.id]))
  if (!ev) return res.status(404).json({ error: 'Evento no encontrado' })

  const match = (await queryOne('SELECT * FROM matches WHERE id=$1', [ev.match_id]))

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
    await query('UPDATE matches SET home_score=$1,away_score=$2 WHERE id=$3', [home, away, ev.match_id])
    if (ev.player_id) await query('UPDATE players SET goals=GREATEST(0,goals-1) WHERE id=$1', [ev.player_id])
  }
  if (ev.type === 'assist'      && ev.player_id) await query('UPDATE players SET assists=GREATEST(0,assists-1) WHERE id=$1', [ev.player_id])
  if (ev.type === 'yellow_card' && ev.player_id) await query('UPDATE players SET yellow_cards=GREATEST(0,yellow_cards-1) WHERE id=$1', [ev.player_id])
  if (ev.type === 'red_card'    && ev.player_id) await query('UPDATE players SET red_cards=GREATEST(0,red_cards-1) WHERE id=$1', [ev.player_id])

  await query('DELETE FROM match_events WHERE id=$1', [ev.id])

  const updatedMatch = (await queryOne('SELECT * FROM matches WHERE id=$1', [ev.match_id]))
  req.io?.emit('match:update', updatedMatch)
  res.json({ ok: true, match: updatedMatch })
})

// Iniciar partido (guarda started_at + árbitro)
router.patch('/matches/:id/start', authMiddleware, refereeOrAdmin, async (req, res) => {
  const now = new Date().toISOString()
  const refereeId = req.user?.id || null
  await query("UPDATE matches SET status='live', started_at=$1, referee_id=COALESCE(referee_id,$2) WHERE id=$3", [now, refereeId, req.params.id])
  const m = (await queryOne(`SELECT m.*,ht.name AS "homeTeam",at.name AS "awayTeam" FROM matches m
    JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id WHERE m.id=$1`, [req.params.id]))
  global.sendPushToTeams?.([m.home_team, m.away_team], {
    type:'match:live', title:'🔴 ¡Partido en vivo!',
    body:`${m.homeTeam} vs ${m.awayTeam} ha comenzado`, url:`/partidos`
  })
  req.io?.emit('match:live', m)
  res.json(m)
})

// ── Smart bracket: auto-advance winner to next round ─────────────────────
async function advanceBracketWinner(matchId, io) {
  const match = (await queryOne('SELECT * FROM matches WHERE id=$1', [matchId]))
  if (!match || match.status !== 'finished' || !match.phase_id) return null

  const phase = (await queryOne('SELECT * FROM phases WHERE id=$1', [match.phase_id]))
  if (!phase || phase.type !== 'knockout') return null

  // Determine winner (draw = no auto-advance, admin decides)
  const winnerId = match.home_score > match.away_score ? match.home_team
    : match.away_score > match.home_score ? match.away_team
    : null
  if (!winnerId) return { draw: true, message: 'Empate — avance manual requerido' }

  // Position of this match within its round (0-indexed by id order)
  const siblings = (await query('SELECT id FROM matches WHERE round_id=$1 ORDER BY id ASC', [match.round_id])).rows
  const myIndex  = siblings.findIndex(m => m.id === matchId)
  const nextSlot = Math.floor(myIndex / 2)
  const isHome   = myIndex % 2 === 0  // even → home, odd → away

  const currRound = (await queryOne('SELECT * FROM rounds WHERE id=$1', [match.round_id]))
  const nextRound = (await queryOne("SELECT * FROM rounds WHERE phase_id=$1 AND order_index>$2 AND name != 'Tercer Lugar' ORDER BY order_index ASC LIMIT 1", [match.phase_id, currRound.order_index]))

  // Cuando este partido alimenta la Final, verificar si todas las semis terminaron
  // para crear automáticamente el partido de Tercer Lugar
  if (nextRound && /^final$/i.test(nextRound.name)) {
    const pendingInRound = (await queryOne("SELECT COUNT(*) as c FROM matches WHERE round_id=$1 AND status != 'finished'", [match.round_id])).c

    if (pendingInRound === 0) {
      // Todas las semis terminaron — recolectar los dos perdedores
      const semiMatches = (await query('SELECT * FROM matches WHERE round_id=$1 AND status=\'finished\' ORDER BY id ASC', [match.round_id])).rows
      const losers = semiMatches.map(m =>
        m.home_score > m.away_score ? m.away_team : m.home_team
      ).filter(Boolean)

      if (losers.length >= 2) {
        // Buscar o crear el round "Tercer Lugar"
        let tercerRound = (await queryOne("SELECT * FROM rounds WHERE phase_id=$1 AND name='Tercer Lugar' LIMIT 1", [match.phase_id]))

        if (!tercerRound) {
          // Insertar Tercer Lugar ANTES de Final:
          // Mover Final al siguiente order_index y poner Tercer Lugar en el actual
          const tercerIdx = nextRound.order_index
          await query('UPDATE rounds SET order_index=order_index+1 WHERE phase_id=$1 AND order_index>=$2', [match.phase_id, tercerIdx])
          const r = await query('INSERT INTO rounds (phase_id, name, order_index) VALUES ($1,$2,$3) RETURNING id', [match.phase_id, 'Tercer Lugar', tercerIdx])
          tercerRound = (await queryOne('SELECT * FROM rounds WHERE id=$1', [r.lastInsertRowid]))
        }

        // Solo crear el partido si aún no existe en ese round
        const existing = (await queryOne('SELECT COUNT(*) as c FROM matches WHERE round_id=$1', [tercerRound.id])).c

        if (!existing) {
          await query(`
            INSERT INTO matches (tournament_id,category_id,phase_id,round_id,home_team,away_team,bracket_slot,location,status,home_is_tbd,away_is_tbd)
            VALUES ($1,$2,$3,$4,$5,$6,0,$7,\'scheduled\',0,0) RETURNING id`, [match.tournament_id, match.category_id, match.phase_id, tercerRound.id,
            losers[0], losers[1], null  /* fecha/cancha se asignan manualmente */])
          io?.to(`tournament:${match.tournament_id}`).emit('bracket:third_place_created', {
            phaseId: match.phase_id
          })
        }
      }
    }
  }

  if (!nextRound) {
    // Final — emit champion
    const champion = (await queryOne('SELECT * FROM teams WHERE id=$1', [winnerId]))
    io?.to(`tournament:${match.tournament_id}`).emit('bracket:champion', {
      team: champion, phaseId: match.phase_id, phaseName: phase.name
    })
    return { champion: champion.name }
  }

  // Find the target TBD match in next round at nextSlot (ordered by id/slot)
  const nextMatches = (await query('SELECT * FROM matches WHERE round_id=$1 ORDER BY COALESCE(bracket_slot, id) ASC', [nextRound.id])).rows

  let targetMatch = nextMatches[nextSlot]
  if (targetMatch) {
    // El partido ya existe — actualizar solo el equipo correspondiente y limpiar flag TBD
    const col    = isHome ? 'home_team'    : 'away_team'
    const tbdCol = isHome ? 'home_is_tbd'  : 'away_is_tbd'
    await query(`UPDATE matches SET ${col}=$1, ${tbdCol}=0 WHERE id=$2`, [winnerId, targetMatch.id])
    targetMatch = (await queryOne('SELECT * FROM matches WHERE id=$1', [targetMatch.id]))
  } else {
    // Crear el partido placeholder.
    // home_team y away_team son NOT NULL → se usa winnerId en ambos slots
    // pero se marca el slot opuesto como TBD para que el frontend lo muestre correctamente.
    const homeTbd = isHome ? 0 : 1   // si el ganador va a home, away está TBD
    const awayTbd = isHome ? 1 : 0   // si el ganador va a away, home está TBD
    const r = await query(`
      INSERT INTO matches (tournament_id,category_id,phase_id,round_id,home_team,away_team,bracket_slot,location,status,home_is_tbd,away_is_tbd)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'scheduled',$9,$10) RETURNING id`, [match.tournament_id, match.category_id, match.phase_id, nextRound.id,
      winnerId, winnerId, nextSlot, null /* fecha/cancha se asignan manualmente */, homeTbd, awayTbd])
    targetMatch = (await queryOne('SELECT * FROM matches WHERE id=$1', [r.lastInsertRowid]))
  }

  // Emit realtime bracket update
  io?.to(`tournament:${match.tournament_id}`).emit('bracket:advance', {
    phaseId: match.phase_id, updatedMatch: targetMatch, winnerId
  })

  // Check if whole round is done → emit round_complete
  const allDone = (await queryOne("SELECT COUNT(*) as c FROM matches WHERE round_id=$1 AND status!='finished'", [match.round_id])).c === 0
  if (allDone) {
    io?.to(`tournament:${match.tournament_id}`).emit('bracket:round_complete', {
      roundId: match.round_id, roundName: currRound.name, nextRoundId: nextRound.id
    })
  }
  return { advanced: winnerId, nextMatchId: targetMatch.id }
}

// ── Check if phase is fully complete ─────────────────────────────────────
async function checkPhaseCompletion(phaseId, io) {
  const phase = (await queryOne('SELECT * FROM phases WHERE id=$1', [phaseId]))
  if (!phase) return

  let isComplete = false

  if (phase.type === 'knockout') {
    // Para knockout: la fase está "completa para premios" cuando el partido Final termina.
    // No esperar el Tercer Lugar (puede no jugarse o ser posterior).
    const finalRound = (await queryOne("SELECT * FROM rounds WHERE phase_id=$1 AND name != 'Tercer Lugar' ORDER BY order_index DESC LIMIT 1", [phaseId]))
    if (finalRound) {
      const total    = (await queryOne("SELECT COUNT(*) as c FROM matches WHERE round_id=$1", [finalRound.id])).c
      const finished = (await queryOne("SELECT COUNT(*) as c FROM matches WHERE round_id=$1 AND status='finished'", [finalRound.id])).c
      isComplete = total > 0 && total === finished
    }
  } else {
    const total    = (await queryOne("SELECT COUNT(*) as c FROM matches WHERE phase_id=$1", [phaseId])).c
    const finished = (await queryOne("SELECT COUNT(*) as c FROM matches WHERE phase_id=$1 AND status='finished'", [phaseId])).c
    isComplete = total > 0 && total === finished
  }

  if (isComplete) {
    await autoGenerateAwardsForPhase(phaseId)

    // Si es fase de grupos → generar bracket de eliminatoria automáticamente
    if (phase.type === 'groups') {
      await autoGenerateKnockoutBracket(phase, io)
    }

    io?.to(`tournament:${phase.tournament_id}`).emit('phase:complete', {
      phaseId, phaseName: phase.name, type: phase.type
    })
  }
}

// ── Auto-generar bracket de eliminatoria desde fase de grupos ─────────────────
async function autoGenerateKnockoutBracket(groupsPhase, io) {
  try {
    // Buscar la fase knockout del mismo torneo/categoría
    const knockoutPhase = await queryOne(`
      SELECT * FROM phases
      WHERE tournament_id=$1 AND type='knockout'
        AND ($2::bigint IS NULL OR category_id=$2)
        AND order_index > $3
      ORDER BY order_index ASC LIMIT 1
    `, [groupsPhase.tournament_id, groupsPhase.category_id || null, groupsPhase.order_index])

    if (!knockoutPhase) return // No hay eliminatoria configurada

    // Obtener el primer round de la eliminatoria
    const firstRound = await queryOne(
      'SELECT * FROM rounds WHERE phase_id=$1 ORDER BY order_index ASC LIMIT 1',
      [knockoutPhase.id]
    )
    if (!firstRound) return

    // ¿Ya hay partidos en ese round? No regenerar
    const existing = await queryOne('SELECT COUNT(*) as c FROM matches WHERE round_id=$1', [firstRound.id])
    if (parseInt(existing.c) > 0) return

    // Obtener grupos de la fase y sus clasificados
    const groups = (await query('SELECT * FROM phase_groups WHERE phase_id=$1 ORDER BY order_index ASC', [groupsPhase.id])).rows
    const advancingTeams = [] // [{ team_id, groupPos, groupIdx }]

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      const advanceCount = g.advance_count || 2
      // Standings del grupo ordenados: pts DESC, gd DESC, gf DESC
      const standings = (await query(`
        SELECT team_id,
          SUM(CASE WHEN home_team=team_id THEN home_score ELSE away_score END) AS gf,
          SUM(CASE WHEN home_team=team_id THEN away_score ELSE home_score END) AS ga,
          SUM(CASE WHEN (home_team=team_id AND home_score>away_score) OR (away_team=team_id AND away_score>home_score) THEN 3
                   WHEN home_score=away_score THEN 1 ELSE 0 END) AS pts
        FROM matches
        WHERE phase_id=$1 AND group_id=$2 AND status='finished'
          AND (home_team=team_id OR away_team=team_id)
        GROUP BY team_id
        ORDER BY pts DESC, (gf-ga) DESC, gf DESC
      `, [groupsPhase.id, g.id])).rows

      // Si no hay standings, usar teams del grupo
      const groupTeams = standings.length > 0 ? standings :
        (await query('SELECT team_id FROM phase_group_teams WHERE group_id=$1', [g.id])).rows

      for (let pos = 0; pos < Math.min(advanceCount, groupTeams.length); pos++) {
        advancingTeams.push({ team_id: groupTeams[pos].team_id, pos, groupIdx: gi })
      }
    }

    if (advancingTeams.length < 2) return

    // Sembrar bracket: 1ro Grupo A vs 2do Grupo B, 1ro Grupo B vs 2do Grupo A...
    // Separar por posición
    const byPos = {}
    for (const t of advancingTeams) {
      if (!byPos[t.pos]) byPos[t.pos] = []
      byPos[t.pos].push(t.team_id)
    }

    // Construir pares: pos0[0] vs pos1[1], pos0[1] vs pos1[0], etc. (cruzado)
    const firstPlace  = byPos[0] || []
    const secondPlace = byPos[1] || []
    const pairs = []

    // Cruzado clásico: 1A vs 2B, 1B vs 2A, 1C vs 2D, ...
    const n = Math.min(firstPlace.length, secondPlace.length)
    for (let i = 0; i < n; i++) {
      const j = (firstPlace.length - 1 - i) % secondPlace.length
      pairs.push([firstPlace[i], secondPlace[j]])
    }
    // Si sobran equipos sin par, agregarlos como BYE
    if (firstPlace.length > n) {
      for (let i = n; i < firstPlace.length; i++) pairs.push([firstPlace[i], null])
    }

    // Insertar partidos del primer round
    let slot = 1
    for (const [home, away] of pairs) {
      if (!away) continue // bye — equipo avanza automáticamente (no generamos partido)
      await query(
        `INSERT INTO matches (tournament_id,category_id,phase_id,round_id,home_team,away_team,status,bracket_slot)
         VALUES ($1,$2,$3,$4,$5,$6,'scheduled',$7)`,
        [knockoutPhase.tournament_id, knockoutPhase.category_id||null,
         knockoutPhase.id, firstRound.id, home, away, slot++]
      )
    }

    io?.to(`tournament:${knockoutPhase.tournament_id}`).emit('bracket:generated', {
      phaseId: knockoutPhase.id, teams: advancingTeams.length
    })
    console.log(`[bracket] Generado: ${pairs.length} partidos en fase ${knockoutPhase.id}`)
  } catch (e) {
    console.error('[bracket]', e.message)
  }
}

// ── Auto-generate awards when a phase completes ───────────────────────────
async function autoGenerateAwardsForPhase(phaseId) {
  const phase = (await queryOne('SELECT * FROM phases WHERE id=$1', [phaseId]))
  if (!phase) return

  // Idempotencia por tipo: no duplicar un award del mismo tipo para la misma fase
  const existingTypes = new Set(
    (await query("SELECT type FROM awards WHERE phase_id=$1 AND auto_generated=1", [phaseId])).rows.map(r => r.type)
  )

  // Si la fase no tiene category_id, inferirlo desde los equipos de sus partidos
  let categoryId = phase.category_id
  if (!categoryId) {
    const inferred = (await queryOne(`
      SELECT t.category_id FROM matches m
      JOIN teams t ON m.home_team = t.id
      WHERE m.phase_id = $1 AND t.category_id IS NOT NULL LIMIT 1
    `, [phaseId]))
    categoryId = inferred?.category_id || null
  }

  const ins = (...__a) => query('INSERT INTO awards (tournament_id,category_id,phase_id,type,player_id,team_id,description,auto_generated) VALUES ($1,$2,$3,$4,$5,$6,$7,1)', __a.flat())
  // Usar categoryId inferido en lugar de phase.category_id
  const cat = categoryId

  if (phase.type === 'league' || phase.type === 'groups') {
    // Goleador
    if (!existingTypes.has('top_scorer')) {
      const topScorer = (await queryOne(`
        SELECT p.id AS player_id, t.id AS team_id, COUNT(*) AS goals
        FROM match_events e
        JOIN matches m ON e.match_id = m.id
        JOIN players p ON e.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        WHERE m.phase_id = $1 AND e.type = 'goal'
        GROUP BY p.id ORDER BY goals DESC LIMIT 1
      `, [phaseId]))
      if (topScorer) {
        await ins(phase.tournament_id, cat, phaseId, 'top_scorer',
          topScorer.player_id, topScorer.team_id,
          `${topScorer.goals} gol${topScorer.goals !== 1 ? 'es' : ''} en la fase`)
      }
    }

    // MVP / Asistidor
    if (!existingTypes.has('mvp')) {
      const topAssist = (await queryOne(`
        SELECT p.id AS player_id, t.id AS team_id, COUNT(*) AS assists
        FROM match_events e
        JOIN matches m ON e.match_id = m.id
        JOIN players p ON e.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        WHERE m.phase_id = $1 AND e.type = 'assist'
        GROUP BY p.id ORDER BY assists DESC LIMIT 1
      `, [phaseId]))
      if (topAssist && topAssist.assists > 0) {
        await ins(phase.tournament_id, cat, phaseId, 'mvp',
          topAssist.player_id, topAssist.team_id,
          `${topAssist.assists} asistencia${topAssist.assists !== 1 ? 's' : ''} en la fase`)
      }
    }

    // Mejor Portero: equipo con menos goles recibidos (mín. 1 partido)
    if (!existingTypes.has('best_keeper')) {
      const bestKeeper = (await queryOne(`
        SELECT t.id AS team_id,
               SUM(CASE WHEN m.home_team=t.id THEN m.away_score ELSE m.home_score END) AS goals_against,
               COUNT(m.id) AS played
        FROM teams t
        JOIN matches m ON (m.home_team=t.id OR m.away_team=t.id)
        WHERE m.phase_id=$1 AND m.status='finished'
        GROUP BY t.id
        HAVING played > 0
        ORDER BY goals_against ASC, played DESC LIMIT 1
      `, [phaseId]))
      if (bestKeeper) {
        const keeper = (await queryOne("SELECT id FROM players WHERE team_id=$1 AND LOWER(COALESCE(position,'')) LIKE '%port%' LIMIT 1", [bestKeeper.team_id]))
        await ins(phase.tournament_id, cat, phaseId, 'best_keeper',
          keeper?.id || null, bestKeeper.team_id,
          `${bestKeeper.goals_against} goles recibidos · ${bestKeeper.played} PJ`)
      }
    }

  } else if (phase.type === 'knockout') {
    // Campeón
    if (!existingTypes.has('best_team')) {
      const finalRound = (await queryOne("SELECT * FROM rounds WHERE phase_id=$1 AND name != 'Tercer Lugar' ORDER BY order_index DESC LIMIT 1", [phaseId]))
      if (finalRound) {
        const finalMatch = (await queryOne("SELECT * FROM matches WHERE round_id=$1 AND status='finished' ORDER BY id DESC LIMIT 1", [finalRound.id]))
        if (finalMatch) {
          const championId = finalMatch.home_score > finalMatch.away_score
            ? finalMatch.home_team
            : finalMatch.away_score > finalMatch.home_score
            ? finalMatch.away_team : null
          if (championId) {
            await ins(phase.tournament_id, cat, phaseId, 'best_team',
              null, championId, `Campeón de ${phase.name}`)
          }
        }
      }
    }

    // Goleador de la eliminatoria
    if (!existingTypes.has('top_scorer')) {
      const topKnockout = (await queryOne(`
        SELECT p.id AS player_id, t.id AS team_id, COUNT(*) AS goals
        FROM match_events e
        JOIN matches m ON e.match_id=m.id
        JOIN players p ON e.player_id=p.id
        JOIN teams t ON p.team_id=t.id
        WHERE m.phase_id=$1 AND e.type='goal'
        GROUP BY p.id ORDER BY goals DESC LIMIT 1
      `, [phaseId]))
      if (topKnockout && topKnockout.goals > 0) {
        await ins(phase.tournament_id, cat, phaseId, 'top_scorer',
          topKnockout.player_id, topKnockout.team_id,
          `${topKnockout.goals} gol${topKnockout.goals !== 1 ? 'es' : ''} en la eliminatoria`)
      }
    }
  }
}

// ── Match Generator ───────────────────────────────────────────────────────
router.post('/matches/generate', authMiddleware, adminOnly, async (req, res) => {
  const {tournamentId,categoryId,phaseId,teamIds,type,startDate,location,roundMinutes} = req.body
  if(!teamIds?.length) return res.status(400).json({error:'Se requieren equipos'})
  const generated = []
  const insMatch = (...__a) => query(`
    INSERT INTO matches (tournament_id,category_id,phase_id,round_id,home_team,away_team,bracket_slot,date,location,status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'scheduled')
  `, __a.flat())
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

      const rr = await query('INSERT INTO rounds (phase_id,name,order_index) VALUES ($1,$2,$3) RETURNING id', [phaseId, `Jornada ${ri+1}`, ri])
      for (const [slot, [h, a]] of pairs.entries()) {
        const r = await insMatch(tournamentId, categoryId||null, phaseId||null, rr.lastInsertRowid, h, a, slot, null, null)
        generated.push(r.lastInsertRowid)
      }
      rotating.unshift(rotating.pop())
    }

  } else if (type === 'knockout') {
    let pow2 = 1; while (pow2 < teamIds.length) pow2 *= 2
    const allRounds = []
    let roundSize = pow2, roundIdx = 0
    while (roundSize >= 2) {
      const name = roundSize===2?'Final': roundSize===4?'Semifinal': roundSize===8?'Cuartos de Final': roundSize===16?'Octavos de Final': `Ronda ${roundIdx+1}`
      const rr = await query('INSERT INTO rounds (phase_id,name,order_index) VALUES ($1,$2,$3) RETURNING id', [phaseId, name, roundIdx])
      allRounds.push({ id: rr.lastInsertRowid, size: roundSize, idx: roundIdx })
      roundSize /= 2; roundIdx++
    }

    const seeded = [...teamIds]; while (seeded.length < pow2) seeded.push(null)
    for (let slot = 0; slot < pow2/2; slot++) {
      const home = seeded[slot*2], away = seeded[slot*2+1]
      if (!home && !away) continue
      // Fecha y cancha NULL — el admin las asigna manualmente
      const r = await insMatch(tournamentId, categoryId||null, phaseId||null, allRounds[0].id,
        home || away, away || home, slot, null, null)
      generated.push(r.lastInsertRowid)
      if (!home || !away) {
        await query("UPDATE matches SET status='finished',home_score=1,away_score=0 WHERE id=$1", [r.lastInsertRowid])
      }
    }

    for (let ri = 1; ri < allRounds.length; ri++) {
      const { id: rid, size } = allRounds[ri]
      for (let slot = 0; slot < size/2; slot++) {
        // Fecha y cancha NULL — el admin las asigna manualmente
        await insMatch(tournamentId, categoryId||null, phaseId||null, rid, null, null, slot, null, null)
      }
    }

    // Process any byes from round 1 so their winners appear in round 2
    const byeMatches = (await query("SELECT id FROM matches WHERE round_id=$1 AND status='finished' ORDER BY id ASC", [allRounds[0].id])).rows
    for (const m of byeMatches) advanceBracketWinner(m.id, null)
  }

  res.status(201).json({ generated: generated.length, matchIds: generated })
})

// ── Standings ─────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/standings', async (req, res) => {
  const t = await getTournament(req.params.slug); if(!t) return notFound(res)
  const catId   = req.query.cat   ? parseInt(req.query.cat)   : null
  const phaseId = req.query.phase ? parseInt(req.query.phase) : null

  // Si se pide una fase específica de tipo 'league', calcular en vivo con desempate completo
  if (phaseId) {
    const phase = (await queryOne('SELECT * FROM phases WHERE id=$1', [phaseId]))
    if (phase?.type === 'league') {
      const rows = await getPhaseStandings(phaseId)
      return res.json(rows.map(r => ({
        ...r, goalDiff: r.goals_for - r.goals_against,
        goalsFor: r.goals_for, goalsAgainst: r.goals_against
      })))
    }
  }

  // Para categoría sin fase: calcular desde todas las fases de liga activas
  if (catId && !phaseId) {
    const phases = (await query(`SELECT * FROM phases WHERE tournament_id=$1 AND category_id=$2 AND type='league' ORDER BY order_index`, [t.id, catId])).rows
    if (phases.length) {
      const allRows = []
      for (const p of phases) {
        const rows = await getPhaseStandings(p.id)
        allRows.push(...rows.map(r => ({ ...r, phaseName: p.name, goalDiff: r.goals_for - r.goals_against, goalsFor: r.goals_for, goalsAgainst: r.goals_against })))
      }
      return res.json(allRows)
    }
  }

  // Fallback: standings tabla (para compatibilidad)
  let sql = `SELECT s.*,te.name AS "teamName",te.logo,(s.goals_for-s.goals_against) AS "goalDiff",c.name AS "categoryName"
    FROM standings s JOIN teams te ON s.team_id=te.id LEFT JOIN categories c ON s.category_id=c.id
    WHERE s.tournament_id=$1 AND s.group_id IS NULL`
  const params = [t.id]
  if (catId)   { params.push(catId);   sql+=` AND s.category_id=$${params.length}` }
  if (phaseId) { params.push(phaseId); sql+=` AND s.phase_id=$${params.length}` }
  sql += ' ORDER BY s.points DESC,(s.goals_for-s.goals_against) DESC,s.goals_for DESC'
  res.json((await query(sql, [...params])).rows)
})

// ── Streams ───────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/streams', async (req, res) => {
  const t = await getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const rows = catId
    ? (await query('SELECT s.*,c.name AS "categoryName" FROM streams s LEFT JOIN categories c ON s.category_id=c.id WHERE s.tournament_id=$1 AND (s.category_id=$2 OR s.category_id IS NULL) ORDER BY s.is_live DESC,s.id DESC', [t.id,catId])).rows
    : (await query('SELECT s.*,c.name AS "categoryName" FROM streams s LEFT JOIN categories c ON s.category_id=c.id WHERE s.tournament_id=$1 ORDER BY s.is_live DESC,s.id DESC', [t.id])).rows
  res.json(rows)
})
router.post('/streams', authMiddleware, adminOnly, async (req, res) => {
  const {tournamentId,categoryId,matchId,platform,title,url,thumbnail} = req.body
  const r = await query('INSERT INTO streams (tournament_id,category_id,match_id,platform,title,url,thumbnail,is_live) VALUES ($1,$2,$3,$4,$5,$6,$7,0) RETURNING id', [tournamentId,categoryId||null,matchId,platform,title,url,thumbnail])
  res.status(201).json((await queryOne('SELECT * FROM streams WHERE id=$1', [r.lastInsertRowid])))
})
router.patch('/streams/:id/live', authMiddleware, adminOnly, async (req, res) => {
  const {isLive} = req.body
  await query('UPDATE streams SET is_live=$1 WHERE id=$2', [isLive?1:0,req.params.id])
  const s = (await queryOne('SELECT * FROM streams WHERE id=$1', [req.params.id]))
  req.io?.emit('stream:update',s); res.json(s)
})
router.delete('/streams/:id', authMiddleware, adminOnly, async (req, res) => {
  await query('DELETE FROM streams WHERE id=$1', [req.params.id]); res.status(204).end()
})

// ── News ──────────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/news', async (req, res) => {
  const t = await getTournament(req.params.slug); if(!t) return notFound(res)
  res.json((await query('SELECT * FROM news WHERE tournament_id=$1 ORDER BY created_at DESC', [t.id])).rows)
})
router.get('/news/:id', async (req, res) => {
  const row = (await queryOne('SELECT * FROM news WHERE id=$1', [req.params.id]))
  if(!row) return notFound(res); res.json(row)
})
router.post('/news', authMiddleware, adminOnly, async (req, res) => {
  const {tournamentId,title,content,cover} = req.body
  const r = await query(
    'INSERT INTO news (tournament_id,title,content,cover) VALUES ($1,$2,$3,$4) RETURNING id,title,created_at',
    [tournamentId, title, content||'', cover||null]
  )
  const news = r.rows[0]
  // Push en background — no bloquea la respuesta ni crashea si falla
  setImmediate(() => {
    query('SELECT id FROM teams WHERE tournament_id=$1', [tournamentId])
      .then(({ rows }) => global.sendPushToTeams?.(rows.map(t => t.id), { type:'news', title:'📰 Nueva noticia', body: title, url:'/noticias' }))
      .catch(() => {})
  })
  res.status(201).json(news)
})
router.put('/news/:id', authMiddleware, adminOnly, async (req, res) => {
  const {title,content,cover} = req.body
  const r = await query(
    'UPDATE news SET title=$1,content=$2,cover=$3 WHERE id=$4 RETURNING *',
    [title, content, cover||null, req.params.id]
  )
  res.json(r.rows[0])
})
router.delete('/news/:id', authMiddleware, adminOnly, async (req, res) => {
  await query('DELETE FROM news WHERE id=$1', [req.params.id]); res.status(204).end()
})

// ── Sponsors ──────────────────────────────────────────────────────────────

// ── Galleries ─────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/galleries', async (req, res) => {
  const t = await getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const galleries = catId
    ? (await query('SELECT * FROM galleries WHERE tournament_id=$1 AND (category_id=$2 OR category_id IS NULL) ORDER BY created_at DESC', [t.id, catId])).rows
    : (await query('SELECT * FROM galleries WHERE tournament_id=$1 ORDER BY created_at DESC', [t.id])).rows
  res.json(await Promise.all(galleries.map(async g => ({...g, images: (await query('SELECT * FROM gallery_images WHERE gallery_id=$1', [g.id])).rows}))))
})
router.post('/galleries', authMiddleware, adminOnly, async (req, res) => {
  const {tournamentId,title,cover,categoryId} = req.body
  const r = await query('INSERT INTO galleries (tournament_id,category_id,title,cover) VALUES ($1,$2,$3,$4) RETURNING id', [tournamentId,categoryId||null,title,cover])
  res.status(201).json((await queryOne('SELECT * FROM galleries WHERE id=$1', [r.lastInsertRowid])))
})
router.delete('/galleries/:id', authMiddleware, adminOnly, async (req, res) => {
  await query('DELETE FROM galleries WHERE id=$1', [req.params.id]); res.status(204).end()
})
router.post('/gallery-images', authMiddleware, adminOnly, async (req, res) => {
  const {galleryId,imageUrl,description} = req.body
  const r = await query('INSERT INTO gallery_images (gallery_id,image_url,description) VALUES ($1,$2,$3) RETURNING id', [galleryId,imageUrl,description||''])
  res.status(201).json((await queryOne('SELECT * FROM gallery_images WHERE id=$1', [r.lastInsertRowid])))
})
router.delete('/gallery-images/:id', authMiddleware, adminOnly, async (req, res) => {
  await query('DELETE FROM gallery_images WHERE id=$1', [req.params.id]); res.status(204).end()
})

// ── Inscriptions ──────────────────────────────────────────────────────────
router.get('/tournaments/:slug/inscriptions', authMiddleware, adminOnly, async (req, res) => {
  const t = await getTournament(req.params.slug); if(!t) return notFound(res)
  const rows = (await query(`SELECT i.*,c.name AS "categoryName", (SELECT COUNT(*) FROM inscription_players ip WHERE ip.inscription_id=i.id) AS "actual_players_count" FROM inscriptions i LEFT JOIN categories c ON i.category_id=c.id WHERE i.tournament_id=$1 ORDER BY i.created_at DESC`, [t.id])).rows
  const result = rows.map(r => {
    let categories = []
    if (r.categories_json) { try { categories = JSON.parse(r.categories_json) } catch{} }
    else if (r.categoryName) { categories = [{ id: r.category_id, name: r.categoryName }] }
    return { ...r, categories, actual_players_count: Number(r.actual_players_count) || 0 }
  })
  res.json(result)
})
router.post('/inscriptions', async (req, res) => {  // Public — no auth
  const {tournamentId,categoryIds,team_name,contact_name,contact_email,contact_phone,players_count,notes,players,logo} = req.body
  if(!team_name||!contact_name||!contact_email) return res.status(400).json({error:'Campos requeridos faltantes'})
  // Resolver nombres de categorías para guardar en JSON
  let categories = []
  if (categoryIds?.length) {
    const catRows = (await query(`SELECT id,name FROM categories WHERE id=ANY($1::bigint[])`, [categoryIds])).rows
    categories = catRows.map(c => ({ id: c.id, name: c.name }))
  }
  const firstCatId = categories[0]?.id || null
  const token = crypto.randomBytes(20).toString('hex')
  const tournament = await queryOne('SELECT id,auto_approve_inscriptions FROM tournaments WHERE id=$1', [tournamentId])
  const autoApprove = tournament?.auto_approve_inscriptions === 1
  const status = autoApprove ? 'approved' : 'pending'
  const r = await query(
    'INSERT INTO inscriptions (tournament_id,category_id,categories_json,logo,team_name,contact_name,contact_email,contact_phone,players_count,notes,status,registration_token) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id',
    [tournamentId, firstCatId, JSON.stringify(categories), logo||null, team_name, contact_name, contact_email, contact_phone||null, players_count||0, notes||null, status, token]
  )
  const id = r.rows[0]?.id || r.lastInsertRowid
  if(players?.length) {
    const insP = (...__a) => query('INSERT INTO inscription_players (inscription_id,name,number,position,birth_date) VALUES ($1,$2,$3,$4,$5)', __a.flat())
    for(const p of players) await insP(id,p.name,p.number||null,p.position||null,p.birth_date||null)
  }
  // If auto-approved, create one team per selected category
  if (autoApprove) {
    await createTeamsFromInscription({ id, tournament_id: tournamentId, team_name, logo: logo||null, categories_json: JSON.stringify(categories) })
  }
  res.status(201).json({id, token, auto_approved: autoApprove, message: autoApprove ? 'Inscripción aprobada automáticamente' : 'Solicitud enviada correctamente'})
})
router.patch('/inscriptions/:id/status', authMiddleware, adminOnly, async (req, res) => {
  const {status} = req.body
  await query('UPDATE inscriptions SET status=$1 WHERE id=$2', [status, req.params.id])
  const insc = await queryOne('SELECT * FROM inscriptions WHERE id=$1', [req.params.id])
  if (status === 'approved' && insc) await createTeamsFromInscription(insc)
  if (status === 'rejected' && insc) await query('DELETE FROM teams WHERE inscription_id=$1', [insc.id])
  res.json(insc)
})
// Alias sin /status — el panel admin hace PATCH /inscriptions/:id directamente
router.patch('/inscriptions/:id', authMiddleware, adminOnly, async (req, res) => {
  const {status, notes} = req.body
  if (status) await query('UPDATE inscriptions SET status=$1 WHERE id=$2', [status, req.params.id])
  if (notes !== undefined) await query('UPDATE inscriptions SET notes=$1 WHERE id=$2', [notes, req.params.id])
  const insc = await queryOne('SELECT * FROM inscriptions WHERE id=$1', [req.params.id])
  if (!insc) return res.status(404).json({error:'Inscripción no encontrada'})
  if (status === 'approved') await createTeamsFromInscription(insc)
  if (status === 'rejected') await query('DELETE FROM teams WHERE inscription_id=$1', [insc.id])
  res.json(insc)
})
router.delete('/inscriptions/:id', authMiddleware, adminOnly, async (req, res) => {
  // Remove teams created from this inscription before deleting
  await query('DELETE FROM teams WHERE inscription_id=$1', [req.params.id])
  await query('DELETE FROM inscriptions WHERE id=$1', [req.params.id])
  res.status(204).end()
})

// ── Helper: create one team per category when inscription is approved ─────────
async function createTeamsFromInscription(insc) {
  let cats = []
  if (insc.categories_json) { try { cats = JSON.parse(insc.categories_json) } catch{} }
  if (!cats.length && insc.category_id) cats = [{ id: insc.category_id }]
  if (!cats.length) {
    // fallback: create uncategorized team
    const ex = await queryOne('SELECT id FROM teams WHERE inscription_id=$1 AND category_id IS NULL', [insc.id])
    if (!ex) await query('INSERT INTO teams (tournament_id,category_id,name,logo,inscription_id) VALUES ($1,$2,$3,$4,$5)', [insc.tournament_id, null, insc.team_name, insc.logo||null, insc.id])
    return
  }
  for (const cat of cats) {
    const ex = await queryOne('SELECT id FROM teams WHERE inscription_id=$1 AND category_id=$2', [insc.id, cat.id])
    if (!ex) {
      await query('INSERT INTO teams (tournament_id,category_id,name,logo,inscription_id) VALUES ($1,$2,$3,$4,$5)', [insc.tournament_id, cat.id, insc.team_name, insc.logo||null, insc.id])
    }
  }
}

// ── Public: Player registration for auto-approved inscriptions ────────────────
router.get('/inscriptions/:id/register', async (req, res) => {
  const insc = await queryOne('SELECT i.*,t.name AS "tournamentName",t.slug AS "tournamentSlug" FROM inscriptions i JOIN tournaments t ON i.tournament_id=t.id WHERE i.id=$1', [req.params.id])
  if (!insc) return res.status(404).json({error:'Inscripción no encontrada'})
  if (insc.status !== 'approved') return res.status(403).json({error:'Esta inscripción no está aprobada'})
  let categories = []
  if (insc.categories_json) { try { categories = JSON.parse(insc.categories_json) } catch{} }
  // Load full category data (with age config)
  if (categories.length) {
    const ids = categories.map(c => c.id)
    const catRows = (await query('SELECT * FROM categories WHERE id=ANY($1::bigint[])', [ids])).rows
    categories = catRows
  }
  const players       = (await query('SELECT ip.*,c.name AS "categoryName" FROM inscription_players ip LEFT JOIN categories c ON ip.category_id=c.id WHERE ip.inscription_id=$1 ORDER BY ip.category_id,ip.id', [insc.id])).rows
  const responsables  = (await query('SELECT * FROM inscription_responsables WHERE inscription_id=$1 ORDER BY category_id,orden', [insc.id])).rows
  res.json({ ...insc, categories, players, responsables })
})

router.post('/inscriptions/:id/players', async (req, res) => {
  const { players, categoryId } = req.body  // players: [{name,number,position,curp}], categoryId
  if (!players?.length || !categoryId) return res.status(400).json({error:'Datos incompletos'})
  const insc = await queryOne('SELECT * FROM inscriptions WHERE id=$1', [req.params.id])
  if (!insc) return res.status(404).json({error:'Inscripción no encontrada'})
  if (insc.status !== 'approved') return res.status(403).json({error:'La inscripción debe estar aprobada'})
  const category = await queryOne('SELECT * FROM categories WHERE id=$1', [categoryId])
  if (!category) return res.status(404).json({error:'Categoría no encontrada'})

  // Check max players per team for this category
  if (category.max_players_per_team) {
    const currentCount = (await queryOne('SELECT COUNT(*) AS c FROM inscription_players WHERE inscription_id=$1 AND category_id=$2', [insc.id, categoryId])).c
    const remaining = category.max_players_per_team - currentCount
    if (remaining <= 0) {
      return res.status(400).json({ error: `Ya alcanzaste el límite de ${category.max_players_per_team} jugadores en ${category.name}.` })
    }
    if (players.length > remaining) {
      return res.status(400).json({ error: `Solo puedes agregar ${remaining} jugador(es) más en ${category.name} (límite: ${category.max_players_per_team}).` })
    }
  }

  const errors = []
  const toInsert = []

  for (const p of players) {
    const name = p.name?.trim()
    if (!name) continue
    const curp = p.curp?.trim().toUpperCase() || null

    if (!curp) {
      errors.push(`${name}: la CURP es obligatoria`)
      continue
    }

    // CURP validation
    if (curp) {
      const curpData = parseCURP(curp)
      if (!curpData) {
        errors.push(`${name}: CURP inválida (formato incorrecto)`)
        continue
      }

      // Age validation against category
      const ageCheck = validateCURPAge(curpData, category)
      if (!ageCheck.valid) {
        errors.push(`${name}: ${ageCheck.reason}`)
        continue
      }

      // Limit girls exception: max 2 per category
      // A girl uses the exception when her birth year < min_birth_year but >= min_birth_year_girls
      const isFemale = curpData.sex === 'M'
      const usesGirlsException = isFemale && category.min_birth_year && category.min_birth_year_girls &&
        curpData.birthYear < category.min_birth_year && curpData.birthYear >= category.min_birth_year_girls
      if (usesGirlsException) {
        // Count how many already registered in this category use the exception (born < min_birth_year)
        const existingExceptions = (await query(
          `SELECT ip.curp FROM inscription_players ip
           WHERE ip.inscription_id=$1 AND ip.category_id=$2 AND ip.curp IS NOT NULL`,
          [insc.id, categoryId]
        )).rows.filter(r => {
          const d = parseCURP(r.curp); return d && d.sex === 'M' && d.birthYear < category.min_birth_year && d.birthYear >= category.min_birth_year_girls
        })
        // Also count the ones being inserted in this same batch
        const batchExceptions = toInsert.filter(ti => {
          const d = parseCURP(ti.curp); return d && d.sex === 'M' && d.birthYear < category.min_birth_year && d.birthYear >= category.min_birth_year_girls
        })
        if (existingExceptions.length + batchExceptions.length >= 2) {
          errors.push(`${name}: ya hay 2 niñas con excepción de edad en ${category.name}. Solo se permiten 2 por categoría.`)
          continue
        }
      }

      // Duplicate CURP in same inscription + same category (DB + current batch)
      const dupSameCat = await queryOne(
        'SELECT id FROM inscription_players WHERE inscription_id=$1 AND category_id=$2 AND UPPER(curp)=$3',
        [insc.id, categoryId, curp]
      )
      if (dupSameCat) {
        errors.push(`${name}: CURP ${curp} ya está registrada en esta categoría`)
        continue
      }
      if (toInsert.some(ti => ti.curp === curp)) {
        errors.push(`${name}: CURP ${curp} aparece duplicada en este mismo envío`)
        continue
      }

      // Duplicate CURP in DIFFERENT team (same tournament) — cachirul check
      const dupOtherTeam = await queryOne(
        `SELECT ip.id,i.team_name FROM inscription_players ip
         JOIN inscriptions i ON ip.inscription_id=i.id
         WHERE i.tournament_id=$1 AND ip.inscription_id<>$2 AND UPPER(ip.curp)=$3 AND i.status='approved'`,
        [insc.tournament_id, insc.id, curp]
      )
      if (dupOtherTeam) {
        errors.push(`${name}: CURP ${curp} ya está registrada en el equipo "${dupOtherTeam.team_name}"`)
        continue
      }
    }

    // Duplicate jersey number in same inscription + category
    const num = p.number ? parseInt(p.number) : null
    if (num) {
      const dupNum = await queryOne(
        'SELECT id FROM inscription_players WHERE inscription_id=$1 AND category_id=$2 AND number=$3',
        [insc.id, categoryId, num]
      )
      if (dupNum) {
        errors.push(`${name}: el número #${num} ya está registrado en esta categoría`)
        continue
      }
      if (toInsert.some(ti => ti.number === num)) {
        errors.push(`${name}: el número #${num} aparece duplicado en este mismo envío`)
        continue
      }
    }

    toInsert.push({ name, number: num, position: p.position||null, curp, photo: p.photo||null, documento_oficial: p.documento_oficial||null })
  }

  if (errors.length && !toInsert.length) {
    return res.status(400).json({ error: 'No se pudo registrar ningún jugador', errors })
  }

  const inserted = []
  for (const p of toInsert) {
    const r = await query(
      'INSERT INTO inscription_players (inscription_id,category_id,name,number,position,curp,photo,documento_oficial) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [insc.id, categoryId, p.name, p.number, p.position, p.curp, p.photo||null, p.documento_oficial||null]
    )
    const newId = r.rows[0]?.id || r.lastInsertRowid
    inserted.push({ id: newId, ...p })

    // Add to the team matching this specific category
    const team = await queryOne('SELECT id FROM teams WHERE inscription_id=$1 AND category_id=$2', [insc.id, categoryId])
    if (team) {
      const dupPlayer = await queryOne('SELECT id FROM players WHERE team_id=$1 AND UPPER(curp)=$2', [team.id, p.curp])
      if (!dupPlayer) {
        await query(
          'INSERT INTO players (team_id,name,number,position,curp,photo,documento_oficial) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [team.id, p.name, p.number, p.position, p.curp, p.photo||null, p.documento_oficial||null]
        )
      }
    }
  }

  res.status(201).json({ inserted, errors: errors.length ? errors : undefined })
})

// Consultar responsables de una inscripción (admin)
router.get('/inscriptions/:id/responsables', authMiddleware, adminOnly, async (req, res) => {
  const insc = await queryOne('SELECT * FROM inscriptions WHERE id=$1', [req.params.id])
  if (!insc) return res.status(404).json({ error: 'Inscripción no encontrada' })
  const rows = (await query(
    'SELECT r.*,c.name AS "categoryName" FROM inscription_responsables r LEFT JOIN categories c ON r.category_id=c.id WHERE r.inscription_id=$1 ORDER BY r.category_id,r.orden',
    [insc.id]
  )).rows
  // también devolvemos las categorías para el admin
  let categories = []
  if (insc.categories_json) { try { categories = JSON.parse(insc.categories_json) } catch {} }
  res.json({ responsables: rows, categories })
})

// Guardar responsables por categoría (reemplaza los de esa categoría)
router.post('/inscriptions/:id/responsables', async (req, res) => {
  const { categoryId, responsables } = req.body
  if (!categoryId || !Array.isArray(responsables)) return res.status(400).json({ error: 'Datos incompletos' })
  const insc = await queryOne('SELECT * FROM inscriptions WHERE id=$1', [req.params.id])
  if (!insc) return res.status(404).json({ error: 'Inscripción no encontrada' })
  if (insc.status !== 'approved') return res.status(403).json({ error: 'La inscripción debe estar aprobada' })
  if (responsables.length < 2) return res.status(400).json({ error: 'Se requieren mínimo 2 responsables por categoría' })
  if (responsables.length > 3) return res.status(400).json({ error: 'Máximo 3 responsables por categoría' })
  for (const r of responsables) {
    if (!r.nombre?.trim() || !r.apellidos?.trim()) return res.status(400).json({ error: 'Nombre y apellidos son obligatorios para cada responsable' })
  }
  // Verificar CURPs duplicadas entre responsables del mismo envío
  const curps = responsables.map(r => r.curp?.trim().toUpperCase()).filter(Boolean)
  if (new Set(curps).size !== curps.length) {
    return res.status(400).json({ error: 'Hay CURPs duplicadas entre los responsables' })
  }
  // Reemplazar responsables de esta categoría
  await query('DELETE FROM inscription_responsables WHERE inscription_id=$1 AND category_id=$2', [insc.id, categoryId])
  const saved = []
  for (let i = 0; i < responsables.length; i++) {
    const r = responsables[i]
    const row = await queryOne(
      'INSERT INTO inscription_responsables (inscription_id,category_id,nombre,apellidos,curp,foto,orden) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [insc.id, categoryId, r.nombre.trim(), r.apellidos.trim(), r.curp ? r.curp.trim().toUpperCase() : null, r.foto||null, i+1]
    )
    saved.push(row)
  }
  res.status(201).json({ saved })
})

// Todos los responsables de un torneo (admin)
router.get('/tournaments/:slug/responsables', authMiddleware, adminOnly, async (req, res) => {
  const t = await getTournament(req.params.slug); if (!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const sql = catId
    ? `SELECT r.*,i.team_name,c.name AS "categoryName"
       FROM inscription_responsables r
       JOIN inscriptions i ON r.inscription_id=i.id
       LEFT JOIN categories c ON r.category_id=c.id
       WHERE i.tournament_id=$1 AND r.category_id=$2
       ORDER BY c.name,i.team_name,r.orden`
    : `SELECT r.*,i.team_name,c.name AS "categoryName"
       FROM inscription_responsables r
       JOIN inscriptions i ON r.inscription_id=i.id
       LEFT JOIN categories c ON r.category_id=c.id
       WHERE i.tournament_id=$1
       ORDER BY c.name,i.team_name,r.orden`
  const rows = (await query(sql, catId ? [t.id, catId] : [t.id])).rows
  res.json(rows)
})

// ── Awards ────────────────────────────────────────────────────────────────
router.get('/tournaments/:slug/awards', async (req, res) => {
  const t = await getTournament(req.params.slug); if(!t) return notFound(res)
  const catId = req.query.cat ? parseInt(req.query.cat) : null
  const base = `SELECT a.*,p.name AS "playerName",p.photo AS "playerPhoto",te.name AS "teamName",te.logo AS "teamLogo",c.name AS "categoryName" FROM awards a LEFT JOIN players p ON a.player_id=p.id LEFT JOIN teams te ON a.team_id=te.id LEFT JOIN categories c ON a.category_id=c.id`
  const rows = catId
    ? (await query(`${base} WHERE a.tournament_id=$1 AND a.category_id=$2 ORDER BY a.id`, [t.id,catId])).rows
    : (await query(`${base} WHERE a.tournament_id=$1 ORDER BY a.id`, [t.id])).rows
  res.json(rows)
})
router.post('/awards', authMiddleware, adminOnly, async (req, res) => {
  const {tournamentId,categoryId,phaseId,type,playerId,teamId,description} = req.body
  const r = await query('INSERT INTO awards (tournament_id,category_id,phase_id,type,player_id,team_id,description,auto_generated) VALUES ($1,$2,$3,$4,$5,$6,$7,0) RETURNING id', [tournamentId,categoryId||null,phaseId||null,type,playerId||null,teamId||null,description||null])
  res.status(201).json((await queryOne('SELECT * FROM awards WHERE id=$1', [r.lastInsertRowid])))
})
router.put('/awards/:id', authMiddleware, adminOnly, async (req, res) => {
  const {type,playerId,teamId,description} = req.body
  await query('UPDATE awards SET type=$1,player_id=$2,team_id=$3,description=$4 WHERE id=$5', [type,playerId||null,teamId||null,description||null,req.params.id])
  res.json((await queryOne(`SELECT a.*,p.name AS "playerName",p.photo AS "playerPhoto",te.name AS "teamName",te.logo AS "teamLogo",c.name AS "categoryName" FROM awards a LEFT JOIN players p ON a.player_id=p.id LEFT JOIN teams te ON a.team_id=te.id LEFT JOIN categories c ON a.category_id=c.id WHERE a.id=$1`, [req.params.id])))
})
router.delete('/awards/:id', authMiddleware, adminOnly, async (req, res) => {
  await query('DELETE FROM awards WHERE id=$1', [req.params.id]); res.status(204).end()
})
// Escanear todas las fases completas y generar premios faltantes (one-shot)
router.post('/admin/awards/scan-all', authMiddleware, adminOnly, async (req, res) => {
  // Fases non-knockout: completas cuando todos los partidos están terminados
  const regularCompleted = (await query(`
    SELECT ph.id FROM phases ph
    WHERE ph.type != 'knockout'
      AND NOT EXISTS (SELECT 1 FROM awards a WHERE a.phase_id = ph.id AND a.auto_generated = 1)
      AND (SELECT COUNT(*) FROM matches m WHERE m.phase_id = ph.id) > 0
      AND (SELECT COUNT(*) FROM matches m WHERE m.phase_id = ph.id) =
          (SELECT COUNT(*) FROM matches m WHERE m.phase_id = ph.id AND m.status = 'finished')
  `, [])).rows

  // Fases knockout: completas cuando el Final round (sin Tercer Lugar) tiene todos sus partidos terminados
  // Incluir fases con category_id NULL (pueden no tener categoría asignada)
  const knockoutPhases = (await query("SELECT id FROM phases WHERE type = 'knockout' AND NOT EXISTS (SELECT 1 FROM awards a WHERE a.phase_id = phases.id AND a.auto_generated = 1)", [])).rows

  const knockoutCompleted = []
  for (const ph of knockoutPhases) {
    const finalRound = (await queryOne("SELECT * FROM rounds WHERE phase_id=$1 AND name != 'Tercer Lugar' ORDER BY order_index DESC LIMIT 1", [ph.id]))
    if (!finalRound) continue
    const total    = (await queryOne("SELECT COUNT(*) as c FROM matches WHERE round_id=$1", [finalRound.id])).c
    const finished = (await queryOne("SELECT COUNT(*) as c FROM matches WHERE round_id=$1 AND status='finished'", [finalRound.id])).c
    if (total > 0 && total === finished) knockoutCompleted.push(ph)
  }

  // Corregir awards auto-generados que tienen category_id NULL (por fases sin categoría asignada)
  const nullCatAwards = (await query(`
    SELECT a.id, m.phase_id, t.category_id
    FROM awards a
    JOIN phases ph ON a.phase_id = ph.id
    JOIN matches m ON m.phase_id = ph.id
    JOIN teams t ON m.home_team = t.id AND t.category_id IS NOT NULL
    WHERE a.auto_generated = 1 AND a.category_id IS NULL
    GROUP BY a.id
  `, [])).rows
  for (const row of nullCatAwards) {
    await query('UPDATE awards SET category_id=$1 WHERE id=$2', [row.category_id, row.id])
  }

  const allCompleted = [...regularCompleted, ...knockoutCompleted]
  for (const p of allCompleted) autoGenerateAwardsForPhase(p.id).catch(e => console.error('[awards]', e.message))
  res.json({ scanned: allCompleted.length, fixed: nullCatAwards.length })
})

// Re-generar premios de una fase manualmente (sobreescribe los auto-generados)
router.post('/phases/:id/awards/regenerate', authMiddleware, adminOnly, async (req, res) => {
  const phaseId = parseInt(req.params.id)
  await query('DELETE FROM awards WHERE phase_id=$1 AND auto_generated=1', [phaseId])
  await autoGenerateAwardsForPhase(phaseId)
  const awards = (await query(`SELECT a.*,p.name AS "playerName",te.name AS "teamName",c.name AS "categoryName" FROM awards a LEFT JOIN players p ON a.player_id=p.id LEFT JOIN teams te ON a.team_id=te.id LEFT JOIN categories c ON a.category_id=c.id WHERE a.phase_id=$1`, [phaseId])).rows
  res.json({ ok:true, awards })
})
// Categorías con fases completadas sin premios (para el dashboard)
router.get('/admin/pending-awards', authMiddleware, adminOnly, async (req, res) => {
  const rows = (await query(`
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
    GROUP BY ph.id, ph.name, ph.type, t.id, t.name, t.slug, c.id, c.name
    HAVING COUNT(m.id) > 0 AND COUNT(m.id) = SUM(CASE WHEN m.status='finished' THEN 1 ELSE 0 END)
    ORDER BY t.name, c.name, ph.order_index
  `, [])).rows
  res.json(rows)
})

// ── Phase Groups ─────────────────────────────────────────────────────────

// Get groups of a phase (with teams + standings)
router.get('/phases/:id/groups', async (req, res) => {
  const phaseId = req.params.id
  const groups  = (await query('SELECT * FROM phase_groups WHERE phase_id=$1 ORDER BY order_index', [phaseId])).rows
  const result  = await Promise.all(groups.map(async g => {
    const teams   = (await query(`
      SELECT t.* FROM teams t JOIN phase_group_teams pgt ON t.id=pgt.team_id WHERE pgt.group_id=$1
    `, [g.id])).rows
    // Usar cálculo en vivo (no la tabla standings que puede estar vacía)
    const standing = (await getGroupStandings(g.id)).map(r => ({ ...r, goalDiff: r.goals_for - r.goals_against }))
    return { ...g, teams, standing }
  }))
  res.json(result)
})

// Get group standings (en vivo con desempate completo)
router.get('/phase-groups/:id/standings', async (req, res) => {
  const rows = await getGroupStandings(parseInt(req.params.id))
  res.json(rows.map(r => ({ ...r, goalDiff: r.goals_for - r.goals_against })))
})

// Get standings de una fase (para ligas)
router.get('/phases/:id/standings', async (req, res) => {
  const phase = (await queryOne('SELECT * FROM phases WHERE id=$1', [req.params.id]))
  if (!phase) return notFound(res)
  if (phase.type === 'groups') {
    // Devolver standings de todos los grupos
    const groups = (await query('SELECT * FROM phase_groups WHERE phase_id=$1 ORDER BY order_index', [phase.id])).rows
    const result = await Promise.all(groups.map(async (g) => ({
      groupId: g.id, groupName: g.name, advanceCount: g.advance_count,
      standings: (await getGroupStandings(g.id)).map(r => ({ ...r, goalDiff: r.goals_for - r.goals_against }))
    })))
    return res.json(result)
  }
  const rows = await getPhaseStandings(phase.id)
  res.json(rows.map(r => ({ ...r, goalDiff: r.goals_for - r.goals_against })))
})

// Get all matches for a phase (used by bracket admin view)
router.get('/phases/:id/matches', async (req, res) => {
  const rows = (await query(`
    SELECT m.*,
      CASE WHEN COALESCE(m.home_is_tbd,0)=1 THEN NULL ELSE ht.name END AS "homeTeam",
      CASE WHEN COALESCE(m.home_is_tbd,0)=1 THEN NULL ELSE ht.logo END AS "homeLogo",
      CASE WHEN COALESCE(m.away_is_tbd,0)=1 THEN NULL ELSE at.name END AS "awayTeam",
      CASE WHEN COALESCE(m.away_is_tbd,0)=1 THEN NULL ELSE at.logo END AS "awayLogo",
      r.name AS "roundName"
    FROM matches m
    LEFT JOIN teams ht ON m.home_team = ht.id
    LEFT JOIN teams at ON m.away_team = at.id
    LEFT JOIN rounds r ON m.round_id = r.id
    WHERE m.phase_id = $1
    ORDER BY r.order_index ASC, COALESCE(m.bracket_slot,0) ASC, m.id ASC
  `, [req.params.id])).rows
  const rounds = (await query('SELECT * FROM rounds WHERE phase_id=$1 ORDER BY order_index', [req.params.id])).rows
  res.json({ matches: rows, rounds })
})

// Get matches for a group
router.get('/phase-groups/:id/matches', async (req, res) => {
  const rows = (await query(`
    SELECT m.*,ht.name AS "homeTeam",at.name AS "awayTeam",r.name AS "roundName"
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    LEFT JOIN rounds r ON m.round_id=r.id WHERE m.group_id=$1 ORDER BY m.date ASC
  `, [req.params.id])).rows
  res.json(rows)
})

// Auto-generate groups for a phase
router.post('/phases/:id/groups/generate', authMiddleware, adminOnly, async (req, res) => {
  const phaseId = req.params.id
  const { teamIds, groupCount, advanceCount = 2, startDate, location, daysPerRound = 7 } = req.body
  if (!teamIds?.length || !groupCount) return res.status(400).json({ error: 'teamIds y groupCount requeridos' })

  // Eliminar en orden correcto: primero los hijos (matches, rounds) antes que los grupos
  // para evitar FOREIGN KEY constraint (matches.group_id → phase_groups.id sin CASCADE)
  await query('DELETE FROM matches WHERE phase_id=$1', [phaseId])
  await query('DELETE FROM rounds WHERE phase_id=$1', [phaseId])
  await query('DELETE FROM phase_groups WHERE phase_id=$1', [phaseId])

  const phase = (await queryOne('SELECT * FROM phases WHERE id=$1', [phaseId]))
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

  const insGroup = (...__a) => query('INSERT INTO phase_groups (phase_id,name,order_index,advance_count) VALUES ($1,$2,$3,$4)', __a.flat())
  const insGroupTeam = (...__a) => query('INSERT INTO phase_group_teams (group_id,team_id) VALUES ($1,$2)', __a.flat())
  const insRound = (...__a) => query('INSERT INTO rounds (phase_id,name,order_index) VALUES ($1,$2,$3)', __a.flat())
  const insMatch = (...__a) => query(`INSERT INTO matches (tournament_id,category_id,phase_id,round_id,group_id,home_team,away_team,date,location,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'scheduled')`, __a.flat())

  // NOTA: fecha y cancha NUNCA se auto-asignan — el admin las gestiona manualmente
  const createdGroups = []

  for (let gi = 0; gi < groupCount; gi++) {
    const groupR = await insGroup(phaseId, `Grupo ${groupNames[gi]}`, gi, advanceCount)
    const groupId = groupR.lastInsertRowid
    const gTeams = groupTeams[gi]

    for (const tid of gTeams) await insGroupTeam(groupId, tid)

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
      const roundR = await insRound(phaseId, rName, gi * 10 + ri)
      const roundId = roundR.lastInsertRowid

      for (const [h, a] of roundPairs) {
        // Fecha NULL y cancha NULL — el admin las asigna en el panel de partidos
        await insMatch(phase.tournament_id, phase.category_id||null, phaseId, roundId, groupId, h, a, null, null)
      }
      rotating.unshift(rotating.pop())
    }

    createdGroups.push({ groupId, name: `Grupo ${groupNames[gi]}`, teams: gTeams })
  }

  const totalMatches = (await queryOne('SELECT COUNT(*) AS c FROM matches WHERE phase_id=$1', [phaseId])).c
  res.status(201).json({ groups: createdGroups, totalMatches })
})

// ── Helper: busca la fase knockout siguiente (SQLite-compatible) ──────────
async function findNextKnockout(tournamentId, categoryId, orderIndex) {
  // SQLite no soporta IS NOT DISTINCT FROM — manejamos NULL explícitamente
  return categoryId != null
    ? (await queryOne(`SELECT * FROM phases WHERE tournament_id=$1 AND category_id=$2 AND type='knockout' AND order_index>$3 ORDER BY order_index LIMIT 1`, [tournamentId, categoryId, orderIndex]))
    : (await queryOne(`SELECT * FROM phases WHERE tournament_id=$1 AND category_id IS NULL AND type='knockout' AND order_index>$2 ORDER BY order_index LIMIT 1`, [tournamentId, orderIndex]))
}

// ── Helper: calcula standings de un grupo con desempate completo ──────────
async function getGroupStandings(groupId) {
  const teams = (await query(`
    SELECT t.* FROM teams t
    JOIN phase_group_teams pgt ON t.id=pgt.team_id
    WHERE pgt.group_id=$1
  `, [groupId])).rows

  if (!teams.length) {
    // Fallback de emergencia si no hay phase_group_teams
    return (await query(`
      SELECT s.*, t.name AS "teamName", t.logo
      FROM standings s JOIN teams t ON s.team_id=t.id
      WHERE s.group_id=$1
      ORDER BY s.points DESC, (s.goals_for-s.goals_against) DESC, s.goals_for DESC
    `, [groupId])).rows
  }

  const matches = (await query(`SELECT * FROM matches WHERE group_id=$1 AND status='finished'`, [groupId])).rows

  // Tarjetas por equipo en este grupo (desde match_events)
  const cards = (await query(`
    SELECT e.team_id,
      SUM(CASE WHEN e.type='red_card'    THEN 1 ELSE 0 END) AS reds,
      SUM(CASE WHEN e.type='yellow_card' THEN 1 ELSE 0 END) AS yellows
    FROM match_events e
    JOIN matches m ON e.match_id=m.id
    WHERE m.group_id=$1 AND e.team_id IS NOT NULL
    GROUP BY e.team_id
  `, [groupId])).rows
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
async function getPhaseStandings(phaseId) {
  const matches = (await query(`SELECT * FROM matches WHERE phase_id=$1 AND status='finished' AND group_id IS NULL`, [phaseId])).rows
  if (!matches.length) return []

  const teamIds = [...new Set(matches.flatMap(m => [m.home_team, m.away_team]))]
  const teams = (await query(`SELECT id, name, logo FROM teams WHERE id IN (${teamIds.map(()=>'$1').join(',')})`, [...teamIds])).rows

  const cards = (await query(`
    SELECT e.team_id,
      SUM(CASE WHEN e.type='red_card' THEN 1 ELSE 0 END) AS reds,
      SUM(CASE WHEN e.type='yellow_card' THEN 1 ELSE 0 END) AS yellows
    FROM match_events e
    JOIN matches m ON e.match_id=m.id
    WHERE m.phase_id=$1 AND m.group_id IS NULL AND e.team_id IS NOT NULL
    GROUP BY e.team_id
  `, [phaseId])).rows
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
router.get('/phases/:id/knockout-preview', authMiddleware, adminOnly, async (req, res) => {
  const phaseId = req.params.id
  const phase   = (await queryOne('SELECT * FROM phases WHERE id=$1', [phaseId]))
  if (!phase) return notFound(res)

  const groups     = (await query('SELECT * FROM phase_groups WHERE phase_id=$1 ORDER BY order_index', [phaseId])).rows
  const groupNames = ['A','B','C','D','E','F','G','H']

  const pending = (await queryOne("SELECT COUNT(*) AS c FROM matches WHERE phase_id=$1 AND status!='finished'", [phaseId])).c
  const total   = (await queryOne("SELECT COUNT(*) AS c FROM matches WHERE phase_id=$1", [phaseId])).c

  const groupStandings = await Promise.all(groups.map(async (g, gi) => {
    const rows = await getGroupStandings(g.id)
    return {
      groupId:      g.id,
      groupName:    `Grupo ${groupNames[gi]}`,
      advanceCount: g.advance_count,
      teams: rows.map((r, pos) => ({ ...r, position: pos + 1, advances: pos < g.advance_count }))
    }
  }))

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

  const nextPhase = await findNextKnockout(phase.tournament_id, phase.category_id, phase.order_index)
  res.json({ pending, total, groupStandings, matchups, nextPhase: nextPhase || null })
})

// ── Avanzar clasificados a la fase eliminatoria ──────────────────────────
router.post('/phases/:id/advance-to-knockout', authMiddleware, adminOnly, async (req, res) => {
  const phaseId = req.params.id
  const { nextPhaseId } = req.body

  const phase = (await queryOne('SELECT * FROM phases WHERE id=$1', [phaseId]))
  if (!phase) return notFound(res)

  const groups  = (await query('SELECT * FROM phase_groups WHERE phase_id=$1 ORDER BY order_index', [phaseId])).rows
  const pending = (await queryOne("SELECT COUNT(*) AS c FROM matches WHERE phase_id=$1 AND status!='finished'", [phaseId])).c
  if (pending > 0) {
    return res.status(400).json({ error: `Hay ${pending} partido(s) pendientes. Todos los partidos de la fase de grupos deben terminar antes de generar la eliminatoria.`, pending })
  }

  if (!groups.length) return res.status(400).json({ error: 'Esta fase no tiene grupos configurados. Genera los partidos de grupos primero.' })

  // Buscar la fase knockout destino y verificar que no tenga partidos iniciados
  const destPhase = nextPhaseId
    ? (await queryOne('SELECT * FROM phases WHERE id=$1', [nextPhaseId]))
    : await findNextKnockout(phase.tournament_id, phase.category_id, phase.order_index)
  if (destPhase) {
    const knockoutStarted = (await queryOne("SELECT COUNT(*) AS c FROM matches WHERE phase_id=$1 AND status IN ('live','finished')", [destPhase.id])).c
    if (knockoutStarted > 0) {
      return res.status(400).json({ error: 'Ya hay partidos de eliminatoria iniciados o finalizados. No se puede regenerar el bracket.' })
    }
  }

  // Obtener clasificados de cada grupo usando helper robusto
  const advancing = []
  for (let gi = 0; gi < groups.length; gi++) {
    const g    = groups[gi]
    const rows = await getGroupStandings(g.id)
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
    ? (await queryOne('SELECT * FROM phases WHERE id=$1', [nextPhaseId]))
    : await findNextKnockout(phase.tournament_id, phase.category_id, phase.order_index)

  if (!nextPhase) {
    // Auto-crear la fase eliminatoria
    const r = await query('INSERT INTO phases (tournament_id, category_id, name, type, order_index, is_active) VALUES ($1,$2,$3,$4,$5,1) RETURNING id', [phase.tournament_id, phase.category_id || null, 'Eliminatoria', 'knockout', phase.order_index + 1])
    nextPhase = (await queryOne('SELECT * FROM phases WHERE id=$1', [r.lastInsertRowid]))
  }

  try {
    try {
      // Limpiar la fase knockout
      await query('DELETE FROM rounds WHERE phase_id=$1', [nextPhase.id])
      await query('DELETE FROM matches WHERE phase_id=$1', [nextPhase.id])

      const insRound = (...__a) => query('INSERT INTO rounds (phase_id,name,order_index) VALUES ($1,$2,$3)', __a.flat())
      const insMatch = (...__a) => query(`INSERT INTO matches (tournament_id,category_id,phase_id,round_id,home_team,away_team,bracket_slot,status) VALUES ($1,$2,$3,$4,$5,$6,$7,'scheduled')`, __a.flat())

      // Construir todas las rondas vacías primero (para que advanceBracketWinner tenga slots donde avanzar)
      const teamIds = seeded.map(s => s.teamId)
      let pow2 = 1; while (pow2 < teamIds.length) pow2 *= 2
      const allRoundIds = []
      let roundSize = pow2, roundIdx = 0
      while (roundSize >= 2) {
        const rName = roundSize <= 2 ? 'Final' : roundSize <= 4 ? 'Semifinales' : roundSize <= 8 ? 'Cuartos de Final' : roundSize <= 16 ? 'Octavos de Final' : `Ronda de ${roundSize}`
        const rr = await insRound(nextPhase.id, rName, roundIdx)
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
          const r = await insMatch(nextPhase.tournament_id, nextPhase.category_id || null, nextPhase.id, firstRoundId, home || away, away || home, slot)
          // Auto-finish bye
          await query("UPDATE matches SET status='finished',home_score=1,away_score=0 WHERE id=$1", [r.lastInsertRowid])
        } else {
          await insMatch(nextPhase.tournament_id, nextPhase.category_id || null, nextPhase.id, firstRoundId, home, away, slot)
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
    } catch(e) { throw e }
  } catch (e) {
    console.error('advance-to-knockout error:', e)
    return res.status(500).json({ error: 'Error al generar la eliminatoria: ' + e.message })
  }

  // Procesar byes si los hay (para que ganadores del bye avancen automáticamente)
  const byeMatches = (await query(`
    SELECT id FROM matches
    WHERE phase_id=$1 AND status='finished'
    ORDER BY id ASC
  `, [nextPhase.id])).rows
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
router.get('/teams/:id/profile', async (req, res) => {
  const teamId = req.params.id

  const team = (await queryOne(`
    SELECT t.*, c.name AS "categoryName", c.gender, c.group_name, tour.name AS "tournamentName", tour.slug
    FROM teams t
    LEFT JOIN categories c ON t.category_id=c.id
    LEFT JOIN tournaments tour ON t.tournament_id=tour.id
    WHERE t.id=$1
  `, [teamId]))
  if (!team) return res.status(404).json({ error: 'Equipo no encontrado' })

  const players = (await query(`SELECT * FROM players WHERE team_id=$1 ORDER BY number ASC, name ASC`, [teamId])).rows

  const standings = (await query(`
    SELECT s.*, p.name AS "phaseName", p.type AS "phaseType", pg.name AS "groupName", c.name AS catName
    FROM standings s
    LEFT JOIN phases p ON s.phase_id=p.id
    LEFT JOIN phase_groups pg ON s.group_id=pg.id
    LEFT JOIN categories c ON s.category_id=c.id
    WHERE s.team_id=$1
    ORDER BY s.category_id, p.order_index
  `, [teamId])).rows

  const recentMatches = (await query(`
    SELECT m.*, ht.name AS "homeTeam", at.name AS "awayTeam", r.name AS "roundName", p.name AS "phaseName"
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    LEFT JOIN rounds r ON m.round_id=r.id LEFT JOIN phases p ON m.phase_id=p.id
    WHERE (m.home_team=$1 OR m.away_team=$2) AND m.status='finished'
    ORDER BY m.date DESC LIMIT 8
  `, [teamId, teamId])).rows

  const upcomingMatches = (await query(`
    SELECT m.*, ht.name AS "homeTeam", at.name AS "awayTeam", r.name AS "roundName", p.name AS "phaseName"
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    LEFT JOIN rounds r ON m.round_id=r.id LEFT JOIN phases p ON m.phase_id=p.id
    WHERE (m.home_team=$1 OR m.away_team=$2) AND m.status='scheduled'
    ORDER BY m.date ASC LIMIT 5
  `, [teamId, teamId])).rows

  const liveMatch = (await queryOne(`
    SELECT m.*, ht.name AS "homeTeam", at.name AS "awayTeam"
    FROM matches m JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    WHERE (m.home_team=$1 OR m.away_team=$2) AND m.status='live' LIMIT 1
  `, [teamId, teamId]))

  const awards = (await query(`
    SELECT a.*, p.name AS "playerName" FROM awards a LEFT JOIN players p ON a.player_id=p.id
    WHERE a.team_id=$1 OR p.team_id=$2 ORDER BY a.id
  `, [teamId, teamId])).rows

  const teamIdInt = parseInt(teamId)
  const stats = {
    totalGoals:   (await queryOne('SELECT COALESCE(SUM(goals),0) AS v FROM players WHERE team_id=$1', [teamId])).v,
    totalAssists: (await queryOne('SELECT COALESCE(SUM(assists),0) AS v FROM players WHERE team_id=$1', [teamId])).v,
    totalYellow:  (await queryOne('SELECT COALESCE(SUM(yellow_cards),0) AS v FROM players WHERE team_id=$1', [teamId])).v,
    totalRed:     (await queryOne('SELECT COALESCE(SUM(red_cards),0) AS v FROM players WHERE team_id=$1', [teamId])).v,
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
router.get('/referees', authMiddleware, adminOnly, async (req, res) => {
  const rows = (await query(`
    SELECT u.id, u.name, u.email, u.username, u.is_active, u.created_at,
           u.tournament_id,
           t.name AS "tournamentName",
           COUNT(DISTINCT m.id) AS matches_refereed
    FROM users u
    LEFT JOIN matches m ON m.referee_id = u.id
    LEFT JOIN tournaments t ON t.id = u.tournament_id
    WHERE u.role = 'referee'
    GROUP BY u.id, u.name, u.email, u.username, u.is_active, u.created_at, u.tournament_id, t.name
    ORDER BY u.name ASC
  `, [])).rows
  res.json(rows)
})

// GET /referees/:id/matches — historial de partidos arbitrados
router.get('/referees/:id/matches', authMiddleware, adminOnly, async (req, res) => {
  const rows = (await query(`
    SELECT m.*, ht.name AS "homeTeam", at.name AS "awayTeam",
           ht.logo AS "homeLogo", at.logo AS "awayLogo",
           t.name AS "tournamentName", c.name AS "categoryName"
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.referee_id=$1
    ORDER BY m.date DESC LIMIT 50
  `, [req.params.id])).rows
  res.json(rows)
})

// POST /referees — crear árbitro (contraseña puede venir del cliente o se auto-genera)
router.post('/referees', authMiddleware, adminOnly, async (req, res) => {
  const { name, email, password: clientPassword, tournamentId } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
  if (!email?.trim()) return res.status(400).json({ error: 'El correo es requerido' })

  // Siempre usar la contraseña que puso el admin (mínimo 6 chars)
  const plainPassword = clientPassword?.trim()
  if (!plainPassword || plainPassword.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  const hash = await bcrypt.hash(plainPassword, 12)

  let r
  try {
    r = await query(`
      INSERT INTO users (name, email, password, role, is_active, tournament_id)
      VALUES ($1, $2, $3, 'referee', 1, $4) RETURNING id`, [name.trim(), email.trim().toLowerCase(), hash, tournamentId || null])
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'El correo ya está registrado' })
    throw e
  }

  const newId = r.rows[0]?.id || r.lastInsertRowid
  const created = (await queryOne(`
    SELECT u.id, u.name, u.email, u.username, u.role, u.is_active, u.tournament_id,
           t.name AS "tournamentName"
    FROM users u LEFT JOIN tournaments t ON t.id = u.tournament_id
    WHERE u.id = $1
  `, [newId]))

  res.status(201).json({ ...created, plainPassword })
})

// PUT /referees/:id — editar árbitro (nombre, email, nueva contraseña, torneo)
router.put('/referees/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name, email, resetPassword, newPassword, tournamentId } = req.body
  const ref = (await queryOne("SELECT * FROM users WHERE id=$1 AND role='referee'", [req.params.id]))
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
    const dup = (await queryOne("SELECT id FROM users WHERE email=$1 AND id!=$2", [email, ref.id]))
    if (dup) return res.status(400).json({ error: 'El correo ya está en uso' })
  }

  // tournament_id usa valor directo (no COALESCE) para permitir desasignar con null
  const newName = name?.trim() || ref.name
  const newEmail = email?.trim()?.toLowerCase() || ref.email
  // tournamentId puede ser null explícitamente para "Sin asignar"
  // undefined significa "no se envió en el body → no tocar"
  const newTournamentId = tournamentId !== undefined ? (tournamentId || null) : ref.tournament_id

  await query("UPDATE users SET name=$1, email=$2, password=$3, tournament_id=$4 WHERE id=$5", [newName, newEmail, hash, newTournamentId, ref.id])

  // Retornar datos completos con nombre del torneo
  const updated = (await queryOne(`
    SELECT u.id, u.name, u.email, u.username, u.role, u.is_active, u.tournament_id,
           t.name AS "tournamentName"
    FROM users u LEFT JOIN tournaments t ON t.id = u.tournament_id
    WHERE u.id = $1
  `, [ref.id]))
  res.json({ ...updated, plainPassword }) // plainPassword es null si no se reseteó
})

// PATCH /referees/:id/toggle — activar/desactivar
router.patch('/referees/:id/toggle', authMiddleware, adminOnly, async (req, res) => {
  const ref = (await queryOne("SELECT * FROM users WHERE id=$1 AND role='referee'", [req.params.id]))
  if (!ref) return res.status(404).json({ error: 'Árbitro no encontrado' })
  const newActive = ref.is_active ? 0 : 1
  await query("UPDATE users SET is_active=$1 WHERE id=$2", [newActive, ref.id])
  res.json({ id: ref.id, is_active: newActive })
})

// DELETE /referees/:id
router.delete('/referees/:id', authMiddleware, adminOnly, async (req, res) => {
  const ref = (await queryOne("SELECT id FROM users WHERE id=$1 AND role='referee'", [req.params.id]))
  if (!ref) return res.status(404).json({ error: 'Árbitro no encontrado' })
  // Desasignar de partidos (no eliminar historial, solo quitar referencia)
  await query("UPDATE matches SET referee_id=NULL WHERE referee_id=$1", [ref.id])
  await query("DELETE FROM users WHERE id=$1", [ref.id])
  res.status(204).end()
})

// ── Árbitro: partidos asignables ─────────────────────────────────────────
// GET /referee/matches — partidos del torneo: scheduled + live propios del árbitro
router.get('/referee/matches', authMiddleware, async (req, res) => {
  if (req.user?.role !== 'referee' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' })
  }
  const referee = (await queryOne('SELECT tournament_id FROM users WHERE id=$1', [req.user.id]))
  const tournamentId = referee?.tournament_id

  let sql = `
    SELECT m.*, ht.name AS "homeTeam", at.name AS "awayTeam",
           ht.logo AS "homeLogo", at.logo AS "awayLogo",
           t.name AS "tournamentName", t.slug AS "tournamentSlug",
           c.name AS "categoryName",
           u.name AS "refereeName"
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    LEFT JOIN users u ON m.referee_id=u.id
    WHERE (
      m.status = 'scheduled'
      OR (m.status = 'live' AND m.referee_id = $1)
    )
    AND COALESCE(m.home_is_tbd, 0) = 0
    AND COALESCE(m.away_is_tbd, 0) = 0
  `
  // $1 = req.user.id (para filtrar partidos live del árbitro)
  const params = [req.user.id]
  if (tournamentId) {
    params.push(tournamentId)
    sql += ` AND m.tournament_id=$${params.length}`
  }
  sql += ' ORDER BY m.date ASC LIMIT 100'

  const rows = (await query(sql, params)).rows

  // También devolver las categorías del torneo para el filtro
  const categories = tournamentId
    ? (await query('SELECT id, name FROM categories WHERE tournament_id=$1 ORDER BY name ASC', [tournamentId])).rows
    : []

  res.json({ matches: rows, categories, tournamentId, tournamentName: rows[0]?.tournamentName || null })
})

// ── Admin stats ───────────────────────────────────────────────────────────
// Todos los partidos para el panel de árbitros
router.get('/admin/all-matches', authMiddleware, adminOnly, async (req, res) => {
  const rows = (await query(`
    SELECT m.*, ht.name AS "homeTeam", at.name AS "awayTeam",
           ht.logo AS "homeLogo", at.logo AS "awayLogo",
           t.name AS "tournamentName", t.slug AS "tournamentSlug",
           c.name AS "categoryName",
           u.name AS "refereeName", u.id AS "refereeId"
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
  `, [])).rows
  res.json(rows)
})

router.get('/admin/stats', authMiddleware, adminOnly, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const isSuperAdmin = req.user.role === 'superadmin'
  const adminFilter = isSuperAdmin ? '' : 'AND t.created_by=$1'
  const adminParam  = isSuperAdmin ? [] : [req.user.id]
  // For scalar counts that only reference tournaments table
  const tourneyWhere = isSuperAdmin ? '' : 'WHERE created_by=$1'

  const liveMatches = (await query(`
    SELECT m.*, ht.name AS "homeTeam", at.name AS "awayTeam",
           ht.logo AS "homeLogo", at.logo AS "awayLogo",
           t.name AS "tournamentName", t.slug AS "tournamentSlug",
           c.name AS "categoryName"
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id
    JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.status='live' ${adminFilter}
    ORDER BY m.started_at DESC
  `, adminParam)).rows

  const todayMatches = (await query(`
    SELECT m.*, ht.name AS "homeTeam", at.name AS "awayTeam",
           ht.logo AS "homeLogo", at.logo AS "awayLogo",
           t.name AS "tournamentName", t.slug AS "tournamentSlug",
           c.name AS "categoryName"
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id
    JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.status='scheduled' AND substr(m.date, 1, 10)=${isSuperAdmin ? '$1' : '$2'} ${adminFilter}
    ORDER BY m.date ASC
  `, isSuperAdmin ? [today] : [req.user.id, today])).rows

  const nextMatches = (await query(`
    SELECT m.*, ht.name AS "homeTeam", at.name AS "awayTeam",
           ht.logo AS "homeLogo", at.logo AS "awayLogo",
           t.name AS "tournamentName", t.slug AS "tournamentSlug",
           c.name AS "categoryName"
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id
    JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.status='scheduled' AND (m.date IS NULL OR m.date > NOW()::text) ${adminFilter}
    ORDER BY m.date ASC LIMIT 5
  `, adminParam)).rows

  const teamsNoCat = (await queryOne(
    isSuperAdmin
      ? "SELECT COUNT(*) AS c FROM teams WHERE category_id IS NULL"
      : "SELECT COUNT(*) AS c FROM teams te JOIN categories cat ON te.category_id=cat.id JOIN tournaments t ON cat.tournament_id=t.id WHERE te.category_id IS NULL AND t.created_by=$1",
    adminParam
  )).c

  // Partidos sin horario o sin cancha — usar TRIM para ignorar strings vacíos también
  const matchesNoSchedule = (await queryOne(`
    SELECT COUNT(*) AS c FROM matches m
    JOIN tournaments t ON m.tournament_id=t.id
    WHERE m.status IN ('scheduled','live')
    AND (NULLIF(TRIM(COALESCE(m.date,'')),''     ) IS NULL
      OR NULLIF(TRIM(COALESCE(m.location,'')),'' ) IS NULL)
    AND m.home_is_tbd = 0 AND m.away_is_tbd = 0
    ${adminFilter}
  `, adminParam)).c

  const matchesNoScheduleList = (await query(`
    SELECT m.id, m.date, m.location,
           ht.name AS "homeTeam", at.name AS "awayTeam",
           t.name AS "tournamentName", t.slug AS "tournamentSlug",
           c.name AS "categoryName"
    FROM matches m
    JOIN teams ht ON m.home_team=ht.id JOIN teams at ON m.away_team=at.id
    JOIN tournaments t ON m.tournament_id=t.id
    LEFT JOIN categories c ON m.category_id=c.id
    WHERE m.status IN ('scheduled','live')
    AND (NULLIF(TRIM(COALESCE(m.date,'')),''     ) IS NULL
      OR NULLIF(TRIM(COALESCE(m.location,'')),'' ) IS NULL)
    AND m.home_is_tbd = 0 AND m.away_is_tbd = 0
    ${adminFilter}
    ORDER BY m.id ASC
    LIMIT 5
  `, adminParam)).rows

  const tournamentCount = (await queryOne(`SELECT COUNT(*) AS c FROM tournaments ${tourneyWhere}`, adminParam)).c
  const categoryCount   = (await queryOne(`SELECT COUNT(*) AS c FROM categories ${isSuperAdmin ? '' : 'WHERE tournament_id IN (SELECT id FROM tournaments WHERE created_by=$1)'}`, adminParam)).c
  // Only count teams from approved inscriptions (or manually created teams without inscription)
  const teamFilter = isSuperAdmin
    ? `WHERE (inscription_id IS NULL OR EXISTS (SELECT 1 FROM inscriptions i WHERE i.id=teams.inscription_id AND i.status='approved'))`
    : `WHERE category_id IN (SELECT id FROM categories WHERE tournament_id IN (SELECT id FROM tournaments WHERE created_by=$1)) AND (inscription_id IS NULL OR EXISTS (SELECT 1 FROM inscriptions i WHERE i.id=teams.inscription_id AND i.status='approved'))`
  const teamCount = (await queryOne(`SELECT COUNT(*) AS c FROM teams ${teamFilter}`, adminParam)).c
  const playerCount = (await queryOne(`SELECT COUNT(*) AS c FROM players ${isSuperAdmin ? '' : 'WHERE team_id IN (SELECT id FROM teams WHERE category_id IN (SELECT id FROM categories WHERE tournament_id IN (SELECT id FROM tournaments WHERE created_by=$1)) AND (inscription_id IS NULL OR EXISTS (SELECT 1 FROM inscriptions i WHERE i.id=teams.inscription_id AND i.status=\'approved\')))'}`, adminParam)).c
  const matchCount      = (await queryOne(`SELECT COUNT(*) AS c FROM matches m ${isSuperAdmin ? '' : 'JOIN tournaments t ON m.tournament_id=t.id WHERE t.created_by=$1'}`, adminParam)).c
  const inscriptionCount = (await queryOne(`SELECT COUNT(*) AS c FROM inscriptions i ${isSuperAdmin ? "WHERE status='pending'" : "JOIN tournaments t ON i.tournament_id=t.id WHERE i.status='pending' AND t.created_by=$1"}`, adminParam)).c

  res.json({
    tournaments:  tournamentCount,
    categories:   categoryCount,
    teams:        teamCount,
    players:      playerCount,
    matches:      matchCount,
    live:         liveMatches.length,
    inscriptions: inscriptionCount,
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
if (process.env.PUBLIC_VAPID_KEY && process.env.PRIVATE_VAPID_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@jugarlapelota.com',
    process.env.PUBLIC_VAPID_KEY,
    process.env.PRIVATE_VAPID_KEY
  )
}

// Get VAPID public key (needed by frontend to subscribe)
router.get('/push/vapid-public-key', async (_req, res) => {
  res.json({ publicKey: process.env.PUBLIC_VAPID_KEY })
})

// Save push subscription (optionally link to logged-in user)
router.post('/push/subscribe', optionalAuth, async (req, res) => {
  const { endpoint, keys } = req.body
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Suscripción inválida' })
  try {
    const userId = req.user?.id || null
    await query(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent, user_id)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth, user_id=COALESCE(excluded.user_id, push_subscriptions.user_id) RETURNING id`, [endpoint, keys.p256dh, keys.auth, req.headers['user-agent']?.slice(0,200) || '', userId])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Unsubscribe + remove all follows for this endpoint
router.post('/push/unsubscribe', async (req, res) => {
  const { endpoint } = req.body
  await query('DELETE FROM team_follows WHERE endpoint=$1', [endpoint])
  await query('DELETE FROM push_subscriptions WHERE endpoint=$1', [endpoint])
  res.json({ ok: true })
})

// ── Team follows (by push endpoint) ───────────────────────────────────────
// Get followed team IDs for an endpoint
router.post('/follows', async (req, res) => {
  const { endpoint } = req.body
  if (!endpoint) return res.json([])
  const rows = (await query('SELECT team_id FROM team_follows WHERE endpoint=$1', [endpoint])).rows
  res.json(rows.map(r => r.team_id))
})

// Follow a team
router.post('/follows/add', async (req, res) => {
  const { endpoint, teamId } = req.body
  if (!endpoint || !teamId) return res.status(400).json({ error: 'Faltan datos' })
  try {
    await query('INSERT INTO team_follows (endpoint, team_id) VALUES ($1,$2) RETURNING id', [endpoint, teamId])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Unfollow a team
router.post('/follows/remove', async (req, res) => {
  const { endpoint, teamId } = req.body
  if (!endpoint || !teamId) return res.status(400).json({ error: 'Faltan datos' })
  await query('DELETE FROM team_follows WHERE endpoint=$1 AND team_id=$2', [endpoint, teamId])
  res.json({ ok: true })
})

// ── Push helpers ──────────────────────────────────────────────────────────

function sendPush(subs, payload) {
  const data = JSON.stringify(payload)
  for (const sub of subs) {
    webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, data)
      .catch(async err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await query('DELETE FROM push_subscriptions WHERE endpoint=$1', [sub.endpoint])
        }
      })
  }
}

// Send only to subscribers following at least one of the given team IDs
async function sendPushToTeams(teamIds, payload) {
  if (!teamIds?.length) return
  const endpoints = (await query(`SELECT DISTINCT ps.endpoint, ps.p256dh, ps.auth
     FROM push_subscriptions ps
     INNER JOIN team_follows tf ON tf.endpoint = ps.endpoint
     WHERE tf.team_id IN (${placeholders})`, [...teamIds])).rows
  sendPush(endpoints, payload)
}

// Send to ALL subscribers — only for admin-triggered announcements
async function sendPushToAll(payload) {
  const subs = (await query('SELECT * FROM push_subscriptions', [])).rows
  sendPush(subs, payload)
}

global.sendPushToAll   = sendPushToAll
global.sendPushToTeams = sendPushToTeams

// ══════════════════════════════════════════════════════════
//  SOLICITUDES DE ADMIN
// ══════════════════════════════════════════════════════════

// Enviar solicitud (público)
router.post('/admin-requests', async (req, res) => {
  const { name, email, phone, org, message } = req.body
  if (!name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Nombre y email son requeridos' })
  const r = await query('INSERT INTO admin_requests (name,email,phone,org,message) VALUES ($1,$2,$3,$4,$5) RETURNING id', [name.trim(), email.trim().toLowerCase(), phone?.trim()||null, org?.trim()||null, message?.trim()||null])
  res.status(201).json({ ok: true, id: r.lastInsertRowid })
})

// Listar solicitudes (solo superadmin)
router.get('/admin-requests', authMiddleware, superAdminOnly, async (req, res) => {
  const rows = (await query('SELECT * FROM admin_requests ORDER BY created_at DESC', [])).rows
  res.json(rows)
})

// Cambiar estado (solo superadmin)
router.patch('/admin-requests/:id/status', authMiddleware, superAdminOnly, async (req, res) => {
  const { status, notes } = req.body
  if (!['pending','approved','rejected'].includes(status)) return res.status(400).json({ error: 'Estado inválido' })
  await query('UPDATE admin_requests SET status=$1, notes=$2 WHERE id=$3', [status, notes||null, req.params.id])
  res.json((await queryOne('SELECT * FROM admin_requests WHERE id=$1', [req.params.id])))
})

// Eliminar solicitud (solo superadmin)
router.delete('/admin-requests/:id', authMiddleware, superAdminOnly, async (req, res) => {
  await query('DELETE FROM admin_requests WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

// ══════════════════════════════════════════════════════════
//  SUPER ADMIN — Gestión de administradores
// ══════════════════════════════════════════════════════════
const bcryptSA = require('bcryptjs')

// Listar todos los admins
router.get('/superadmin/admins', authMiddleware, superAdminOnly, async (req, res) => {
  const admins = (await query(`
    SELECT id, name, email, username, role, is_active, created_at,
           (SELECT COUNT(*) FROM tournaments WHERE 1=1) as _pad
    FROM users
    WHERE role IN ('admin','superadmin')
    ORDER BY role DESC, name ASC
  `, [])).rows
  res.json(admins)
})

// Crear admin
router.post('/superadmin/admins', authMiddleware, superAdminOnly, async (req, res) => {
  const { name, email, username, password, role = 'admin' } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
  if (!email?.trim() && !username?.trim()) return res.status(400).json({ error: 'Debes ingresar un email o nombre de usuario' })
  if (!password?.trim()) return res.status(400).json({ error: 'La contraseña es requerida' })
  if (!['admin','superadmin'].includes(role)) return res.status(400).json({ error: 'Rol inválido' })
  if (email?.trim()) {
    const exists = await queryOne('SELECT id FROM users WHERE email=$1', [email.trim().toLowerCase()])
    if (exists) return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
  }
  if (username?.trim()) {
    const exists = await queryOne('SELECT id FROM users WHERE username=$1', [username.trim().toLowerCase()])
    if (exists) return res.status(409).json({ error: 'Ya existe un usuario con ese nombre de usuario' })
  }
  const hash = bcryptSA.hashSync(password, 10)
  const emailVal = email?.trim() ? email.trim().toLowerCase() : (username.trim().toLowerCase() + '@jugarlapelota.local')
  const usernameVal = username?.trim() ? username.trim().toLowerCase() : null
  const r = await query(
    'INSERT INTO users (name,email,username,password,role,is_active) VALUES ($1,$2,$3,$4,$5,1) RETURNING id',
    [name.trim(), emailVal, usernameVal, hash, role]
  )
  const created = await queryOne('SELECT id,name,email,username,role,is_active,created_at FROM users WHERE id=$1', [r.rows?.[0]?.id || r.lastInsertRowid])
  res.status(201).json(created)
})

// Actualizar admin (nombre, email, rol)
router.put('/superadmin/admins/:id', authMiddleware, superAdminOnly, async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'No puedes modificar tu propia cuenta desde aquí' })
  const { name, email, username, role } = req.body
  const user = (await queryOne('SELECT * FROM users WHERE id=$1', [id]))
  if (!user) return res.status(404).json({ error: 'Admin no encontrado' })
  if (email) {
    const dup = await queryOne('SELECT id FROM users WHERE email=$1 AND id!=$2', [email.trim().toLowerCase(), id])
    if (dup) return res.status(409).json({ error: 'Email ya en uso' })
  }
  if (username) {
    const dup = await queryOne('SELECT id FROM users WHERE username=$1 AND id!=$2', [username.trim().toLowerCase(), id])
    if (dup) return res.status(409).json({ error: 'Nombre de usuario ya en uso' })
  }
  await query(
    'UPDATE users SET name=COALESCE($1,name), email=COALESCE($2,email), username=COALESCE($3,username), role=COALESCE($4,role) WHERE id=$5',
    [name?.trim() || null, email?.trim().toLowerCase() || null, username?.trim().toLowerCase() || null, role || null, id]
  )
  res.json(await queryOne('SELECT id,name,email,username,role,is_active,created_at FROM users WHERE id=$1', [id]))
})

// Cambiar contraseña
router.patch('/superadmin/admins/:id/password', authMiddleware, superAdminOnly, async (req, res) => {
  const id = Number(req.params.id)
  const { password } = req.body
  if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  const user = (await queryOne('SELECT id FROM users WHERE id=$1', [id]))
  if (!user) return res.status(404).json({ error: 'Admin no encontrado' })
  const hash = bcryptSA.hashSync(password, 10)
  await query('UPDATE users SET password=$1 WHERE id=$2', [hash, id])
  res.json({ ok: true })
})

// Activar / desactivar
router.patch('/superadmin/admins/:id/status', authMiddleware, superAdminOnly, async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' })
  const { is_active } = req.body
  const user = (await queryOne('SELECT id FROM users WHERE id=$1', [id]))
  if (!user) return res.status(404).json({ error: 'Admin no encontrado' })
  await query('UPDATE users SET is_active=$1 WHERE id=$2', [is_active ? 1 : 0, id])
  res.json((await queryOne('SELECT id,name,email,role,is_active FROM users WHERE id=$1', [id])))
})

// Eliminar admin
router.delete('/superadmin/admins/:id', authMiddleware, superAdminOnly, async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' })
  const user = (await queryOne('SELECT id,role FROM users WHERE id=$1', [id]))
  if (!user) return res.status(404).json({ error: 'Admin no encontrado' })
  await query('DELETE FROM users WHERE id=$1', [id])
  res.json({ ok: true })
})

module.exports = router
