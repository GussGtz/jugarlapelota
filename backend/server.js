require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const http       = require('http')
const { Server } = require('socket.io')
const path       = require('path')
const { init, IS_PG, query, isUniqueViolation, uniqueViolationColumn } = require('./config/db')

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
    // Multer no pone .status/.statusCode en sus errores (verificado: ambos
    // vienen undefined), así que un archivo que excede el límite caía como
    // 500 genérico en vez de 413 — el mensaje sí le llegaba bien al usuario
    // (el frontend ya lo detecta por texto), pero cualquier monitoreo de
    // errores 5xx lo contaría como falla real del servidor.
    if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Archivo demasiado grande (máx 25 MB)' })
    }
    // Red de seguridad: si una ruta no atrapó a mano un choque de constraint
    // UNIQUE (dos requests simultáneas pasaron el SELECT-check de duplicados
    // antes de que cualquiera insertara), devolver 409 en vez de 500.
    if (isUniqueViolation(err)) {
      const col = uniqueViolationColumn(err, ['curp', 'number', 'team_name', 'teamname', 'name'])
      const label = { curp: 'la CURP', number: 'el número', team_name: 'el nombre', teamname: 'el nombre', name: 'el nombre' }[col] || 'estos datos'
      return res.status(409).json({ error: `Ya existe un registro con ${label} indicado (probablemente por un envío duplicado). Intenta de nuevo.` })
    }
    const status = err.status || err.statusCode || 500
    res.status(status).json({ error: err.message || 'Error interno del servidor' })
  })

  // "Viendo en vivo": el conteo es simplemente el tamaño de la sala socket.io
  // `match:${id}` — no hace falta guardar nada en la base de datos, con que
  // el proceso viva ya sabemos cuántos hay conectados a cada partido.
  function broadcastMatchViewers(matchId) {
    const count = io.sockets.adapter.rooms.get(`match:${matchId}`)?.size || 0
    io.to(`match:${matchId}`).emit('match:viewers', { matchId: Number(matchId), count })
  }

  io.on('connection', (socket) => {
    socket.on('join:tournament', slug => socket.join(`tournament:${slug}`))

    socket.on('join:match', (matchId) => {
      if (!matchId) return
      socket.join(`match:${matchId}`)
      broadcastMatchViewers(matchId)
    })
    socket.on('leave:match', (matchId) => {
      if (!matchId) return
      socket.leave(`match:${matchId}`)
      broadcastMatchViewers(matchId)
    })

    // 'disconnecting' (no 'disconnect') porque socket.rooms todavía tiene las
    // salas match:* en este punto — en 'disconnect' ya las perdió y no hay
    // forma de saber de qué partidos salir.
    socket.on('disconnecting', () => {
      const matchRooms = [...socket.rooms].filter(r => r.startsWith('match:'))
      if (!matchRooms.length) return
      setImmediate(() => matchRooms.forEach(room => broadcastMatchViewers(room.slice('match:'.length))))
    })

    socket.on('disconnect', () => {})
  })

  // ── Recordatorio de próximos partidos a seguidores de equipo ────────────
  // routes/index.js expone la función en global.checkUpcomingMatchReminders
  // (no hay infraestructura de cron en el proyecto — un setInterval basta,
  // igual que el keep-alive de abajo)
  setInterval(() => {
    global.checkUpcomingMatchReminders?.().catch(e => console.error('[match-reminders]', e.message))
  }, 15 * 60 * 1000)

  // ── Keep-alive: evita que Neon y Render duerman ─────────────────────────
  if (IS_PG) {
    // Ping a Neon cada 4 min para mantener la conexión activa
    setInterval(() => {
      query('SELECT 1').catch(e => console.error('[keepalive-db]', e.message))
    }, 4 * 60 * 1000)

    // Auto-ping HTTP a sí mismo cada 5 min para que Render no duerma el proceso
    const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3001}`
    setInterval(() => {
      const url = `${SELF_URL}/health`
      require('https').get(url, r => r.resume()).on('error', () =>
        require('http').get(url, r => r.resume()).on('error', () => {})
      )
    }, 5 * 60 * 1000)
  }

  const PORT = process.env.PORT || 3001
  server.listen(PORT, () => {
    console.log(`\n🚀  API corriendo en http://localhost:${PORT}/api`)
    console.log(`📡  Socket.io activo`)
    console.log(`🗄️   DB: ${IS_PG ? 'PostgreSQL/Neon' : 'SQLite local'}\n`)
  })
}

start().catch(err => { console.error('Error al iniciar:', err); process.exit(1) })
