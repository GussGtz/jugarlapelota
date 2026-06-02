<template>
  <div class="overflow-x-auto pb-6 select-none" style="background:#f8fafc">

    <!-- Empty state -->
    <div v-if="!roundColumns.length" class="text-center py-20 px-8">
      <IconTrophy class="w-14 h-14 mx-auto mb-3 text-slate-200" />
      <p class="text-slate-400 font-semibold">Sin partidos en este bracket</p>
      <p class="text-slate-300 text-sm mt-1">Genera los partidos desde el panel de Fases</p>
    </div>

    <div v-else class="relative min-w-max" ref="containerRef">

      <!-- Round labels row -->
      <div class="flex items-center mb-4 pt-4 px-4" :style="{ gap: 0 }">
        <div v-for="(round, ri) in roundColumns" :key="'label-'+ri"
          class="text-center shrink-0"
          :style="{ width: CARD_W + 'px', paddingLeft: ri === 0 ? '0' : COL_GAP + 'px' }">
          <span class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{{ round.name }}</span>
        </div>
      </div>

      <!-- SVG connector lines -->
      <svg class="absolute inset-0 pointer-events-none" style="top:0;left:0;overflow:visible"
        :width="svgW" :height="svgH">
        <path v-for="(l,i) in lines" :key="i"
          :d="l.d" fill="none"
          :stroke="l.done ? '#10b981' : '#cbd5e1'"
          stroke-width="2" stroke-linecap="square" />
      </svg>

      <!-- Match columns -->
      <div class="flex items-start px-4" style="gap:0">
        <div v-for="(round, ri) in roundColumns" :key="'col-'+ri"
          class="shrink-0 flex flex-col"
          :style="{
            width: CARD_W + 'px',
            paddingLeft: ri === 0 ? '0' : COL_GAP + 'px',
            gap: cardGap(ri) + 'px',
            marginTop: cardMarginTop(ri) + 'px',
            paddingBottom: '24px'
          }">

          <!-- Match card -->
          <div v-for="match in round.matches" :key="match.id || Math.random()"
            ref="cardEls"
            :data-round="ri"
            :data-mid="match.id"
            class="bracket-card rounded-lg overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
            :class="[
              match.status === 'live' ? 'ring-1 ring-red-400 shadow-red-100 shadow-md' : '',
              isBye(match) ? 'opacity-40 pointer-events-none' : ''
            ]"
            @click="match.id && $router.push(`/${tournamentSlug}/partido/${match.id}`)">

            <!-- Card header -->
            <div class="flex items-center justify-between px-2.5 py-1" style="background:#f1f5f9;border-bottom:1px solid #e2e8f0">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{{ round.name }}</span>
              <span v-if="match.status === 'live'"
                class="text-[9px] font-black text-red-500 flex items-center gap-1 animate-pulse">
                <span class="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>EN VIVO
              </span>
              <span v-else-if="match.status === 'finished'"
                class="text-[9px] font-black text-emerald-500 uppercase tracking-wider">FINAL</span>
              <span v-else class="text-[9px] text-slate-300">{{ fmtDate(match.date) }}</span>
            </div>

            <!-- Home team row -->
            <div class="team-row flex items-center gap-2 px-2.5 py-2 border-b"
              :style="{
                background: isWinner(match,'home') ? '#f0fdf4' : 'white',
                borderColor: '#f1f5f9'
              }">
              <!-- Seed badge -->
              <div class="seed-badge shrink-0 w-6 h-6 rounded flex items-center justify-center text-[9px] font-black text-white"
                :style="{ background: isTBD(match,'home') ? '#cbd5e1' : teamColor(match.homeTeam) }">
                {{ match.bracket_slot != null ? slotLabel(match.bracket_slot, 'home') : '' }}
              </div>
              <!-- Logo -->
              <div class="w-7 h-7 shrink-0 flex items-center justify-center rounded overflow-hidden bg-slate-50">
                <img v-if="match.homeLogo" :src="match.homeLogo" class="w-full h-full object-contain" />
                <span v-else-if="!isTBD(match,'home')"
                  class="text-[10px] font-black"
                  :style="{ color: teamColor(match.homeTeam) }">
                  {{ teamInitials(match.homeTeam) }}
                </span>
                <span v-else class="text-slate-300 text-[10px]">?</span>
              </div>
              <!-- Name -->
              <span class="flex-1 text-[11px] font-black uppercase leading-tight truncate"
                :class="[
                  isTBD(match,'home')    ? 'text-slate-300 italic font-normal normal-case' :
                  isWinner(match,'home') ? 'text-slate-900' :
                  isLoser(match,'home')  ? 'text-slate-300 line-through' :
                  'text-slate-700'
                ]">
                {{ isTBD(match,'home') ? 'Por definir' : (match.homeTeam || 'Por determinar') }}
              </span>
              <!-- Champion trophy -->
              <span v-if="match.status === 'finished' && isWinner(match,'home') && /^final$/i.test(round.name)"
                class="leading-none" title="Campeón"><IconTrophy class="w-3.5 h-3.5 text-yellow-500 inline"/></span>
              <!-- Score -->
              <span class="text-sm font-black shrink-0 w-5 text-right"
                :class="[
                  match.status === 'scheduled' ? 'text-slate-200' :
                  isWinner(match,'home') ? 'text-emerald-600' :
                  isLoser(match,'home')  ? 'text-slate-300' :
                  'text-slate-700'
                ]">
                {{ match.status !== 'scheduled' ? match.home_score : '' }}
              </span>
            </div>

            <!-- Away team row -->
            <div class="team-row flex items-center gap-2 px-2.5 py-2"
              :style="{
                background: isWinner(match,'away') ? '#f0fdf4' : 'white',
              }">
              <div class="seed-badge shrink-0 w-6 h-6 rounded flex items-center justify-center text-[9px] font-black text-white"
                :style="{ background: isTBD(match,'away') ? '#cbd5e1' : teamColor(match.awayTeam) }">
                {{ match.bracket_slot != null ? slotLabel(match.bracket_slot, 'away') : '' }}
              </div>
              <div class="w-7 h-7 shrink-0 flex items-center justify-center rounded overflow-hidden bg-slate-50">
                <img v-if="match.awayLogo" :src="match.awayLogo" class="w-full h-full object-contain" />
                <span v-else-if="!isTBD(match,'away')"
                  class="text-[10px] font-black"
                  :style="{ color: teamColor(match.awayTeam) }">
                  {{ teamInitials(match.awayTeam) }}
                </span>
                <span v-else class="text-slate-300 text-[10px]">?</span>
              </div>
              <span class="flex-1 text-[11px] font-black uppercase leading-tight truncate"
                :class="[
                  isTBD(match,'away')    ? 'text-slate-300 italic font-normal normal-case' :
                  isWinner(match,'away') ? 'text-slate-900' :
                  isLoser(match,'away')  ? 'text-slate-300 line-through' :
                  'text-slate-700'
                ]">
                {{ isTBD(match,'away') ? 'Por definir' : (match.awayTeam || 'Por determinar') }}
              </span>
              <!-- Champion trophy -->
              <span v-if="match.status === 'finished' && isWinner(match,'away') && /^final$/i.test(round.name)"
                class="leading-none" title="Campeón"><IconTrophy class="w-3.5 h-3.5 text-yellow-500 inline"/></span>
              <span class="text-sm font-black shrink-0 w-5 text-right"
                :class="[
                  match.status === 'scheduled' ? 'text-slate-200' :
                  isWinner(match,'away') ? 'text-emerald-600' :
                  isLoser(match,'away')  ? 'text-slate-300' :
                  'text-slate-700'
                ]">
                {{ match.status !== 'scheduled' ? match.away_score : '' }}
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  matches:        { type: Array,  default: () => [] },
  rounds:         { type: Array,  default: () => [] },
  tournamentSlug: { type: String, default: '' }
})

const containerRef = ref(null)
const cardEls      = ref([])
const lines        = ref([])
const svgW         = ref(0)
const svgH         = ref(0)

const CARD_W   = 230
const COL_GAP  = 48
const CARD_H   = 90   // approximate card height
const BASE_GAP = 12   // gap between cards in round 0

function cardGap(ri)       { return BASE_GAP * Math.pow(2, ri) }
function cardMarginTop(ri) { return ri === 0 ? 0 : cardGap(ri) / 2 }

// ── Data ──────────────────────────────────────────────
const roundColumns = computed(() => {
  const cols = []
  for (const round of props.rounds) {
    const ms = props.matches
      .filter(m => m.round_id === round.id)
      .sort((a, b) => (a.bracket_slot ?? a.id) - (b.bracket_slot ?? b.id))
    if (ms.length) cols.push({ name: round.name, matches: ms })
  }
  const noRound = props.matches.filter(m => !m.round_id)
  if (noRound.length) cols.push({ name: 'Partidos', matches: noRound })
  return cols
})

// ── Helpers ───────────────────────────────────────────
function isWinner(m, s) { return m.status === 'finished' && (s === 'home' ? m.home_score > m.away_score : m.away_score > m.home_score) }
function isLoser(m, s)  { return m.status === 'finished' && (s === 'home' ? m.home_score < m.away_score : m.away_score < m.home_score) }
function isTBD(m, s)    { return s === 'home' ? (m.home_is_tbd === 1 || (!m.homeTeam && !m.home_team)) : (m.away_is_tbd === 1 || (!m.awayTeam && !m.away_team)) }
function isBye(m)       { return !m.home_team && !m.away_team }

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
}

// Seed slot labels (A1, A2, B1, B2…)
function slotLabel(slot, side) {
  if (slot == null) return ''
  const pair   = Math.floor(slot / 2)
  const letter = String.fromCharCode(65 + pair)
  const num    = side === 'home' ? pair * 2 + 1 : pair * 2 + 2
  return letter + num
}

function teamColor(name) {
  if (!name) return '#94a3b8'
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${Math.abs(h) % 360},55%,38%)`
}
function teamInitials(name) {
  if (!name) return '?'
  const p = name.trim().split(/\s+/)
  return p.length === 1 ? name.slice(0,2).toUpperCase() : (p[0][0]+p[1][0]).toUpperCase()
}

// ── SVG bracket lines (L-shape: H → V → H) ───────────
function buildLines() {
  if (!containerRef.value || roundColumns.value.length < 2) return
  const cRect = containerRef.value.getBoundingClientRect()
  svgW.value  = containerRef.value.scrollWidth  + 40
  svgH.value  = containerRef.value.scrollHeight + 40

  const byRound = {}
  for (const el of (cardEls.value || [])) {
    const ri = parseInt(el.dataset.round)
    if (!byRound[ri]) byRound[ri] = []
    byRound[ri].push(el)
  }

  const result = []
  for (let ri = 0; ri < roundColumns.value.length - 1; ri++) {
    const cur  = byRound[ri]     || []
    const next = byRound[ri + 1] || []
    if (!cur.length || !next.length) continue

    for (let ni = 0; ni < next.length; ni++) {
      const nCard = next[ni]
      if (!nCard) continue
      const nR = nCard.getBoundingClientRect()
      // Entry point: left-middle of the next card
      const x2 = nR.left - cRect.left
      const y2 = nR.top  - cRect.top + nR.height / 2

      const pair = [cur[ni * 2], cur[ni * 2 + 1]]
      const pairRects = pair.map(c => c ? c.getBoundingClientRect() : null)

      // midX: horizontal midpoint between columns
      const midX = pairRects.find(Boolean)
        ? pairRects.find(Boolean).right - cRect.left + (COL_GAP / 2)
        : x2 - COL_GAP / 2

      // Vertical connector: between the midpoints of the two feeder cards
      const ys = pairRects.filter(Boolean).map(r => r.top - cRect.top + r.height / 2)
      if (ys.length === 2) {
        // Vertical spine
        result.push({
          d: `M ${midX} ${ys[0]} V ${ys[1]}`,
          done: pair.every(c => {
            if (!c) return false
            const m = props.matches.find(m => m.id === parseInt(c.dataset.mid))
            return m?.status === 'finished'
          })
        })
        // Arrow to next card
        result.push({
          d: `M ${midX} ${y2} H ${x2}`,
          done: roundColumns.value[ri + 1]?.matches[ni]?.status !== 'scheduled'
        })
      }

      for (const [idx, card] of pair.entries()) {
        if (!card) continue
        const r   = card.getBoundingClientRect()
        const x1  = r.right - cRect.left
        const y1  = r.top   - cRect.top + r.height / 2
        const mid = props.matches.find(m => m.id === parseInt(card.dataset.mid))
        // Horizontal stub from card to midX
        result.push({
          d:    `M ${x1} ${y1} H ${midX}`,
          done: mid?.status === 'finished'
        })
      }
    }
  }
  lines.value = result
}

onMounted(() => nextTick(buildLines))
watch(() => [props.matches, props.rounds], () => nextTick(buildLines), { deep: true })
</script>

<style scoped>
.bracket-card {
  border: 1.5px solid #e2e8f0;
  background: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.bracket-card:hover {
  border-color: #94a3b8;
}
.seed-badge {
  font-size: 9px;
  min-width: 24px;
}
</style>
