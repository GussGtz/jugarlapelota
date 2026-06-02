<template>
  <div class="space-y-10">

    <!-- ── HOY ──────────────────────────────────────────────── -->
    <section v-if="today.length">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-1 h-6 bg-orange-400 rounded-full"></div>
        <h2 class="text-lg font-extrabold text-slate-900">Hoy</h2>
        <span class="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest
          bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-full">
          <span class="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
          {{ today.length }} partido{{ today.length !== 1 ? 's' : '' }}
        </span>
      </div>
      <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <MatchCard v-for="m in today" :key="m.id" :match="m" :tournament-slug="slug" />
      </div>
    </section>

    <!-- ── PRÓXIMOS ──────────────────────────────────────────── -->
    <section v-if="upcoming.length">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-1 h-6 bg-primary rounded-full"></div>
        <h2 class="text-lg font-extrabold text-slate-900">Próximos</h2>
        <span class="text-xs text-slate-400">{{ upcoming.length }} partido{{ upcoming.length !== 1 ? 's' : '' }}</span>
      </div>
      <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <MatchCard v-for="m in upcoming" :key="m.id" :match="m" :tournament-slug="slug" />
      </div>
    </section>

    <!-- ── RESULTADOS ─────────────────────────────────────────── -->
    <section v-if="hasFinished">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-1 h-6 bg-accent rounded-full"></div>
        <h2 class="text-lg font-extrabold text-slate-900">Resultados</h2>
      </div>

      <!-- Si hay rondas (liga): agrupado por jornada -->
      <template v-if="rounds && rounds.length">
        <div class="space-y-6">
          <div v-for="round in [...rounds].reverse()" :key="round.id">
            <template v-if="matchesByRound && matchesByRound(round.id).some(m => m.status === 'finished')">
              <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span class="w-1 h-3 bg-slate-300 rounded-full"></span>{{ round.name }}
              </p>
              <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <MatchCard
                  v-for="m in matchesByRound(round.id).filter(m => m.status === 'finished')"
                  :key="m.id" :match="m" :tournament-slug="slug" />
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- Sin rondas (knockout, grupos, sin fase): lista plana más recientes primero -->
      <template v-else>
        <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <MatchCard v-for="m in finished" :key="m.id" :match="m" :tournament-slug="slug" />
        </div>
      </template>
    </section>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import MatchCard from '@/components/MatchCard/MatchCard.vue'

const props = defineProps({
  today:          { type: Array, default: () => [] },
  upcoming:       { type: Array, default: () => [] },
  finished:       { type: Array, default: () => [] },
  slug:           { type: String, required: true },
  // Opcionales para vista por jornada (league)
  rounds:         { type: Array,    default: null },
  matchesByRound: { type: Function, default: null },
})

const hasFinished = computed(() => {
  if (props.rounds?.length && props.matchesByRound) {
    return props.rounds.some(r => props.matchesByRound(r.id).some(m => m.status === 'finished'))
  }
  return props.finished.length > 0
})
</script>
