<template>
  <div class="space-y-8">

    <!-- ── STAT CARDS ──────────────────────────────────────────── -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- En vivo destacado -->
      <div class="card col-span-2 lg:col-span-1 flex items-center gap-4"
        :class="st.live > 0 ? 'border-red-300 bg-red-50' : ''">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          :class="st.live > 0 ? 'bg-red-500' : 'bg-slate-100'">
          <IconRadio class="w-6 h-6" :class="st.live > 0 ? 'text-white animate-pulse' : 'text-slate-400'"/>
        </div>
        <div>
          <p class="text-2xl font-black" :class="st.live > 0 ? 'text-red-600' : 'text-slate-900'">
            {{ st.live }}
          </p>
          <p class="text-xs font-bold text-slate-500">EN VIVO ahora</p>
        </div>
      </div>

      <div v-for="s in statCards" :key="s.label" class="card flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          :style="{ background: s.bg }">
          <component :is="s.icon" class="w-5 h-5 text-white"/>
        </div>
        <div>
          <p class="text-2xl font-black text-slate-900">{{ s.value }}</p>
          <p class="text-xs font-bold text-slate-500">{{ s.label }}</p>
          <p v-if="s.alert" class="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
            <IconAlertTriangle class="w-3 h-3"/> {{ s.alert }}
          </p>
        </div>
      </div>
    </div>

    <!-- ── ALERTAS OPERATIVAS ──────────────────────────────────── -->
    <div v-if="alerts.length" class="space-y-2">
      <div v-for="a in alerts" :key="a.key"
        class="flex items-center gap-3 rounded-xl px-4 py-3 border text-sm"
        :class="a.cls">
        <component :is="a.icon" class="w-4 h-4 shrink-0"/>
        <span class="flex-1">{{ a.msg }}</span>
        <router-link :to="a.to" class="font-bold text-xs hover:underline shrink-0">{{ a.cta }}</router-link>
      </div>
    </div>

    <!-- ── ALERTA: PARTIDOS SIN HORARIO / CANCHA ──────────────── -->
    <div v-if="st.matchesNoSchedule > 0"
      class="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 space-y-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
          <IconCalendar class="w-5 h-5 text-white"/>
        </div>
        <div class="flex-1">
          <p class="font-black text-amber-900 text-sm">
            {{ st.matchesNoSchedule }} partido{{ st.matchesNoSchedule > 1 ? 's' : '' }} sin horario o cancha asignada
          </p>
          <p class="text-amber-700 text-xs mt-0.5">
            Los jugadores, equipos y árbitros no pueden ver cuándo ni dónde se juegan
          </p>
        </div>
        <router-link to="/admin/partidos?filter=pending-schedule"
          class="shrink-0 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-black hover:bg-amber-600 transition flex items-center gap-1.5">
          <IconPenLine class="w-3.5 h-3.5"/> Asignar ahora
        </router-link>
      </div>

      <!-- Mini-lista de los primeros sin asignar -->
      <div v-if="st.matchesNoScheduleList?.length" class="space-y-1.5">
        <div v-for="m in st.matchesNoScheduleList" :key="m.id"
          class="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-amber-100">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-slate-900 truncate">{{ m.homeTeam }} vs {{ m.awayTeam }}</p>
            <p class="text-[10px] text-slate-500">{{ m.categoryName }} · {{ m.tournamentName }}</p>
          </div>
          <div class="flex items-center gap-3 shrink-0 text-[10px]">
            <span class="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold"
              :class="m.date ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'">
              <IconClock class="w-3 h-3"/>
              {{ m.date ? 'Con horario' : 'Sin horario' }}
            </span>
            <span class="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold"
              :class="m.location ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'">
              <IconMapPin class="w-3 h-3"/>
              {{ m.location ? 'Con cancha' : 'Sin cancha' }}
            </span>
          </div>
        </div>
        <p v-if="st.matchesNoSchedule > 5" class="text-[10px] text-amber-600 text-center font-semibold">
          y {{ st.matchesNoSchedule - 5 }} más...
        </p>
      </div>
    </div>

    <!-- ── PARTIDOS EN VIVO ────────────────────────────────────── -->
    <section v-if="st.liveMatches?.length">
      <div class="flex items-center gap-3 mb-4">
        <span class="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping inline-block"></span>
        <h2 class="text-lg font-black text-slate-900">Partidos en vivo</h2>
        <span class="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
          {{ st.liveMatches.length }}
        </span>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <LiveMatchCard
          v-for="m in st.liveMatches" :key="m.id"
          :match="m"
          @open="goMatch(m)"/>
      </div>
    </section>

    <!-- ── PARTIDOS DE HOY ────────────────────────────────────── -->
    <section v-if="st.todayMatches?.length">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-1 h-6 bg-primary rounded-full"></div>
        <h2 class="text-lg font-black text-slate-900">Hoy</h2>
        <span class="text-xs text-slate-400">{{ todayLabel }}</span>
      </div>
      <div class="space-y-2">
        <div v-for="m in st.todayMatches" :key="m.id"
          @click="goMatch(m)"
          class="card flex items-center gap-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all py-3">
          <!-- Logos -->
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <TeamBadge :logo="m.homeLogo" :name="m.homeTeam" size="sm"/>
            <span class="font-bold text-slate-900 text-sm truncate flex-1">{{ m.homeTeam }}</span>
          </div>
          <div class="text-center shrink-0">
            <p class="text-xs font-black text-slate-400">{{ fmtTime(m.date) }}</p>
            <p class="text-[10px] text-slate-400">{{ m.categoryName }}</p>
          </div>
          <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span class="font-bold text-slate-900 text-sm truncate flex-1 text-right">{{ m.awayTeam }}</span>
            <TeamBadge :logo="m.awayLogo" :name="m.awayTeam" size="sm"/>
          </div>
          <!-- Ir al partido -->
          <button @click.stop="goMatch(m)"
            class="shrink-0 flex items-center gap-1 text-xs font-black text-white bg-primary px-3 py-1.5 rounded-lg hover:bg-primary/90">
            <IconPlay class="w-3 h-3"/> Arbitrar
          </button>
        </div>
      </div>
    </section>

    <!-- ── PRÓXIMOS PARTIDOS ──────────────────────────────────── -->
    <section v-if="st.nextMatches?.length">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-1 h-6 bg-slate-300 rounded-full"></div>
        <h2 class="text-lg font-black text-slate-900">Próximos</h2>
      </div>
      <div class="overflow-x-auto rounded-2xl border border-muted">
        <table class="w-full text-sm min-w-[480px]">
          <thead class="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-wider">
            <tr>
              <th class="py-2.5 px-4 text-left">Partido</th>
              <th class="py-2.5 px-4 text-center">Fecha</th>
              <th class="py-2.5 px-4 text-center">Categoría</th>
              <th class="py-2.5 px-4 text-center">Torneo</th>
              <th class="py-2.5 px-4"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in st.nextMatches" :key="m.id"
              class="border-t border-muted hover:bg-slate-50 transition-colors cursor-pointer"
              @click="goMatch(m)">
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <TeamBadge :logo="m.homeLogo" :name="m.homeTeam" size="xs"/>
                  <span class="font-semibold text-slate-900">{{ m.homeTeam }}</span>
                  <span class="text-slate-400 text-xs">vs</span>
                  <span class="font-semibold text-slate-900">{{ m.awayTeam }}</span>
                  <TeamBadge :logo="m.awayLogo" :name="m.awayTeam" size="xs"/>
                </div>
              </td>
              <td class="py-3 px-4 text-center text-xs text-slate-500">{{ fmtDate(m.date) }}</td>
              <td class="py-3 px-4 text-center text-xs text-slate-500">{{ m.categoryName || '—' }}</td>
              <td class="py-3 px-4 text-center text-xs text-slate-500">{{ m.tournamentName }}</td>
              <td class="py-3 px-4 text-center">
                <span class="text-[10px] font-bold text-primary">Ver →</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Empty total -->
    <div v-if="!st.liveMatches?.length && !st.todayMatches?.length && !st.nextMatches?.length"
      class="card text-center py-12 text-slate-400">
      <IconCalendar class="w-10 h-10 mx-auto mb-3 opacity-30"/>
      <p class="font-semibold">No hay partidos programados próximamente</p>
      <router-link to="/admin/partidos" class="text-primary text-sm font-bold mt-2 inline-block hover:underline">
        Crear partidos →
      </router-link>
    </div>

    <!-- ── PREMIOS RECIENTES / FASES COMPLETADAS ────────────── -->
    <section v-if="pendingPhases.length || recentAwards.length">
      <div class="flex items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-3">
          <div class="w-1 h-6 bg-yellow-400 rounded-full"></div>
          <h2 class="text-lg font-black text-slate-900">Reconocimientos</h2>
        </div>
        <router-link to="/admin/premios" class="text-xs font-bold text-primary hover:underline">Ver todos →</router-link>
      </div>

      <!-- Fases completadas sin premios -->
      <div v-if="pendingPhases.length" class="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4 space-y-2">
        <p class="text-sm font-black text-amber-700 flex items-center gap-2">
          <IconAlertTriangle class="w-4 h-4 shrink-0"/>
          {{ pendingPhases.length }} fase{{ pendingPhases.length > 1 ? 's' : '' }} sin premios generados
        </p>
        <div class="flex flex-wrap gap-2">
          <router-link to="/admin/premios"
            v-for="p in pendingPhases" :key="p.phase_id"
            class="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200 transition flex items-center gap-1.5">
            <IconZap class="w-3 h-3"/>
            {{ p.tournament_name }} · {{ p.category_name }} · {{ p.phase_name }}
          </router-link>
        </div>
      </div>

      <!-- Premios recientes -->
      <div v-if="recentAwards.length" class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="award in recentAwards" :key="award.id"
          class="card text-center py-4 space-y-1.5">
          <div class="flex justify-center mb-1">
            <div v-if="award.playerPhoto" class="w-10 h-10 rounded-full overflow-hidden bg-slate-100">
              <img :src="award.playerPhoto" class="w-full h-full object-cover"/>
            </div>
            <div v-else-if="award.teamLogo" class="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
              <img :src="award.teamLogo" class="w-full h-full object-contain p-1"/>
            </div>
            <IconAward v-else class="w-8 h-8 text-yellow-400"/>
          </div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ awardLabelMap[award.type] || award.type }}</p>
          <p class="font-black text-slate-900 text-sm leading-tight">{{ award.playerName || award.teamName || '—' }}</p>
          <p class="text-[10px] text-primary">{{ award.categoryName }}</p>
          <span v-if="award.auto_generated" class="inline-block text-[9px] font-black px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Auto</span>
        </div>
      </div>
    </section>

    <!-- ── ACCIONES RÁPIDAS ───────────────────────────────────── -->
    <section>
      <div class="flex items-center gap-3 mb-4">
        <div class="w-1 h-6 bg-accent rounded-full"></div>
        <h2 class="text-lg font-black text-slate-900">Acciones rápidas</h2>
      </div>
      <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <router-link v-for="action in actions" :key="action.to" :to="action.to"
          class="card flex flex-col items-center gap-2 py-5 hover:border-primary hover:shadow-md text-center group transition-all">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center"
            :style="{ background: action.bg }">
            <component :is="action.icon" class="w-5 h-5 text-white"/>
          </div>
          <span class="text-xs font-bold text-slate-600 group-hover:text-primary transition-colors leading-tight">
            {{ action.label }}
          </span>
          <span v-if="action.badge"
            class="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
            {{ action.badge }}
          </span>
        </router-link>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { Trophy, Shirt, CircleDot, Radio, ImageIcon, Newspaper,
         Users, ClipboardList, AlertTriangle, Calendar, Play, Zap, Award } from 'lucide-vue-next'

const router = useRouter()
const pendingPhases = ref([])
const recentAwards  = ref([])

const awardLabelMap = {
  top_scorer: 'Goleador', mvp: 'MVP', best_keeper: 'Mejor Portero',
  best_team: 'Mejor Equipo', fair_play: 'Fair Play', revelation: 'Revelación'
}

const st = ref({
  tournaments: 0, categories: 0, teams: 0, players: 0,
  matches: 0, live: 0, inscriptions: 0, teamsNoCat: 0,
  liveMatches: [], todayMatches: [], nextMatches: []
})

// ── Mini componente TeamBadge ────────────────────────────
const TeamBadge = defineComponent({
  props: { logo: String, name: String, size: { default: 'sm' } },
  setup(p) {
    const sz = { xs: 'w-5 h-5', sm: 'w-7 h-7', md: 'w-9 h-9' }[p.size] || 'w-7 h-7'
    return () => h('div', { class: `${sz} rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0` },
      p.logo
        ? h('img', { src: p.logo, class: 'w-full h-full object-contain p-0.5' })
        : h('span', { class: 'text-[9px] font-black text-slate-400' },
            (p.name || '?').slice(0,2).toUpperCase())
    )
  }
})

// ── LiveMatchCard ────────────────────────────────────────
const LiveMatchCard = defineComponent({
  props: { match: Object },
  emits: ['open'],
  setup(p, { emit }) {
    return () => h('div', {
      class: 'card border-red-300 bg-gradient-to-br from-red-50 to-white cursor-pointer hover:shadow-lg transition-all',
      onClick: () => emit('open')
    }, [
      h('div', { class: 'flex items-center justify-between mb-3' }, [
        h('div', { class: 'flex items-center gap-1.5' }, [
          h('span', { class: 'w-2 h-2 bg-red-500 rounded-full animate-ping inline-block' }),
          h('span', { class: 'text-[10px] font-black text-red-600 uppercase tracking-widest' }, 'EN VIVO'),
        ]),
        h('span', { class: 'text-[10px] text-slate-400' }, p.match.tournamentName)
      ]),
      h('div', { class: 'flex items-center gap-3' }, [
        h('div', { class: 'flex-1 text-center' }, [
          h('div', { class: 'w-10 h-10 rounded-xl bg-slate-100 mx-auto mb-1 overflow-hidden flex items-center justify-center' },
            p.match.homeLogo
              ? h('img', { src: p.match.homeLogo, class: 'w-full h-full object-contain' })
              : h('span', { class: 'text-xs font-black text-slate-400' }, (p.match.homeTeam||'?').slice(0,2))),
          h('p', { class: 'text-xs font-bold text-slate-900 truncate' }, p.match.homeTeam)
        ]),
        h('div', { class: 'text-center px-2' }, [
          h('p', { class: 'text-3xl font-black text-slate-900 tabular-nums' },
            `${p.match.home_score} - ${p.match.away_score}`)
        ]),
        h('div', { class: 'flex-1 text-center' }, [
          h('div', { class: 'w-10 h-10 rounded-xl bg-slate-100 mx-auto mb-1 overflow-hidden flex items-center justify-center' },
            p.match.awayLogo
              ? h('img', { src: p.match.awayLogo, class: 'w-full h-full object-contain' })
              : h('span', { class: 'text-xs font-black text-slate-400' }, (p.match.awayTeam||'?').slice(0,2))),
          h('p', { class: 'text-xs font-bold text-slate-900 truncate' }, p.match.awayTeam)
        ])
      ]),
      h('button', {
        class: 'w-full mt-3 py-2 rounded-xl bg-red-600 text-white text-xs font-black flex items-center justify-center gap-1.5 hover:bg-red-700 transition-colors'
      }, [h('span', {}, 'Abrir panel del árbitro')])
    ])
  }
})

// ── Computed ─────────────────────────────────────────────
const todayLabel = computed(() =>
  new Date().toLocaleDateString('es-MX', { weekday:'long', day:'2-digit', month:'long' })
)

const statCards = computed(() => [
  { label: 'Torneos',      value: st.value.tournaments,  icon: Trophy,        bg: '#0ea5e9' },
  { label: 'Equipos',      value: st.value.teams,        icon: Shirt,         bg: '#8b5cf6',
    alert: st.value.teamsNoCat > 0 ? `${st.value.teamsNoCat} sin categoría` : null },
  { label: 'Jugadores',    value: st.value.players,      icon: Users,         bg: '#10b981' },
  { label: 'Inscripciones pendientes', value: st.value.inscriptions, icon: ClipboardList, bg: '#f59e0b',
    alert: st.value.inscriptions > 0 ? 'Requieren revisión' : null },
])

const alerts = computed(() => {
  const list = []
  if (st.value.inscriptions > 0) list.push({
    key: 'insc', icon: AlertTriangle,
    cls: 'bg-amber-50 border-amber-200 text-amber-800',
    msg: `${st.value.inscriptions} inscripción${st.value.inscriptions > 1 ? 'es' : ''} pendiente${st.value.inscriptions > 1 ? 's' : ''} de aprobar`,
    to: '/admin/inscripciones', cta: 'Revisar →'
  })
  if (st.value.teamsNoCat > 0) list.push({
    key: 'nocat', icon: AlertTriangle,
    cls: 'bg-orange-50 border-orange-200 text-orange-800',
    msg: `${st.value.teamsNoCat} equipo${st.value.teamsNoCat > 1 ? 's' : ''} sin categoría asignada`,
    to: '/admin/equipos', cta: 'Asignar →'
  })
  return list
})

// Stat card de partidos con badge de advertencia
const matchStatBadge = computed(() =>
  st.value.matchesNoSchedule > 0 ? `${st.value.matchesNoSchedule} sin horario/cancha` : null
)

const actions = computed(() => [
  { icon: Trophy,        label: 'Torneo',        to: '/admin/torneos',        bg: '#0ea5e9' },
  { icon: Shirt,         label: 'Equipos',       to: '/admin/equipos',        bg: '#8b5cf6',
    badge: st.value.teamsNoCat > 0 ? `${st.value.teamsNoCat} pendientes` : null },
  { icon: CircleDot,     label: 'Partidos',      to: '/admin/partidos',       bg: '#10b981',
    badge: matchStatBadge.value || null },
  { icon: ClipboardList, label: 'Inscripciones', to: '/admin/inscripciones',  bg: '#f59e0b',
    badge: st.value.inscriptions > 0 ? `${st.value.inscriptions} nuevas` : null },
  { icon: ImageIcon,     label: 'Galería',       to: '/admin/galeria',        bg: '#ec4899' },
  { icon: Newspaper,     label: 'Noticias',      to: '/admin/noticias',       bg: '#64748b' },
])

function goMatch(m) {
  router.push(`/${m.tournamentSlug}/partido/${m.id}`)
}

function fmtTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
}

onMounted(async () => {
  try {
    const [statsRes, pendingRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/pending-awards')
    ])
    st.value = statsRes.data
    pendingPhases.value = pendingRes.data

    // Cargar premios recientes del primer torneo disponible
    const tours = await api.get('/tournaments')
    if (tours.data.length) {
      const { data } = await api.get(`/tournaments/${tours.data[0].slug}/awards`)
      recentAwards.value = data.slice(0, 8)
    }
  } catch {}
})
</script>
