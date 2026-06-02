<template>
  <div class="overflow-x-auto">
    <table class="w-full text-xs">
      <thead>
        <tr class="bg-slate-50 text-slate-400 uppercase tracking-wider text-[9px]">
          <th class="py-2 px-3 text-left w-7">#</th>
          <th class="py-2 px-3 text-left">Equipo</th>
          <th class="py-2 px-2 text-center">PJ</th>
          <th class="py-2 px-2 text-center hidden sm:table-cell">G</th>
          <th class="py-2 px-2 text-center hidden sm:table-cell">E</th>
          <th class="py-2 px-2 text-center hidden sm:table-cell">P</th>
          <th class="py-2 px-2 text-center hidden md:table-cell">GF</th>
          <th class="py-2 px-2 text-center hidden md:table-cell">GC</th>
          <th class="py-2 px-2 text-center hidden sm:table-cell">DG</th>
          <th class="py-2 px-2 text-center hidden lg:table-cell" title="Tarjetas rojas"><span class="inline-block w-2.5 h-3.5 rounded-sm bg-red-500 opacity-80"></span></th>
          <th class="py-2 px-2 text-center hidden lg:table-cell" title="Tarjetas amarillas"><span class="inline-block w-2.5 h-3.5 rounded-sm bg-yellow-400 opacity-80"></span></th>
          <th class="py-2 px-3 text-center font-bold text-primary">PTS</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in standings" :key="row.team_id || i"
          class="border-t border-slate-100 hover:bg-slate-50 transition-colors">
          <!-- Zone bar + posición -->
          <td class="py-2.5 px-3 font-black text-xs relative">
            <span class="zone-bar" :style="{ background: zoneColor(i) }"></span>
            <span :style="{ color: zoneColor(i) }">{{ i + 1 }}</span>
          </td>
          <!-- Equipo -->
          <td class="py-2.5 px-3">
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
                <img v-if="row.logo" :src="row.logo" class="w-full h-full object-contain p-0.5" />
                <span v-else class="text-[8px] font-black" :style="{ color: teamColor(row.teamName) }">
                  {{ initials(row.teamName) }}
                </span>
              </div>
              <router-link v-if="slug && row.team_id" :to="`/${slug}/equipo/${row.team_id}`"
                class="font-semibold text-slate-900 truncate max-w-[100px] hover:text-primary hover:underline">
                {{ row.teamName }}
              </router-link>
              <span v-else class="font-semibold text-slate-900 truncate max-w-[100px]">{{ row.teamName }}</span>
              <span v-if="i < advanceCount"
                class="hidden sm:inline-flex text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full"
                :style="{ color: zoneColor(i), background: zoneColor(i) + '1a' }">
                ↑
              </span>
            </div>
          </td>
          <td class="py-2.5 px-2 text-center text-slate-500">{{ row.played ?? 0 }}</td>
          <td class="py-2.5 px-2 text-center text-emerald-600 font-semibold hidden sm:table-cell">{{ row.won ?? 0 }}</td>
          <td class="py-2.5 px-2 text-center text-slate-400 hidden sm:table-cell">{{ row.drawn ?? 0 }}</td>
          <td class="py-2.5 px-2 text-center text-red-400 hidden sm:table-cell">{{ row.lost ?? 0 }}</td>
          <td class="py-2.5 px-2 text-center text-slate-500 hidden md:table-cell">{{ row.goals_for ?? 0 }}</td>
          <td class="py-2.5 px-2 text-center text-slate-500 hidden md:table-cell">{{ row.goals_against ?? 0 }}</td>
          <td class="py-2.5 px-2 text-center hidden sm:table-cell font-semibold"
            :class="diff(row) > 0 ? 'text-emerald-600' : diff(row) < 0 ? 'text-red-500' : 'text-slate-300'">
            {{ diff(row) > 0 ? '+' : '' }}{{ diff(row) }}
          </td>
          <td class="py-2.5 px-2 text-center text-slate-400 hidden lg:table-cell text-[10px]">
            {{ row.red_cards > 0 ? row.red_cards : '-' }}
          </td>
          <td class="py-2.5 px-2 text-center text-slate-400 hidden lg:table-cell text-[10px]">
            {{ row.yellow_cards > 0 ? row.yellow_cards : '-' }}
          </td>
          <td class="py-2.5 px-3 text-center font-black text-sm text-primary">{{ row.points ?? 0 }}</td>
        </tr>
        <tr v-if="!standings.length">
          <td colspan="12" class="text-center text-slate-400 py-8 text-xs italic">Sin partidos jugados aún</td>
        </tr>
      </tbody>
    </table>

    <!-- Leyenda de zonas -->
    <div v-if="advanceCount && standings.length" class="flex flex-wrap items-center gap-4 px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-[9px] text-slate-500 font-semibold uppercase tracking-wide">
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-sm" style="background:#10b981"></span> 1° — Clasifica directo
      </div>
      <div v-if="advanceCount > 1" class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-sm" style="background:#0ea5e9"></span> 2°+ — Clasifica
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-sm bg-slate-300"></span> Eliminado
      </div>
      <div class="ml-auto text-slate-400 normal-case font-normal">
        Desempate: Pts · DG · GF · H2H · Disciplina
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  standings:    { type: Array,  default: () => [] },
  advanceCount: { type: Number, default: 1 },
  slug:         { type: String, default: '' }
})

function zoneColor(i) {
  if (i === 0) return '#10b981'
  if (i < 4)  return '#0ea5e9'
  return '#94a3b8'
}
function diff(row) {
  return row.goalDiff ?? (row.goals_for ?? 0) - (row.goals_against ?? 0)
}
function teamColor(name) {
  if (!name) return '#94a3b8'
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${Math.abs(h) % 360},55%,40%)`
}
function initials(name) {
  if (!name) return '?'
  const p = name.trim().split(/\s+/)
  return p.length === 1 ? name.slice(0,2).toUpperCase() : (p[0][0]+p[1][0]).toUpperCase()
}
</script>

<style scoped>
.zone-bar {
  position: absolute;
  left: 0; top: 4px; bottom: 4px;
  width: 3px;
  border-radius: 0 2px 2px 0;
}
</style>
