const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'jlp_secret_dev')
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' })
  }
  next()
}

function superAdminOnly(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acceso de super administrador requerido' })
  }
  next()
}

function refereeOrAdmin(req, res, next) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'referee') {
    return res.status(403).json({ error: 'Acceso denegado' })
  }
  next()
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'jlp_secret_dev') } catch {}
  }
  next()
}

module.exports = { authMiddleware, adminOnly, superAdminOnly, optionalAuth, refereeOrAdmin }
