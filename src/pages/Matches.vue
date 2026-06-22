<template>
  <div>

    <!-- ─── Selector de categoría ─────────────────────────────── -->
    <CategorySelector :model-value="catId" @change="onCatChange" />

    <!-- ─── Tabs de fase (sticky bajo la navbar) ──────────────── -->
    <div v-if="phases.list.length > 1"
      class="bg-white border-b border-muted sticky top-12 md:top-16 z-30">
      <div class="max-w-7xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
        <button v-for="phase in phases.list" :key="phase.id"
          @click="selectPhase(phase)"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 border"
          :class="phases.current?.id === phase.id
            ? 'bg-primary text-white border-primary shadow-sm'
            : 'text-slate-600 hover:text-primary hover:border-primary/30 border-muted'">
          <IconUsers         v-if="phase.type==='groups'"   class="w-3.5 h-3.5" />
          <IconTrophy        v-else-if="phase.type==='knockout'" class="w-3.5 h-3.5" />
          <IconClipboardList v-else                          class="w-3.5 h-3.5" />
          {{ phase.name }}
        </button>
      </div>
    </div>

    <!-- ─── Loading ───────────────────────────────────────────── -->
    <div v-if="loading" class="flex justify-center py-24">
      <div class="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>

    <template v-else>

      <!-- ─── EN VIVO ────────────────────────────────────────── -->
      <div v-if="liveMatches.length" class="max-w-7xl mx-auto px-4 pt-6 pb-2">
        <div class="flex items-center gap-3 mb-4">
          <span class="inline-flex items-center gap-2 bg-red-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full animate-pulse shadow-md shadow-red-100">
            <IconCircle class="w-2.5 h-2.5 fill-white" /> En Vivo
          </span>
        </div>
        <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <MatchCard v-for="m in liveMatches" :key="m.id" :match="m" :tournament-slug="slug" />
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════
           FASE DE GRUPOS
      ═══════════════════════════════════════════════════════ -->
      <template v-if="phaseType === 'groups'">
        <div class="max-w-7xl mx-auto px-4 py-6 space-y-10">

          <!-- Clasificaciones por grupo -->
          <section>
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-3">
                <div class="w-1 h-6 bg-primary rounded-full"></div>
                <h2 class="text-lg font-extrabold text-slate-900">Clasificación</h2>
                <span class="text-xs text-slate-400">{{ groups.length }} {{ groups.length === 1 ? 'grupo' : 'grupos' }}</span>
              </div>
            </div>

            <div class="grid gap-5" :class="groupsGridClass(groups.length)">
              <div v-for="group in groups" :key="group.id"
                class="bg-white rounded-2xl border border-muted shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3.5"
                  style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)">
                  <div>
                    <h3 class="font-black text-white text-sm">{{ group.name }}</h3>
                    <p class="text-white/40 text-[10px] mt-0.5">{{ group.standing?.length || 0 }} equipos</p>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[9px] text-white/40 uppercase tracking-wider">Clasifican</span>
                    <div v-for="n in (group.advance_count || 1)" :key="n"
                      class="w-2 h-2 rounded-full"
                      :style="{ background: n===1 ? '#10b981' : '#0ea5e9' }"></div>
                    <span class="text-white font-black text-sm ml-0.5">{{ group.advance_count || 1 }}</span>
                  </div>
                </div>
                <GroupTable :standings="group.standing || []" :advance-count="group.advance_count || 1" :slug="slug" />
                <details v-if="groupMatchMap[group.id]?.length" class="border-t border-slate-100">
                  <summary class="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none
                    hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors">
                    <span>Partidos ({{ groupMatchMap[group.id].length }})</span>
                    <span class="text-slate-300 text-sm">▾</span>
                  </summary>
                  <div class="divide-y divide-slate-50 bg-white">
                    <div v-for="m in groupMatchMap[group.id]" :key="m.id"
                      @click="$router.push(`/${slug}/partido/${m.id}`)"
                      class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors text-xs">
                      <div class="flex items-center gap-2 min-w-0 justify-end">
                        <span class="font-semibold text-slate-800 truncate text-right">{{ m.homeTeam }}</span>
                        <span class="w-1.5 h-1.5 rounded-full shrink-0"
                          :class="m.status==='finished'?'bg-emerald-400':m.status==='live'?'bg-red-500 animate-pulse':'bg-slate-200'"/>
                      </div>
                      <span class="font-black text-center shrink-0 px-1 tabular-nums"
                        :class="m.status==='live'?'text-red-500':m.status==='finished'?'text-slate-900':'text-slate-300'">
                        <template v-if="m.status!=='scheduled'">{{ m.home_score }}–{{ m.away_score }}</template>
                        <template v-else>vs</template>
                      </span>
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-1.5 h-1.5 rounded-full shrink-0"
                          :class="m.status==='finished'?'bg-emerald-400':m.status==='live'?'bg-red-500 animate-pulse':'bg-slate-200'"/>
                        <span class="font-semibold text-slate-800 truncate">{{ m.awayTeam }}</span>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </section>

          <!-- Sin grupos: tabla liga general -->
          <section v-if="!groups.length && leagueStandings.length">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-1 h-6 bg-primary rounded-full"></div>
              <h2 class="text-lg font-extrabold text-slate-900">Clasificación</h2>
            </div>
            <div class="bg-white rounded-2xl border border-muted shadow-sm overflow-hidden">
              <StandingsTable :standings="leagueStandings" :slug="slug" />
            </div>
          </section>

          <!-- Secciones compartidas: Hoy / Próximos / Resultados -->
          <SharedMatchSections :today="todayMatches" :upcoming="upcomingPhaseMatches"
            :finished="finishedMatches" :slug="slug" />
        </div>
      </template>

      <!-- ══════════════════════════════════════════════════════
           FASE ELIMINATORIA (KNOCKOUT)
      ═══════════════════════════════════════════════════════ -->
      <template v-else-if="phaseType === 'knockout'">
        <div class="max-w-7xl mx-auto px-4 py-6 space-y-8">

          <!-- Header + toggle -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-1 h-6 bg-amber-500 rounded-full"></div>
              <h2 class="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <IconTrophy class="w-5 h-5 text-amber-500" />
                {{ phases.current?.name || 'Eliminatoria' }}
              </h2>
            </div>
            <div class="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
              <button @click="koView='bracket'"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                :class="koView==='bracket'?'bg-white text-primary shadow-sm':'text-slate-500 hover:text-slate-700'">
                <IconTrophy class="w-3.5 h-3.5" /> Bracket
              </button>
              <button @click="koView='list'"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                :class="koView==='list'?'bg-white text-primary shadow-sm':'text-slate-500 hover:text-slate-700'">
                <IconClipboardList class="w-3.5 h-3.5" /> Rondas
              </button>
            </div>
          </div>

          <!-- Vista Bracket -->
          <BracketView v-if="koView==='bracket'"
            :matches="phaseMatches" :rounds="currentRounds" :tournament-slug="slug" />

          <!-- Vista Rondas (lista) -->
          <div v-else class="space-y-8">
            <div v-for="round in currentRounds" :key="round.id">
              <div class="flex items-center gap-2 mb-4">
                <span class="w-1 h-4 bg-amber-400 rounded-full"></span>
                <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide">{{ round.name }}</h3>
                <span class="text-xs text-slate-400">{{ matchesByRound(round.id).length }} partido{{ matchesByRound(round.id).length!==1?'s':'' }}</span>
              </div>
              <div class="grid sm:grid-cols-2 gap-4">
                <MatchCard v-for="m in matchesByRound(round.id)" :key="m.id" :match="m" :tournament-slug="slug" />
              </div>
              <p v-if="!matchesByRound(round.id).length" class="text-xs text-slate-400 italic pl-3">En espera de clasificados...</p>
            </div>
            <p v-if="!currentRounds.length" class="text-center text-slate-400 py-12 text-sm">Sin rondas generadas aún.</p>
          </div>

          <!-- Secciones compartidas: Hoy / Próximos / Resultados -->
          <SharedMatchSections :today="todayMatches" :upcoming="upcomingPhaseMatches"
            :finished="finishedMatches" :slug="slug" />
        </div>
      </template>

      <!-- ══════════════════════════════════════════════════════
           FASE LIGA (LEAGUE)
      ═══════════════════════════════════════════════════════ -->
      <template v-else-if="phaseType === 'league'">
        <div class="max-w-7xl mx-auto px-4 py-6 space-y-10">

          <!-- Tabla de posiciones -->
          <section v-if="leagueStandings.length">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-1 h-6 bg-primary rounded-full"></div>
              <h2 class="text-lg font-extrabold text-slate-900">Clasificación</h2>
            </div>
            <div class="bg-white rounded-2xl border border-muted shadow-sm overflow-hidden">
              <StandingsTable :standings="leagueStandings" :slug="slug" />
            </div>
          </section>

          <!-- Secciones compartidas: Hoy / Próximos / Resultados por jornada -->
          <SharedMatchSections :today="todayMatches" :upcoming="upcomingPhaseMatches"
            :finished="finishedMatches" :slug="slug"
            :rounds="currentRounds" :matches-by-round="matchesByRound" />
        </div>
      </template>

      <!-- ─── Sin fase: partidos sueltos ───────────────────────── -->
      <template v-else-if="!phaseType">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <SharedMatchSections :today="todayMatches" :upcoming="upcomingPhaseMatches"
            :finished="finishedMatches" :slug="slug" />
        </div>
      </template>

      <!-- ─── Empty state ──────────────────────────────────────── -->
      <div v-if="!loading && !todayMatches.length && !upcomingPhaseMatches.length && !finishedMatches.length && !liveMatches.length && !groups.length && !leagueStandings.length && !currentRounds.length"
        class="py-24 text-center text-slate-400">
        <IconCircleDot class="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p class="text-lg font-semibold">Sin información para esta categoría</p>
        <p class="text-sm mt-1 opacity-60">Los partidos y clasificaciones aparecerán aquí</p>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTournament }      from '@/composables/useTournament'
import { useCategoriesStore } from '@/stores/categories'
import { usePhasesStore }     from '@/stores/phases'
import { onTournamentMatch }  from '@/services/socket'
import api from '@/api'
import CategorySelector    from '@/components/CategorySelector/CategorySelector.vue'
import MatchCard           from '@/components/MatchCard/MatchCard.vue'
import GroupTable          from '@/components/GroupTable/GroupTable.vue'
import StandingsTable      from '@/components/StandingsTable/StandingsTable.vue'
import BracketView         from '@/components/BracketView/BracketView.vue'
import SharedMatchSections from '@/components/SharedMatchSections/SharedMatchSections.vue'

const { slug } = useTournament()
const cats     = useCategoriesStore()
const phases   = usePhasesStore()
const router   = useRouter()

const allMatches      = ref([])   // todos los partidos de la categoría
const phaseMatches    = ref([])   // partidos de la fase activa
const groups          = ref([])
const leagueStandings = ref([])
const loading         = ref(false)
const catId           = ref(null)
const koView          = ref('bracket')  // 'bracket' | 'list'
let   loadSeq         = 0  // race-condition guard

// ── Tipo de la fase activa ─────────────────────────────────────
const phaseType = computed(() => phases.current?.type || null)

// ── Rondas de la fase activa ───────────────────────────────────
const currentRounds = computed(() => phases.current?.rounds || [])

// ── Partidos en vivo (de TODOS los partidos de la categoría) ──
const liveMatches = computed(() =>
  allMatches.value.filter(m => m.status === 'live')
)

// ── Helper: fecha local YYYY-MM-DD del partido ────────────────
function matchDay(m) {
  if (!m.date) return null
  return m.date.slice(0, 10)   // '2026-06-01T18:00' → '2026-06-01'
}
const todayStr = new Date().toLocaleDateString('sv-SE') // 'YYYY-MM-DD'

// ── Pool base: fase activa + sin-fase (toda la categoría)  ────
const scheduledAll = computed(() => {
  const ids = new Set(phaseMatches.value.map(m => m.id))
  const extra = allMatches.value.filter(m => m.status === 'scheduled' && !ids.has(m.id))
  const base  = phaseMatches.value.filter(m => m.status === 'scheduled')
  return [...base, ...extra].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(a.date) - new Date(b.date)
  })
})

// Partidos de HOY (fecha de hoy, status scheduled o live)
const todayMatches = computed(() =>
  allMatches.value.filter(m =>
    (m.status === 'scheduled' || m.status === 'live') && matchDay(m) === todayStr
  ).sort((a, b) => (!a.date || !b.date) ? 0 : new Date(a.date) - new Date(b.date))
)

// Próximos (fecha futura, excluye hoy)
const upcomingPhaseMatches = computed(() =>
  scheduledAll.value.filter(m => !matchDay(m) || matchDay(m) > todayStr)
)

// Finalizados: de la fase activa + sin-fase, más recientes primero
const finishedMatches = computed(() => {
  const ids = new Set(phaseMatches.value.map(m => m.id))
  const extra = allMatches.value.filter(m => m.status === 'finished' && !ids.has(m.id))
  const base  = phaseMatches.value.filter(m => m.status === 'finished')
  return [...base, ...extra].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return -1
    if (!b.date) return 1
    return new Date(b.date) - new Date(a.date)
  })
})

// ── Partidos por ronda ─────────────────────────────────────────
function matchesByRound(rid) {
  return phaseMatches.value.filter(m => m.round_id === rid)
}

// ── Mapa grupo_id → partidos ──────────────────────────────────
const groupMatchMap = computed(() => {
  const map = {}
  for (const m of phaseMatches.value) {
    if (m.group_id) {
      if (!map[m.group_id]) map[m.group_id] = []
      map[m.group_id].push(m)
    }
  }
  return map
})

// ── Grid adaptable por número de grupos ───────────────────────
function groupsGridClass(n) {
  if (n <= 2) return 'md:grid-cols-2'
  if (n <= 3) return 'md:grid-cols-3'
  if (n <= 4) return 'md:grid-cols-2 lg:grid-cols-4'
  if (n <= 6) return 'md:grid-cols-2 lg:grid-cols-3'
  return 'md:grid-cols-2 lg:grid-cols-4'
}

// ── Cargar datos para la fase activa ──────────────────────────
async function loadPhaseData() {
  if (!slug.value || !catId.value) return
  const seq = ++loadSeq
  loading.value = true
  allMatches.value      = []
  phaseMatches.value    = []
  groups.value          = []
  leagueStandings.value = []
  try {
    const allRes = await api.get(`/tournaments/${slug.value}/matches?cat=${catId.value}`)
    if (seq !== loadSeq) return  // stale response, discard

    allMatches.value = allRes.data

    if (!phases.current) return

    const phaseId = phases.current.id
    const matchRes = await api.get(`/tournaments/${slug.value}/matches?phase=${phaseId}`)
    if (seq !== loadSeq) return

    phaseMatches.value = matchRes.data

    if (phaseType.value === 'groups') {
      const grpRes = await api.get(`/phases/${phaseId}/groups`)
      if (seq !== loadSeq) return
      if (grpRes.data.length) {
        groups.value = grpRes.data
      } else {
        const stdRes = await api.get(`/phases/${phaseId}/standings`)
        if (seq !== loadSeq) return
        leagueStandings.value = stdRes.data
      }
    } else if (phaseType.value === 'league') {
      const stdRes = await api.get(`/phases/${phaseId}/standings`)
      if (seq !== loadSeq) return
      leagueStandings.value = stdRes.data
    }
  } catch (e) {
    console.error(e)
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

async function selectPhase(phase) {
  phases.current = phase
  koView.value   = 'bracket'
  await loadPhaseData()
}

async function onCatChange(cat) {
  catId.value = cat.id
  phases.reset()
  await phases.fetchByTournament(slug.value, cat.id)
  await loadPhaseData()
}

// ── Socket: actualizar partidos en tiempo real ───────────────────
let cleanupSocket = null
watch(slug, (s) => {
  cleanupSocket?.()
  if (!s) return
  // Obtener tournament_id desde el primer partido cargado o esperar
  const unwatch = watch(allMatches, (list) => {
    if (!list.length) return
    const tid = list[0]?.tournament_id
    if (!tid) return
    unwatch()
    cleanupSocket = onTournamentMatch(tid, (updated) => {
      // Actualizar en allMatches
      const ai = allMatches.value.findIndex(m => m.id === updated.id)
      if (ai >= 0) allMatches.value[ai] = { ...allMatches.value[ai], ...updated }
      // Actualizar en phaseMatches
      const pi = phaseMatches.value.findIndex(m => m.id === updated.id)
      if (pi >= 0) phaseMatches.value[pi] = { ...phaseMatches.value[pi], ...updated }
    })
  }, { immediate: true })
}, { immediate: true })

onUnmounted(() => cleanupSocket?.())
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
