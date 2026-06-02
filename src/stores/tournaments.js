import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useTournamentsStore = defineStore('tournaments', () => {
  const list    = ref([])
  const current = ref(null)
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const { data } = await api.get('/tournaments')
      list.value = data
    } catch { /* backend no disponible */ } finally {
      loading.value = false
    }
  }

  async function fetchBySlug(slug) {
    loading.value = true
    try {
      const { data } = await api.get(`/tournaments/${slug}`)
      current.value = data
      return data
    } catch { /* backend no disponible */ } finally {
      loading.value = false
    }
  }

  async function create(payload) {
    const { data } = await api.post('/tournaments', payload)
    list.value.push(data)
    return data
  }

  async function update(id, payload) {
    const { data } = await api.put(`/tournaments/${id}`, payload)
    const idx = list.value.findIndex(t => t.id === id)
    if (idx !== -1) list.value[idx] = data
    return data
  }

  async function remove(id) {
    await api.delete(`/tournaments/${id}`)
    list.value = list.value.filter(t => t.id !== id)
  }

  return { list, current, loading, fetchAll, fetchBySlug, create, update, remove }
})
