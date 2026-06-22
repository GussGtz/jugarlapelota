<template>
  <div>
    <CategorySelector :model-value="catId" @change="onCatChange" />

    <div class="max-w-5xl mx-auto px-3 md:px-4 py-6 space-y-10">

      <!-- ── Loading ─────────────────────────────────────────── -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-else>

        <!-- ══ Sin datos para esta categoría ══════════════════════ -->
        <div v-if="!hasCategoryData"
          class="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <IconClock class="w-12 h-12 text-slate-300"/>
          <p class="font-black text-slate-700 text-lg">Categoría en preparación</p>
          <p class="text-slate-400 text-sm max-w-xs">
            Aún no hay partidos jugados ni estadísticas disponibles para esta categoría.
            Los datos aparecerán conforme avance el torneo.
          </p>
        </div>

        <template v-else>

        <!-- ══════════════════════════════════════════════════════
             PODIO — 1° 2° 3° lugar
        ═════════════════════════════════════════════════════════ -->
        <section v-if="podio.length">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-1 h-6 bg-yellow-400 rounded-full"></div>
            <h2 class="text-lg font-extrabold text-slate-900">Clasificación Final</h2>
          </div>

          <!-- Podio visual -->
          <div class="flex items-end justify-center gap-4 mb-6">

            <!-- 2° lugar -->
            <div v-if="podio[1]"
              class="flex-1 max-w-[160px] flex flex-col items-center">
              <router-link :to="`/${slug}/equipo/${podio[1].id}`"
                class="w-16 h-16 rounded-full overflow-hidden border-4 border-slate-300 bg-slate-100 flex items-center justify-center mb-2 shadow hover:scale-105 transition-transform">
                <img v-if="podio[1].logo" :src="podio[1].logo" class="w-full h-full object-contain p-1" />
                <span v-else class="text-slate-500 font-black text-lg">{{ initials(podio[1].name) }}</span>
              </router-link>
              <p class="font-bold text-slate-800 text-sm text-center leading-tight truncate w-full text-center">{{ podio[1].name }}</p>
              <p v-if="podio[1].pts != null && !podio[1].fromBracket" class="text-xs text-slate-500 mt-0.5">{{ podio[1].pts }}pts</p>
              <p v-else-if="podio[1].fromBracket" class="text-xs text-slate-400 mt-0.5">Subcampeón</p>
              <div class="w-full mt-3 rounded-t-xl flex items-center justify-center py-4 font-black text-2xl"
                style="background:#94a3b8; color:white; height:80px">2°</div>
            </div>

            <!-- 1° lugar -->
            <div v-if="podio[0]"
              class="flex-1 max-w-[180px] flex flex-col items-center">
              <div class="relative">
                <router-link :to="`/${slug}/equipo/${podio[0].id}`"
                  class="w-20 h-20 rounded-full overflow-hidden border-4 bg-yellow-50 flex items-center justify-center mb-2 shadow-lg hover:scale-105 transition-transform"
                  style="border-color:#f59e0b">
                  <img v-if="podio[0].logo" :src="podio[0].logo" class="w-full h-full object-contain p-1" />
                  <span v-else class="text-yellow-600 font-black text-xl">{{ initials(podio[0].name) }}</span>
                </router-link>
                <span class="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow">
                  <IconTrophy class="w-3 h-3 text-white" />
                </span>
              </div>
              <p class="font-black text-slate-900 text-base text-center leading-tight truncate w-full text-center">{{ podio[0].name }}</p>
              <p v-if="podio[0].pts != null && !podio[0].fromBracket" class="text-xs text-yellow-600 font-bold mt-0.5">{{ podio[0].pts }}pts</p>
              <p v-else-if="podio[0].fromBracket" class="text-xs text-yellow-600 font-bold mt-0.5 flex items-center gap-1"><IconTrophy class="w-3 h-3"/> Campeón</p>
              <div class="w-full mt-3 rounded-t-xl flex items-center justify-center py-5 font-black text-3xl text-white shadow-md"
                style="background:linear-gradient(135deg,#f59e0b,#d97706); height:110px">1°</div>
            </div>

            <!-- 3° lugar -->
            <div v-if="podio[2]"
              class="flex-1 max-w-[160px] flex flex-col items-center">
              <router-link :to="`/${slug}/equipo/${podio[2].id}`"
                class="w-16 h-16 rounded-full overflow-hidden border-4 border-orange-300 bg-orange-50 flex items-center justify-center mb-2 shadow hover:scale-105 transition-transform">
                <img v-if="podio[2].logo" :src="podio[2].logo" class="w-full h-full object-contain p-1" />
                <span v-else class="text-orange-500 font-black text-lg">{{ initials(podio[2].name) }}</span>
              </router-link>
              <p class="font-bold text-slate-800 text-sm text-center leading-tight truncate w-full text-center">{{ podio[2].name }}</p>
              <p v-if="podio[2].pts != null && !podio[2].fromBracket" class="text-xs text-slate-500 mt-0.5">{{ podio[2].pts }}pts</p>
              <p v-else-if="podio[2].fromBracket" class="text-xs text-slate-400 mt-0.5">3er Lugar</p>
              <div class="w-full mt-3 rounded-t-xl flex items-center justify-center py-3 font-black text-2xl text-white"
                style="background:#d97706; height:60px">3°</div>
            </div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════
             RECONOCIMIENTOS DE EQUIPO
        ═════════════════════════════════════════════════════════ -->
        <!-- Solo mostrar reconocimientos si hay datos reales para ESTA categoría -->
        <section v-if="hasEnoughDataForRecognitions && (bestKeeper || bestTeam || displayAwards.length)">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-1 h-6 bg-primary rounded-full"></div>
            <h2 class="text-lg font-extrabold text-slate-900">Reconocimientos de Equipo</h2>
          </div>

          <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4">

            <!-- Mejor Portero (menos goles recibidos) -->
            <router-link v-if="bestKeeper" :to="`/${slug}/equipo/${bestKeeper.id}`"
              class="bg-white rounded-2xl border border-muted shadow-sm p-5 flex flex-col items-center text-center hover:shadow-md hover:border-sky-200 transition-all block">
              <div class="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-3">
                <IconShield class="w-6 h-6 text-sky-500" />
              </div>
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mejor Portero</p>

              <!-- Foto del portero (si existe) o logo del equipo -->
              <div class="w-14 h-14 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center mb-2 border-2 border-sky-200">
                <img v-if="bestKeeper.keeperPhoto" :src="bestKeeper.keeperPhoto" class="w-full h-full object-cover" />
                <img v-else-if="bestKeeper.logo" :src="bestKeeper.logo" class="w-full h-full object-contain p-1" />
                <span v-else class="font-black text-sky-600">{{ initials(bestKeeper.name) }}</span>
              </div>

              <!-- Nombre del portero (si está registrado) -->
              <p v-if="bestKeeper.keeperName" class="font-black text-slate-900 text-sm leading-tight">
                {{ bestKeeper.keeperName }}
              </p>
              <p v-else class="font-semibold text-slate-500 text-xs italic">Portero no registrado</p>

              <!-- Equipo -->
              <div class="flex items-center gap-1.5 mt-1 justify-center">
                <div class="w-4 h-4 rounded overflow-hidden bg-slate-100 shrink-0">
                  <img v-if="bestKeeper.logo" :src="bestKeeper.logo" class="w-full h-full object-contain" />
                </div>
                <p class="text-slate-500 text-xs font-semibold">{{ bestKeeper.name }}</p>
              </div>

              <p v-if="bestKeeper.description" class="text-sky-600 font-bold text-xs mt-2">{{ bestKeeper.description }}</p>
              <template v-else>
                <p class="text-sky-600 font-bold text-xs mt-2">{{ bestKeeper.goals_against }} goles recibidos</p>
                <p class="text-slate-400 text-[10px] mt-0.5">{{ bestKeeper.played }} PJ · Fase regular</p>
              </template>
            </router-link>

            <!-- Mejor Equipo / Campeón -->
            <router-link v-if="bestTeam" :to="`/${slug}/equipo/${bestTeam.id}`"
              class="rounded-2xl border shadow-sm p-5 flex flex-col items-center text-center hover:shadow-md transition-all block"
              :class="bestTeam.isChampion
                ? 'border-yellow-300 bg-gradient-to-b from-yellow-50 to-white hover:border-yellow-400'
                : 'border-muted bg-white hover:border-emerald-200'">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                :class="bestTeam.isChampion ? 'bg-yellow-50 border border-yellow-200' : 'bg-emerald-50 border border-emerald-100'">
                <IconTrophy class="w-6 h-6" :class="bestTeam.isChampion ? 'text-yellow-500' : 'text-emerald-500'" />
              </div>
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                {{ bestTeam.isChampion ? 'Campeón' : 'Mejor Equipo' }}
              </p>
              <div class="w-14 h-14 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center mb-2 border-2"
                :class="bestTeam.isChampion ? 'border-yellow-300' : 'border-emerald-200'">
                <img v-if="bestTeam.logo" :src="bestTeam.logo" class="w-full h-full object-contain p-1" />
                <span v-else class="font-black" :class="bestTeam.isChampion ? 'text-yellow-600' : 'text-emerald-600'">{{ initials(bestTeam.name) }}</span>
              </div>
              <p class="font-black text-slate-900 text-sm leading-tight">{{ bestTeam.name }}</p>
              <p v-if="bestTeam.description" class="text-xs text-yellow-600 font-semibold mt-1">{{ bestTeam.description }}</p>
              <div v-else-if="bestTeam.points != null" class="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span class="font-bold text-emerald-600">{{ bestTeam.points }}pts</span>
                <span>·</span>
                <span>{{ bestTeam.goals_for }}GF</span>
                <span>·</span>
                <span :class="(bestTeam.goals_for - bestTeam.goals_against) >= 0 ? 'text-emerald-500' : 'text-red-400'">
                  DG{{ (bestTeam.goals_for - bestTeam.goals_against) >= 0 ? '+' : '' }}{{ bestTeam.goals_for - bestTeam.goals_against }}
                </span>
              </div>
            </router-link>

            <!-- Awards del admin (filtrando best_team y best_keeper que ya se muestran arriba) -->
            <router-link v-for="award in displayAwards" :key="award.id"
              :to="award.player_id ? `/${slug}/jugador/${award.player_id}` : award.team_id ? `/${slug}/equipo/${award.team_id}` : `/${slug}/jugadores`"
              class="bg-white rounded-2xl border border-muted shadow-sm p-5 flex flex-col items-center text-center hover:shadow-md hover:border-yellow-200 transition-all block">
              <div class="w-12 h-12 rounded-2xl bg-yellow-50 border border-yellow-100 flex items-center justify-center mb-3">
                <IconMedal class="w-6 h-6 text-yellow-500" />
              </div>
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{{ awardLabel(award.type) }}</p>
              <div class="w-14 h-14 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center mb-2 border-2 border-yellow-200">
                <img v-if="award.playerPhoto" :src="award.playerPhoto" class="w-full h-full object-cover" />
                <img v-else-if="award.teamLogo" :src="award.teamLogo" class="w-full h-full object-contain p-1" />
                <IconUser v-else class="w-7 h-7 text-slate-400" />
              </div>
              <p class="font-black text-slate-900 text-sm leading-tight">{{ award.playerName || award.teamName || '—' }}</p>
            </router-link>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════
             ESTADÍSTICAS INDIVIDUALES
        ═════════════════════════════════════════════════════════ -->
        <section>
          <div class="flex items-center gap-3 mb-5">
            <div class="w-1 h-6 bg-accent rounded-full"></div>
            <h2 class="text-lg font-extrabold text-slate-900">Estadísticas Individuales</h2>
          </div>

          <!-- Tabs -->
          <div class="flex gap-2 flex-wrap mb-5">
            <button v-for="tab in tabs" :key="tab.key"
              @click="activeTab = tab.key"
              class="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-all font-semibold"
              :class="activeTab === tab.key
                ? 'bg-primary/10 border-primary text-primary shadow-sm'
                : 'border-muted text-slate-500 hover:text-slate-900 hover:border-slate-300 bg-white'">
              <component :is="tab.icon" class="w-3.5 h-3.5 shrink-0" />
              {{ tab.label }}
            </button>
            <select v-model="filterPos"
              class="ml-auto bg-white border border-muted rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
              <option value="">Todas las posiciones</option>
              <option v-for="pos in positions" :key="pos" :value="pos">{{ pos }}</option>
            </select>
          </div>

          <!-- Top 3 podium de jugadores -->
          <div v-if="top3Players.length" class="grid grid-cols-3 gap-3 mb-5">
            <div v-for="(p, i) in top3Players" :key="p.id"
              class="bg-white rounded-2xl border shadow-sm text-center py-4 px-3 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
              :class="i===0?'border-yellow-200 bg-yellow-50/50':i===1?'border-slate-200':'border-orange-200 bg-orange-50/30'"
              @click="$router.push(`/${slug}/jugador/${p.id}`)">
              <div class="relative w-12 h-12 rounded-full mx-auto mb-2 bg-slate-100 overflow-hidden border-2"
                :class="i===0?'border-yellow-400':i===1?'border-slate-300':'border-orange-400'">
                <img v-if="p.photo" :src="p.photo" class="w-full h-full object-cover" />
                <IconUser v-else class="w-7 h-7 text-slate-400 absolute inset-0 m-auto" />
                <span class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow"
                  :class="i===0?'bg-yellow-400':i===1?'bg-slate-400':'bg-amber-600'">{{ i+1 }}</span>
              </div>
              <p class="font-black text-slate-900 text-xs leading-tight truncate">{{ p.name }}</p>
              <p class="text-slate-400 text-[10px] truncate">{{ p.teamName }}</p>
              <p class="text-2xl font-black mt-1" :class="tabStatColor">{{ tabStatValue(p) }}</p>
              <p class="text-[10px] text-slate-400">{{ tabStatLabel }}</p>
            </div>
          </div>

          <!-- Tabla completa -->
          <div class="overflow-x-auto rounded-2xl border border-muted shadow-sm bg-white">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th class="py-3 px-3 text-left w-6">#</th>
                  <th class="py-3 px-3 text-left">Jugador</th>
                  <th class="py-3 px-3 text-left hidden sm:table-cell">Equipo</th>
                  <th class="py-3 px-3 text-center hidden sm:table-cell">PJ</th>
                  <th v-for="col in activeCols" :key="col.key"
                    class="py-3 px-3 text-center" :class="col.color">{{ col.header }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in filteredPlayers" :key="p.id"
                  class="border-t border-slate-50 hover:bg-primary/5 transition-colors cursor-pointer"
                  @click="$router.push(`/${slug}/jugador/${p.id}`)">
                  <td class="py-3 px-3 font-bold text-xs"
                    :class="i===0?'text-yellow-500':i===1?'text-slate-400':i===2?'text-orange-500':'text-slate-300'">
                    {{ i + 1 }}
                  </td>
                  <td class="py-3 px-3">
                    <div class="flex items-center gap-2.5">
                      <div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        <img v-if="p.photo" :src="p.photo" class="w-full h-full object-cover" />
                        <IconUser v-else class="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p class="font-semibold text-slate-900 text-xs leading-tight">{{ p.name }}</p>
                        <p v-if="p.number" class="text-[9px] text-slate-400">#{{ p.number }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-3 text-slate-500 text-xs hidden sm:table-cell">{{ p.teamName }}</td>
                  <td class="py-3 px-3 text-center text-slate-400 text-xs hidden sm:table-cell">{{ p.matches_played || 0 }}</td>
                  <td v-for="col in activeCols" :key="col.key"
                    class="py-3 px-3 text-center font-black" :class="col.color">
                    {{ p[col.key] || 0 }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="!filteredPlayers.length" class="text-center text-slate-400 text-sm py-10 italic">
              Sin datos para esta categoría
            </p>
          </div>

          <!-- Totales -->
          <div v-if="filteredPlayers.length" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div class="bg-white rounded-xl border border-muted px-4 py-3 text-center">
              <p class="text-2xl font-black text-accent">{{ totalGoals }}</p>
              <p class="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">Goles</p>
            </div>
            <div class="bg-white rounded-xl border border-muted px-4 py-3 text-center">
              <p class="text-2xl font-black text-primary">{{ totalAssists }}</p>
              <p class="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">Asistencias</p>
            </div>
            <div class="bg-white rounded-xl border border-muted px-4 py-3 text-center">
              <p class="text-2xl font-black text-yellow-500">{{ totalYellow }}</p>
              <p class="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">Amarillas</p>
            </div>
            <div class="bg-white rounded-xl border border-muted px-4 py-3 text-center">
              <p class="text-2xl font-black text-red-500">{{ totalRed }}</p>
              <p class="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">Rojas</p>
            </div>
          </div>
        </section>

        </template><!-- end v-else hasCategoryData -->

      </template><!-- end v-else !loading -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useTournament }      from '@/composables/useTournament'
import { useCategoriesStore } from '@/stores/categories'
import { onStandingsUpdate }  from '@/services/socket'
import api from '@/api'
import CategorySelector from '@/components/CategorySelector/CategorySelector.vue'

const { slug } = useTournament()
const cats     = useCategoriesStore()

const players    = ref([])
const awards     = ref([])
const standings  = ref([])
const loading    = ref(false)
const catId      = ref(null)
let   loadSeq    = 0
const activeTab  = ref('goals')
const filterPos  = ref('')

// ── Tabs de estadísticas ──────────────────────────────────────
const tabs = [
  { key: 'goals',    label: 'Goleadores',   icon: 'IconTarget' },
  { key: 'assists',  label: 'Asistidores',  icon: 'IconZap' },
  { key: 'combined', label: 'Participación',icon: 'IconBarChart2' },
  { key: 'cards',    label: 'Disciplina',   icon: 'IconFlag' },
]

const tabColsMap = {
  goals:    [{ key: 'goals',        header: 'Goles',    color: 'text-accent' }],
  assists:  [{ key: 'assists',      header: 'Asist.',   color: 'text-primary' }],
  combined: [
    { key: 'goals',    header: 'G',     color: 'text-accent' },
    { key: 'assists',  header: 'A',     color: 'text-primary' },
    { key: 'combined', header: 'G+A',   color: 'text-yellow-500' },
  ],
  cards: [
    { key: 'yellow_cards', header: 'Am', color: 'text-yellow-500' },
    { key: 'red_cards',    header: 'Rj', color: 'text-red-500' },
  ],
}

const activeCols  = computed(() => tabColsMap[activeTab.value] || [])
const sortKey     = computed(() => ({ goals:'goals', assists:'assists', combined:'combined', cards:'yellow_cards' })[activeTab.value])
const tabStatLabel = computed(() => ({ goals:'Goles', assists:'Asistencias', combined:'G+A', cards:'Amarillas' })[activeTab.value])
const tabStatColor = computed(() => ({ goals:'text-accent', assists:'text-primary', combined:'text-yellow-500', cards:'text-yellow-500' })[activeTab.value])
function tabStatValue(p) { return p[sortKey.value] || 0 }

const enriched = computed(() =>
  players.value.map(p => ({
    ...p,
    goals:        parseInt(p.goals||0),
    assists:      parseInt(p.assists||0),
    yellow_cards: parseInt(p.yellow_cards||0),
    red_cards:    parseInt(p.red_cards||0),
    matches_played: parseInt(p.matches_played||0),
    combined:     parseInt(p.goals||0) + parseInt(p.assists||0)
  }))
)
const positions = computed(() => [...new Set(enriched.value.map(p => p.position).filter(Boolean))].sort())
const filteredPlayers = computed(() => {
  let list = enriched.value
  if (filterPos.value) list = list.filter(p => p.position === filterPos.value)
  return [...list].sort((a, b) => (b[sortKey.value]||0) - (a[sortKey.value]||0))
})
const top3Players = computed(() => filteredPlayers.value.slice(0, 3).filter(p => tabStatValue(p) > 0))

const totalGoals   = computed(() => enriched.value.reduce((s,p) => s + parseInt(p.goals||0), 0))
const totalAssists = computed(() => enriched.value.reduce((s,p) => s + parseInt(p.assists||0), 0))
const totalYellow  = computed(() => enriched.value.reduce((s,p) => s + parseInt(p.yellow_cards||0), 0))
const totalRed     = computed(() => enriched.value.reduce((s,p) => s + parseInt(p.red_cards||0), 0))

// ── Reconocimientos de equipo (calculados desde standings) ────
const standingsWithPlayedMatches = computed(() =>
  standings.value.filter(s => (s.played || s.matchesPlayed || 0) > 0)
)

const bracketStandings = ref([])

// Podio — bracket results if available, else group standings
const podio = computed(() => {
  if (bracketStandings.value.length >= 2) return bracketStandings.value
  const rows = [...standingsWithPlayedMatches.value]
    .sort((a, b) =>
      (b.points - a.points) ||
      ((b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)) ||
      (b.goals_for - a.goals_for)
    )
  return rows.slice(0, 3).map(r => ({
    id:             r.team_id,
    name:           r.teamName,
    logo:           r.logo,
    pts:            r.points,
    played:         r.played,
    goals_for:      r.goals_for,
    goals_against:  r.goals_against,
  }))
})

// Mejor Portero — prioriza award del DB, sino calcula desde standings
const bestKeeper = computed(() => {
  const keeperAward = awards.value.find(a => a.type === 'best_keeper')
  if (keeperAward) {
    return {
      id:            keeperAward.team_id,
      name:          keeperAward.teamName,
      logo:          keeperAward.teamLogo,
      goals_against: null,
      played:        null,
      keeperName:    keeperAward.playerName || null,
      keeperPhoto:   keeperAward.playerPhoto || null,
      description:   keeperAward.description,
      fromAward:     true,
    }
  }
  // Fallback desde standings de grupos
  const rows = [...standingsWithPlayedMatches.value]
    .sort((a, b) => (a.goals_against - b.goals_against) || (b.played - a.played))
  if (!rows.length) return null
  const r = rows[0]
  const keeper = players.value.find(p =>
    p.team_id === r.team_id && p.position?.toLowerCase().includes('port')
  )
  return {
    id:            r.team_id,
    name:          r.teamName,
    logo:          r.logo,
    goals_against: r.goals_against,
    played:        r.played,
    keeperName:    keeper?.name || null,
    keeperPhoto:   keeper?.photo || null,
  }
})

// Mejor Equipo — si hay campeón de bracket, usar ese; sino el mejor de grupos
const bestTeam = computed(() => {
  // Preferir award auto-generado de tipo best_team (campeón del bracket)
  const bracketChampion = awards.value.find(a => a.type === 'best_team' && a.teamName)
  if (bracketChampion) {
    return {
      id:            bracketChampion.team_id,
      name:          bracketChampion.teamName,
      logo:          bracketChampion.teamLogo,
      points:        null,
      goals_for:     null,
      goals_against: null,
      played:        null,
      isChampion:    true,
      description:   bracketChampion.description
    }
  }
  // Fallback: mejor equipo por estadísticas de fase regular
  const rows = [...standingsWithPlayedMatches.value]
    .sort((a, b) => {
      const ratioA = a.played ? a.points / a.played : 0
      const ratioB = b.played ? b.points / b.played : 0
      return (ratioB - ratioA) ||
        ((b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)) ||
        (b.goals_for - a.goals_for)
    })
  if (!rows.length) return null
  const r = rows[0]
  return { id: r.team_id, name: r.teamName, logo: r.logo, points: r.points, goals_for: r.goals_for, goals_against: r.goals_against, played: r.played }
})

// Filtrar awards del DB para no duplicar best_team ni best_keeper (ya se muestran arriba)
const displayAwards = computed(() =>
  awards.value.filter(a => a.type !== 'best_team' && a.type !== 'best_keeper')
)

// ¿Tiene esta categoría datos suficientes para mostrar reconocimientos?
const hasEnoughDataForRecognitions = computed(() => {
  // Verificar que los awards del estado corresponden a la categoría actual
  const catNum = catId.value ? parseInt(catId.value) : null
  const relevantAwards = catNum
    ? awards.value.filter(a => !a.category_id || parseInt(a.category_id) === catNum)
    : awards.value
  return standingsWithPlayedMatches.value.length > 0 || relevantAwards.length > 0
})

// ¿Hay cualquier tipo de datos para mostrar en esta vista?
const hasCategoryData = computed(() =>
  players.value.length > 0 || hasEnoughDataForRecognitions.value
)

// ── Helpers ───────────────────────────────────────────────────
function initials(name) {
  if (!name) return '?'
  const p = name.trim().split(/\s+/)
  return p.length === 1 ? name.slice(0,2).toUpperCase() : (p[0][0]+p[1][0]).toUpperCase()
}

const awardLabels = { top_scorer:'Goleador', mvp:'MVP', best_keeper:'Mejor Portero', best_team:'Mejor Equipo', fair_play:'Fair Play' }
const awardLabel  = t => awardLabels[t] || t

// ── Carga ─────────────────────────────────────────────────────
async function load(id) {
  const seq = ++loadSeq
  loading.value        = true
  players.value        = []
  awards.value         = []
  standings.value      = []
  bracketStandings.value = []
  try {
    const [pl, aw, phases] = await Promise.all([
      api.get(`/tournaments/${slug.value}/players/phase-stats${id ? `?cat=${id}` : ''}`),
      api.get(`/tournaments/${slug.value}/awards${id ? `?cat=${id}` : ''}`).catch(() => ({ data: [] })),
      api.get(`/tournaments/${slug.value}/phases${id ? `?cat=${id}` : ''}`).catch(() => ({ data: [] })),
    ])
    if (seq !== loadSeq) return
    players.value = pl.data
    awards.value  = aw.data

    // Standings SOLO de fases groups/league de ESTA categoría (sin knockout, sin cruzar categorías)
    // Normalizar id a número (puede venir como string del selector)
    const catIdNum = id ? parseInt(id) : null
    const regularPhases = phases.data.filter(p =>
      (p.type === 'groups' || p.type === 'league') &&
      // Si se seleccionó una categoría, asegurar que la fase pertenece a ella (comparar como número)
      (!catIdNum || parseInt(p.category_id) === catIdNum)
    )
    const allStandings  = []
    for (const phase of regularPhases) {
      try {
        const { data: phaseStandings } = await api.get(`/phases/${phase.id}/standings`)
        if (Array.isArray(phaseStandings) && phaseStandings.length) {
          const first = phaseStandings[0]
          if (first?.standings) {
            // /phases/:id/standings con grupos → [{groupId, standings:[...]}]
            for (const grp of phaseStandings) allStandings.push(...(grp.standings || []))
          } else if (first?.standing) {
            // /phases/:id/groups → [{standing:[...]}]  (campo singular)
            for (const grp of phaseStandings) allStandings.push(...(grp.standing || []))
          } else if (first?.team_id) {
            // Array plano de equipos (fase liga)
            allStandings.push(...phaseStandings)
          }
        }
      } catch {}
    }

    // Deduplicar por team_id (si el equipo está en varios grupos, sumar stats)
    const map = {}
    for (const s of allStandings) {
      const tid = s.team_id
      if (!map[tid]) {
        map[tid] = { ...s }
      } else {
        // Sumar estadísticas de distintos grupos
        map[tid].points       = (map[tid].points || 0) + (s.points || 0)
        map[tid].played       = (map[tid].played || 0) + (s.played || 0)
        map[tid].won          = (map[tid].won || 0) + (s.won || 0)
        map[tid].drawn        = (map[tid].drawn || 0) + (s.drawn || 0)
        map[tid].lost         = (map[tid].lost || 0) + (s.lost || 0)
        map[tid].goals_for    = (map[tid].goals_for || 0) + (s.goals_for || 0)
        map[tid].goals_against= (map[tid].goals_against || 0) + (s.goals_against || 0)
      }
    }
    standings.value = Object.values(map)

    // Bracket standings SOLO de la categoría seleccionada — NO hacer fallback a otras
    bracketStandings.value = []
    // Solo fases knockout de ESTA categoría — comparación numérica
    const knockoutPhases = phases.data.filter(p =>
      p.type === 'knockout' &&
      (!catIdNum || parseInt(p.category_id) === catIdNum)
    )
    for (const kp of knockoutPhases) {
      try {
        const { data: kpData } = await api.get(`/phases/${kp.id}/matches`)
        const rounds  = kpData.rounds || []
        const matches = kpData.matches || []
        if (!rounds.length) continue

        const finalRound = rounds.find(r => /^final$/i.test(r.name))
        if (!finalRound) continue
        const finalMatch = matches.find(m => m.round_id === finalRound.id && m.status === 'finished')
        if (!finalMatch) continue

        const toEntry = (m, teamId) => {
          // home_team puede venir como number o string según el runtime; forzar comparación
          const tid = Number(teamId)
          const isHome = tid === Number(m.home_team)
          return {
            id:   tid,
            name: isHome ? (m.homeTeam || m.homeName) : (m.awayTeam || m.awayName),
            logo: isHome ? m.homeLogo : m.awayLogo,
            pts:  0,
            fromBracket: true
          }
        }

        const hScore = Number(finalMatch.home_score ?? 0)
        const aScore = Number(finalMatch.away_score ?? 0)
        const championId = hScore > aScore ? finalMatch.home_team : aScore > hScore ? finalMatch.away_team : null
        const runnerUpId = hScore > aScore ? finalMatch.away_team : aScore > hScore ? finalMatch.home_team : null
        if (!championId || !runnerUpId) continue
        const champion   = toEntry(finalMatch, championId)
        const runnerUp   = toEntry(finalMatch, runnerUpId)
        let thirdPlace   = null

        const tercerRound = rounds.find(r => /tercer/i.test(r.name))
        if (tercerRound) {
          const tercerMatch = matches.find(m => m.round_id === tercerRound.id && m.status === 'finished')
          if (tercerMatch) {
            const thirdId = tercerMatch.home_score > tercerMatch.away_score ? tercerMatch.home_team : tercerMatch.away_team
            thirdPlace = toEntry(tercerMatch, thirdId)
          }
        } else {
          const orderedBeforeFinal = rounds
            .filter(r => r.order_index < finalRound.order_index && !/tercer/i.test(r.name))
            .sort((a, b) => b.order_index - a.order_index)
          const semiRound = orderedBeforeFinal[0]
          if (semiRound) {
            const losers = matches
              .filter(m => m.round_id === semiRound.id && m.status === 'finished')
              .map(m => {
                const loserId = m.home_score > m.away_score ? m.away_team : m.home_team
                return toEntry(m, loserId)
              })
            if (losers.length) thirdPlace = losers[0]
          }
        }

        bracketStandings.value = [champion, runnerUp, thirdPlace].filter(Boolean)
        break
      } catch {}
    }
  } catch (e) {
    console.error(e)
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function onCatChange(cat) { catId.value = cat.id; load(cat.id) }

// ── Socket: recargar cuando termina un partido (standings, awards, bracket) ──
let cleanupStandings = null
const { tournament } = useTournament()
watch([catId, tournament], ([id, t]) => {
  cleanupStandings?.()
  if (!id || !t?.id) return
  cleanupStandings = onStandingsUpdate(t.id, id, () => load(id))
}, { immediate: true })
onUnmounted(() => cleanupStandings?.())
</script>
