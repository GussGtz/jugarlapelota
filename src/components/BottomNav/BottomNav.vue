<template>
  <nav class="block md:hidden fixed bottom-0 left-0 right-0 z-50 nav-root">
    <!-- Frosted glass bar -->
    <div class="nav-bar">

      <!-- Tournament context: 4 tabs fijos -->
      <template v-if="slug">
        <button
          v-for="tab in tournamentTabs"
          :key="tab.key"
          @click="handleTab(tab)"
          class="nav-item"
          :class="{ 'nav-item--tapped': tappedTab === tab.key }"
          @animationend="tappedTab = null"
        >
          <span class="nav-pill" :class="tab.active ? 'nav-pill--on' : ''">
            <span class="relative">
              <component :is="tab.icon"
                class="nav-icon transition-all duration-200"
                :class="tab.active ? 'text-primary scale-110' : 'text-slate-400'" />
              <span v-if="tab.key === 'partidos' && liveCount > 0" class="badge-live live-ring">
                {{ liveCount > 9 ? '9+' : liveCount }}
              </span>
            </span>
          </span>
          <span class="nav-label" :class="tab.active ? 'text-primary font-semibold' : 'text-slate-400'">
            {{ tab.label }}
          </span>
        </button>
      </template>

      <!-- Global context -->
      <template v-else>
        <button
          v-for="tab in globalTabs"
          :key="tab.key"
          @click="handleTab(tab)"
          class="nav-item"
          :class="{ 'nav-item--tapped': tappedTab === tab.key }"
          @animationend="tappedTab = null"
        >
          <span class="nav-pill" :class="tab.active ? 'nav-pill--on' : ''">
            <span class="relative">
              <template v-if="tab.key === 'siguiendo' && auth.user?.avatar">
                <img :src="auth.user.avatar" referrerpolicy="no-referrer"
                  class="w-6 h-6 rounded-full object-cover ring-2 transition-all"
                  :class="tab.active ? 'ring-primary' : 'ring-slate-200'" />
              </template>
              <template v-else>
                <component :is="tab.icon"
                  class="nav-icon transition-all duration-200"
                  :class="[tab.active ? 'text-primary scale-110' : 'text-slate-400',
                           tab.key === 'live' ? '!text-red-500' : '']" />
              </template>
              <span v-if="tab.key === 'live' && liveCount > 0" class="badge-live live-ring">
                {{ liveCount > 9 ? '9+' : liveCount }}
              </span>
              <span v-if="tab.badge" class="badge-primary">{{ tab.badge }}</span>
            </span>
          </span>
          <span class="nav-label" :class="tab.active ? 'text-primary font-semibold' : 'text-slate-400'">
            {{ tab.label }}
          </span>
        </button>
      </template>
    </div>

  </nav>

  <!-- ── DRAWER: En Vivo (teleport fuera del nav para evitar backdrop-filter stacking context) ── -->
  <Teleport to="body">
    <Transition name="fade-overlay">
      <div v-if="liveDrawerOpen" class="fixed inset-0 bg-black/40 z-[100]" @click="liveDrawerOpen = false" />
    </Transition>
    <Transition name="slide-up-drawer">
      <div v-if="liveDrawerOpen"
        class="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl"
        style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem); max-height: 75vh; display: flex; flex-direction: column;">
        <div class="shrink-0 px-5 pt-4 pb-3">
          <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"></div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <h3 class="text-base font-black text-slate-900">Partidos en vivo</h3>
            </div>
            <button @click="liveDrawerOpen = false" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors text-lg font-bold">×</button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto px-4 pb-2">
          <div v-if="liveLoading" class="flex justify-center py-10">
            <div class="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div v-else-if="!liveMatches.length" class="flex flex-col items-center justify-center py-10 gap-3">
            <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <component :is="IcCircle" class="w-8 h-8 text-slate-300" />
            </div>
            <p class="font-semibold text-slate-500 text-sm">No hay partidos en vivo</p>
            <p class="text-xs text-slate-400 text-center">Cuando empiece un partido aparecerá aquí en tiempo real</p>
          </div>
          <div v-else class="space-y-3">
            <button
              v-for="m in liveMatches" :key="m.id"
              @click="goToMatch(m)"
              class="w-full bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform">
              <div class="flex items-center gap-1.5 mb-3">
                <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                <span class="text-[10px] font-bold text-red-500 uppercase tracking-wider">En Vivo</span>
                <span class="text-[10px] text-slate-400">· {{ m.tournamentName }}</span>
                <span v-if="m.categoryName" class="text-[10px] text-slate-400">· {{ m.categoryName }}</span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <div class="flex-1 flex items-center gap-2 min-w-0">
                  <div class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    <img v-if="m.homeLogo" :src="m.homeLogo" class="w-full h-full object-contain p-0.5" />
                    <component v-else :is="IcShield" class="w-4 h-4 text-slate-400" />
                  </div>
                  <span class="font-bold text-slate-900 text-sm truncate">{{ m.homeTeam }}</span>
                </div>
                <div class="shrink-0 px-3 py-1 bg-slate-900 rounded-xl">
                  <span class="text-white font-black text-base tabular-nums">{{ m.home_score ?? 0 }} – {{ m.away_score ?? 0 }}</span>
                </div>
                <div class="flex-1 flex items-center gap-2 justify-end min-w-0">
                  <span class="font-bold text-slate-900 text-sm truncate text-right">{{ m.awayTeam }}</span>
                  <div class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    <img v-if="m.awayLogo" :src="m.awayLogo" class="w-full h-full object-contain p-0.5" />
                    <component v-else :is="IcShield" class="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── DRAWER: Siguiendo ── -->
  <Teleport to="body">
    <Transition name="fade-overlay">
      <div v-if="followingDrawerOpen" class="fixed inset-0 bg-black/40 z-[100]" @click="followingDrawerOpen = false" />
    </Transition>
    <Transition name="slide-up-drawer">
      <div v-if="followingDrawerOpen"
        class="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl"
        style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem); max-height: 75vh; display: flex; flex-direction: column;">
        <div class="shrink-0 px-5 pt-4 pb-3">
          <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"></div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <component :is="IcHeart" class="w-5 h-5 text-red-400" />
              <h3 class="text-base font-black text-slate-900">Siguiendo</h3>
              <span v-if="following.count" class="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {{ following.count }}
              </span>
            </div>
            <button @click="followingDrawerOpen = false" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors text-lg font-bold">×</button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto px-4 pb-2">
          <div v-if="followingLoading" class="flex justify-center py-10">
            <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div v-else-if="followingError" class="flex flex-col items-center justify-center py-10 gap-3">
            <div class="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
              <component :is="IcShield" class="w-8 h-8 text-red-300" />
            </div>
            <p class="font-semibold text-slate-500 text-sm">No se pudieron cargar los datos</p>
            <button @click="openFollowingDrawer" class="text-xs text-primary font-bold px-4 py-2 rounded-xl bg-primary/10">Reintentar</button>
          </div>
          <div v-else-if="!followedTeams.length && !followedTournaments.length" class="flex flex-col items-center justify-center py-10 gap-3">
            <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <component :is="IcHeart" class="w-8 h-8 text-slate-300" />
            </div>
            <p class="font-semibold text-slate-500 text-sm">No sigues nada aún</p>
            <p class="text-xs text-slate-400 text-center">Sigue equipos o torneos para verlos aquí</p>
          </div>
          <div v-else class="space-y-4">
            <!-- Torneos seguidos -->
            <div v-if="followedTournaments.length">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <component :is="IcTrophy" class="w-3 h-3" /> Torneos
              </p>
              <div class="space-y-2">
                <button v-for="t in followedTournaments" :key="t.id"
                  @click="goToTournament(t)"
                  class="w-full flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm text-left active:scale-[0.98] transition-transform">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-slate-100">
                    <img v-if="t.logo" :src="t.logo" class="w-full h-full object-contain p-1" />
                    <component v-else :is="IcTrophy" class="w-6 h-6 text-slate-400" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-900 text-sm truncate">{{ t.name }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ t.location }}</p>
                  </div>
                  <component :is="IcChevronRight" class="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              </div>
            </div>
            <!-- Equipos seguidos -->
            <div v-if="followedTeams.length">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <component :is="IcShield" class="w-3 h-3" /> Equipos
              </p>
              <div class="space-y-2">
                <button v-for="team in followedTeams" :key="team.id"
                  @click="goToTeam(team)"
                  class="w-full flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm text-left active:scale-[0.98] transition-transform">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                    :style="team.color ? `background:${team.color}22` : 'background:#f1f5f9'">
                    <img v-if="team.logo" :src="team.logo" class="w-full h-full object-contain p-1" />
                    <component v-else :is="IcShield" class="w-6 h-6 text-slate-400" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-900 text-sm truncate">{{ team.name }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ team.tournamentName }}</p>
                  </div>
                  <component :is="IcChevronRight" class="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, resolveComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMatchesStore } from '@/stores/matches'
import { useAuthStore } from '@/stores/auth'
import { useFollowingStore } from '@/stores/following'
import api from '@/api'

const props     = defineProps({ slug: { type: String, default: null } })
const route     = useRoute()
const router    = useRouter()
const matches   = useMatchesStore()
const auth      = useAuthStore()
const following = useFollowingStore()

const liveDrawerOpen      = ref(false)
const followingDrawerOpen = ref(false)
const tappedTab           = ref(null)

const liveMatches        = ref([])
const liveLoading        = ref(false)
const followedTeams      = ref([])
const followedTournaments = ref([])
const followingLoading   = ref(false)
const followingError     = ref(false)

const liveCount = computed(() => matches.live?.length ?? 0)

const IcHome         = resolveComponent('IconHome')
const IcCircleDot    = resolveComponent('IconCircleDot')
const IcUserCircle2  = resolveComponent('IconUserCircle2')
const IcImage        = resolveComponent('IconImage')
const IcUser         = resolveComponent('IconUser')
const IcHeart        = resolveComponent('IconHeart')
const IcCircle       = resolveComponent('IconCircle')
const IcTrophy       = resolveComponent('IconTrophy')
const IcShield       = resolveComponent('IconShield')
const IcChevronRight = resolveComponent('IconChevronRight')

function isActive(path) {
  if (path === `/${props.slug}`) return route.path === path
  return route.path === path || route.path.startsWith(path + '/')
}

const tournamentTabs = computed(() => [
  { key: 'inicio',          label: 'Inicio',      icon: IcHome,        path: `/${props.slug}`,          active: isActive(`/${props.slug}`) },
  { key: 'partidos',        label: 'Partidos',    icon: IcCircleDot,   path: `/${props.slug}/partidos`, active: isActive(`/${props.slug}/partidos`) },
  { key: 'reconocimientos', label: 'Reconocim.',  icon: IcUserCircle2, path: `/${props.slug}/jugadores`,active: isActive(`/${props.slug}/jugadores`) },
  { key: 'media',           label: 'Media',       icon: IcImage,       path: `/${props.slug}/media`,    active: isActive(`/${props.slug}/media`) },
])

const globalTabs = computed(() => {
  const base = [
    { key: 'inicio', label: 'Inicio',  icon: IcHome,   path: '/',   active: route.path === '/' },
    { key: 'live',   label: 'En Vivo', icon: IcCircle, path: null,  active: false },
  ]
  if (auth.isFan) {
    base.push({ key: 'siguiendo', label: 'Siguiendo', icon: IcHeart, path: null, active: false, badge: following.count || null })
  } else {
    base.push({ key: 'acceder', label: 'Acceder', icon: IcUser, path: '/login', active: isActive('/login') })
  }
  return base
})

async function openLiveDrawer() {
  liveDrawerOpen.value = true
  liveLoading.value    = true
  try {
    const { data } = await api.get('/matches/live')
    liveMatches.value = data
  } catch {
    liveMatches.value = []
  } finally {
    liveLoading.value = false
  }
}

async function openFollowingDrawer() {
  followingDrawerOpen.value = true
  const teamIds       = [...following.teamIds].map(Number)
  const tournamentIds = [...following.tournamentIds].map(Number)
  if (!teamIds.length && !tournamentIds.length) return

  followingLoading.value    = true
  followingError.value      = false
  followedTeams.value       = []
  followedTournaments.value = []

  try {
    const [teamsRes, tourRes] = await Promise.all([
      teamIds.length ? api.get('/teams') : Promise.resolve({ data: [] }),
      tournamentIds.length ? api.get('/tournaments') : Promise.resolve({ data: [] }),
    ])

    if (teamIds.length) {
      const existingIds = new Set(teamsRes.data.map(t => Number(t.id)))
      followedTeams.value = teamsRes.data.filter(t => teamIds.includes(Number(t.id)))
      for (const id of teamIds) {
        if (!existingIds.has(id)) following.unfollow(id)
      }
    }

    if (tournamentIds.length) {
      const existingIds = new Set(tourRes.data.map(t => Number(t.id)))
      followedTournaments.value = tourRes.data.filter(t => tournamentIds.includes(Number(t.id)))
      for (const id of tournamentIds) {
        if (!existingIds.has(id)) following.unfollowTournament(id)
      }
    }
  } catch {
    followingError.value = true
  } finally {
    followingLoading.value = false
  }
}

function handleTab(tab) {
  tappedTab.value = tab.key
  if (tab.key === 'live')       { openLiveDrawer();      return }
  if (tab.key === 'siguiendo')  { openFollowingDrawer(); return }
  if (tab.path) router.push(tab.path)
}

function goToMatch(m) {
  liveDrawerOpen.value = false
  router.push(`/${m.tournamentSlug}/partidos`)
}

function goToTeam(team) {
  followingDrawerOpen.value = false
  router.push(`/${team.tournamentSlug}/equipo/${team.id}`)
}

function goToTournament(t) {
  followingDrawerOpen.value = false
  router.push(`/${t.slug}`)
}
</script>

<style scoped>
/* El nav raíz cubre toda la zona inferior incluyendo safe-area */
.nav-root {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(0, 0, 0, 0.07);
  box-shadow: 0 -1px 0 rgba(0,0,0,0.04), 0 -8px 32px rgba(0,0,0,0.06);
  /* Extiende el fondo hasta el borde físico */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.nav-bar {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  padding: 6px 4px 8px;
  /* Sin fondo propio — lo hereda de nav-root */
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-top: none;
  box-shadow: none;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 2px 0;
  min-width: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.nav-item--tapped {
  animation: nav-bounce 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
@keyframes nav-bounce {
  0%   { transform: scale(1); }
  30%  { transform: scale(0.82); }
  70%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.nav-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 32px;
  border-radius: 16px;
  transition: background 0.22s ease, transform 0.18s ease;
}
.nav-pill--on {
  background: rgb(14 165 233 / 0.12);
  transform: translateY(-1px);
}

.nav-icon { width: 22px; height: 22px; }

.nav-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1;
  transition: color 0.2s;
  white-space: nowrap;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-live {
  position: absolute;
  top: -4px; right: -6px;
  width: 16px; height: 16px;
  background: #ef4444;
  color: white;
  font-size: 9px; font-weight: 700;
  border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
}
.badge-primary {
  position: absolute;
  top: -4px; right: -6px;
  width: 16px; height: 16px;
  background: #0ea5e9;
  color: white;
  font-size: 9px; font-weight: 700;
  border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
}

.fade-overlay-enter-active, .fade-overlay-leave-active { transition: opacity 0.25s ease; }
.fade-overlay-enter-from, .fade-overlay-leave-to { opacity: 0; }

.slide-up-drawer-enter-active { transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.slide-up-drawer-leave-active { transition: transform 0.25s ease-in; }
.slide-up-drawer-enter-from, .slide-up-drawer-leave-to { transform: translateY(100%); }
</style>
