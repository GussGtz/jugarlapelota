const { db } = require('../config/db')

// Admin ve solo sus torneos; superadmin y público ven todos
function getAll(req, res) {
  let rows
  if (req.user?.role === 'admin') {
    rows = db.prepare('SELECT * FROM tournaments WHERE created_by=? ORDER BY created_at DESC').all(req.user.id)
  } else {
    rows = db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC').all()
  }
  res.json(rows)
}

function getBySlug(req, res) {
  const row = db.prepare('SELECT * FROM tournaments WHERE slug = ?').get(req.params.slug)
  if (!row) return res.status(404).json({ error: 'Torneo no encontrado' })
  res.json(row)
}

function create(req, res) {
  const { name, slug, description, location, logo, banner, primaryColor, secondaryColor, startDate, endDate, modality } = req.body
  const result = db.prepare(`
    INSERT INTO tournaments (name, slug, description, location, logo, banner, primary_color, secondary_color, start_date, end_date, modality, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, slug, description, location, logo || null, banner || null, primaryColor || '#00C2FF', secondaryColor || '#00FF95', startDate, endDate, modality || 'copa', req.user.id)
  const row = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(row)
}

function update(req, res) {
  const id = Number(req.params.id)
  // Verificar propiedad
  if (!checkOwnerById(req, res, id)) return
  const { name, slug, description, location, logo, banner, primaryColor, secondaryColor, startDate, endDate, modality } = req.body
  db.prepare(`
    UPDATE tournaments SET name=?, slug=?, description=?, location=?,
    logo=?, banner=?, primary_color=?, secondary_color=?, start_date=?, end_date=?, modality=? WHERE id=?
  `).run(name, slug, description, location, logo || null, banner || null, primaryColor, secondaryColor, startDate, endDate, modality || 'copa', id)
  const row = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id)
  res.json(row)
}

function remove(req, res) {
  const id = Number(req.params.id)
  if (!checkOwnerById(req, res, id)) return
  db.prepare('DELETE FROM tournaments WHERE id = ?').run(id)
  res.status(204).end()
}

// Devuelve true si el usuario puede gestionar el torneo, false (y responde 403) si no
function checkOwnerById(req, res, id) {
  if (req.user?.role === 'superadmin') return true
  const t = db.prepare('SELECT created_by FROM tournaments WHERE id=?').get(id)
  if (!t) { res.status(404).json({ error: 'Torneo no encontrado' }); return false }
  if (t.created_by !== req.user.id) {
    res.status(403).json({ error: 'No tienes permiso para gestionar este torneo' }); return false
  }
  return true
}

// Middleware: verifica que el admin sea dueño del torneo por slug
function ownSlugGuard(req, res, next) {
  if (req.user?.role === 'superadmin') return next()
  const t = db.prepare('SELECT created_by FROM tournaments WHERE slug=?').get(req.params.slug)
  if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
  if (t.created_by !== req.user.id) return res.status(403).json({ error: 'No tienes permiso para gestionar este torneo' })
  next()
}

module.exports = { getAll, getBySlug, create, update, remove, checkOwnerById, ownSlugGuard }
