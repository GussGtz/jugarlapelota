const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const https  = require('https')
const { query, queryOne } = require('../config/db')

async function login(req, res) {
  const { email, password, username } = req.body
  try {
    const user = username
      ? await queryOne('SELECT * FROM users WHERE username=$1', [username])
      : await queryOne('SELECT * FROM users WHERE email=$1', [email?.trim().toLowerCase()])

    if (!user) return res.status(401).json({ error: 'Correo o usuario no encontrado' })
    if (!bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    if (user.is_active === 0 || user.is_active === '0' || user.is_active === false)
      return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' })
    console.log(`[login] ${user.email} role=${user.role} is_active=${user.is_active}`)

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

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
  https.get(url, (gRes) => {
    let raw = ''
    gRes.on('data', d => { raw += d })
    gRes.on('end', async () => {
      try {
        const payload = JSON.parse(raw)
        if (payload.error) return res.status(401).json({ error: 'Token de Google inválido' })
        const clientId = process.env.GOOGLE_CLIENT_ID
        if (clientId && payload.aud !== clientId)
          return res.status(401).json({ error: 'Client ID no coincide' })

        const { sub: googleId, email, name, picture } = payload
        let user = await queryOne('SELECT * FROM users WHERE google_id=$1', [googleId])
               || await queryOne('SELECT * FROM users WHERE email=$1', [email])

        if (!user) {
          const r = await query(
            'INSERT INTO users (name,email,google_id,avatar,role,password) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
            [name, email, googleId, picture||null, 'fan', '']
          )
          user = await queryOne('SELECT * FROM users WHERE id=$1', [r.lastInsertRowid])
        } else {
          await query('UPDATE users SET google_id=$1, avatar=$2 WHERE id=$3', [googleId, picture||user.avatar, user.id])
          user = await queryOne('SELECT * FROM users WHERE id=$1', [user.id])
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'jlp_secret_dev',
          { expiresIn: '30d' }
        )
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } })
      } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error verificando token' })
      }
    })
  }).on('error', () => res.status(500).json({ error: 'Error contactando Google' }))
}

async function me(req, res) {
  const user = await queryOne(`
    SELECT u.id, u.name, u.email, u.username, u.role, u.avatar, u.is_active,
           u.tournament_id, t.name AS tournamentName, t.slug AS tournamentSlug
    FROM users u
    LEFT JOIN tournaments t ON t.id = u.tournament_id
    WHERE u.id = $1
  `, [req.user.id])
  res.json(user)
}

module.exports = { login, googleLogin, me }
