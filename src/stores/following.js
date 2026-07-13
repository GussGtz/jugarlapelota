import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'

export const useFollowingStore = defineStore('following', () => {
  const teamIds = ref(new Set(
    JSON.parse(localStorage.getItem('jlp_follows') || '[]').map(Number)
  ))
  const tournamentIds = ref(new Set(
    JSON.parse(localStorage.getItem('jlp_follows_tournaments') || '[]').map(Number)
  ))

  const list            = computed(() => [...teamIds.value])
  const count           = computed(() => teamIds.value.size + tournamentIds.value.size)
  const teamCount       = computed(() => teamIds.value.size)
  const tournamentCount = computed(() => tournamentIds.value.size)
  // Texto combinado para mostrar en UI — antes cada consumidor mostraba solo
  // "Siguiendo N equipos" usando el conteo combinado, lo cual era incorrecto
  // en cuanto el usuario seguía también algún torneo.
  const summaryText = computed(() => {
    const parts = []
    if (teamCount.value)       parts.push(`${teamCount.value} equipo${teamCount.value !== 1 ? 's' : ''}`)
    if (tournamentCount.value) parts.push(`${tournamentCount.value} torneo${tournamentCount.value !== 1 ? 's' : ''}`)
    return parts.join(' y ')
  })

  function isFollowing(id)           { return teamIds.value.has(Number(id)) }
  function isFollowingTournament(id) { return tournamentIds.value.has(Number(id)) }

  function _save() {
    localStorage.setItem('jlp_follows', JSON.stringify([...teamIds.value]))
    localStorage.setItem('jlp_follows_tournaments', JSON.stringify([...tournamentIds.value]))
  }

  async function purgeStale() {
    if (!teamIds.value.size) return
    try {
      const { data } = await api.get('/teams')
      const existingIds = new Set(data.map(t => Number(t.id)))
      let changed = false
      for (const id of [...teamIds.value]) {
        if (!existingIds.has(id)) { teamIds.value.delete(id); changed = true }
      }
      if (changed) _save()
    } catch {}
  }

  // El backend persiste por endpoint (dispositivo/push) y, si hay sesión, también
  // por cuenta (user_id) — así el seguimiento sobrevive a cambios de dispositivo.
  function _shouldSync(endpoint) {
    return !!endpoint || useAuthStore().isLoggedIn
  }

  async function syncFromServer(endpoint = null) {
    if (!_shouldSync(endpoint)) return
    try {
      // Follows locales previos al login (anónimos) — se preservan subiéndolos a la cuenta
      // en vez de perderlos al sobreescribir con lo que ya tenía el servidor.
      const localTeamIds = [...teamIds.value]
      const localTournamentIds = [...tournamentIds.value]

      const [teamsRes, tourRes] = await Promise.all([
        api.post('/follows', { endpoint }),
        api.post('/follows/tournaments', { endpoint }),
      ])
      const serverTeamIds = new Set(teamsRes.data.map(Number))
      const serverTournamentIds = new Set(tourRes.data.map(Number))

      const newTeamIds = localTeamIds.filter(id => !serverTeamIds.has(id))
      const newTournamentIds = localTournamentIds.filter(id => !serverTournamentIds.has(id))
      await Promise.all([
        ...newTeamIds.map(id => api.post('/follows/add', { endpoint, teamId: id }).catch(() => {})),
        ...newTournamentIds.map(id => api.post('/follows/tournament/add', { endpoint, tournamentId: id }).catch(() => {})),
      ])

      teamIds.value = new Set([...serverTeamIds, ...newTeamIds])
      tournamentIds.value = new Set([...serverTournamentIds, ...newTournamentIds])
      _save()
    } catch {}
  }

  async function follow(teamId, endpoint) {
    const id = Number(teamId)
    if (teamIds.value.has(id)) return
    teamIds.value.add(id); _save()
    if (_shouldSync(endpoint)) { try { await api.post('/follows/add', { endpoint, teamId: id }) } catch {} }
  }

  async function unfollow(teamId, endpoint) {
    const id = Number(teamId)
    teamIds.value.delete(id); _save()
    if (_shouldSync(endpoint)) { try { await api.post('/follows/remove', { endpoint, teamId: id }) } catch {} }
  }

  async function toggle(teamId, endpoint) {
    if (isFollowing(teamId)) await unfollow(teamId, endpoint)
    else await follow(teamId, endpoint)
  }

  async function followTournament(tournamentId, endpoint) {
    const id = Number(tournamentId)
    if (tournamentIds.value.has(id)) return
    tournamentIds.value.add(id); _save()
    if (_shouldSync(endpoint)) { try { await api.post('/follows/tournament/add', { endpoint, tournamentId: id }) } catch {} }
  }

  async function unfollowTournament(tournamentId, endpoint) {
    const id = Number(tournamentId)
    tournamentIds.value.delete(id); _save()
    if (_shouldSync(endpoint)) { try { await api.post('/follows/tournament/remove', { endpoint, tournamentId: id }) } catch {} }
  }

  async function toggleTournament(tournamentId, endpoint) {
    if (isFollowingTournament(tournamentId)) await unfollowTournament(tournamentId, endpoint)
    else await followTournament(tournamentId, endpoint)
  }

  return {
    teamIds, tournamentIds, list, count, teamCount, tournamentCount, summaryText,
    isFollowing, isFollowingTournament,
    purgeStale, syncFromServer,
    follow, unfollow, toggle,
    followTournament, unfollowTournament, toggleTournament,
  }
})
