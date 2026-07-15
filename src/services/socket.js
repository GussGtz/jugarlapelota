import { io } from 'socket.io-client'
import { useMatchesStore } from '@/stores/matches'

let socket = null

// Listeners por matchId para eventos específicos
const matchEventListeners    = new Map()  // matchId → callback[]
const matchUpdateListeners   = new Map()  // matchId → callback[]
const matchViewersListeners  = new Map()  // matchId → callback[]  ("viendo en vivo")
const matchReactionsListeners = new Map() // matchId → callback[]
// Listeners globales por torneo
const tournamentListeners    = new Map()  // tournamentId → callback[]  (cualquier match:update de ese torneo)
const standingsListeners     = new Map()  // `${tournamentId}:${categoryId}` → callback[]

export function connectSocket() {
  if (socket?.connected) return socket

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
    auth: { token: localStorage.getItem('jlp_token') },
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  socket.on('connect',    () => console.log('[Socket] Conectado ✓'))
  socket.on('disconnect', () => console.log('[Socket] Desconectado'))
  socket.on('reconnect',  () => console.log('[Socket] Reconectado ✓'))

  // Helper: notificar a todos los listeners de un map
  function notify(map, key, ...args) {
    ;(map.get(key) || []).forEach(cb => cb(...args))
  }
  function notifyAll(map, ...args) {
    map.forEach(cbs => cbs.forEach(cb => cb(...args)))
  }

  // Actualización general de partido (marcador, estado, fecha, cancha)
  socket.on('match:update', (match) => {
    if (!match?.id) return
    const matchesStore = useMatchesStore()
    matchesStore.applySocketUpdate(match)
    // Por partido específico
    notify(matchUpdateListeners, match.id, match)
    // Por torneo (para páginas que muestran todos los partidos del torneo)
    if (match.tournament_id) notify(tournamentListeners, match.tournament_id, match)
  })

  // Partido iniciado en vivo
  socket.on('match:live', (match) => {
    if (!match?.id) return
    const matchesStore = useMatchesStore()
    matchesStore.applySocketUpdate(match)
    notify(matchUpdateListeners, match.id, match)
    if (match.tournament_id) notify(tournamentListeners, match.tournament_id, match)
    showBrowserNotification('Partido iniciado', `${match.homeTeam} vs ${match.awayTeam}`)
  })

  // Evento registrado por el árbitro (gol, tarjeta, etc.)
  socket.on('match:event', ({ matchId, event, match }) => {
    if (!matchId) return
    const matchesStore = useMatchesStore()
    if (match) {
      matchesStore.applySocketUpdate(match)
      notify(matchUpdateListeners, matchId, match)
      if (match.tournament_id) notify(tournamentListeners, match.tournament_id, match)
    }
    notify(matchEventListeners, matchId, event, match)
    if (event?.type === 'goal' || event?.type === 'own_goal') {
      const scorer = event.playerName || event.teamName || ''
      showBrowserNotification('Gol!', `${scorer} — ${event.minute}'`)
    }
  })

  // Standings actualizados (cuando termina un partido)
  socket.on('standings:update', ({ tournamentId, categoryId, phaseId }) => {
    const key = `${tournamentId}:${categoryId ?? 'all'}`
    notify(standingsListeners, key, { tournamentId, categoryId, phaseId })
    // También notificar listeners sin categoría específica (torneo completo)
    notify(standingsListeners, `${tournamentId}:all`, { tournamentId, categoryId, phaseId })
  })

  // "Viendo en vivo" — cuántos hay conectados a la sala de este partido
  socket.on('match:viewers', ({ matchId, count }) => {
    notify(matchViewersListeners, matchId, count)
  })

  // Reacciones rápidas actualizadas (otro visitante reaccionó)
  socket.on('match:reactions', ({ matchId, reactions }) => {
    notify(matchReactionsListeners, matchId, reactions)
  })

  return socket
}

/** Entra a la sala de "viendo en vivo" de un partido */
export function joinMatchRoom(matchId) {
  socket?.emit('join:match', matchId)
}

/** Sale de la sala de "viendo en vivo" de un partido */
export function leaveMatchRoom(matchId) {
  socket?.emit('leave:match', matchId)
}

/** Escucha el conteo de "viendo en vivo" de un partido específico */
export function onMatchViewers(matchId, callback) {
  return addListener(matchViewersListeners, matchId, callback)
}

/** Escucha actualizaciones de reacciones rápidas de un partido específico */
export function onMatchReactions(matchId, callback) {
  return addListener(matchReactionsListeners, matchId, callback)
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

/** Helper genérico para registrar/limpiar listener en un Map */
function addListener(map, key, cb) {
  if (!map.has(key)) map.set(key, [])
  map.get(key).push(cb)
  return () => {
    const arr = map.get(key) || []
    map.set(key, arr.filter(x => x !== cb))
  }
}

/** Escucha eventos (gol, tarjeta…) de un partido específico */
export function onMatchEvent(matchId, callback) {
  return addListener(matchEventListeners, matchId, callback)
}

/** Escucha actualizaciones de marcador/estado de un partido específico */
export function onMatchUpdate(matchId, callback) {
  return addListener(matchUpdateListeners, matchId, callback)
}

/**
 * Escucha cualquier cambio de partido dentro de un torneo.
 * Útil para páginas que muestran la lista completa de partidos.
 */
export function onTournamentMatch(tournamentId, callback) {
  return addListener(tournamentListeners, parseInt(tournamentId), callback)
}

/**
 * Escucha cuando los standings de una categoría cambian (partido finalizado).
 * @param categoryId  null = escucha cualquier categoría del torneo
 */
export function onStandingsUpdate(tournamentId, categoryId, callback) {
  const key = `${tournamentId}:${categoryId ?? 'all'}`
  return addListener(standingsListeners, key, callback)
}

function showBrowserNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-72.png' })
  }
}

export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}
