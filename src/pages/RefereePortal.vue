<template>
  <div class="min-h-screen bg-slate-900 flex flex-col" style="padding-top: env(safe-area-inset-top, 0px)">

    <!-- ══ PORTAL ══════════════════════════════════════════════════ -->
    <template v-if="authStore.token">

      <!-- Header fijo -->
      <div class="bg-slate-800 border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <IconShield class="w-5 h-5 text-primary"/>
          </div>
          <div>
            <p class="text-white font-black text-sm leading-none">{{ authStore.user?.name }}</p>
            <p class="text-slate-500 text-[10px] mt-0.5 leading-none">
              <span v-if="loadingMatches" class="text-slate-600">Cargando...</span>
              <span v-else-if="allMatches.length" class="text-primary font-semibold">{{ allMatches.length }} partido{{ allMatches.length !== 1 ? 's' : '' }} disponible{{ allMatches.length !== 1 ? 's' : '' }}</span>
              <span v-else class="text-slate-500">Portal global de arbitraje</span>
            </p>
          </div>
        </div>
        <button @click="confirmLogout=true"
          class="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-xs font-bold px-3 py-2 rounded-xl hover:bg-white/5">
          <IconLogOut class="w-4 h-4"/> Salir
        </button>
      </div>

      <!-- Contenido principal -->
      <div class="flex-1 flex flex-col">

        <!-- ── Vista: Seleccionar partido ─────────────────────── -->
        <div v-if="!activeMatch" class="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">

          <!-- Título + categorías -->
          <div class="pt-2">
            <p class="text-white font-black text-lg">Partidos programados</p>
            <p class="text-slate-500 text-xs mt-0.5">Selecciona el partido que vas a arbitrar</p>
          </div>

          <!-- Filtro por categoría -->
          <div v-if="categories.length > 1" class="flex gap-2 flex-wrap">
            <button @click="selCategory=null"
              class="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              :class="selCategory===null ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 border border-white/10 hover:border-white/20'">
              Todas
            </button>
            <button v-for="cat in categories" :key="cat.id"
              @click="selCategory=cat.id"
              class="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              :class="selCategory===cat.id ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 border border-white/10 hover:border-white/20'">
              {{ cat.name }}
            </button>
          </div>

          <!-- Loading -->
          <div v-if="loadingMatches" class="space-y-3">
            <div v-for="i in 4" :key="i" class="h-28 rounded-2xl bg-slate-800 animate-pulse"></div>
          </div>

          <!-- Sin partidos -->
          <div v-else-if="!filteredMatches.length" class="text-center py-16 text-slate-600">
            <IconCalendar class="w-12 h-12 mx-auto mb-3 opacity-30"/>
            <p class="font-semibold text-slate-500">No hay partidos programados</p>
            <p class="text-xs mt-1">
              {{ selCategory ? 'Prueba con otra categoría' : 'No hay partidos disponibles para arbitrar' }}
            </p>
          </div>

          <!-- Lista de partidos -->
          <div v-else class="space-y-3">
            <div v-for="m in filteredMatches" :key="m.id"
              class="rounded-2xl border overflow-hidden cursor-pointer transition-all"
              :class="m.status === 'live'
                ? 'border-red-500/50 bg-red-950/40 hover:border-red-400/60'
                : 'border-white/10 bg-slate-800 hover:border-primary/40'"
              @click="selectMatch(m)">

              <!-- Categoría + estado -->
              <div class="px-4 py-2 border-b flex items-center justify-between"
                :class="m.status === 'live' ? 'border-red-500/20 bg-red-900/20' : 'border-white/5 bg-slate-800/80'">
                <div class="flex items-center gap-2">
                  <span v-if="m.status === 'live'"
                    class="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-400">
                    <span class="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping inline-block"></span>
                    EN VIVO
                  </span>
                  <span v-else class="text-[10px] font-black uppercase tracking-wider text-primary">{{ m.categoryName }}</span>
                </div>
                <span class="text-[10px] text-slate-500 flex items-center gap-1">
                  <IconCalendar class="w-3 h-3"/> {{ fmtDate(m.date) }}
                </span>
              </div>

              <!-- Equipos -->
              <div class="p-4 flex items-center gap-3">
                <div class="flex-1 flex items-center gap-2.5 min-w-0 justify-end">
                  <p class="font-black text-white text-sm truncate text-right leading-tight">{{ m.homeTeam }}</p>
                  <div class="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
                    <img v-if="m.homeLogo" :src="m.homeLogo" class="w-full h-full object-contain p-0.5"/>
                    <IconShirt v-else class="w-5 h-5 text-slate-500"/>
                  </div>
                </div>
                <div class="shrink-0 w-10 text-center">
                  <span v-if="m.status === 'live'" class="text-base font-black text-white">
                    {{ m.home_score }} - {{ m.away_score }}
                  </span>
                  <span v-else class="text-sm font-black text-slate-600">vs</span>
                </div>
                <div class="flex-1 flex items-center gap-2.5 min-w-0">
                  <div class="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
                    <img v-if="m.awayLogo" :src="m.awayLogo" class="w-full h-full object-contain p-0.5"/>
                    <IconShirt v-else class="w-5 h-5 text-slate-500"/>
                  </div>
                  <p class="font-black text-white text-sm truncate leading-tight">{{ m.awayTeam }}</p>
                </div>
              </div>

              <!-- Fecha y cancha -->
              <div class="px-4 pb-1 flex items-center gap-4 flex-wrap">
                <span class="flex items-center gap-1 text-[11px]"
                  :class="m.date ? 'text-slate-400' : 'text-amber-500 font-semibold'">
                  <IconClock class="w-3 h-3"/>
                  {{ m.date ? fmtDate(m.date) : 'Horario por confirmar' }}
                </span>
                <span class="flex items-center gap-1 text-[11px]"
                  :class="m.location ? 'text-slate-400' : 'text-amber-500 font-semibold'">
                  <IconMapPin class="w-3 h-3"/>
                  {{ m.location || 'Cancha por confirmar' }}
                </span>
              </div>

              <!-- CTA -->
              <div class="px-4 pb-3 pt-2">
                <div v-if="m.status === 'live'"
                  class="w-full py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-center text-xs font-black text-red-400 flex items-center justify-center gap-1.5">
                  <IconRadio class="w-3.5 h-3.5 animate-pulse"/> Retomar partido en curso
                </div>
                <div v-else
                  class="w-full py-2 rounded-xl bg-primary/10 border border-primary/20 text-center text-xs font-black text-primary flex items-center justify-center gap-1.5">
                  <IconPlay class="w-3.5 h-3.5"/> Arbitrar este partido
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Vista: Panel de partido ────────────────────────── -->
        <div v-else class="flex-1 flex flex-col max-w-2xl mx-auto w-full">

          <!-- Sub-header del partido -->
          <div class="px-4 py-3 border-b border-white/10 flex items-center gap-3 bg-slate-800/50">
            <button @click="activeMatch=null; stopPevTimer()"
              class="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/5">
              <IconArrowLeft class="w-5 h-5"/>
            </button>
            <div class="flex-1 min-w-0">
              <p class="text-white font-black text-sm truncate leading-tight">
                {{ activeMatch.homeTeam }} vs {{ activeMatch.awayTeam }}
              </p>
              <div class="flex items-center gap-3 mt-0.5 flex-wrap">
                <span class="text-[10px] text-slate-500">{{ activeMatch.categoryName }}</span>
                <span v-if="activeMatch.date" class="text-[10px] text-slate-500 flex items-center gap-1">
                  <IconClock class="w-2.5 h-2.5"/> {{ fmtDate(activeMatch.date) }}
                </span>
                <span v-if="activeMatch.location" class="text-[10px] text-slate-500 flex items-center gap-1">
                  <IconMapPin class="w-2.5 h-2.5"/> {{ activeMatch.location }}
                </span>
              </div>
            </div>
            <!-- Cronómetro -->
            <div v-if="activeMatch.status==='live'"
              class="flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-full px-3 py-1.5">
              <span class="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              <span class="font-black text-sm tabular-nums">{{ pevElapsedStr }}</span>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4">

            <!-- Marcador -->
            <div class="bg-slate-800 rounded-2xl border overflow-hidden"
              :class="activeMatch.status==='live' ? 'border-red-500/30' : 'border-white/10'">
              <div class="py-2 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                :class="activeMatch.status==='live' ? 'bg-red-600 text-white' :
                        activeMatch.status==='finished' ? 'bg-emerald-800 text-emerald-300' : 'bg-slate-700 text-slate-400'">
                <template v-if="activeMatch.status==='live'">
                  <span class="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                  EN VIVO · {{ pevElapsedStr }}
                </template>
                <template v-else-if="activeMatch.status==='finished'">
                  <IconCheckCircle class="w-3.5 h-3.5"/> Finalizado
                </template>
                <template v-else>
                  <IconClock class="w-3.5 h-3.5"/> Programado
                </template>
              </div>

              <div class="flex items-center py-5 px-4 gap-2">
                <div class="flex-1 text-center">
                  <div class="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center mx-auto mb-2 overflow-hidden border border-white/10">
                    <img v-if="activeMatch.homeLogo" :src="activeMatch.homeLogo" class="w-full h-full object-contain p-1"/>
                    <IconShirt v-else class="w-7 h-7 text-slate-500"/>
                  </div>
                  <p class="font-black text-white text-sm leading-tight">{{ activeMatch.homeTeam }}</p>
                </div>
                <div class="text-center px-3">
                  <p v-if="activeMatch.status!=='scheduled'" class="text-4xl font-black text-white tabular-nums">
                    {{ activeMatch.home_score }}<span class="text-slate-600 mx-1.5">-</span>{{ activeMatch.away_score }}
                  </p>
                  <p v-else class="text-3xl font-black text-slate-700">vs</p>
                </div>
                <div class="flex-1 text-center">
                  <div class="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center mx-auto mb-2 overflow-hidden border border-white/10">
                    <img v-if="activeMatch.awayLogo" :src="activeMatch.awayLogo" class="w-full h-full object-contain p-1"/>
                    <IconShirt v-else class="w-7 h-7 text-slate-500"/>
                  </div>
                  <p class="font-black text-white text-sm leading-tight">{{ activeMatch.awayTeam }}</p>
                </div>
              </div>

              <!-- Goles marcados -->
              <div v-if="matchEvents.filter(e=>e.type==='goal'||e.type==='own_goal').length"
                class="border-t border-white/5 px-4 py-2 flex flex-wrap gap-x-3 gap-y-1">
                <span v-for="g in matchEvents.filter(e=>e.type==='goal'||e.type==='own_goal')" :key="g.id"
                  class="text-[11px] text-slate-400 flex items-center gap-1">
                  <IconTarget class="w-3 h-3 text-green-400 shrink-0"/>
                  <span class="font-semibold text-slate-300">{{ g.playerName || '?' }}</span>
                  <span class="tabular-nums">{{ g.minute }}'<span v-if="g.second" class="text-slate-600">{{ String(g.second).padStart(2,'0') }}</span></span>
                </span>
              </div>
            </div>

            <!-- INICIAR PARTIDO -->
            <button v-if="activeMatch.status==='scheduled'"
              @click="confirmStartShow=true"
              class="w-full py-5 rounded-2xl font-black text-xl text-white flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"
              style="background:linear-gradient(135deg,#16a34a,#15803d)">
              <IconPlay class="w-7 h-7"/> INICIAR PARTIDO
            </button>

            <!-- PANEL EN VIVO -->
            <template v-if="activeMatch.status==='live'">

              <!-- Registrar evento -->
              <div class="bg-slate-800 rounded-2xl border border-white/10 p-4 space-y-4">
                <p class="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <IconZap class="w-3.5 h-3.5 text-primary"/> Registrar evento
                </p>

                <!-- Tipo de evento -->
                <div class="grid grid-cols-5 gap-2">
                  <button v-for="et in eventTypes" :key="et.type"
                    @click="pev.type=et.type; pev.teamId=null; pev.playerId=null"
                    class="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all"
                    :class="pev.type===et.type ? et.activeDark : 'border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/5'">
                    <span class="w-5 h-5 flex items-center justify-center">
                      <span v-if="et.type==='yellow_card'" class="w-3 h-4 rounded-sm bg-yellow-400 block"></span>
                      <span v-else-if="et.type==='red_card'" class="w-3 h-4 rounded-sm bg-red-500 block"></span>
                      <component v-else :is="et.icon" class="w-4 h-4" :class="pev.type===et.type?'text-white':et.color"/>
                    </span>
                    <span class="text-[9px] font-bold leading-tight text-center">{{ et.label }}</span>
                  </button>
                </div>

                <!-- Equipo -->
                <div v-if="pev.type" class="grid grid-cols-2 gap-2">
                  <button @click="selectPevTeam(activeMatch.home_team)"
                    class="flex items-center gap-2 px-3 py-3 rounded-xl border-2 font-bold text-sm transition-all"
                    :class="pev.teamId===activeMatch.home_team ? 'border-primary bg-primary/20 text-white' : 'border-white/10 text-slate-400 hover:border-white/20'">
                    <div class="w-7 h-7 rounded-lg bg-slate-700 shrink-0 overflow-hidden">
                      <img v-if="activeMatch.homeLogo" :src="activeMatch.homeLogo" class="w-full h-full object-contain"/>
                      <IconShirt v-else class="w-3.5 h-3.5 text-slate-500 m-auto"/>
                    </div>
                    <span class="truncate text-xs">{{ activeMatch.homeTeam }}</span>
                  </button>
                  <button @click="selectPevTeam(activeMatch.away_team)"
                    class="flex items-center gap-2 px-3 py-3 rounded-xl border-2 font-bold text-sm transition-all"
                    :class="pev.teamId===activeMatch.away_team ? 'border-primary bg-primary/20 text-white' : 'border-white/10 text-slate-400 hover:border-white/20'">
                    <div class="w-7 h-7 rounded-lg bg-slate-700 shrink-0 overflow-hidden">
                      <img v-if="activeMatch.awayLogo" :src="activeMatch.awayLogo" class="w-full h-full object-contain"/>
                      <IconShirt v-else class="w-3.5 h-3.5 text-slate-500 m-auto"/>
                    </div>
                    <span class="truncate text-xs">{{ activeMatch.awayTeam }}</span>
                  </button>
                </div>

                <!-- Jugador -->
                <div v-if="pev.type && pev.teamId">
                  <input v-model="pevSearch" placeholder="Buscar jugador por nombre o número..."
                    class="w-full bg-slate-700 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm mb-2 focus:outline-none focus:border-primary placeholder-slate-500"/>
                  <div class="max-h-48 overflow-y-auto space-y-1">
                    <button v-for="p in pevPlayers" :key="p.id"
                      @click="pev.playerId=p.id"
                      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-sm transition-all text-left"
                      :class="pev.playerId===p.id ? 'border-primary bg-primary/15 text-white' : 'border-white/5 bg-slate-700 text-slate-300 hover:border-white/10'">
                      <div class="w-8 h-8 rounded-full bg-slate-600 shrink-0 overflow-hidden flex items-center justify-center">
                        <img v-if="p.photo" :src="p.photo" class="w-full h-full object-cover"/>
                        <span v-else class="text-[10px] font-black text-slate-300">{{ p.number||'?' }}</span>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-bold text-xs truncate">{{ p.name }}</p>
                        <p class="text-[10px] text-slate-500">#{{ p.number }} · {{ p.position }}</p>
                      </div>
                      <IconCheck v-if="pev.playerId===p.id" class="w-4 h-4 text-primary shrink-0"/>
                    </button>
                    <p v-if="!pevPlayers.length" class="text-center text-slate-500 text-xs py-3">
                      {{ pevSearch ? 'Sin resultados' : 'Sin jugadores registrados en este equipo' }}
                    </p>
                  </div>
                </div>

                <!-- Tiempo + Registrar -->
                <div v-if="pev.type && pev.teamId" class="space-y-1.5">
                  <div class="flex gap-2 items-end">
                    <div class="space-y-1">
                      <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">Min.</p>
                      <input v-model.number="pev.minute" type="number" min="1" max="120"
                        class="w-14 bg-slate-700 border border-white/10 rounded-xl px-2 py-2.5 text-center text-sm font-black text-white focus:outline-none focus:border-primary"/>
                    </div>
                    <span class="pb-3 text-slate-700 font-black text-xl">:</span>
                    <div class="space-y-1">
                      <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">Seg.</p>
                      <input v-model.number="pev.second" type="number" min="0" max="59"
                        class="w-14 bg-slate-700 border border-white/10 rounded-xl px-2 py-2.5 text-center text-sm font-black text-white focus:outline-none focus:border-primary"/>
                    </div>
                    <button @click="pev.minute=pevElapsedMin; pev.second=pevElapsedSec"
                      class="flex items-center gap-1 text-[11px] text-primary font-bold border border-primary/30 px-2.5 py-2.5 rounded-xl whitespace-nowrap hover:bg-primary/5 transition">
                      <IconTimer class="w-3 h-3"/> {{ pevElapsedStr }}
                    </button>
                    <button @click="confirmPevAdd()"
                      :disabled="!pev.type||!pev.teamId"
                      class="flex-1 py-2.5 rounded-xl font-black text-white text-sm transition disabled:opacity-30 active:scale-95"
                      :class="eventTypes.find(e=>e.type===pev.type)?.btnClass||'bg-primary'">
                      Registrar
                    </button>
                  </div>
                  <p class="text-[10px] text-slate-600 text-right flex items-center justify-end gap-1">
                    <IconTimer class="w-3 h-3"/> {{ pev.minute }}:{{ String(pev.second).padStart(2,'0') }}
                  </p>
                </div>
              </div>

              <!-- Finalizar -->
              <button @click="confirmEndShow=true"
                class="w-full py-4 rounded-2xl font-black text-sm border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 transition flex items-center justify-center gap-2 active:scale-95">
                <IconSquare class="w-4 h-4"/> FINALIZAR PARTIDO
              </button>
            </template>

            <!-- Timeline de eventos -->
            <div v-if="matchEvents.length" class="bg-slate-800 rounded-2xl border border-white/10 p-4">
              <p class="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <IconClipboardList class="w-3.5 h-3.5"/> Registro de eventos
              </p>
              <div class="space-y-1.5 max-h-64 overflow-y-auto">
                <div v-for="e in [...matchEvents].reverse()" :key="e.id"
                  class="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-700/50">
                  <span class="text-xs font-black text-slate-500 w-12 text-right tabular-nums shrink-0">
                    {{ e.minute }}'<span v-if="e.second" class="text-slate-600">{{ String(e.second).padStart(2,'0') }}</span>
                  </span>
                  <span class="w-5 h-5 flex items-center justify-center shrink-0">
                    <IconTarget       v-if="e.type==='goal'"        class="w-4 h-4 text-green-400"/>
                    <IconRefreshCw    v-else-if="e.type==='own_goal'" class="w-4 h-4 text-orange-400"/>
                    <IconZap          v-else-if="e.type==='assist'"  class="w-4 h-4 text-blue-400"/>
                    <span v-else-if="e.type==='yellow_card'" class="w-2.5 h-3.5 rounded-sm bg-yellow-400 block"></span>
                    <span v-else-if="e.type==='red_card'"    class="w-2.5 h-3.5 rounded-sm bg-red-500 block"></span>
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-white truncate">{{ e.playerName || 'Jugador' }}</p>
                    <p class="text-[11px] text-slate-500">{{ e.teamName }}</p>
                  </div>
                </div>
              </div>
            </div>

          </div><!-- end scroll -->
        </div><!-- end panel partido -->
      </div><!-- end contenido -->
    </template><!-- end autenticado -->

    <!-- ══ DIÁLOGOS DE CONFIRMACIÓN ══════════════════════════════ -->

    <!-- Confirmar: selección de partido -->
    <Teleport to="body">
      <div v-if="confirmSelectMatch" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <div class="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <IconShield class="w-5 h-5 text-primary"/>
            </div>
            <div>
              <p class="font-black text-white">¿Confirmas que arbitrarás este partido?</p>
              <p class="text-slate-400 text-sm mt-1">
                <strong class="text-white">{{ pendingMatch?.homeTeam }}</strong> vs <strong class="text-white">{{ pendingMatch?.awayTeam }}</strong>
              </p>
              <p class="text-[11px] text-slate-500 mt-0.5">{{ pendingMatch?.categoryName }}</p>
            </div>
          </div>
          <p class="text-slate-500 text-xs bg-slate-700/50 rounded-xl p-3">
            Una vez iniciado, el partido quedará en vivo para todos los espectadores y no podrá ser tomado por otro árbitro.
          </p>
          <div class="flex gap-3">
            <button @click="confirmSelectMatch=false; pendingMatch=null"
              class="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 font-bold text-sm hover:bg-white/5 transition">
              Cancelar
            </button>
            <button @click="openMatch(pendingMatch)"
              class="flex-1 py-2.5 rounded-xl font-black text-white text-sm bg-primary hover:bg-primary/90 transition">
              Arbitrar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirmar: iniciar -->
    <Teleport to="body">
      <div v-if="confirmStartShow" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <div class="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4 text-center">
          <div class="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <IconPlay class="w-7 h-7 text-green-400"/>
          </div>
          <h3 class="font-black text-white text-xl">¿Iniciar partido?</h3>
          <p class="text-slate-400 text-sm">
            {{ activeMatch?.homeTeam }} vs {{ activeMatch?.awayTeam }}
          </p>
          <div class="bg-slate-700/50 rounded-xl p-3 text-left space-y-1">
            <p class="text-[11px] text-slate-400 flex items-center gap-1.5">
              <IconCheckCircle class="w-3.5 h-3.5 text-green-400 shrink-0"/> El cronómetro iniciará inmediatamente
            </p>
            <p class="text-[11px] text-slate-400 flex items-center gap-1.5">
              <IconCheckCircle class="w-3.5 h-3.5 text-green-400 shrink-0"/> El partido aparecerá como EN VIVO para todos
            </p>
            <p class="text-[11px] text-slate-400 flex items-center gap-1.5">
              <IconCheckCircle class="w-3.5 h-3.5 text-green-400 shrink-0"/> Tu nombre quedará registrado como árbitro
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3 pt-1">
            <button @click="confirmStartShow=false"
              class="py-3 rounded-xl border border-white/10 text-slate-400 font-bold text-sm hover:bg-white/5 transition">
              Cancelar
            </button>
            <button @click="portalStartMatch()"
              :disabled="submittingStart"
              class="py-3 rounded-xl font-black text-white text-sm transition active:scale-95 disabled:opacity-50"
              style="background:#16a34a">
              {{ submittingStart ? 'Iniciando...' : '¡Iniciar!' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirmar: evento -->
    <Teleport to="body">
      <div v-if="confirmPev.show" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <div class="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <IconAlertCircle class="w-5 h-5 text-amber-400"/>
            </div>
            <div>
              <p class="font-black text-white">{{ confirmPev.title }}</p>
              <p class="text-slate-400 text-sm mt-1">{{ confirmPev.body }}</p>
            </div>
          </div>
          <div class="flex gap-3">
            <button @click="confirmPev.show=false" class="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 font-bold text-sm">Cancelar</button>
            <button @click="doPevAdd()"
              :disabled="confirmPev.submitting"
              class="flex-1 py-2.5 rounded-xl font-black text-white text-sm disabled:opacity-50 transition"
              :class="eventTypes.find(e=>e.type===pev.type)?.btnClass||'bg-primary'">
              {{ confirmPev.submitting ? 'Guardando...' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirmar: finalizar -->
    <Teleport to="body">
      <div v-if="confirmEndShow" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <div class="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4 text-center">
          <div class="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <IconSquare class="w-7 h-7 text-red-400"/>
          </div>
          <h3 class="font-black text-white text-xl">¿Finalizar partido?</h3>
          <div class="bg-slate-700 rounded-xl p-4">
            <p class="text-xs text-slate-500 uppercase tracking-wider mb-2">Resultado final</p>
            <div class="flex items-center justify-center gap-5">
              <div class="text-center">
                <p class="text-xs text-slate-400 truncate max-w-[80px]">{{ activeMatch?.homeTeam }}</p>
                <p class="text-4xl font-black text-white">{{ activeMatch?.home_score }}</p>
              </div>
              <p class="text-slate-600 font-black text-2xl">—</p>
              <div class="text-center">
                <p class="text-xs text-slate-400 truncate max-w-[80px]">{{ activeMatch?.awayTeam }}</p>
                <p class="text-4xl font-black text-white">{{ activeMatch?.away_score }}</p>
              </div>
            </div>
            <p class="text-xs text-slate-500 mt-3 flex items-center justify-center gap-1">
              <IconTimer class="w-3 h-3"/> Duración: {{ pevElapsedStr }}
            </p>
          </div>
          <p class="text-slate-500 text-xs">Árbitro: <strong class="text-slate-300">{{ authStore.user?.name }}</strong></p>
          <div class="grid grid-cols-2 gap-3">
            <button @click="confirmEndShow=false" class="py-3 rounded-xl border border-white/10 text-slate-400 font-bold text-sm">Seguir jugando</button>
            <button @click="portalEndMatch()" :disabled="submittingEnd"
              class="py-3 rounded-xl font-black text-white text-sm bg-red-600 hover:bg-red-700 transition active:scale-95 disabled:opacity-50">
              {{ submittingEnd ? 'Finalizando...' : 'Finalizar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirmar: salir -->
    <Teleport to="body">
      <div v-if="confirmLogout" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <div class="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-xs p-6 space-y-4 text-center">
          <IconLogOut class="w-10 h-10 text-slate-400 mx-auto"/>
          <p class="font-black text-white">¿Cerrar sesión?</p>
          <p v-if="activeMatch?.status==='live'" class="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            Tienes un partido en curso. Finalízalo antes de salir.
          </p>
          <div class="flex gap-3">
            <button @click="confirmLogout=false" class="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 font-bold text-sm">Cancelar</button>
            <button @click="doLogout()" :disabled="activeMatch?.status==='live'"
              class="flex-1 py-2.5 rounded-xl font-black text-white text-sm bg-slate-600 hover:bg-slate-500 disabled:opacity-30 transition">
              Salir
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter }    from 'vue-router'
import api from '@/api'

const authStore = useAuthStore()
const router    = useRouter()

// ── Portal data ────────────────────────────────────────────
const allMatches    = ref([])
const categories    = ref([])
const tournamentId  = ref(null)
const tournamentName = ref('')
const selCategory   = ref(null)
const loadingMatches = ref(false)
const activeMatch   = ref(null)
const matchEvents   = ref([])
const homePlayers   = ref([])
const awayPlayers   = ref([])

const filteredMatches = computed(() => {
  if (!selCategory.value) return allMatches.value
  return allMatches.value.filter(m => m.category_id === selCategory.value)
})

async function loadPortalData() {
  loadingMatches.value = true
  try {
    const { data } = await api.get('/referee/matches')
    allMatches.value   = data.matches || []
    categories.value   = data.categories || []
    // Solo usar lo que devuelve la API — no el caché de sesión, que puede estar desactualizado
    tournamentId.value   = data.tournamentId   ?? null
    tournamentName.value = data.tournamentName ?? ''
  } catch {} finally { loadingMatches.value = false }
}

// ── Selección con confirmación ────────────────────────────
const confirmSelectMatch = ref(false)
const pendingMatch       = ref(null)

function selectMatch(m) {
  pendingMatch.value      = m
  confirmSelectMatch.value = true
}

async function openMatch(m) {
  confirmSelectMatch.value = false
  pendingMatch.value = null
  activeMatch.value  = { ...m }
  matchEvents.value  = []
  pevElapsed.value   = 0

  const [evRes, hp, ap] = await Promise.allSettled([
    api.get(`/matches/${m.id}/events`),
    api.get(`/teams/${m.home_team}/players`),
    api.get(`/teams/${m.away_team}/players`),
  ])
  matchEvents.value = evRes.status==='fulfilled' ? evRes.value.data : []
  homePlayers.value  = hp.status==='fulfilled'  ? hp.value.data  : []
  awayPlayers.value  = ap.status==='fulfilled'  ? ap.value.data  : []

  // Si el partido ya está EN VIVO (árbitro retomando), arrancar el cronómetro desde started_at
  if (m.status === 'live') startPevTimer(m.started_at)
}

// ── Timer ──────────────────────────────────────────────────
const pevElapsed = ref(0)
let   pevTimer   = null

const pevElapsedMin = computed(() => Math.floor(pevElapsed.value / 60) + 1)
const pevElapsedSec = computed(() => pevElapsed.value % 60)
const pevElapsedStr = computed(() => {
  const m = String(Math.floor(pevElapsed.value / 60)).padStart(2,'0')
  const s = String(pevElapsed.value % 60).padStart(2,'0')
  return `${m}:${s}`
})

function startPevTimer(startedAt) {
  stopPevTimer()
  pevElapsed.value = startedAt
    ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
    : 0
  pevTimer = setInterval(() => {
    pevElapsed.value++
    if (activeMatch.value?.status === 'live') {
      pev.minute = pevElapsedMin.value
      pev.second = pevElapsedSec.value
    }
  }, 1000)
}
function stopPevTimer() { clearInterval(pevTimer); pevTimer = null }

// ── Evento ─────────────────────────────────────────────────
const pev      = reactive({ type: '', teamId: null, playerId: null, minute: 1, second: 0 })
const pevSearch = ref('')

const eventTypes = [
  { type:'goal',        icon:'IconTarget',        label:'Gol',       color:'text-green-400',  activeDark:'border-green-500 bg-green-500/20 text-green-300',  btnClass:'bg-green-600' },
  { type:'own_goal',    icon:'IconRefreshCw',      label:'En propia', color:'text-orange-400', activeDark:'border-orange-500 bg-orange-500/20 text-orange-300', btnClass:'bg-orange-500' },
  { type:'assist',      icon:'IconZap',            label:'Asist.',    color:'text-blue-400',   activeDark:'border-blue-500 bg-blue-500/20 text-blue-300',    btnClass:'bg-blue-600' },
  { type:'yellow_card', icon:'card-yellow',        label:'Amarilla',  color:'',                activeDark:'border-yellow-500 bg-yellow-500/20 text-yellow-300', btnClass:'bg-yellow-500' },
  { type:'red_card',    icon:'card-red',           label:'Roja',      color:'',                activeDark:'border-red-500 bg-red-500/20 text-red-300',       btnClass:'bg-red-600' },
]

const pevPlayers = computed(() => {
  const pool = String(pev.teamId) === String(activeMatch.value?.home_team) ? homePlayers.value : awayPlayers.value
  const q = pevSearch.value.toLowerCase().trim()
  if (!q) return pool
  return pool.filter(p => p.name.toLowerCase().includes(q) || String(p.number||'').includes(q))
})

function selectPevTeam(id) { pev.teamId = id; pev.playerId = null; pevSearch.value = '' }

const confirmPev = reactive({ show: false, title: '', body: '', submitting: false })
function confirmPevAdd() {
  if (!pev.type || !pev.teamId) return
  const teamName = String(pev.teamId) === String(activeMatch.value?.home_team) ? activeMatch.value?.homeTeam : activeMatch.value?.awayTeam
  const player   = [...homePlayers.value, ...awayPlayers.value].find(p => p.id === pev.playerId)
  const labels   = { goal:'Gol', own_goal:'Gol en propia', assist:'Asistencia', yellow_card:'T. Amarilla', red_card:'T. Roja' }
  confirmPev.title = `¿Registrar ${labels[pev.type]}?`
  const playerStr = player ? ` · ${player.name} (#${player.number})` : ''
  confirmPev.body  = `${teamName}${playerStr} · Min. ${pev.minute}:${String(pev.second).padStart(2,'0')}`
  confirmPev.show  = true
}
async function doPevAdd() {
  if (confirmPev.submitting) return
  confirmPev.submitting = true
  try {
    const { data } = await api.post(`/matches/${activeMatch.value.id}/events`, {
      type: pev.type, teamId: pev.teamId, playerId: pev.playerId||null,
      minute: pev.minute, second: pev.second
    })
    confirmPev.show = false
    activeMatch.value = { ...activeMatch.value, ...data.match }
    matchEvents.value = (await api.get(`/matches/${activeMatch.value.id}/events`)).data
    pev.type = ''; pev.playerId = null; pevSearch.value = ''
  } catch(e) {
    confirmPev.show = false
    alert(e.response?.data?.error || 'Error al registrar')
  } finally {
    confirmPev.submitting = false
  }
}

// ── Iniciar / Finalizar ────────────────────────────────────
const confirmStartShow   = ref(false)
const confirmEndShow     = ref(false)
const submittingStart    = ref(false)
const submittingEnd      = ref(false)

async function portalStartMatch() {
  if (submittingStart.value) return
  submittingStart.value = true
  try {
    const { data } = await api.patch(`/matches/${activeMatch.value.id}/start`)
    confirmStartShow.value = false
    activeMatch.value = { ...activeMatch.value, ...data, status: 'live' }
    startPevTimer(data.started_at)
    allMatches.value = allMatches.value.filter(m => m.id !== activeMatch.value.id)
  } catch(e) {
    confirmStartShow.value = false
    alert(e.response?.data?.error || 'Error al iniciar el partido. Intenta de nuevo.')
  } finally {
    submittingStart.value = false
  }
}

async function portalEndMatch() {
  if (submittingEnd.value) return
  submittingEnd.value = true
  try {
    await api.patch(`/matches/${activeMatch.value.id}/score`, {
      homeScore: activeMatch.value.home_score,
      awayScore: activeMatch.value.away_score,
      finish: true
    })
    confirmEndShow.value = false
    activeMatch.value = { ...activeMatch.value, status: 'finished' }
    stopPevTimer()
  } catch(e) {
    confirmEndShow.value = false
    alert(e.response?.data?.error || 'Error al finalizar el partido. Intenta de nuevo.')
  } finally {
    submittingEnd.value = false
  }
}

// ── Logout ─────────────────────────────────────────────────
const confirmLogout = ref(false)
function doLogout() {
  confirmLogout.value = false
  stopPevTimer()
  authStore.logout()
  activeMatch.value = null
  router.push('/')    // Redirigir al inicio general
}

// ── Helpers ────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return 'Sin fecha'
  return new Date(d).toLocaleDateString('es-MX', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
}

onMounted(async () => {
  // Si no está autenticado o no tiene rol válido → redirigir al login
  if (!authStore.token) {
    router.replace('/login?redirect=/arbitro')
    return
  }
  const role = authStore.user?.role
  if (role !== 'referee' && role !== 'admin') {
    authStore.logout()
    router.replace('/login?redirect=/arbitro')
    return
  }
  await loadPortalData()
})
onUnmounted(stopPevTimer)
</script>
