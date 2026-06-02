import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useMatchesStore = defineStore('matches', () => {
  const list    = ref([])
  const live    = ref([])
  const current = ref(null)
  const loading = ref(false)

  async function fetchByTournament(slug) {
    loading.value = true
    try {
      const { data } = await api.get(`/tournaments/${slug}/matches`)
      list.value = data
      live.value = data.filter(m => m.status === 'live')
    } catch { /* backend no disponible */ } finally {
      loading.value = false
    }
  }

  async function fetchOne(id) {
    try {
      const { data } = await api.get(`/matches/${id}`)
      current.value = data
      return data
    } catch { /* backend no disponible */ }
  }

  async function updateScore(id, homeScore, awayScore) {
    const { data } = await api.patch(`/matches/${id}/score`, { homeScore, awayScore })
    const idx = list.value.findIndex(m => m.id === id)
    if (idx !== -1) list.value[idx] = data
    return data
  }

  function applySocketUpdate(match) {
    if (!match?.id) return
    const idx = list.value.findIndex(m => m.id === match.id)
    if (idx !== -1) {
      // Merge para preservar campos enriquecidos que quizás no vengan en el update
      list.value[idx] = { ...list.value[idx], ...match }
    }
    if (current.value?.id === match.id) {
      current.value = { ...current.value, ...match }
    }
    live.value = list.value.filter(m => m.status === 'live')
  }

  return { list, live, current, loading, fetchByTournament, fetchOne, updateScore, applySocketUpdate }
})
