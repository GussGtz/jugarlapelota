<template>
  <div v-if="tournament">
    <!-- Tournament sub-page banner -->
    <div v-if="!isHomePage && !hideNav" class="relative overflow-hidden h-28 md:h-56"
      :style="{ background: `linear-gradient(135deg, ${tournament.primaryColor || '#0ea5e9'}22, #f1f5f9)` }">
      <img v-if="tournament.banner" :src="tournament.banner" class="absolute inset-0 w-full h-full object-cover opacity-20" />
      <div class="relative max-w-7xl mx-auto px-4 h-full flex items-center md:items-end md:pb-6">
        <div class="flex items-center gap-3">
          <img v-if="tournament.logo" :src="tournament.logo"
            class="w-12 h-12 md:w-20 md:h-20 object-contain bg-card rounded-xl md:rounded-2xl p-1.5 md:p-2 shadow-sm" />
          <div>
            <h1 class="text-xl md:text-3xl font-black text-slate-900 leading-tight">{{ tournament.name }}</h1>
            <div class="flex items-center gap-2 mt-0.5">
              <p class="text-slate-500 text-xs md:text-sm flex items-center gap-1">
                <IconMapPin class="w-3 h-3" /> {{ tournament.location }}
              </p>
              <!-- Modality badge -->
              <span v-if="tournament.modality" class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                :class="modalityBadge(tournament.modality)">
                {{ modalityLabel(tournament.modality) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs nav — oculto en inscripción cuando admin/referee logueado -->
    <div v-if="!hideNav" class="hidden xl:block sticky xl:top-16 z-40 bg-white border-b border-muted shadow-sm">
      <div class="max-w-7xl mx-auto px-0 md:px-4 flex overflow-x-auto scrollbar-hide">
        <router-link
          v-for="tab in visibleTabs" :key="tab.path"
          :to="`/${slug}${tab.path}`"
          class="flex items-center gap-1 md:gap-1.5 px-3 md:px-4 py-2.5 md:py-3 text-[11px] md:text-sm font-medium whitespace-nowrap border-b-2 transition-all shrink-0"
          :class="isActive(tab)
            ? 'border-primary text-primary'
            : 'border-transparent text-slate-400 hover:text-slate-700'"
        >
          <component :is="tab.icon" class="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
          <span>{{ tab.label }}</span>
        </router-link>
      </div>
    </div>

    <router-view />
  </div>

  <div v-else-if="loading" class="flex items-center justify-center min-h-64 text-slate-500">
    Cargando torneo...
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useTournament } from '@/composables/useTournament'
import { useCategoriesStore } from '@/stores/categories'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Home, CircleDot, ClipboardList, User, Radio } from 'lucide-vue-next'

const { slug, tournament, loading, load, hasStandings } = useTournament()
const cats  = useCategoriesStore()
const route = useRoute()
const auth  = useAuthStore()

const hideNav = computed(() =>
  route.name === 'Inscription' && (auth.isAdmin || auth.user?.role === 'referee')
)

const isHomePage = computed(() => {
  const base = `/${slug.value}`
  return route.path === base || route.path === base + '/'
})

onMounted(async () => {
  await load()
  if (slug.value) await cats.fetchByTournament(slug.value)
})

function isActive(tab) {
  const path = route.path
  const base = `/${slug.value}`
  if (tab.path === '') return path === base || path === base + '/'
  return path.startsWith(base + tab.path)
}

const allTabs = [
  { icon: Home,          label: 'Inicio',          path: '',          always: true },
  { icon: CircleDot,     label: 'Partidos',         path: '/partidos', always: true },
  { icon: ClipboardList, label: 'Tabla',            path: '/tabla',    always: false, modalityKey: 'standings' },
  { icon: User,          label: 'Reconocimientos',  path: '/jugadores',always: true },
  { icon: Radio,         label: 'Media',            path: '/media',    always: true },
]

// Tabla solo visible en Liga y Mixto
const visibleTabs = computed(() =>
  allTabs.filter(t => t.always || (t.modalityKey === 'standings' && hasStandings.value))
)

function modalityLabel(m) {
  return { copa:'Copa', liga:'Liga', mixto:'Liga + Liguilla', grupos_eliminacion:'Grupos+Bracket' }[m] || m
}
function modalityBadge(m) {
  return {
    copa:               'bg-amber-100 text-amber-700',
    liga:               'bg-emerald-100 text-emerald-700',
    mixto:              'bg-blue-100 text-blue-700',
    grupos_eliminacion: 'bg-purple-100 text-purple-700',
  }[m] || 'bg-slate-100 text-slate-600'
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
