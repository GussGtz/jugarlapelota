import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const usePhasesStore = defineStore('phases', () => {
  const list    = ref([])
  const current = ref(null)
  const loading = ref(false)

  async function fetchByTournament(slug, catId) {
    loading.value = true
    try {
      const params = catId ? `?cat=${catId}` : ''
      const { data } = await api.get(`/tournaments/${slug}/phases${params}`)
      list.value    = data
      current.value = data.find(p => p.is_active) || data[0] || null
    } catch {} finally { loading.value = false }
  }

  function reset() { list.value = []; current.value = null }

  return { list, current, loading, fetchByTournament, reset }
})
