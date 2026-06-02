<template>
  <div class="overflow-x-auto rounded-2xl" :class="dark ? 'border border-white/10' : 'border border-muted'">
    <table class="w-full text-sm min-w-[320px]">
      <thead :class="dark ? 'bg-white/5 text-white/50' : 'bg-slate-100 text-slate-500'"
        class="uppercase text-[10px] md:text-xs tracking-wider">
        <tr>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-left w-6">#</th>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-left">Equipo</th>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-center">PJ</th>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-center hidden sm:table-cell">G</th>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-center hidden sm:table-cell">E</th>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-center hidden sm:table-cell">P</th>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-center hidden md:table-cell">GF</th>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-center hidden md:table-cell">GC</th>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-center hidden sm:table-cell">DG</th>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-center hidden lg:table-cell" title="Tarjetas rojas"><span class="inline-block w-2.5 h-3.5 rounded-sm bg-red-500 opacity-80"></span></th>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-center hidden lg:table-cell" title="Tarjetas amarillas"><span class="inline-block w-2.5 h-3.5 rounded-sm bg-yellow-400 opacity-80"></span></th>
          <th class="py-2.5 px-2 md:py-3 md:px-4 text-center font-bold text-primary">PTS</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in standings" :key="row.team_id || row.teamId || i"
          class="transition-colors"
          :class="[
            dark ? 'border-t border-white/10 hover:bg-white/5 text-white' : 'border-t border-slate-100 hover:bg-slate-50',
            i === 0 ? 'border-l-2 border-l-yellow-400' :
            i < 3  ? 'border-l-2 border-l-primary/40' : ''
          ]">
          <!-- Posición -->
          <td class="py-2.5 px-2 md:py-3 md:px-4 font-black text-xs"
            :class="i === 0 ? 'text-yellow-500' : i < 3 ? 'text-primary' : dark ? 'text-white/40' : 'text-slate-300'">
            {{ i + 1 }}
          </td>
          <!-- Equipo -->
          <td class="py-2.5 px-2 md:py-3 md:px-4">
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 md:w-6 md:h-6 rounded overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
                <img v-if="row.logo" :src="row.logo" class="w-full h-full object-contain p-0.5" />
                <span v-else class="text-[7px] font-black text-slate-500">{{ initials(row.teamName) }}</span>
              </div>
              <router-link v-if="slug && row.team_id" :to="`/${slug}/equipo/${row.team_id}`"
                :class="dark ? 'font-semibold text-white text-xs md:text-sm truncate max-w-[100px] md:max-w-[160px] hover:text-primary hover:underline' : 'font-semibold text-slate-900 text-xs md:text-sm truncate max-w-[100px] md:max-w-[160px] hover:text-primary hover:underline'">
                {{ row.teamName }}
              </router-link>
              <span v-else :class="dark ? 'font-semibold text-white text-xs md:text-sm truncate max-w-[100px] md:max-w-[160px]' : 'font-semibold text-slate-900 text-xs md:text-sm truncate max-w-[100px] md:max-w-[160px]'">
                {{ row.teamName }}
              </span>
            </div>
          </td>
          <td class="py-2.5 px-2 md:py-3 md:px-4 text-center text-xs md:text-sm" :class="dark ? 'text-white/60' : 'text-slate-600'">
            {{ row.played ?? 0 }}
          </td>
          <td class="py-2.5 px-2 md:py-3 md:px-4 text-center text-emerald-500 font-semibold text-xs md:text-sm hidden sm:table-cell">
            {{ row.won ?? 0 }}
          </td>
          <td class="py-2.5 px-2 md:py-3 md:px-4 text-center text-xs md:text-sm hidden sm:table-cell" :class="dark ? 'text-white/50' : 'text-slate-500'">
            {{ row.drawn ?? 0 }}
          </td>
          <td class="py-2.5 px-2 md:py-3 md:px-4 text-center text-red-400 text-xs md:text-sm hidden sm:table-cell">
            {{ row.lost ?? 0 }}
          </td>
          <td class="py-2.5 px-2 md:py-3 md:px-4 text-center text-xs md:text-sm hidden md:table-cell" :class="dark ? 'text-white/60' : 'text-slate-600'">
            {{ row.goals_for ?? row.goalsFor ?? 0 }}
          </td>
          <td class="py-2.5 px-2 md:py-3 md:px-4 text-center text-xs md:text-sm hidden md:table-cell" :class="dark ? 'text-white/60' : 'text-slate-600'">
            {{ row.goals_against ?? row.goalsAgainst ?? 0 }}
          </td>
          <td class="py-2.5 px-2 md:py-3 md:px-4 text-center text-xs md:text-sm font-semibold hidden sm:table-cell"
            :class="goalDiff(row) > 0 ? 'text-emerald-500' : goalDiff(row) < 0 ? 'text-red-400' : dark ? 'text-white/30' : 'text-slate-300'">
            {{ goalDiff(row) > 0 ? '+' : '' }}{{ goalDiff(row) }}
          </td>
          <td class="py-2.5 px-2 md:py-3 md:px-4 text-center text-xs hidden lg:table-cell" :class="dark ? 'text-white/40' : 'text-slate-400'">
            {{ (row.red_cards ?? 0) > 0 ? row.red_cards : '-' }}
          </td>
          <td class="py-2.5 px-2 md:py-3 md:px-4 text-center text-xs hidden lg:table-cell" :class="dark ? 'text-white/40' : 'text-slate-400'">
            {{ (row.yellow_cards ?? 0) > 0 ? row.yellow_cards : '-' }}
          </td>
          <td class="py-2.5 px-2 md:py-3 md:px-4 text-center font-black text-primary text-sm md:text-base">
            {{ row.points ?? 0 }}
          </td>
        </tr>
        <tr v-if="!standings.length">
          <td colspan="12" class="text-center py-10 text-xs italic" :class="dark ? 'text-white/30' : 'text-slate-400'">
            Sin partidos jugados aún
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Criterios de desempate -->
    <div v-if="standings.length" class="flex flex-wrap items-center gap-2 px-4 py-2 border-t text-[9px] font-medium uppercase tracking-wide"
      :class="dark ? 'border-white/10 text-white/30 bg-white/5' : 'border-slate-100 text-slate-400 bg-slate-50'">
      <span>Desempate:</span>
      <span class="font-bold inline-flex items-center gap-1" :class="dark ? 'text-white/50' : 'text-slate-500'">
        Pts → DG → GF → H2H →
        <span class="inline-block w-2 h-3 rounded-sm bg-red-500 opacity-70"></span>
        →
        <span class="inline-block w-2 h-3 rounded-sm bg-yellow-400 opacity-70"></span>
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  standings: { type: Array,   default: () => [] },
  slug:      { type: String,  default: '' },
  dark:      { type: Boolean, default: false }
})

function goalDiff(row) {
  return row.goalDiff ?? (row.goals_for ?? row.goalsFor ?? 0) - (row.goals_against ?? row.goalsAgainst ?? 0)
}
function initials(name) {
  if (!name) return '?'
  const p = name.trim().split(/\s+/)
  return p.length === 1 ? name.slice(0,2).toUpperCase() : (p[0][0]+p[1][0]).toUpperCase()
}
</script>
