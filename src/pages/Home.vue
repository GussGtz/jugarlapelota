<template>
  <div>
    <HeroSection />

    <!-- Live matches -->
    <section v-if="liveMatches.length" class="max-w-7xl mx-auto px-4 py-12">
      <div v-reveal class="flex items-center gap-3 mb-6">
        <span class="live-dot"></span>
        <h2 class="section-title">Partidos en Vivo</h2>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MatchCard v-for="(m, i) in liveMatches" :key="m.id" v-reveal="{ delay: i * 80 }" :match="m" :tournament-slug="m.tournamentSlug" />
      </div>
    </section>

    <!-- Tournaments -->
    <section id="torneos" class="max-w-7xl mx-auto px-4 py-12">
      <div v-reveal class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 class="section-title">Torneos Activos</h2>
        <!-- Buscador -->
        <div class="relative w-full sm:w-64">
          <IconSearch class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar torneo..."
            class="w-full pl-9 pr-4 py-2 text-sm bg-white border border-muted rounded-xl focus:outline-none focus:border-primary text-slate-900 placeholder-slate-400"
          />
        </div>
      </div>

      <div v-if="tournaments.loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="card animate-pulse h-48 bg-muted/50"></div>
      </div>
      <div v-else>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <router-link
            v-for="(t, i) in visibleTournaments"
            :key="t.id"
            v-reveal="{ delay: i * 90 }"
            :to="`/${t.slug}`"
            class="card group hover:scale-[1.02] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out block min-w-0"
            :style="{ borderColor: t.primaryColor || '' }"
          >
            <div class="overflow-hidden rounded-xl mb-4">
              <img v-if="t.banner" :src="t.banner" class="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-500" />
              <div v-else class="w-full h-32 bg-muted flex items-center justify-center">
                <IconTrophy class="w-10 h-10 text-gray-500" />
              </div>
            </div>
            <div class="flex items-center gap-3 min-w-0">
              <img v-if="t.logo" :src="t.logo" class="w-10 h-10 object-contain shrink-0" />
              <div class="min-w-0">
                <h3 class="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{{ t.name }}</h3>
                <p class="text-slate-500 text-xs flex items-center gap-1 truncate"><IconMapPin class="w-3 h-3 shrink-0" /> <span class="truncate">{{ t.location }}</span></p>
              </div>
            </div>
          </router-link>
        </div>
        <!-- Sin resultados -->
        <p v-if="!visibleTournaments.length" class="text-center text-slate-400 py-10 text-sm">
          No se encontraron torneos con "{{ searchQuery }}"
        </p>
        <!-- Ver todos: muestra el buscador con todos los torneos al limpiar el filtro -->
        <div v-if="!searchQuery && filteredTournaments.length > 3" class="flex justify-center mt-6">
          <button @click="showAll = !showAll"
            class="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-sky-600 transition-colors">
            {{ showAll ? 'Ver menos' : `Ver todos (${filteredTournaments.length})` }}
            <IconChevronRight class="w-4 h-4 transition-transform" :class="showAll ? 'rotate-90' : ''" />
          </button>
        </div>
      </div>
    </section>

    <!-- Ranking de más seguidos -->
    <section v-if="topTournaments.length || topTeams.length" class="max-w-7xl mx-auto px-4 py-12">
      <div v-reveal class="flex items-center gap-3 mb-6">
        <h2 class="section-title">Los más seguidos</h2>
      </div>
      <div class="grid sm:grid-cols-2 gap-6">
        <div v-if="topTournaments.length" class="card min-w-0">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <IconTrophy class="w-3.5 h-3.5" /> Torneos
          </p>
          <router-link v-for="(t, i) in topTournaments" :key="t.id" :to="`/${t.slug}`"
            class="flex items-center gap-3 py-2 group">
            <span class="w-5 text-center text-sm font-black text-slate-300">{{ i + 1 }}</span>
            <div class="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
              <img v-if="t.logo" :src="t.logo" class="w-full h-full object-contain" />
              <IconTrophy v-else class="w-4 h-4 text-slate-400" />
            </div>
            <span class="flex-1 min-w-0 font-semibold text-slate-800 text-sm truncate group-hover:text-primary transition-colors">{{ t.name }}</span>
            <span class="flex items-center gap-1 text-xs font-bold text-red-500 shrink-0">
              <IconHeart class="w-3.5 h-3.5 fill-red-400" /> {{ t.followerCount }}
            </span>
          </router-link>
        </div>
        <div v-if="topTeams.length" class="card min-w-0">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <IconShirt class="w-3.5 h-3.5" /> Equipos
          </p>
          <router-link v-for="(t, i) in topTeams" :key="t.id" :to="`/${t.tournamentSlug}/equipo/${t.id}`"
            class="flex items-center gap-3 py-2 group">
            <span class="w-5 text-center text-sm font-black text-slate-300">{{ i + 1 }}</span>
            <div class="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
              <img v-if="t.logo" :src="t.logo" class="w-full h-full object-contain" />
              <IconShirt v-else class="w-4 h-4 text-slate-400" />
            </div>
            <span class="flex-1 min-w-0 truncate">
              <span class="block font-semibold text-slate-800 text-sm truncate group-hover:text-primary transition-colors">{{ t.name }}</span>
              <span v-if="t.categoryName" class="block text-xs text-slate-400 truncate">{{ t.categoryName }}</span>
            </span>
            <span class="flex items-center gap-1 text-xs font-bold text-red-500 shrink-0">
              <IconHeart class="w-3.5 h-3.5 fill-red-400" /> {{ t.followerCount }}
            </span>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ── Instala la app + Para todos en el torneo ────────── -->
    <section id="caracteristicas" class="bg-slate-50 py-16 md:py-24 border-t border-slate-100">
      <div class="max-w-7xl mx-auto px-4">
        <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          <!-- Tutorial de instalación (PWA) -->
          <InstallTutorial />

          <!-- Características / roles -->
          <div class="text-center">
            <span v-reveal class="inline-block text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">
              Plataforma completa
            </span>
            <h2 v-reveal="{ delay: 80 }" class="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              Un torneo conectado
              <span class="text-primary"> para todos</span>
            </h2>
            <p v-reveal="{ delay: 140 }" class="text-slate-500 mt-3 text-base max-w-sm mx-auto">
              Cada persona involucrada tiene su propio rol y experiencia dentro de la plataforma.
            </p>

            <!-- Cards -->
            <div class="grid grid-cols-2 gap-5 max-w-md mx-auto mt-8">
              <div v-for="(role, i) in roles" :key="role.title" v-reveal="{ delay: 220 + i * 100 }" class="role-card">
                <!-- SVG ilustración -->
                <div class="role-svg-wrap" :style="{ background: role.gradient }">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
                    class="w-16 h-16 role-svg" :style="{ color: role.stroke }">
                    <g v-html="role.svg"></g>
                  </svg>
                </div>
                <h3 class="font-black text-slate-900 text-base md:text-lg mt-5 mb-2">{{ role.title }}</h3>
                <p class="text-slate-500 text-sm leading-relaxed">{{ role.desc }}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ── Feature sections con mockups ──────────────────── -->
    <FeatureSections />

    <!-- ── Banner contratar ───────────────────────────────── -->
    <ContratarBanner />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTournamentsStore } from '@/stores/tournaments'
import api from '@/api'
import HeroSection      from '@/components/Hero/HeroSection.vue'
import MatchCard        from '@/components/MatchCard/MatchCard.vue'
import FeatureSections  from '@/components/FeatureSections/FeatureSections.vue'
import ContratarBanner  from '@/components/ContratarBanner/ContratarBanner.vue'
import InstallTutorial  from '@/components/InstallTutorial/InstallTutorial.vue'

const tournaments = useTournamentsStore()
const liveMatches = ref([])
const searchQuery = ref('')
const showAll     = ref(false)
const allTeams    = ref([])

const topTournaments = computed(() =>
  [...tournaments.list].filter(t => t.followerCount > 0)
    .sort((a, b) => b.followerCount - a.followerCount).slice(0, 5)
)
const topTeams = computed(() =>
  [...allTeams.value].filter(t => t.followerCount > 0)
    .sort((a, b) => b.followerCount - a.followerCount).slice(0, 5)
)

const filteredTournaments = computed(() => {
  if (!searchQuery.value.trim()) return tournaments.list
  const q = searchQuery.value.toLowerCase()
  return tournaments.list.filter(t =>
    t.name.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q)
  )
})

const visibleTournaments = computed(() =>
  searchQuery.value.trim() || showAll.value
    ? filteredTournaments.value
    : filteredTournaments.value.slice(0, 3)
)

const roles = [
  {
    title:    'Organizadores',
    desc:     'Control total del torneo: equipos, fases, árbitros y resultados desde un panel sencillo.',
    stroke:   '#0ea5e9',
    gradient: 'linear-gradient(135deg,#e0f2fe,#bae6fd)',
    svg: `
      <circle cx="50" cy="14" r="9" stroke="currentColor" stroke-width="2.2" fill="none"/>
      <path d="M33 36 Q50 28 67 36 L64 58 H36 Z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>
      <path d="M36 58 L31 76 L27 88" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M64 58 L69 76 L73 88" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M36 42 L20 52" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M64 42 L74 36" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="70" y="28" width="22" height="28" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
      <line x1="75" y1="36" x2="87" y2="36" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="75" y1="41" x2="87" y2="41" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="75" y1="46" x2="83" y2="46" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="77" y="25" width="8" height="6" rx="1.5" stroke="currentColor" stroke-width="1.8" fill="none"/>
    `
  },
  {
    title:    'Árbitros',
    desc:     'Captura goles, tarjetas y eventos del partido en tiempo real desde tu celular.',
    stroke:   '#8b5cf6',
    gradient: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
    svg: `
      <circle cx="42" cy="14" r="9" stroke="currentColor" stroke-width="2.2" fill="none"/>
      <path d="M27 36 Q42 28 57 36 L55 58 H29 Z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>
      <path d="M29 58 L24 76 L20 88" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M55 58 L60 76 L64 88" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M29 40 L18 52" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M55 38 L68 22" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="63" y="10" width="16" height="22" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
      <line x1="63" y1="16" x2="79" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="12" cy="56" r="5" stroke="currentColor" stroke-width="1.8" fill="none"/>
      <path d="M17 54 Q22 48 18 52" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="74" y="62" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
      <line x1="74" y1="67" x2="86" y2="67" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    `
  },
  {
    title:    'Jugadores',
    desc:     'Consulta tu calendario, estadísticas personales y el historial de partidos de tu equipo.',
    stroke:   '#10b981',
    gradient: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
    svg: `
      <circle cx="32" cy="12" r="9" stroke="currentColor" stroke-width="2.2" fill="none"/>
      <path d="M20 32 Q32 25 44 32 L46 50 H18 Z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>
      <path d="M18 50 L12 66 L10 80" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M46 50 L58 62" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M58 62 L68 56" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M20 36 L10 44" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M44 34 L54 28" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="74" cy="72" r="14" stroke="currentColor" stroke-width="2.2" fill="none"/>
      <path d="M66 66 L74 72 L82 66" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M66 78 L74 72 L82 78" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="74" y1="58" x2="74" y2="64" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="74" y1="80" x2="74" y2="86" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="60" y1="72" x2="66" y2="72" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="82" y1="72" x2="88" y2="72" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    `
  },
  {
    title:    'Aficionados',
    desc:     'Sigue a tu equipo favorito, recibe alertas de goles y mira el marcador en vivo.',
    stroke:   '#f97316',
    gradient: 'linear-gradient(135deg,#ffedd5,#fed7aa)',
    svg: `
      <circle cx="50" cy="18" r="10" stroke="currentColor" stroke-width="2.2" fill="none"/>
      <path d="M35 40 Q50 32 65 40 L62 60 H38 Z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>
      <path d="M38 60 L33 78 L29 90" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M62 60 L67 78 L71 90" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M38 44 L20 28" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M62 44 L80 28" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M15 24 L20 28 L16 32" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M85 24 L80 28 L84 32" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="20" r="3" stroke="currentColor" stroke-width="1.8" fill="none"/>
      <circle cx="88" cy="20" r="3" stroke="currentColor" stroke-width="1.8" fill="none"/>
      <line x1="50" y1="4" x2="50" y2="8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="56" y1="6" x2="54" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="44" y1="6" x2="46" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    `
  },
]

onMounted(async () => {
  await tournaments.fetchAll()
  const results = await Promise.allSettled(
    tournaments.list.map(t =>
      api.get(`/tournaments/${t.slug}/matches`).then(r => ({
        slug: t.slug,
        live: r.data.filter(m => m.status === 'live')
      }))
    )
  )
  liveMatches.value = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value.live.map(m => ({ ...m, tournamentSlug: r.value.slug })))

  api.get('/teams').then(r => { allTeams.value = r.data }).catch(() => {})
})
</script>

<style scoped>
.role-card {
  background: #fff;
  border-radius: 24px;
  padding: 28px 20px 32px;
  border: 1px solid #e2e8f0;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.role-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.09);
}

.role-svg-wrap {
  width: 96px;
  height: 96px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.role-card:hover .role-svg-wrap {
  transform: scale(1.08) rotate(-4deg);
}
.role-svg {
  transition: transform 0.3s ease;
}
.role-card:hover .role-svg {
  transform: scale(1.08);
}
</style>
