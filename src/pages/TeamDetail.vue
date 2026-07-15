<template>
  <div class="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8 space-y-6">

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-4">
      <div class="animate-pulse bg-slate-200 h-32 rounded-2xl"></div>
      <div class="animate-pulse bg-slate-200 h-24 rounded-2xl"></div>
    </div>

    <template v-else-if="profile">

      <!-- Hero Card -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="h-20 md:h-28" :style="{ background: `linear-gradient(135deg, ${teamColor}22, ${teamColor}44)` }"></div>
        <div class="px-4 md:px-6 pb-5 -mt-10 flex items-end gap-4">
          <div class="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-3xl font-black text-white flex-shrink-0"
            :style="{ background: teamColor }">
            <img v-if="profile.team.logo" :src="profile.team.logo" class="w-full h-full object-contain rounded-xl" />
            <template v-else>{{ teamInitials }}</template>
          </div>
          <div class="pb-1 flex-1 min-w-0">
            <h1 class="text-2xl md:text-3xl font-black text-slate-900 truncate">{{ profile.team.name }}</h1>
            <div class="flex flex-wrap gap-2 mt-2">
              <!-- Categoría activa -->
              <span class="text-xs bg-primary text-white font-bold px-2.5 py-1 rounded-full">
                {{ profile.team.categoryName || 'Sin categoría' }}
              </span>
              <!-- Otras categorías del mismo equipo -->
              <router-link
                v-for="t in sameNameTeams" :key="t.id"
                :to="`/${slug}/equipo/${t.id}`"
                class="text-xs bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary font-semibold px-2.5 py-1 rounded-full transition-colors border border-transparent hover:border-primary/20">
                {{ t.categoryName || 'Otra categoría' }}
              </router-link>
              <span v-if="profile.team.tournamentName" class="text-xs text-slate-400 flex items-center gap-1 ml-1">
                <IconTrophy class="w-3 h-3" /> {{ profile.team.tournamentName }}
              </span>
            </div>
          </div>
          <!-- Follow button -->
          <button @click="toggleFollow"
            class="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all border"
            :class="isFollowed
              ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
              : 'bg-white border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'">
            <IconHeart class="w-4 h-4" :class="isFollowed ? 'fill-red-400 text-red-400' : ''" />
            <span class="hidden sm:inline">{{ isFollowed ? 'Siguiendo' : 'Seguir' }}</span>
          </button>
        </div>

        <!-- Quick info row -->
        <div class="grid grid-cols-2 sm:grid-cols-5 border-t border-slate-100">
          <div v-if="profile.team.coach" class="flex items-center gap-2 px-4 py-3 border-r border-slate-100">
            <IconUser class="w-4 h-4 text-slate-400 shrink-0" />
            <div class="min-w-0">
              <p class="text-[10px] text-slate-400 uppercase tracking-wide">DT</p>
              <p class="text-sm font-semibold text-slate-900 truncate">{{ profile.team.coach }}</p>
            </div>
          </div>
          <div v-if="profile.team.captain" class="flex items-center gap-2 px-4 py-3 border-r border-slate-100">
            <IconStar class="w-4 h-4 text-yellow-500 shrink-0" />
            <div class="min-w-0">
              <p class="text-[10px] text-slate-400 uppercase tracking-wide">Capitán</p>
              <p class="text-sm font-semibold text-slate-900 truncate">{{ profile.team.captain }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 px-4 py-3 border-r border-slate-100 min-w-0">
            <IconUsers class="w-4 h-4 text-slate-400 shrink-0" />
            <div class="min-w-0">
              <p class="text-[10px] text-slate-400 uppercase tracking-wide truncate">Jugadores</p>
              <p class="text-sm font-semibold text-slate-900 truncate">{{ profile.players.length }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 px-4 py-3 border-r border-slate-100 min-w-0">
            <IconCircleDot class="w-4 h-4 text-slate-400 shrink-0" />
            <div class="min-w-0">
              <p class="text-[10px] text-slate-400 uppercase tracking-wide truncate">Partidos</p>
              <p class="text-sm font-semibold text-slate-900 truncate">{{ profile.stats.matchesPlayed }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 px-4 py-3 min-w-0">
            <IconHeart class="w-4 h-4 text-red-400 shrink-0" />
            <div class="min-w-0">
              <p class="text-[10px] text-slate-400 uppercase tracking-wide truncate">Seguidores</p>
              <p class="text-sm font-semibold text-slate-900 truncate">{{ profile.stats.followerCount }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Live match banner -->
      <div v-if="profile.liveMatch" class="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
        <span class="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0"></span>
        <div class="flex-1">
          <p class="text-sm font-bold text-red-700">¡Jugando ahora!</p>
          <p class="text-xs text-red-500">{{ profile.liveMatch.homeTeam }} {{ profile.liveMatch.home_score }} - {{ profile.liveMatch.away_score }} {{ profile.liveMatch.awayTeam }}</p>
        </div>
        <router-link :to="`/${slug}/partido/${profile.liveMatch.id}`" class="text-xs text-red-600 font-bold border border-red-300 px-3 py-1.5 rounded-lg">Ver</router-link>
      </div>

      <!-- Stats grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center">
          <p class="text-2xl md:text-3xl font-black text-emerald-500">{{ profile.stats.wins }}</p>
          <p class="text-[10px] text-slate-400 mt-0.5 font-medium">Victorias</p>
        </div>
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center">
          <p class="text-2xl md:text-3xl font-black text-slate-400">{{ profile.stats.draws }}</p>
          <p class="text-[10px] text-slate-400 mt-0.5 font-medium">Empates</p>
        </div>
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center">
          <p class="text-2xl md:text-3xl font-black text-red-400">{{ profile.stats.losses }}</p>
          <p class="text-[10px] text-slate-400 mt-0.5 font-medium">Derrotas</p>
        </div>
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center">
          <p class="text-2xl md:text-3xl font-black text-primary">{{ profile.stats.totalGoals }}</p>
          <p class="text-[10px] text-slate-400 mt-0.5 font-medium">Goles</p>
        </div>
      </div>

      <!-- Standings positions -->
      <div v-if="profile.standings.length" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <IconClipboardList class="w-4 h-4 text-primary" />
          <h2 class="font-bold text-slate-900 text-sm">Posición en tabla</h2>
        </div>
        <div class="divide-y divide-slate-100">
          <div v-for="s in profile.standings" :key="s.id" class="px-4 py-3 flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-slate-700 truncate">{{ s.phaseName }}</p>
              <p v-if="s.groupName" class="text-[10px] text-slate-400">{{ s.groupName }}</p>
            </div>
            <div class="flex items-center gap-3 text-sm shrink-0">
              <span class="text-slate-500">{{ s.played }}PJ</span>
              <span class="font-black text-primary text-base">{{ s.points }}pts</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs: Plantilla / Partidos / Premios -->
      <div>
        <div class="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1">
          <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
            class="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
            :class="activeTab === tab.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500'">
            <component :is="tab.icon" class="w-3.5 h-3.5 shrink-0" />
            {{ tab.label }}
          </button>
        </div>

        <!-- Plantilla -->
        <div v-if="activeTab === 'squad'" class="grid sm:grid-cols-2 gap-2">
          <div v-for="p in profile.players" :key="p.id"
            class="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-3 hover:border-primary/30 transition-colors cursor-pointer min-w-0"
            @click="$router.push(`/${slug}/jugador/${p.id}`)">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
              :style="{ background: teamColor }">
              <img v-if="p.photo" :src="p.photo" class="w-full h-full object-cover rounded-full" />
              <template v-else>{{ p.number || '?' }}</template>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-slate-900 text-sm truncate">{{ p.name }}</p>
              <p class="text-[11px] text-slate-400">{{ p.position || '—' }}</p>
            </div>
            <div class="flex gap-2 text-xs shrink-0 items-center">
              <span class="font-bold text-primary flex items-center gap-0.5">{{ p.goals }}<IconTarget class="w-3 h-3" /></span>
              <span class="text-yellow-500 flex items-center gap-0.5">{{ p.yellow_cards }}<span class="inline-block w-2 h-2.5 rounded-sm bg-yellow-400"></span></span>
            </div>
          </div>
          <p v-if="!profile.players.length" class="col-span-2 text-center text-slate-400 py-8">Sin jugadores registrados.</p>
        </div>

        <!-- Partidos -->
        <div v-if="activeTab === 'matches'" class="space-y-3">
          <div v-if="profile.upcomingMatches.length">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Próximos</h3>
            <MatchCard v-for="m in profile.upcomingMatches" :key="m.id" :match="m" :tournament-slug="slug" />
          </div>
          <div v-if="profile.recentMatches.length">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4 px-1">Últimos resultados</h3>
            <MatchCard v-for="m in profile.recentMatches" :key="m.id" :match="m" :tournament-slug="slug" />
          </div>
          <p v-if="!profile.recentMatches.length && !profile.upcomingMatches.length"
            class="text-center text-slate-400 py-8">Sin partidos registrados.</p>
        </div>

        <!-- Premios -->
        <div v-if="activeTab === 'awards'">
          <div v-if="profile.awards.length" class="grid grid-cols-2 gap-3">
            <div v-for="a in profile.awards" :key="a.id"
              class="bg-white rounded-2xl border border-yellow-200 shadow-sm p-4 text-center">
              <IconTrophy class="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p class="text-xs font-bold text-slate-600 uppercase tracking-wide">{{ awardLabel(a.type) }}</p>
              <p class="text-sm font-black text-slate-900 mt-1">{{ a.playerName || profile.team.name }}</p>
            </div>
          </div>
          <p v-else class="text-center text-slate-400 py-8">Sin premios registrados.</p>
        </div>
      </div>

    </template>

    <div v-else class="text-center text-slate-400 py-16">Equipo no encontrado.</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import MatchCard from '@/components/MatchCard/MatchCard.vue'
import { useFollowingStore } from '@/stores/following'
import { useAuthStore } from '@/stores/auth'
import { usePWA } from '@/composables/usePWA'

const route     = useRoute()
const router    = useRouter()
const slug      = computed(() => route.params.slug)
const teamId    = computed(() => route.params.id)
const profile      = ref(null)
const sameNameTeams = ref([])  // otros equipos con el mismo nombre (otras categorías)
const loading      = ref(true)
const activeTab    = ref('squad')

const following = useFollowingStore()
const auth      = useAuthStore()
const { pushEndpoint, pushGranted, subscribePush } = usePWA()
const isFollowed = computed(() => following.isFollowing(teamId.value))

async function toggleFollow() {
  if (!auth.isLoggedIn) {
    // Guarda la ruta actual y manda a login
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }
  if (!pushGranted.value) await subscribePush()
  await following.toggle(teamId.value, pushEndpoint.value)
}

const tabs = [
  { key: 'squad',   label: 'Plantilla', icon: 'IconUsers' },
  { key: 'matches', label: 'Partidos',  icon: 'IconCircleDot' },
  { key: 'awards',  label: 'Premios',   icon: 'IconMedal' },
]

const teamColor = computed(() => {
  if (!profile.value?.team?.name) return '#0ea5e9'
  let hash = 0
  for (const c of profile.value.team.name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`
})

const teamInitials = computed(() => {
  const name = profile.value?.team?.name || ''
  const parts = name.trim().split(/\s+/)
  return parts.length === 1 ? name.slice(0,2).toUpperCase() : (parts[0][0]+parts[1][0]).toUpperCase()
})

const awardLabels = { top_scorer:'Goleador', mvp:'MVP', best_keeper:'Mejor Portero', best_team:'Mejor Equipo', fair_play:'Fair Play' }
function awardLabel(t) { return awardLabels[t] || t }

onMounted(async () => {
  try {
    const { data } = await api.get(`/teams/${teamId.value}/profile?slug=${slug.value}`)
    profile.value = data

    // Buscar otros equipos con el mismo nombre en otras categorías del mismo torneo
    if (data?.team?.name && slug.value) {
      const { data: allTeams } = await api.get(`/tournaments/${slug.value}/teams`)
      const teamName = data.team.name.trim().toLowerCase()
      sameNameTeams.value = allTeams
        .filter(t => t.name.trim().toLowerCase() === teamName && String(t.id) !== String(teamId.value))
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>
