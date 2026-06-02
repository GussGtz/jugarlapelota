<template>
  <div class="space-y-4 md:space-y-6">
    <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Analytics</h2>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="s in stats" :key="s.label" class="card text-center py-6">
        <p class="text-4xl font-black mb-2" :class="s.color">{{ s.value }}</p>
        <p class="text-slate-500 text-sm">{{ s.label }}</p>
      </div>
    </div>
    <div class="grid md:grid-cols-2 gap-4">
      <!-- Top goleadores -->
      <div class="card">
        <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2"><IconCircle class="w-4 h-4 text-accent" /> Top Goleadores</h3>
        <div class="space-y-3">
          <div v-for="(p, i) in topScorers" :key="p.id" class="flex items-center gap-3">
            <span class="text-slate-400 font-bold w-5 text-sm">{{ i+1 }}</span>
            <div class="flex-1">
              <p class="text-slate-900 text-sm font-semibold">{{ p.name }}</p>
              <p class="text-slate-400 text-xs">{{ p.teamName }}</p>
            </div>
            <span class="text-accent font-black text-lg">{{ p.goals }}</span>
          </div>
          <p v-if="!topScorers.length" class="text-slate-500 text-sm text-center py-4">Sin datos.</p>
        </div>
      </div>
      <!-- Partidos recientes -->
      <div class="card">
        <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2"><IconCalendar class="w-4 h-4 text-primary" /> Partidos Recientes</h3>
        <div class="space-y-2">
          <div v-for="m in recentMatches" :key="m.id" class="flex items-center justify-between text-sm py-1 border-b border-muted/50">
            <span class="text-slate-700 truncate flex-1">{{ m.homeTeam }} vs {{ m.awayTeam }}</span>
            <span class="font-bold text-primary ml-2 flex-shrink-0" v-if="m.status !== 'scheduled'">{{ m.home_score }}-{{ m.away_score }}</span>
          </div>
          <p v-if="!recentMatches.length" class="text-slate-500 text-sm text-center py-4">Sin partidos.</p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api'
const serverStats = ref({ tournaments:0, teams:0, players:0, matches:0, live:0 })
const players = ref([])
const matches = ref([])
const topScorers = computed(() => [...players.value].sort((a,b) => b.goals - a.goals).slice(0,5))
const recentMatches = computed(() => [...matches.value].reverse().slice(0,5))
const stats = computed(() => [
  { label:'Torneos', value: serverStats.value.tournaments, color:'text-primary' },
  { label:'Equipos', value: serverStats.value.teams, color:'text-slate-900' },
  { label:'Jugadores', value: serverStats.value.players, color:'text-accent' },
  { label:'Partidos', value: serverStats.value.matches, color:'text-slate-900' },
])
onMounted(async () => {
  try {
    const [st, ts] = await Promise.all([api.get('/admin/stats'), api.get('/tournaments')])
    serverStats.value = st.data
    if (ts.data.length) {
      const slug = ts.data[0].slug
      const [pl, ma] = await Promise.all([api.get(`/tournaments/${slug}/players`), api.get(`/tournaments/${slug}/matches`)])
      players.value = pl.data
      matches.value = ma.data
    }
  } catch {}
})
</script>
