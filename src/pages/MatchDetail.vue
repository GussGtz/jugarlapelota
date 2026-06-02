<template>
  <div class="max-w-2xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-5">
    <div v-if="loading" class="card animate-pulse h-64 bg-muted/50"></div>

    <template v-else-if="match">

      <!-- ── MARCADOR PRINCIPAL ─────────────────────────────── -->
      <div class="card overflow-hidden">

        <!-- Barra de estado -->
        <div class="flex items-center justify-center gap-3 py-2.5 text-xs font-black uppercase tracking-widest"
          :class="match.status==='live'     ? 'bg-red-600 text-white' :
                  match.status==='finished' ? 'bg-slate-100 text-slate-500' :
                  'bg-primary/10 text-primary'">
          <span v-if="match.status==='live'" class="flex items-center gap-2">
            <span class="w-2 h-2 bg-white rounded-full animate-ping inline-block"></span>
            EN VIVO · {{ elapsedStr }}
          </span>
          <span v-else-if="match.status==='finished'">Partido Finalizado</span>
          <span v-else>Programado · {{ formattedDate }}</span>
        </div>

        <!-- Equipos + marcador -->
        <div class="flex items-center py-6 px-4 gap-3">
          <!-- Local -->
          <div class="flex-1 flex flex-col items-center gap-2 text-center">
            <router-link :to="`/${route.params.slug}/equipo/${match.home_team}`"
              class="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              :class="followsHome ? 'ring-2 ring-primary ring-offset-2' : ''">
              <img v-if="match.homeLogo" :src="match.homeLogo" class="w-full h-full object-contain p-1"/>
              <IconShirt v-else class="w-8 h-8 text-slate-400"/>
            </router-link>
            <router-link :to="`/${route.params.slug}/equipo/${match.home_team}`"
              class="font-black text-slate-900 text-sm leading-tight hover:text-primary transition-colors">
              {{ match.homeTeam }}
            </router-link>
            <button @click="following.toggle(match.home_team)"
              class="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-all"
              :class="followsHome
                ? 'bg-red-50 border-red-200 text-red-500'
                : 'border-slate-200 text-slate-400 hover:border-primary/40 hover:text-primary'">
              <IconHeart class="w-3 h-3" :class="followsHome ? 'fill-red-400 text-red-400' : ''"/>
              {{ followsHome ? 'Siguiendo' : 'Seguir' }}
            </button>
            <!-- Tarjetas del equipo local -->
            <div class="flex gap-1 flex-wrap justify-center">
              <span v-for="ev in homeCards" :key="ev.id"
                class="text-[9px] font-bold px-1.5 py-0.5 rounded"
                :class="ev.type==='yellow_card' ? 'bg-yellow-400 text-yellow-900' : 'bg-red-600 text-white'">
                {{ ev.playerNumber || '?' }}
              </span>
            </div>
          </div>

          <!-- Goles -->
          <div class="text-center px-2">
            <div v-if="match.status !== 'scheduled'" class="text-5xl md:text-6xl font-black text-slate-900 tabular-nums">
              {{ match.home_score }}<span class="text-slate-300 mx-1.5">-</span>{{ match.away_score }}
            </div>
            <div v-else class="text-4xl font-black text-slate-300">vs</div>
            <!-- Fecha y cancha bajo el marcador -->
            <div class="mt-2 space-y-1">
              <p class="text-[11px] flex items-center justify-center gap-1"
                :class="match.date ? 'text-slate-500' : 'text-amber-500 font-semibold'">
                <IconClock class="w-3 h-3 shrink-0"/>
                {{ match.date
                    ? new Date(match.date).toLocaleDateString('es-MX',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
                    : 'Horario por confirmar' }}
              </p>
              <p class="text-[11px] flex items-center justify-center gap-1"
                :class="match.location ? 'text-slate-500' : 'text-amber-500 font-semibold'">
                <IconMapPin class="w-3 h-3 shrink-0"/>
                {{ match.location || 'Cancha por confirmar' }}
              </p>
            </div>
          </div>

          <!-- Visitante -->
          <div class="flex-1 flex flex-col items-center gap-2 text-center">
            <router-link :to="`/${route.params.slug}/equipo/${match.away_team}`"
              class="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              :class="followsAway ? 'ring-2 ring-primary ring-offset-2' : ''">
              <img v-if="match.awayLogo" :src="match.awayLogo" class="w-full h-full object-contain p-1"/>
              <IconShirt v-else class="w-8 h-8 text-slate-400"/>
            </router-link>
            <router-link :to="`/${route.params.slug}/equipo/${match.away_team}`"
              class="font-black text-slate-900 text-sm leading-tight hover:text-primary transition-colors">
              {{ match.awayTeam }}
            </router-link>
            <button @click="following.toggle(match.away_team)"
              class="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-all"
              :class="followsAway
                ? 'bg-red-50 border-red-200 text-red-500'
                : 'border-slate-200 text-slate-400 hover:border-primary/40 hover:text-primary'">
              <IconHeart class="w-3 h-3" :class="followsAway ? 'fill-red-400 text-red-400' : ''"/>
              {{ followsAway ? 'Siguiendo' : 'Seguir' }}
            </button>
            <div class="flex gap-1 flex-wrap justify-center">
              <span v-for="ev in awayCards" :key="ev.id"
                class="text-[9px] font-bold px-1.5 py-0.5 rounded"
                :class="ev.type==='yellow_card' ? 'bg-yellow-400 text-yellow-900' : 'bg-red-600 text-white'">
                {{ ev.playerNumber || '?' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Goleadores rápidos -->
        <div v-if="goalEvents.length" class="border-t border-muted px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1">
          <div v-for="ev in goalEvents" :key="ev.id"
            class="flex items-center gap-1 text-xs text-slate-600">
            <IconCircleDot class="w-3.5 h-3.5 text-primary"/>
            <span class="font-semibold">{{ ev.playerName || 'N/A' }}</span>
            <span class="text-slate-400 tabular-nums">{{ ev.minute }}'<span v-if="ev.second" class="text-slate-300">{{ String(ev.second).padStart(2,'0') }}</span></span>
            <span v-if="ev.type==='own_goal'" class="text-red-500 text-[10px]">(PP)</span>
          </div>
        </div>
      </div>

      <!-- ── TICKER EN VIVO ─────────────────────────────────── -->
      <Transition name="ticker-slide">
        <div v-if="match.status === 'live' && liveEvents.length"
          class="rounded-2xl overflow-hidden border border-red-200 bg-red-50">
          <div class="px-4 py-2 bg-red-600 flex items-center gap-2">
            <span class="w-2 h-2 bg-white rounded-full animate-ping"></span>
            <p class="text-white font-black text-xs uppercase tracking-widest">Eventos en vivo</p>
          </div>
          <TransitionGroup name="event-pop" tag="div" class="divide-y divide-red-100">
            <div v-for="e in liveEvents" :key="e.id"
              class="flex items-center gap-3 px-4 py-2.5 transition-all duration-300"
              :class="e.flash ? 'bg-yellow-50' : 'bg-red-50'">
              <!-- Icono del evento -->
              <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                :class="{
                  'bg-green-100': e.type==='goal',
                  'bg-orange-100': e.type==='own_goal',
                  'bg-blue-100': e.type==='assist',
                  'bg-yellow-100': e.type==='yellow_card',
                  'bg-red-100': e.type==='red_card',
                }">
                <IconTarget       v-if="e.type==='goal'"        class="w-4 h-4 text-green-600"/>
                <IconRefreshCw    v-else-if="e.type==='own_goal'" class="w-4 h-4 text-orange-500"/>
                <IconZap          v-else-if="e.type==='assist'"  class="w-4 h-4 text-blue-600"/>
                <span v-else-if="e.type==='yellow_card'" class="w-2.5 h-3.5 rounded-sm bg-yellow-400 block"></span>
                <span v-else-if="e.type==='red_card'"    class="w-2.5 h-3.5 rounded-sm bg-red-600 block"></span>
              </div>
              <!-- Descripción -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-black text-slate-900">
                  {{ { goal:'¡GOL!', own_goal:'¡Gol en propia!', assist:'Asistencia', yellow_card:'Tarjeta amarilla', red_card:'Tarjeta roja' }[e.type] }}
                  <span v-if="e.playerName" class="font-semibold text-slate-700"> · {{ e.playerName }}</span>
                </p>
                <p class="text-xs text-slate-500">{{ e.teamName }}</p>
              </div>
              <!-- Tiempo -->
              <span class="text-xs font-black text-slate-400 tabular-nums shrink-0">
                {{ e.minute }}'<span v-if="e.second" class="text-slate-300">{{ String(e.second).padStart(2,'0') }}</span>
              </span>
            </div>
          </TransitionGroup>
        </div>
      </Transition>

      <!-- Panel del árbitro eliminado de la vista pública — se gestiona desde /admin/partidos -->
      <div v-if="false" class="space-y-4">

        <!-- Header del panel -->
        <div class="flex items-center gap-3">
          <div class="w-1 h-6 bg-primary rounded-full"></div>
          <h2 class="font-black text-slate-900">Panel del Árbitro</h2>
        </div>

        <!-- Botón INICIAR -->
        <button v-if="match.status === 'scheduled'"
          @click="confirmStart = true"
          class="w-full py-4 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-3 shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
          style="background:linear-gradient(135deg,#16a34a,#15803d)">
          <IconPlay class="w-6 h-6"/>
          INICIAR PARTIDO
        </button>

        <!-- Panel EN VIVO -->
        <template v-if="match.status === 'live'">

          <!-- Timer grande -->
          <div class="rounded-2xl bg-slate-900 text-white p-4 flex items-center justify-between">
            <div>
              <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Minuto</p>
              <p class="text-5xl font-black tabular-nums leading-none">{{ elapsedStr }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-slate-400">{{ match.homeTeam }}</p>
              <p class="text-3xl font-black">{{ match.home_score }} — {{ match.away_score }}</p>
              <p class="text-sm text-slate-400">{{ match.awayTeam }}</p>
            </div>
          </div>

          <!-- ── REGISTRAR EVENTO ─────────────────── -->
          <div class="card space-y-4">
            <h3 class="font-black text-slate-900 flex items-center gap-2">
              <IconZap class="w-4 h-4 text-primary"/> Registrar evento
            </h3>

            <!-- Paso 1: tipo de evento -->
            <div>
              <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">1 · ¿Qué ocurrió?</p>
              <div class="grid grid-cols-2 gap-2">
                <button v-for="et in eventTypes" :key="et.type"
                  @click="ev.type = et.type"
                  class="flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-sm font-bold transition-all text-left"
                  :class="ev.type === et.type ? et.activeClass : 'border-slate-200 text-slate-600 hover:border-slate-300'">
                  <span class="w-6 h-6 flex items-center justify-center shrink-0">
                    <span v-if="et.icon==='card-yellow'" class="inline-block w-3.5 h-5 rounded-sm bg-yellow-400"></span>
                    <span v-else-if="et.icon==='card-red'" class="inline-block w-3.5 h-5 rounded-sm bg-red-500"></span>
                    <component v-else :is="et.icon" class="w-5 h-5" />
                  </span>
                  <div>
                    <p class="font-black text-sm leading-tight">{{ et.label }}</p>
                    <p class="text-[10px] font-normal opacity-70">{{ et.sub }}</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- Paso 2: equipo -->
            <div v-if="ev.type">
              <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">2 · ¿Qué equipo?</p>
              <div class="grid grid-cols-2 gap-2">
                <button @click="ev.teamId = match.home_team; ev.playerId = null"
                  class="flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all"
                  :class="ev.teamId === match.home_team ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'">
                  <div class="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    <img v-if="match.homeLogo" :src="match.homeLogo" class="w-full h-full object-contain"/>
                    <IconShirt v-else class="w-4 h-4 text-slate-400"/>
                  </div>
                  <span class="truncate">{{ match.homeTeam }}</span>
                </button>
                <button @click="ev.teamId = match.away_team; ev.playerId = null"
                  class="flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all"
                  :class="ev.teamId === match.away_team ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'">
                  <div class="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    <img v-if="match.awayLogo" :src="match.awayLogo" class="w-full h-full object-contain"/>
                    <IconShirt v-else class="w-4 h-4 text-slate-400"/>
                  </div>
                  <span class="truncate">{{ match.awayTeam }}</span>
                </button>
              </div>
            </div>

            <!-- Paso 3: jugador -->
            <div v-if="ev.type && ev.teamId">
              <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">3 · ¿Qué jugador?</p>
              <!-- Búsqueda -->
              <input v-model="playerSearch" placeholder="Buscar por nombre o número..."
                class="w-full border border-muted rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:border-primary"/>
              <div class="max-h-48 overflow-y-auto space-y-1">
                <button v-for="p in filteredPlayers" :key="p.id"
                  @click="ev.playerId = p.id"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-sm transition-all text-left"
                  :class="ev.playerId === p.id ? 'border-primary bg-primary/10' : 'border-slate-100 hover:border-slate-200 bg-slate-50'">
                  <!-- Avatar -->
                  <div class="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    <img v-if="p.photo" :src="p.photo" class="w-full h-full object-cover"/>
                    <span v-else class="text-xs font-black text-slate-500">{{ p.number || '?' }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-900 truncate">{{ p.name }}</p>
                    <p class="text-[11px] text-slate-400">{{ p.position }} · #{{ p.number }}</p>
                  </div>
                  <IconCheck v-if="ev.playerId === p.id" class="w-4 h-4 text-primary shrink-0"/>
                </button>
                <p v-if="!filteredPlayers.length" class="text-center text-slate-400 text-xs py-4">
                  {{ playerSearch ? 'Sin resultados' : 'Sin jugadores registrados en este equipo' }}
                </p>
              </div>
            </div>

            <!-- Paso 4: minuto + confirmar -->
            <div v-if="ev.type && ev.teamId" class="flex items-end gap-3">
              <div class="flex-1">
                <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Minuto</p>
                <div class="flex items-center gap-2">
                  <input v-model.number="ev.minute" type="number" min="1" max="120"
                    class="w-20 border border-muted rounded-xl px-3 py-2.5 text-center text-sm font-black focus:outline-none focus:border-primary"/>
                  <button @click="ev.minute = elapsedMin"
                    class="text-xs text-primary font-bold border border-primary/30 px-3 py-2.5 rounded-xl hover:bg-primary/5">
                    Actual ({{ elapsedMin }}')
                  </button>
                </div>
              </div>
              <button @click="addEvent"
                :disabled="!ev.type || !ev.teamId || evSaving"
                class="flex-1 py-2.5 rounded-xl font-black text-white text-sm disabled:opacity-40 transition-all hover:opacity-90 active:scale-95"
                :class="currentEventType?.btnClass || 'bg-primary'">
                {{ evSaving ? 'Guardando...' : currentEventType?.label || 'Registrar' }}
              </button>
            </div>
          </div>

          <!-- Botón FINALIZAR -->
          <button @click="confirmEnd = true"
            class="w-full py-3.5 rounded-2xl font-black text-base border-2 border-red-300 text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
            <IconSquare class="w-5 h-5 fill-red-500 text-red-500"/>
            FINALIZAR PARTIDO
          </button>
        </template>
      </div>

      <!-- ── LÍNEA DE TIEMPO DE EVENTOS ─────────────────────── -->
      <div v-if="events.length" class="card space-y-1">
        <h3 class="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
          <IconClipboardList class="w-4 h-4 text-primary"/> Registro del partido
        </h3>
        <div class="space-y-1.5">
          <div v-for="ev in [...events].reverse()" :key="ev.id"
            class="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 group transition-colors">
            <!-- Minuto -->
            <span class="text-xs font-black text-slate-400 w-8 text-right shrink-0">{{ ev.minute }}'</span>
            <!-- Icono -->
            <span class="shrink-0 flex items-center justify-center w-6 h-6">
              <IconTarget      v-if="ev.type==='goal'"        class="w-4 h-4 text-green-600" />
              <IconAlertTriangle v-else-if="ev.type==='own_goal'" class="w-4 h-4 text-orange-500" />
              <IconZap         v-else-if="ev.type==='assist'"  class="w-4 h-4 text-blue-500" />
              <span v-else-if="ev.type==='yellow_card'" class="inline-block w-3 h-4 rounded-sm bg-yellow-400"></span>
              <span v-else-if="ev.type==='red_card'"    class="inline-block w-3 h-4 rounded-sm bg-red-500"></span>
              <IconCircle v-else class="w-3 h-3 text-slate-300" />
            </span>
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-slate-900 truncate">
                {{ ev.playerName || 'Jugador' }}
                <span v-if="ev.type==='own_goal'" class="text-red-500 text-xs">(PP)</span>
              </p>
              <p class="text-[11px] text-slate-400">{{ ev.teamName }} · {{ eventLabel(ev.type) }}</p>
            </div>
            <!-- Quitar (solo admin) -->
            <button v-if="isAdmin" @click="removeEvent(ev)"
              class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded">
              <IconX class="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>

      <!-- Transmisión -->
      <div v-if="stream" class="card">
        <h3 class="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <IconRadio class="w-4 h-4"/> Transmisión en vivo
        </h3>
        <a :href="stream.url" target="_blank" class="btn-primary inline-block text-sm">
          Ver en {{ stream.platform }}
        </a>
      </div>
    </template>

    <!-- ══════════════════════════════════════
         CONFIRMACIÓN: INICIAR
    ═══════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="confirmStart" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
          <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <IconPlay class="w-8 h-8 text-green-600"/>
          </div>
          <div>
            <h3 class="font-black text-slate-900 text-xl">¿Iniciar partido?</h3>
            <p class="text-slate-600 text-sm mt-1">
              {{ match.homeTeam }} vs {{ match.awayTeam }}
            </p>
            <p class="text-slate-400 text-xs mt-2">
              El cronómetro comenzará y el partido se marcará como EN VIVO para todos los espectadores.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3 pt-2">
            <button @click="confirmStart = false"
              class="py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">
              Cancelar
            </button>
            <button @click="startMatch"
              class="py-3 rounded-xl font-black text-white text-sm"
              style="background:linear-gradient(135deg,#16a34a,#15803d)">
              ¡Iniciar!
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══════════════════════════════════════
         CONFIRMACIÓN: FINALIZAR
    ═══════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="confirmEnd" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
          <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <IconSquare class="w-8 h-8 fill-red-600 text-red-600"/>
          </div>
          <div>
            <h3 class="font-black text-slate-900 text-xl">¿Finalizar partido?</h3>
            <!-- Resultado final -->
            <div class="mt-3 p-4 rounded-xl bg-slate-50 border border-muted">
              <p class="text-xs text-slate-400 uppercase tracking-wider mb-2">Resultado final</p>
              <div class="flex items-center justify-center gap-4">
                <div class="text-center">
                  <p class="text-xs text-slate-500 truncate max-w-[80px]">{{ match.homeTeam }}</p>
                  <p class="text-4xl font-black text-slate-900">{{ match.home_score }}</p>
                </div>
                <p class="text-slate-300 font-black text-2xl">—</p>
                <div class="text-center">
                  <p class="text-xs text-slate-500 truncate max-w-[80px]">{{ match.awayTeam }}</p>
                  <p class="text-4xl font-black text-slate-900">{{ match.away_score }}</p>
                </div>
              </div>
              <p class="text-xs text-slate-400 mt-2">Duración: {{ elapsedStr }}</p>
            </div>
            <p class="text-slate-400 text-xs mt-3">
              Esta acción es permanente. Las estadísticas y la tabla se actualizarán automáticamente.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3 pt-2">
            <button @click="confirmEnd = false"
              class="py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">
              Seguir jugando
            </button>
            <button @click="endMatch"
              class="py-3 rounded-xl font-black text-white text-sm bg-red-600 hover:bg-red-700">
              Finalizar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFollowingStore } from '@/stores/following'
import { onMatchEvent, onMatchUpdate } from '@/services/socket'
import api from '@/api'

const route     = useRoute()
const auth      = useAuthStore()
const following = useFollowingStore()
const isAdmin   = computed(() => auth.isAdmin)

const followsHome = computed(() => match.value ? following.isFollowing(match.value.home_team) : false)
const followsAway = computed(() => match.value ? following.isFollowing(match.value.away_team) : false)
const followsAny  = computed(() => followsHome.value || followsAway.value)

const match  = ref(null)
const events = ref([])
const stream = ref(null)
const loading = ref(true)

// Ticker de eventos en vivo (últimos eventos animados)
const liveEvents = ref([])   // { id, type, playerName, teamName, minute, second, flash }
let   liveEventTimer = null

function pushLiveEvent(event) {
  liveEvents.value.unshift({ ...event, flash: true })
  if (liveEvents.value.length > 6) liveEvents.value.pop()
  // Quitar flash después de 3s
  clearTimeout(liveEventTimer)
  liveEventTimer = setTimeout(() => {
    liveEvents.value.forEach(e => { e.flash = false })
  }, 3000)
}

// Árbitro state
const confirmStart = ref(false)
const confirmEnd   = ref(false)
const evSaving     = ref(false)
const playerSearch = ref('')

// Estado del evento a registrar
const ev = ref({ type: '', teamId: null, playerId: null, minute: 1 })

// Jugadores por equipo
const homePlayers = ref([])
const awayPlayers = ref([])

// Cronómetro
const elapsed    = ref(0)   // segundos
let   timerHandle = null

const elapsedMin = computed(() => Math.floor(elapsed.value / 60) + 1)
const elapsedStr = computed(() => {
  const m = String(Math.floor(elapsed.value / 60)).padStart(2, '0')
  const s = String(elapsed.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

function startTimer() {
  if (timerHandle) return
  timerHandle = setInterval(() => elapsed.value++, 1000)
}
function stopTimer() {
  clearInterval(timerHandle); timerHandle = null
}

function calcElapsed(startedAt) {
  if (!startedAt) return 0
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
}

// Tipos de evento
const eventTypes = [
  { type: 'goal',        icon: 'IconTarget',       label: 'Gol',           sub: 'Anota un tanto',         activeClass: 'border-green-500 bg-green-50 text-green-700',   btnClass: 'bg-green-600' },
  { type: 'own_goal',    icon: 'IconAlertTriangle', label: 'Gol en propia', sub: 'Autogol',                 activeClass: 'border-orange-500 bg-orange-50 text-orange-700', btnClass: 'bg-orange-500' },
  { type: 'assist',      icon: 'IconZap',           label: 'Asistencia',    sub: 'Pase de gol',             activeClass: 'border-blue-500 bg-blue-50 text-blue-700',      btnClass: 'bg-blue-600' },
  { type: 'yellow_card', icon: 'card-yellow',       label: 'Amarilla',      sub: 'Tarjeta amarilla',        activeClass: 'border-yellow-500 bg-yellow-50 text-yellow-700', btnClass: 'bg-yellow-500' },
  { type: 'red_card',    icon: 'card-red',          label: 'Roja',          sub: 'Tarjeta roja / expulsión',activeClass: 'border-red-500 bg-red-50 text-red-700',         btnClass: 'bg-red-600' },
]

const currentEventType = computed(() => eventTypes.find(e => e.type === ev.value.type))

// Computed de eventos
const goalEvents = computed(() => events.value.filter(e => e.type === 'goal' || e.type === 'own_goal'))
const homeCards  = computed(() => events.value.filter(e =>
  (e.type === 'yellow_card' || e.type === 'red_card') && e.team_id === match.value?.home_team))
const awayCards  = computed(() => events.value.filter(e =>
  (e.type === 'yellow_card' || e.type === 'red_card') && e.team_id === match.value?.away_team))

// Jugadores del equipo seleccionado, filtrados por búsqueda
const currentPlayers = computed(() =>
  ev.value.teamId === match.value?.home_team ? homePlayers.value : awayPlayers.value
)
const filteredPlayers = computed(() => {
  const q = playerSearch.value.toLowerCase().trim()
  if (!q) return currentPlayers.value
  return currentPlayers.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    String(p.number).includes(q)
  )
})

// Formato de fecha
const formattedDate = computed(() =>
  match.value?.date
    ? new Date(match.value.date).toLocaleDateString('es-MX', {
        weekday:'long', day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit'
      })
    : ''
)

// Helpers
function eventLabel(type) {
  return { goal:'Gol', own_goal:'Gol en propia', assist:'Asistencia', yellow_card:'Tarjeta amarilla', red_card:'Tarjeta roja' }[type] || type
}

// Carga inicial
async function loadMatch() {
  const { data } = await api.get(`/matches/${route.params.id}`)
  match.value = data
  if (data.status === 'live') {
    elapsed.value = calcElapsed(data.started_at)
    startTimer()
  }
}

async function loadEvents() {
  const { data } = await api.get(`/matches/${route.params.id}/events`)
  events.value = data
}

async function loadPlayers() {
  if (!match.value) return
  const [h, a] = await Promise.all([
    api.get(`/teams/${match.value.home_team}/players`).catch(() => ({ data: [] })),
    api.get(`/teams/${match.value.away_team}/players`).catch(() => ({ data: [] }))
  ])
  homePlayers.value = h.data
  awayPlayers.value = a.data
}

// Acciones
async function startMatch() {
  const { data } = await api.patch(`/matches/${route.params.id}/start`)
  match.value = { ...match.value, ...data, status: 'live', started_at: data.started_at }
  elapsed.value = 0
  startTimer()
  confirmStart.value = false
}

async function endMatch() {
  await api.patch(`/matches/${route.params.id}/score`, {
    homeScore: match.value.home_score,
    awayScore: match.value.away_score,
    finish: true
  })
  match.value = { ...match.value, status: 'finished' }
  stopTimer()
  confirmEnd.value = false
}

async function addEvent() {
  if (!ev.value.type || !ev.value.teamId || evSaving.value) return
  evSaving.value = true
  try {
    const { data } = await api.post(`/matches/${route.params.id}/events`, {
      type:     ev.value.type,
      teamId:   ev.value.teamId,
      playerId: ev.value.playerId || null,
      minute:   ev.value.minute || elapsedMin.value
    })
    match.value = { ...match.value, ...data.match }
    await loadEvents()
    // Reset solo jugador y tipo para agilizar registro continuo
    ev.value.type     = ''
    ev.value.playerId = null
    playerSearch.value = ''
  } catch (e) {
    alert(e.response?.data?.error || 'Error al registrar evento')
  } finally {
    evSaving.value = false
  }
}

async function removeEvent(event) {
  if (!confirm(`¿Anular este evento? (${eventLabel(event.type)} - min ${event.minute})`)) return
  const { data } = await api.delete(`/match-events/${event.id}`)
  match.value = { ...match.value, ...data.match }
  await loadEvents()
}

// Actualizar minuto con el cronómetro
watch(elapsedMin, (min) => { ev.value.minute = min })

// Watch equipo para resetear búsqueda
watch(() => ev.value.teamId, () => { playerSearch.value = ''; ev.value.playerId = null })

let cleanupSocketEvent  = null
let cleanupSocketUpdate = null

onMounted(async () => {
  loading.value = true
  try {
    await loadMatch()
    await Promise.all([loadEvents(), loadPlayers()])

    if (match.value?.stream_id) {
      const s = await api.get(`/tournaments/${route.params.slug}/streams`)
      stream.value = s.data.find(s => s.id === match.value.stream_id) || null
    }
  } catch {} finally { loading.value = false }

  const matchId = parseInt(route.params.id)

  // Suscribirse a eventos del árbitro en tiempo real
  cleanupSocketEvent = onMatchEvent(matchId, (event, updatedMatch) => {
    // Añadir evento al feed si no está ya
    if (event && !events.value.find(e => e.id === event.id)) {
      events.value.push(event)
      pushLiveEvent(event)
    }
    if (updatedMatch) {
      match.value = { ...match.value, ...updatedMatch }
    }
  })

  // Suscribirse a actualizaciones de marcador/estado
  cleanupSocketUpdate = onMatchUpdate(matchId, (updatedMatch) => {
    const wasScheduled = match.value?.status === 'scheduled'
    match.value = { ...match.value, ...updatedMatch }
    // Si acaba de ponerse en vivo, iniciar cronómetro
    if (wasScheduled && updatedMatch.status === 'live') {
      elapsed.value = calcElapsed(updatedMatch.started_at)
      startTimer()
    }
    // Si terminó, detener cronómetro
    if (updatedMatch.status === 'finished') {
      stopTimer()
    }
  })
})

onUnmounted(() => {
  stopTimer()
  cleanupSocketEvent?.()
  cleanupSocketUpdate?.()
  clearTimeout(liveEventTimer)
})
</script>

<style scoped>
/* Ticker de evento nuevo */
.event-pop-enter-active { transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.event-pop-enter-from   { opacity: 0; transform: translateY(-12px) scale(0.95); }
.event-pop-leave-active { transition: all 0.2s ease; }
.event-pop-leave-to     { opacity: 0; transform: translateX(20px); }

.ticker-slide-enter-active { transition: all 0.4s ease; }
.ticker-slide-enter-from   { opacity: 0; transform: translateY(-8px); }
</style>
