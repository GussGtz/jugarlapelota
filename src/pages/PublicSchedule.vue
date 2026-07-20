<template>
  <div class="min-h-screen" style="background:#F7F9FC">

    <!-- ── Cargando ─────────────────────────────────────────── -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh] text-slate-400">
      <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- ── Enlace inválido ──────────────────────────────────── -->
    <div v-else-if="!tournament" class="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-3">
      <div class="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
        <IconAlertCircle class="w-7 h-7 text-red-400" />
      </div>
      <h1 class="text-lg font-black text-slate-900">Enlace inválido o expirado</h1>
      <p class="text-sm text-slate-500 max-w-xs">Pide al organizador del torneo que te comparta el enlace actualizado.</p>
    </div>

    <!-- ── Contenido ────────────────────────────────────────── -->
    <template v-else>
      <!-- Banner de torneo -->
      <div class="relative overflow-hidden h-28 md:h-56"
        :style="{ background: `linear-gradient(135deg, ${tournament.primary_color || '#0ea5e9'}22, #f1f5f9)` }">
        <img v-if="tournament.banner" :src="tournament.banner" class="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div class="relative max-w-7xl mx-auto px-4 h-full flex items-center md:items-end md:pb-6">
          <div class="flex items-center gap-3">
            <img v-if="tournament.logo" :src="tournament.logo"
              class="w-12 h-12 md:w-20 md:h-20 object-contain bg-card rounded-xl md:rounded-2xl p-1.5 md:p-2 shadow-sm" />
            <div>
              <h1 class="text-xl md:text-3xl font-black text-slate-900 leading-tight">{{ tournament.name }}</h1>
              <div class="flex items-center gap-2 mt-0.5">
                <p v-if="tournament.location" class="text-slate-500 text-xs md:text-sm flex items-center gap-1">
                  <IconMapPin class="w-3 h-3" /> {{ tournament.location }}
                </p>
                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-900/80 text-white flex items-center gap-1">
                  <IconLock class="w-2.5 h-2.5" /> Enlace privado
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h2 class="text-lg font-black text-slate-900">Rol de juegos</h2>
          <p class="text-sm text-slate-500">Selecciona una categoría para ver los partidos de todos los equipos.</p>
        </div>

        <!-- Selector de categoría -->
        <div v-if="categories.length > 1" class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button v-for="c in categories" :key="c.id" @click="selectCategory(c)"
            class="shrink-0 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border"
            :class="selCategory?.id === c.id
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-white text-slate-600 border-muted hover:border-primary/40'">
            {{ c.name }}
          </button>
        </div>

        <!-- Cargando partidos -->
        <div v-if="loadingMatches" class="flex justify-center py-10">
          <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>

        <p v-else-if="!phaseGroups.length" class="text-center text-slate-400 py-16">
          Todavía no hay partidos generados en esta categoría.
        </p>

        <!-- Partidos agrupados por fase -->
        <div v-else class="space-y-6">
          <div v-for="pg in phaseGroups" :key="pg.phaseId" class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="w-1 h-5 bg-primary rounded-full"></div>
              <h3 class="text-sm font-black uppercase tracking-wide text-slate-700">{{ pg.phaseName }}</h3>
            </div>

            <div v-for="rg in pg.roundGroups" :key="rg.label" class="space-y-2">
              <p v-if="rg.label" class="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">{{ rg.label }}</p>
              <div class="grid sm:grid-cols-2 gap-3">
                <MatchCard v-for="m in rg.matches" :key="m.id" :match="m" :tournament-slug="tournament.slug" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'
import MatchCard from '@/components/MatchCard/MatchCard.vue'

const route = useRoute()

const loading  = ref(true)
const tournament = ref(null)
const categories  = ref([])
const selCategory  = ref(null)
const loadingMatches = ref(false)
const phaseGroups = ref([])

async function selectCategory(c) {
  selCategory.value = c
  await loadMatches()
}

async function loadMatches() {
  if (!tournament.value || !selCategory.value) return
  loadingMatches.value = true
  phaseGroups.value = []
  try {
    const { data } = await api.get(`/tournaments/${tournament.value.slug}/matches?cat=${selCategory.value.id}`)
    // Solo fase inicial (grupos/liga) — el rol compartido es el de la fase de grupos,
    // no el bracket eliminatorio (que puede tener equipos "por definir").
    const relevant = data.filter(m => m.phaseType === 'groups' || m.phaseType === 'league')

    const byPhase = {}
    for (const m of relevant) {
      const key = m.phase_id ?? 'sin-fase'
      if (!byPhase[key]) byPhase[key] = { phaseId: key, phaseName: m.phaseName || 'Partidos', matches: [] }
      byPhase[key].matches.push(m)
    }

    phaseGroups.value = Object.values(byPhase).map(pg => {
      const byRound = {}
      for (const m of pg.matches) {
        const key = m.roundName || ''
        if (!byRound[key]) byRound[key] = { label: key, matches: [] }
        byRound[key].matches.push(m)
      }
      return { ...pg, roundGroups: Object.values(byRound) }
    })
  } catch { phaseGroups.value = [] }
  finally { loadingMatches.value = false }
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/schedule-link/${route.params.token}`)
    tournament.value = data
    const { data: cats } = await api.get(`/tournaments/${data.slug}/categories`)
    categories.value = cats
    if (cats.length) await selectCategory(cats[0])
  } catch { tournament.value = null }
  finally { loading.value = false }
})
</script>
