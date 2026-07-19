const { query, queryOne } = require('../config/db')
const { tournamentFollowerCount, tournamentFollowerCounts } = require('../utils/followers')

// Admin ve solo sus torneos; superadmin y público ven todos
async function getAll(req, res) {
  const { rows } = req.user?.role === 'admin'
    ? await query('SELECT * FROM tournaments WHERE created_by=$1 ORDER BY created_at DESC', [req.user.id])
    : await query('SELECT * FROM tournaments ORDER BY created_at DESC', [])
  const counts = await tournamentFollowerCounts(rows.map(t => t.id))
  res.json(rows.map(t => ({ ...t, followerCount: counts.get(Number(t.id)) || 0 })))
}

async function getBySlug(req, res) {
  const row = await queryOne('SELECT * FROM tournaments WHERE slug=$1', [req.params.slug])
  if (!row) return res.status(404).json({ error: 'Torneo no encontrado' })
  row.followerCount = await tournamentFollowerCount(row.id)
  res.json(row)
}

async function create(req, res) {
  const { name, slug, description, location, logo, banner, sponsorsBanner, primaryColor, secondaryColor, startDate, endDate, modality,
    socialFacebook, socialInstagram, socialTiktok, socialYoutube, socialWhatsapp } = req.body
  const result = await query(
    `INSERT INTO tournaments (name,slug,description,location,logo,banner,sponsors_banner,primary_color,secondary_color,start_date,end_date,modality,created_by,
     social_facebook,social_instagram,social_tiktok,social_youtube,social_whatsapp)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
    [name, slug, description, location, logo||null, banner||null, sponsorsBanner||null, primaryColor||'#00C2FF', secondaryColor||'#00FF95', startDate, endDate, modality||'copa', req.user.id,
     socialFacebook||null, socialInstagram||null, socialTiktok||null, socialYoutube||null, socialWhatsapp||null]
  )
  const row = await queryOne('SELECT * FROM tournaments WHERE id=$1', [result.lastInsertRowid])
  res.status(201).json(row)
}

async function update(req, res) {
  const id = Number(req.params.id)
  if (!await checkOwnerById(req, res, id)) return
  const { name, slug, description, location, logo, banner, sponsorsBanner, primaryColor, secondaryColor, startDate, endDate, modality,
    socialFacebook, socialInstagram, socialTiktok, socialYoutube, socialWhatsapp } = req.body
  await query(
    `UPDATE tournaments SET name=$1,slug=$2,description=$3,location=$4,logo=$5,banner=$6,sponsors_banner=$7,
     primary_color=$8,secondary_color=$9,start_date=$10,end_date=$11,modality=$12,
     social_facebook=$13,social_instagram=$14,social_tiktok=$15,social_youtube=$16,social_whatsapp=$17 WHERE id=$18`,
    [name, slug, description, location, logo||null, banner||null, sponsorsBanner||null, primaryColor, secondaryColor, startDate, endDate, modality||'copa',
     socialFacebook||null, socialInstagram||null, socialTiktok||null, socialYoutube||null, socialWhatsapp||null, id]
  )
  res.json(await queryOne('SELECT * FROM tournaments WHERE id=$1', [id]))
}

async function remove(req, res) {
  const id = Number(req.params.id)
  if (!await checkOwnerById(req, res, id)) return
  await query('DELETE FROM tournaments WHERE id=$1', [id])
  res.status(204).end()
}

async function checkOwnerById(req, res, id) {
  if (req.user?.role === 'superadmin') return true
  const t = await queryOne('SELECT created_by FROM tournaments WHERE id=$1', [id])
  if (!t) { res.status(404).json({ error: 'Torneo no encontrado' }); return false }
  if (String(t.created_by) !== String(req.user.id)) {
    res.status(403).json({ error: 'No tienes permiso para gestionar este torneo' }); return false
  }
  return true
}

async function ownSlugGuard(req, res, next) {
  if (req.user?.role === 'superadmin') return next()
  const t = await queryOne('SELECT created_by FROM tournaments WHERE slug=$1', [req.params.slug])
  if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
  if (String(t.created_by) !== String(req.user.id)) return res.status(403).json({ error: 'No tienes permiso para gestionar este torneo' })
  next()
}

module.exports = { getAll, getBySlug, create, update, remove, checkOwnerById, ownSlugGuard }
