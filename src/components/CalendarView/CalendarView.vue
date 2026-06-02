<template>
  <div class="space-y-5">
    <!-- Month Navigation Header -->
    <div class="flex items-center justify-between">
      <button @click="prevMonth"
        class="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 hover:border-primary hover:text-primary text-slate-500 transition-colors">
        <IconChevronLeft class="w-5 h-5" />
      </button>

      <div class="text-center">
        <h3 class="text-xl font-extrabold text-slate-900 capitalize leading-tight">{{ monthName }}</h3>
        <p class="text-xs text-slate-400 font-medium">{{ currentYear }}</p>
      </div>

      <button @click="nextMonth"
        class="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 hover:border-primary hover:text-primary text-slate-500 transition-colors">
        <IconChevronRight class="w-5 h-5" />
      </button>
    </div>

    <!-- Day headers -->
    <div class="grid grid-cols-7 gap-1">
      <div v-for="day in dayNames" :key="day"
        class="text-center text-xs font-bold text-slate-400 uppercase py-2 tracking-wider">
        {{ day }}
      </div>
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-1.5">
      <div
        v-for="cell in calendarCells"
        :key="cell.key"
        @click="cell.day && selectDay(cell)"
        class="min-h-[90px] rounded-2xl p-2 transition-all relative"
        :class="[
          cell.day ? 'cursor-pointer hover:border-primary/50' : '',
          cell.isToday
            ? 'ring-2 ring-primary bg-white border border-slate-100 shadow-sm'
            : cell.day
              ? 'bg-white border border-slate-100 hover:shadow-md'
              : 'bg-transparent',
          selectedCell?.key === cell.key
            ? '!border-primary !bg-primary/5 shadow-md' : '',
          cell.matches?.length > 0 ? 'shadow-sm' : '',
          !cell.day ? '' : ''
        ]"
      >
        <template v-if="cell.day">
          <!-- Day number -->
          <div class="flex items-center justify-between mb-1.5">
            <span
              class="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full"
              :class="
                selectedCell?.key === cell.key
                  ? 'bg-primary text-white'
                  : cell.isToday
                    ? 'text-primary font-extrabold'
                    : 'text-slate-600'
              ">
              {{ cell.day }}
            </span>
            <span v-if="cell.matches.length > 0"
              class="text-[9px] font-bold text-slate-400">
              {{ cell.matches.length }}
            </span>
          </div>

          <!-- Match dots / badges -->
          <div class="space-y-1">
            <div
              v-for="match in cell.matches.slice(0, 3)"
              :key="match.id"
              class="flex items-center gap-1 text-[10px] leading-tight rounded-lg px-1.5 py-1 truncate"
              :class="matchBadgeClass(match.status)"
            >
              <span
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :class="match.status === 'live' ? 'bg-red-500 animate-pulse' : match.status === 'finished' ? 'bg-slate-400' : 'bg-primary'">
              </span>
              <span class="truncate font-medium">{{ match.homeTeam?.split(' ')[0] }}</span>
            </div>
            <div v-if="cell.matches.length > 3"
              class="text-[10px] text-slate-400 text-center font-medium">
              +{{ cell.matches.length - 3 }} más
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Selected day detail panel -->
    <Transition name="fade-expand">
      <div v-if="selectedCell && selectedCell.matches.length" class="space-y-3">
        <div class="flex items-center gap-2 px-1">
          <IconCalendarDays class="w-4 h-4 text-primary" />
          <h4 class="font-bold text-slate-900 capitalize">{{ selectedDateLabel }}</h4>
          <span class="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
            {{ selectedCell.matches.length }} partido{{ selectedCell.matches.length > 1 ? 's' : '' }}
          </span>
        </div>

        <div class="grid sm:grid-cols-2 gap-3">
          <div
            v-for="match in selectedCell.matches"
            :key="match.id"
            class="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
            @click="$emit('match-click', match)"
          >
            <!-- Header -->
            <div class="px-4 py-2 bg-slate-50 flex items-center justify-between">
              <span class="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {{ match.roundName || match.phaseName || 'Partido' }}
              </span>
              <div class="flex items-center gap-1.5">
                <span v-if="match.status === 'live'"
                  class="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                  <span class="live-dot w-1.5 h-1.5"></span> EN VIVO
                </span>
                <span v-else-if="match.status === 'finished'"
                  class="text-[10px] text-emerald-600 font-bold">Final</span>
                <span v-else class="text-[10px] text-slate-400">{{ fmtTime(match.date) }}</span>
              </div>
            </div>

            <!-- Teams with avatars and score -->
            <div class="px-4 py-3 space-y-2">
              <!-- Home -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div class="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
                    :style="{ background: teamColor(match.homeTeam) }">
                    {{ teamInitials(match.homeTeam) }}
                  </div>
                  <span class="text-sm font-bold text-slate-900 truncate">{{ match.homeTeam }}</span>
                </div>
                <span v-if="match.status !== 'scheduled'"
                  class="font-black text-xl text-primary w-7 text-center">{{ match.home_score }}</span>
                <span v-else class="text-slate-300 text-sm w-7 text-center">—</span>
              </div>
              <!-- Away -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div class="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
                    :style="{ background: teamColor(match.awayTeam) }">
                    {{ teamInitials(match.awayTeam) }}
                  </div>
                  <span class="text-sm font-bold text-slate-900 truncate">{{ match.awayTeam }}</span>
                </div>
                <span v-if="match.status !== 'scheduled'"
                  class="font-black text-xl text-primary w-7 text-center">{{ match.away_score }}</span>
                <span v-else class="text-slate-300 text-sm w-7 text-center">—</span>
              </div>
            </div>

            <!-- Location footer -->
            <div v-if="match.location" class="px-4 py-2 border-t border-slate-50">
              <span class="text-[10px] text-slate-400 flex items-center gap-1">
                <IconMapPin class="w-3 h-3" /> {{ match.location }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="selectedCell && !selectedCell.matches.length"
        class="text-center text-slate-400 text-sm py-6 bg-white rounded-2xl border border-slate-100">
        Sin partidos para este día.
      </div>
    </Transition>

    <!-- Legend -->
    <div class="flex items-center gap-4 flex-wrap pt-3 border-t border-slate-100">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-primary inline-block"></span>
        <span class="text-xs text-slate-500">Programado</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
        <span class="text-xs text-slate-500">En vivo</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
        <span class="text-xs text-slate-500">Finalizado</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  matches: { type: Array, default: () => [] }
})

defineEmits(['match-click'])

const today        = new Date()
const currentYear  = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())
const selectedCell = ref(null)

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const monthName = computed(() =>
  new Date(currentYear.value, currentMonth.value, 1)
    .toLocaleDateString('es-MX', { month: 'long' })
)

const selectedDateLabel = computed(() => {
  if (!selectedCell.value?.day) return ''
  return new Date(currentYear.value, currentMonth.value, selectedCell.value.day)
    .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
})

const calendarCells = computed(() => {
  const year     = currentYear.value
  const month    = currentMonth.value
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < firstDay; i++) {
    cells.push({ key: `empty-${i}`, day: null, matches: [] })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d
    const dayMatches = props.matches.filter(m => {
      if (!m.date) return false
      const md = new Date(m.date)
      return md.getFullYear() === year && md.getMonth() === month && md.getDate() === d
    })
    cells.push({ key: dateStr, day: d, isToday, matches: dayMatches })
  }

  const remainder = cells.length % 7
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push({ key: `end-${i}`, day: null, matches: [] })
    }
  }

  return cells
})

function prevMonth() {
  selectedCell.value = null
  if (currentMonth.value === 0) { currentMonth.value = 11; currentYear.value-- }
  else currentMonth.value--
}
function nextMonth() {
  selectedCell.value = null
  if (currentMonth.value === 11) { currentMonth.value = 0; currentYear.value++ }
  else currentMonth.value++
}
function selectDay(cell) {
  selectedCell.value = selectedCell.value?.key === cell.key ? null : cell
}

function matchBadgeClass(status) {
  if (status === 'live')     return 'bg-red-50 text-red-600'
  if (status === 'finished') return 'bg-slate-100 text-slate-500'
  return 'bg-sky-50 text-primary'
}
function fmtTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function teamColor(name) {
  if (!name) return '#94a3b8'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`
}
function teamInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length === 1 ? name.slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase()
}
</script>

<style scoped>
.fade-expand-enter-active { animation: fadeExpand 0.25s ease-out; }
.fade-expand-leave-active { animation: fadeExpand 0.2s ease-in reverse; }
@keyframes fadeExpand {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
