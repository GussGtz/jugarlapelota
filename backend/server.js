require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const http       = require('http')
const { Server } = require('socket.io')
const path       = require('path')
const { init, IS_PG } = require('./config/db')

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

  // Archivos subidos (solo en local con SQLite; en prod se usa Cloudinary)
  if (!IS_PG) {
    app.use('/uploads', express.static(path.join(__dirname, 'data/uploads')))
  }

  app.use('/api', routes)
  app.get('/health', (_req, res) => res.json({ status: 'ok', db: IS_PG ? 'postgres' : 'sqlite', time: new Date().toISOString() }))

  io.on('connection', (socket) => {
    socket.on('join:tournament', slug => socket.join(`tournament:${slug}`))
    socket.on('disconnect', () => {})
  })

  const PORT = process.env.PORT || 3001
  server.listen(PORT, () => {
    console.log(`\n🚀  API corriendo en http://localhost:${PORT}/api`)
    console.log(`📡  Socket.io activo`)
    console.log(`🗄️   DB: ${IS_PG ? 'PostgreSQL/Neon' : 'SQLite local'}\n`)
  })
}

start().catch(err => { console.error('Error al iniciar:', err); process.exit(1) })
