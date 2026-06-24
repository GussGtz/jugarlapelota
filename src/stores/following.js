import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

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

  async function syncFromServer(endpoint) {
    if (!endpoint) return
    try {
      const [teamsRes, tourRes] = await Promise.all([
        api.post('/follows', { endpoint }),
        api.post('/follows/tournaments', { endpoint }),
      ])
      teamIds.value = new Set(teamsRes.data.map(Number))
      tournamentIds.value = new Set(tourRes.data.map(Number))
      _save()
    } catch {}
  }

  async function follow(teamId, endpoint) {
    const id = Number(teamId)
    if (teamIds.value.has(id)) return
    teamIds.value.add(id); _save()
    if (endpoint) { try { await api.post('/follows/add', { endpoint, teamId: id }) } catch {} }
  }

  async function unfollow(teamId, endpoint) {
    const id = Number(teamId)
    teamIds.value.delete(id); _save()
    if (endpoint) { try { await api.post('/follows/remove', { endpoint, teamId: id }) } catch {} }
  }

  async function toggle(teamId, endpoint) {
    if (isFollowing(teamId)) await unfollow(teamId, endpoint)
    else await follow(teamId, endpoint)
  }

  async function followTournament(tournamentId, endpoint) {
    const id = Number(tournamentId)
    if (tournamentIds.value.has(id)) return
    tournamentIds.value.add(id); _save()
    if (endpoint) { try { await api.post('/follows/tournament/add', { endpoint, tournamentId: id }) } catch {} }
  }

  async function unfollowTournament(tournamentId, endpoint) {
    const id = Number(tournamentId)
    tournamentIds.value.delete(id); _save()
    if (endpoint) { try { await api.post('/follows/tournament/remove', { endpoint, tournamentId: id }) } catch {} }
  }

  async function toggleTournament(tournamentId, endpoint) {
    if (isFollowingTournament(tournamentId)) await unfollowTournament(tournamentId, endpoint)
    else await followTournament(tournamentId, endpoint)
  }

  return {
    teamIds, tournamentIds, list, count, teamCount, tournamentCount,
    isFollowing, isFollowingTournament,
    purgeStale, syncFromServer,
    follow, unfollow, toggle,
    followTournament, unfollowTournament, toggleTournament,
  }
})
