require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const http       = require('http')
const { Server } = require('socket.io')
const path       = require('path')
const { init, IS_PG, query } = require('./config/db')

// ── Evitar crash por promesas no capturadas ───────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason?.message || reason)
})
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message)
})

async function start() {
  // Inicializar base de datos (SQLite local o PostgreSQL/Neon en producción)
  await init()

  const routes = require('./routes')

  const app    = express()
  const server = http.createServer(app)
  const io     = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || '*', credentials: true }
  })

  const FRONTEND = process.env.FRONTEND_URL || '*'
  app.use(cors({ origin: FRONTEND }))
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use((req, _res, next) => { req.io = io; next() })

  // Servir uploads siempre (en prod Render sirve los archivos del deploy)
  app.use('/uploads', express.static(path.join(__dirname, 'data/uploads')))

  app.use('/api', routes)
  app.get('/health', (_req, res) => res.json({ status: 'ok', db: IS_PG ? 'postgres' : 'sqlite', time: new Date().toISOString(), version: 'v6-autosetup-fix' }))

  // ── Error handler global (captura async errors + express-async-errors) ──────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    console.error('[ERROR]', req.method, req.path, err.message || err)
    const status = err.status || err.statusCode || 500
    res.status(status).json({ error: err.message || 'Error interno del servidor' })
  })

  io.on('connection', (socket) => {
    socket.on('join:tournament', slug => socket.join(`tournament:${slug}`))
    socket.on('disconnect', () => {})
  })

  // ── Keep-alive: evita que Neon y Render duerman ─────────────────────────
  if (IS_PG) {
    setInterval(() => {
      query('SELECT 1').catch(e => console.error('[keepalive]', e.message))
    }, 4 * 60 * 1000) // cada 4 minutos
  }

  const PORT = process.env.PORT || 3001
  server.listen(PORT, () => {
    console.log(`\n🚀  API corriendo en http://localhost:${PORT}/api`)
    console.log(`📡  Socket.io activo`)
    console.log(`🗄️   DB: ${IS_PG ? 'PostgreSQL/Neon' : 'SQLite local'}\n`)
  })
}

start().catch(err => { console.error('Error al iniciar:', err); process.exit(1) })
