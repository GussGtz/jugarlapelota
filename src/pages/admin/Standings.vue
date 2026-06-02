<template>
  <div class="space-y-4 md:space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Resultados</h2>
    </div>

    <!-- Filtros -->
    <div class="flex gap-3 flex-wrap items-center">
      <!-- Torneo -->
      <select v-model="selTournament" @change="onTournamentChange"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option v-for="t in tournaments" :key="t.slug" :value="t">{{ t.name }}</option>
      </select>

      <!-- Categoría -->
      <select v-model="selCategory" @change="loadResults"
        :disabled="!categories.length"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary disabled:opacity-40">
        <option :value="null">— Categoría —</option>
        <option v-for="c in categories" :key="c.id" :value="c">{{ c.name }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 2" :key="i" class="card animate-pulse h-40 bg-muted/40"></div>
    </div>

    <!-- Sin categoría seleccionada -->
    <div v-else-if="!selCategory" class="card text-center py-16 text-slate-400">
      <IconFilter class="w-10 h-10 mx-auto mb-3 opacity-20"/>
      <p class="font-semibold">Selecciona una categoría para ver los resultados</p>
    </div>

    <!-- Sin fases -->
    <div v-else-if="!phases.length" class="card text-center py-16 text-slate-400">
      <IconLayersIcon class="w-10 h-10 mx-auto mb-3 opacity-20"/>
      <p class="font-semibold">No hay fases configuradas en esta categoría</p>
    </div>

    <!-- Resultados por fase -->
    <template v-else>
      <div v-for="phase in phases" :key="phase.id" class="space-y-3">

        <!-- Cabecera de fase -->
        <div class="flex items-center gap-3">
          <div class="w-1 h-6 bg-primary rounded-full shrink-0"></div>
          <div>
            <h3 class="font-black text-slate-900">{{ phase.name }}</h3>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              :class="phaseChipClass(phase.type)">
              {{ phaseLabel(phase.type) }}
            </span>
          </div>
        </div>

        <!-- LIGA — tabla simple -->
        <div v-if="phase.type === 'league'" class="card overflow-hidden p-0">
          <div v-if="phaseData[phase.id]?.length">
            <StandingsTable :standings="phaseData[phase.id]" :slug="selTournament?.slug" />
          </div>
          <p v-else class="text-center text-slate-400 py-10 text-sm">Sin partidos jugados aún</p>
        </div>

        <!-- GRUPOS — una tabla por grupo -->
        <div v-else-if="phase.type === 'groups'" class="grid md:grid-cols-2 gap-4">
          <div v-if="phaseData[phase.id]?.length" v-for="group in phaseData[phase.id]" :key="group.groupId"
            class="card overflow-hidden p-0">
            <div class="px-4 py-2.5 border-b border-muted flex items-center gap-2 bg-slate-50">
              <IconUsers class="w-3.5 h-3.5 text-primary"/>
              <span class="font-black text-slate-800 text-sm">{{ group.groupName || `Grupo ${group.groupId}` }}</span>
              <span class="text-[10px] text-slate-400 ml-auto">{{ group.standings?.length ?? 0 }} equipos</span>
            </div>
            <GroupTable :standings="group.standings || []" :advance-count="phase.advance_count || 1" :slug="selTournament?.slug" />
          </div>
          <p v-else class="text-center text-slate-400 py-10 text-sm col-span-2">Sin grupos generados aún</p>
        </div>

        <!-- ELIMINATORIA — bracket -->
        <div v-else-if="phase.type === 'knockout'" class="card overflow-hidden p-0">
          <div v-if="phaseData[phase.id]?.matches?.length">
            <BracketView
              :matches="phaseData[phase.id].matches"
              :rounds="phaseData[phase.id].rounds"
              :tournament-slug="selTournament?.slug" />
          </div>
          <p v-else class="text-center text-slate-400 py-10 text-sm">Sin partidos generados en este bracket</p>
        </div>

        <!-- Otro tipo — tabla genérica -->
        <div v-else class="card overflow-hidden p-0">
          <div v-if="phaseData[phase.id]?.length">
            <StandingsTable :standings="phaseData[phase.id]" :slug="selTournament?.slug" />
          </div>
          <p v-else class="text-center text-slate-400 py-10 text-sm">Sin datos para esta fase</p>
        </div>

      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import api from '@/api'
import StandingsTable from '@/components/StandingsTable/StandingsTable.vue'
import GroupTable     from '@/components/GroupTable/GroupTable.vue'
import BracketView    from '@/components/BracketView/BracketView.vue'

const tournaments  = ref([])
const categories   = ref([])
const phases       = ref([])
const phaseData    = reactive({})
const selTournament = ref(null)
const selCategory   = ref(null)
const loading       = ref(false)

async function onTournamentChange() {
  selCategory.value = null
  categories.value  = []
  phases.value      = []
  if (!selTournament.value) return
  try {
    const { data } = await api.get(`/tournaments/${selTournament.value.slug}/categories`)
    categories.value = data
    if (data.length === 1) { selCategory.value = data[0]; await loadResults() }
  } catch {}
}

async function loadResults() {
  if (!selTournament.value || !selCategory.value) return
  loading.value = true
  phases.value  = []
  try {
    const { data: phasesData } = await api.get(
      `/tournaments/${selTournament.value.slug}/phases?cat=${selCategory.value.id}`
    )
    phases.value = phasesData

    await Promise.all(phasesData.map(async (phase) => {
      try {
        if (phase.type === 'knockout') {
          const { data } = await api.get(`/phases/${phase.id}/matches`)
          phaseData[phase.id] = data
        } else {
          const { data } = await api.get(`/phases/${phase.id}/standings`)
          phaseData[phase.id] = data
        }
      } catch { phaseData[phase.id] = [] }
    }))
  } catch {} finally { loading.value = false }
}

function phaseLabel(type) {
  return { league: 'Liga', groups: 'Grupos', knockout: 'Eliminatoria', custom: 'Personalizada' }[type] ?? type
}
function phaseChipClass(type) {
  return {
    league:   'bg-blue-100 text-blue-700',
    groups:   'bg-purple-100 text-purple-700',
    knockout: 'bg-orange-100 text-orange-700',
    custom:   'bg-slate-100 text-slate-600',
  }[type] ?? 'bg-slate-100 text-slate-600'
}

async function init() {
  const { data } = await api.get('/tournaments')
  tournaments.value = data
  if (data.length) { selTournament.value = data[0]; await onTournamentChange() }
}
init()
</script>
