import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useStandingsStore = defineStore('standings', () => {
  const table   = ref([])
  const loading = ref(false)

  async function fetchByTournament(slug) {
    loading.value = true
    try {
      const { data } = await api.get(`/tournaments/${slug}/standings`)
      table.value = data
    } catch { /* backend no disponible */ } finally {
      loading.value = false
    }
  }

  return { table, loading, fetchByTournament }
})
