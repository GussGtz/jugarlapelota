<template>
  <router-link :to="`/${tournamentSlug}/partido/${match.id}`"
    class="block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-200 overflow-hidden">

    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
      <span class="text-[10px] md:text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate mr-2">
        {{ match.roundName || match.phaseName || 'Partido' }}
      </span>
      <div class="flex items-center gap-1 shrink-0">
        <template v-if="match.status === 'live'">
          <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          <span class="text-[10px] font-extrabold text-red-500">EN VIVO</span>
        </template>
        <template v-else-if="match.status === 'finished'">
          <IconCheckCircle class="w-3 h-3 text-emerald-500" />
          <span class="text-[10px] font-bold text-emerald-600">FINAL</span>
        </template>
        <template v-else>
          <span class="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">PROG.</span>
        </template>
      </div>
    </div>

    <!-- Teams and Score -->
    <div class="flex items-center justify-between gap-2 px-3 py-3 md:py-4">

      <!-- Home team -->
      <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
        <div class="w-10 h-10 md:w-12 md:h-12 rounded-full shadow-sm flex items-center justify-center text-sm md:text-base font-black text-white shrink-0"
          :style="{ background: teamColor(match.homeTeam) }">
          <img v-if="match.homeLogo" :src="match.homeLogo" class="w-full h-full object-cover rounded-full" />
          <template v-else>{{ teamInitials(match.homeTeam) }}</template>
        </div>
        <router-link v-if="tournamentSlug && match.home_team" :to="`/${tournamentSlug}/equipo/${match.home_team}`" @click.stop
          class="font-bold text-xs md:text-sm text-center w-full leading-tight px-1 hover:underline"
          :class="isWinner('home') ? 'text-slate-900' : isLoser('home') ? 'text-slate-400' : 'text-slate-800'">
          {{ shortName(match.homeTeam) }}
        </router-link>
        <p v-else class="font-bold text-xs md:text-sm text-center w-full leading-tight px-1"
          :class="isWinner('home') ? 'text-slate-900' : isLoser('home') ? 'text-slate-400' : 'text-slate-800'">
          {{ shortName(match.homeTeam) }}
        </p>
      </div>

      <!-- Score / VS -->
      <div class="flex flex-col items-center gap-0.5 shrink-0 min-w-[60px] md:min-w-[80px]">
        <div v-if="match.status !== 'scheduled'" class="flex items-center gap-1.5 md:gap-2">
          <span class="text-2xl md:text-4xl font-black leading-none"
            :class="isWinner('home') ? 'text-slate-900' : 'text-slate-400'">
            {{ match.home_score ?? 0 }}
          </span>
          <span class="text-base md:text-xl font-bold text-slate-200">-</span>
          <span class="text-2xl md:text-4xl font-black leading-none"
            :class="isWinner('away') ? 'text-slate-900' : 'text-slate-400'">
            {{ match.away_score ?? 0 }}
          </span>
        </div>
        <div v-else>
          <span class="text-lg md:text-2xl font-black text-slate-200">VS</span>
        </div>
        <span class="text-[9px] md:text-[10px] text-slate-400 font-medium">{{ fmtTime(match.date) }}</span>
      </div>

      <!-- Away team -->
      <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
        <div class="w-10 h-10 md:w-12 md:h-12 rounded-full shadow-sm flex items-center justify-center text-sm md:text-base font-black text-white shrink-0"
          :style="{ background: teamColor(match.awayTeam) }">
          <img v-if="match.awayLogo" :src="match.awayLogo" class="w-full h-full object-cover rounded-full" />
          <template v-else>{{ teamInitials(match.awayTeam) }}</template>
        </div>
        <router-link v-if="tournamentSlug && match.away_team" :to="`/${tournamentSlug}/equipo/${match.away_team}`" @click.stop
          class="font-bold text-xs md:text-sm text-center w-full leading-tight px-1 hover:underline"
          :class="isWinner('away') ? 'text-slate-900' : isLoser('away') ? 'text-slate-400' : 'text-slate-800'">
          {{ shortName(match.awayTeam) }}
        </router-link>
        <p v-else class="font-bold text-xs md:text-sm text-center w-full leading-tight px-1"
          :class="isWinner('away') ? 'text-slate-900' : isLoser('away') ? 'text-slate-400' : 'text-slate-800'">
          {{ shortName(match.awayTeam) }}
        </p>
      </div>
    </div>

    <!-- Footer: fecha y cancha -->
    <div class="flex items-center justify-between px-3 py-2 border-t"
      :class="(!match.date || !match.location) && match.status==='scheduled'
        ? 'bg-amber-50 border-amber-100'
        : 'bg-slate-50 border-slate-100'">
      <!-- Cancha -->
      <span class="flex items-center gap-1 min-w-0 mr-2 text-[10px]"
        :class="match.location ? 'text-slate-500' : 'text-amber-500 font-semibold'">
        <IconMapPin class="w-2.5 h-2.5 shrink-0"/>
        <span class="truncate">{{ match.location || 'Cancha por confirmar' }}</span>
      </span>
      <!-- Fecha/hora -->
      <span class="text-[10px] font-medium shrink-0"
        :class="match.date ? 'text-slate-500' : 'text-amber-500 font-semibold'">
        {{ match.date ? fmtDate(match.date) : 'Horario por confirmar' }}
      </span>
    </div>
  </router-link>
</template>

<script setup>
const props = defineProps({
  match:          { type: Object, required: true },
  tournamentSlug: { type: String, default: '' }
})

function isWinner(side) {
  if (props.match.status !== 'finished') return false
  const h = props.match.home_score ?? 0, a = props.match.away_score ?? 0
  return side === 'home' ? h > a : a > h
}
function isLoser(side) {
  if (props.match.status !== 'finished') return false
  const h = props.match.home_score ?? 0, a = props.match.away_score ?? 0
  return side === 'home' ? h < a : a < h
}
function teamColor(name) {
  if (!name) return '#94a3b8'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`
}
function teamInitials(name) {
  if (!name) return '?'
  const p = name.trim().split(/\s+/)
  return p.length === 1 ? name.slice(0,2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase()
}
// Shorten long team names on mobile
function shortName(name) {
  if (!name) return ''
  if (name.length <= 12) return name
  // Return first word or first 10 chars
  const first = name.split(' ')[0]
  return first.length <= 12 ? first : first.slice(0,10) + '.'
}
function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'short' })
}
function fmtTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:true })
}
</script>
