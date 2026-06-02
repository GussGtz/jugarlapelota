const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const https  = require('https')
const { db } = require('../config/db')

function login(req, res) {
  const { email, password, username } = req.body
  try {
    // Admite login por email O por username (para árbitros)
    const user = username
      ? db.prepare("SELECT * FROM users WHERE username=?").get(username)
      : db.prepare('SELECT * FROM users WHERE email=?').get(email)

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }
    if (user.is_active === 0) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' })
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'jlp_secret_dev',
      { expiresIn: '7d' }
    )
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role, avatar: user.avatar } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error del servidor' })
  }
}

function googleLogin(req, res) {
  const { credential } = req.body
  if (!credential) return res.status(400).json({ error: 'Credencial requerida' })

  // Verify Google ID token via Google's tokeninfo endpoint
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
  https.get(url, (gRes) => {
    let raw = ''
    gRes.on('data', d => { raw += d })
    gRes.on('end', () => {
      try {
        const payload = JSON.parse(raw)
        if (payload.error) return res.status(401).json({ error: 'Token de Google inválido' })

        const clientId = process.env.GOOGLE_CLIENT_ID
        if (clientId && payload.aud !== clientId) {
          return res.status(401).json({ error: 'Client ID no coincide' })
        }

        const { sub: googleId, email, name, picture } = payload

        // Find or create fan user
        let user = db.prepare('SELECT * FROM users WHERE google_id=?').get(googleId)
          || db.prepare('SELECT * FROM users WHERE email=?').get(email)

        if (!user) {
          const r = db.prepare(
            'INSERT INTO users (name, email, google_id, avatar, role, password) VALUES (?,?,?,?,?,?)'
          ).run(name, email, googleId, picture || null, 'fan', '')
          user = db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid)
        } else {
          // Siempre actualiza avatar y google_id (foto puede cambiar en Google)
          db.prepare('UPDATE users SET google_id=?, avatar=? WHERE id=?').run(googleId, picture || user.avatar, user.id)
          user = db.prepare('SELECT * FROM users WHERE id=?').get(user.id)
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'jlp_secret_dev',
          { expiresIn: '30d' }
        )
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } })
      } catch (e) {
        res.status(500).json({ error: 'Error verificando token' })
      }
    })
  }).on('error', () => res.status(500).json({ error: 'Error contactando Google' }))
}

function me(req, res) {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.username, u.role, u.avatar, u.is_active,
           u.tournament_id, t.name AS tournamentName, t.slug AS tournamentSlug
    FROM users u
    LEFT JOIN tournaments t ON t.id = u.tournament_id
    WHERE u.id = ?
  `).get(req.user.id)
  res.json(user)
}

module.exports = { login, googleLogin, me }
