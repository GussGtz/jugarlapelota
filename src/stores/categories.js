import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'
import { Circle, Activity, Trophy, Crown, Star } from 'lucide-vue-next'

export const useCategoriesStore = defineStore('categories', () => {
  const list       = ref([])
  const selected   = ref(null)
  const loading    = ref(false)
  let   lastSlug   = null

  const GROUPS = {
    infantil:  { label: 'Infantil',  icon: Circle   },
    juvenil:   { label: 'Juvenil',   icon: Activity },
    libre:     { label: 'Libre',     icon: Trophy   },
    veteranos: { label: 'Veteranos', icon: Crown    },
    femenil:   { label: 'Femenil',   icon: Star     },
  }

  // Predefined category options for the admin form
  const CATEGORY_OPTIONS = [
    // Infantil
    { name:'Sub-5 / Chupones', gender:'varonil',  group_name:'infantil' },
    { name:'Sub-7',            gender:'varonil',  group_name:'infantil' },
    { name:'Sub-9',            gender:'varonil',  group_name:'infantil' },
    { name:'Sub-11',           gender:'varonil',  group_name:'infantil' },
    { name:'Sub-13',           gender:'varonil',  group_name:'infantil' },
    // Juvenil
    { name:'Sub-15',           gender:'varonil',  group_name:'juvenil' },
    { name:'Sub-17',           gender:'varonil',  group_name:'juvenil' },
    { name:'Sub-20',           gender:'varonil',  group_name:'juvenil' },
    { name:'Juvenil Menor',    gender:'varonil',  group_name:'juvenil' },
    { name:'Juvenil Mayor',    gender:'varonil',  group_name:'juvenil' },
    // Libre
    { name:'Libre Varonil',    gender:'varonil',  group_name:'libre' },
    { name:'Libre Femenil',    gender:'femenil',  group_name:'libre' },
    // Veteranos
    { name:'Veteranos 30+',    gender:'varonil',  group_name:'veteranos' },
    { name:'Veteranos 35+',    gender:'varonil',  group_name:'veteranos' },
    { name:'Veteranos 40+',    gender:'varonil',  group_name:'veteranos' },
    { name:'Veteranos Master 50+', gender:'varonil', group_name:'veteranos' },
    // Femenil
    { name:'Infantil Femenil', gender:'femenil',  group_name:'infantil' },
    { name:'Juvenil Femenil',  gender:'femenil',  group_name:'juvenil' },
    { name:'Sub-15 Femenil',   gender:'femenil',  group_name:'juvenil' },
    { name:'Sub-17 Femenil',   gender:'femenil',  group_name:'juvenil' },
  ]

  async function fetchByTournament(slug) {
    if (lastSlug === slug && list.value.length) return
    loading.value = true
    // Limpiar selección al cambiar de torneo
    if (lastSlug !== slug) {
      selected.value = null
    }
    try {
      const { data } = await api.get(`/tournaments/${slug}/categories`)
      list.value = data
      lastSlug   = slug
    } catch {} finally { loading.value = false }
  }

  function selectById(id) {
    selected.value = list.value.find(c => c.id === id) || null
  }

  function grouped() {
    const groups = {}
    for (const cat of list.value) {
      const g = cat.group_name || 'libre'
      if (!groups[g]) groups[g] = { ...GROUPS[g], key: g, cats: [] }
      groups[g].cats.push(cat)
    }
    return Object.values(groups)
  }

  return { list, selected, loading, CATEGORY_OPTIONS, fetchByTournament, selectById, grouped }
})
