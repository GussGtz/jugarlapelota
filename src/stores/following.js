import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

export const useFollowingStore = defineStore('following', () => {
  const teamIds = ref(new Set(
    JSON.parse(localStorage.getItem('jlp_follows') || '[]').map(Number)
  ))

  const list    = computed(() => [...teamIds.value])
  const count   = computed(() => teamIds.value.size)

  function isFollowing(id) { return teamIds.value.has(Number(id)) }

  function _save() {
    localStorage.setItem('jlp_follows', JSON.stringify([...teamIds.value]))
  }

  // Elimina IDs de equipos que ya no existen en la BD (torneos eliminados)
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
    } catch { /* backend no disponible — no tocar nada */ }
  }

  async function syncFromServer(endpoint) {
    if (!endpoint) return
    try {
      const { data } = await api.post('/follows', { endpoint })
      teamIds.value = new Set(data.map(Number))
      _save()
    } catch {}
  }

  async function follow(teamId, endpoint) {
    const id = Number(teamId)
    if (teamIds.value.has(id)) return
    teamIds.value.add(id)
    _save()
    if (endpoint) {
      try { await api.post('/follows/add', { endpoint, teamId: id }) } catch {}
    }
  }

  async function unfollow(teamId, endpoint) {
    const id = Number(teamId)
    teamIds.value.delete(id)
    _save()
    if (endpoint) {
      try { await api.post('/follows/remove', { endpoint, teamId: id }) } catch {}
    }
  }

  async function toggle(teamId, endpoint) {
    if (isFollowing(teamId)) await unfollow(teamId, endpoint)
    else await follow(teamId, endpoint)
  }

  return { teamIds, list, count, isFollowing, purgeStale, syncFromServer, follow, unfollow, toggle }
})
