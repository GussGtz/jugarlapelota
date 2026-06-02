<template>
  <div>

    <CategorySelector :model-value="catId" @change="onCatChange" />

    <section class="py-12 md:py-16" style="background:#F7F9FC">
      <div class="max-w-5xl mx-auto px-4">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-1 h-6 bg-primary rounded-full"></div>
          <h2 class="section-title">
            {{ cats.selected?.name }}
            <span class="text-base font-normal text-slate-500 ml-2">— Posiciones</span>
          </h2>
        </div>

        <div v-if="loading" class="skeleton rounded-2xl h-64"></div>
        <div v-else class="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <StandingsTable :standings="standings" :slug="slug" />
        </div>
        <p v-if="!loading && !standings.length" class="text-center text-slate-400 py-12">
          Sin equipos registrados en esta categoría.
        </p>

        <div v-if="standings.length" class="text-center mt-6">
          <router-link :to="`/${slug}/fixture`"
            class="inline-flex items-center gap-2 btn-ghost text-sm">
            <IconShuffle class="w-4 h-4" /> Ver Fixture Completo
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useTournament } from '@/composables/useTournament'
import { useCategoriesStore } from '@/stores/categories'
import { onStandingsUpdate } from '@/services/socket'
import api from '@/api'
import CategorySelector from '@/components/CategorySelector/CategorySelector.vue'
import StandingsTable from '@/components/StandingsTable/StandingsTable.vue'

const { slug } = useTournament()
const cats     = useCategoriesStore()
const standings = ref([])
const loading   = ref(false)
const catId     = ref(null)

async function load(id) {
  if (!id || !slug.value) return
  loading.value = true
  try {
    // Fetch phases for this category and pull standings from the first league phase
    const phasesRes = await api.get(`/tournaments/${slug.value}/phases?cat=${id}`)
    const leaguePhase = phasesRes.data.find(p => p.type === 'league' || p.type === 'groups')
    if (leaguePhase) {
      const stdRes = await api.get(`/phases/${leaguePhase.id}/standings`)
      // /phases/:id/standings for groups returns [{groupId, standings:[...]}]
      // for league returns flat array
      const raw = stdRes.data
      if (Array.isArray(raw) && raw.length && raw[0]?.standings) {
        standings.value = raw.flatMap(g => g.standings || [])
      } else {
        standings.value = raw
      }
    } else {
      // Fallback for tournaments without explicit phases
      const { data } = await api.get(`/tournaments/${slug.value}/standings?cat=${id}`)
      standings.value = data
    }
  } catch {} finally { loading.value = false }
}

function onCatChange(cat) { catId.value = cat.id; load(cat.id) }

watch(() => cats.selected, cat => { if (cat) { catId.value = cat.id; load(cat.id) } }, { immediate: true })

// ── Socket: recargar standings automáticamente cuando cambian ────
const { tournament } = useTournament()
let cleanupStandings = null
watch([catId, tournament], ([id, t]) => {
  cleanupStandings?.()
  if (!id || !t?.id) return
  cleanupStandings = onStandingsUpdate(t.id, id, () => load(id))
}, { immediate: true })
onUnmounted(() => cleanupStandings?.())
</script>
