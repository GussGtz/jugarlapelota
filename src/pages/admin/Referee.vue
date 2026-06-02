<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg md:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <IconShield class="w-6 h-6 text-primary" /> Arbitraje
        </h2>
        <p class="text-slate-400 text-sm mt-0.5">Gestión de árbitros y partidos en tiempo real</p>
      </div>
      <div class="flex items-center gap-3">
        <div v-if="liveCount > 0"
          class="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-sm font-black">
          <span class="w-2 h-2 bg-white rounded-full animate-ping inline-block"></span>
          {{ liveCount }} EN VIVO
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex bg-slate-100 rounded-2xl p-1 w-fit gap-1">
      <button @click="activeTab='matches'"
        class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
        :class="activeTab==='matches' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'">
        <IconPlay class="w-4 h-4 inline mr-1.5 -mt-0.5"/>Partidos
      </button>
      <button @click="activeTab='referees'; loadReferees()"
        class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
        :class="activeTab==='referees' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'">
        <IconUsers class="w-4 h-4 inline mr-1.5 -mt-0.5"/>Árbitros
        <span v-if="referees.length" class="ml-1 text-[10px] font-black text-slate-400">({{ referees.length }})</span>
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════════
         TAB: ÁRBITROS
    ════════════════════════════════════════════════════════ -->
    <div v-if="activeTab==='referees'" class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-slate-500">Árbitros registrados con acceso al portal</p>
        <button @click="openRefModal(null)"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition">
          <IconPlus class="w-4 h-4"/> Nuevo árbitro
        </button>
      </div>

      <div v-if="refLoading" class="grid md:grid-cols-2 gap-4">
        <div v-for="i in 3" :key="i" class="card h-24 animate-pulse bg-muted/30"></div>
      </div>

      <div v-else-if="!referees.length" class="card py-16 text-center text-slate-400">
        <IconUsers class="w-10 h-10 mx-auto mb-3 opacity-20"/>
        <p class="font-semibold">No hay árbitros registrados</p>
        <p class="text-xs mt-1">Crea un árbitro para que pueda iniciar sesión en el portal</p>
      </div>

      <div v-else class="grid md:grid-cols-2 gap-3">
        <div v-for="ref in referees" :key="ref.id"
          class="card p-4 flex items-center gap-4"
          :class="ref.is_active ? '' : 'opacity-60'">
          <!-- Avatar inicial -->
          <div class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-black text-white text-lg"
            :style="{ background: ref.is_active ? '#0ea5e9' : '#94a3b8' }">
            {{ ref.name.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-black text-slate-900 text-sm truncate">{{ ref.name }}</p>
            <p class="text-[11px] text-slate-500 truncate">{{ ref.email }}</p>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
              <code class="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">{{ ref.username }}</code>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold"
                :class="ref.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'">
                {{ ref.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span v-if="ref.tournamentName" class="text-[10px] text-primary font-semibold flex items-center gap-1">
                <IconTrophy class="w-3 h-3"/> {{ ref.tournamentName }}
              </span>
              <span v-else class="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                <IconAlertTriangle class="w-3 h-3"/> Sin torneo asignado
              </span>
              <span v-if="ref.matches_refereed" class="text-[10px] text-slate-400">· {{ ref.matches_refereed }} partido{{ ref.matches_refereed!==1?'s':'' }}</span>
            </div>
          </div>
          <!-- Acciones -->
          <div class="flex flex-col gap-1.5 shrink-0">
            <button @click="openRefModal(ref)" class="text-xs text-primary font-bold hover:underline">Editar</button>
            <button @click="askToggleRef(ref)" class="text-xs font-bold hover:underline"
              :class="ref.is_active ? 'text-orange-500' : 'text-green-600'">
              {{ ref.is_active ? 'Desactivar' : 'Activar' }}
            </button>
            <button @click="askDeleteRef(ref)" class="text-xs text-red-500 font-bold hover:underline">Eliminar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════
         TAB: PARTIDOS
    ════════════════════════════════════════════════════════ -->
    <template v-if="activeTab==='matches'">

    <!-- Filtros -->
    <div class="flex gap-3 flex-wrap items-center">
      <!-- Torneo -->
      <select v-model="selTournament" @change="onTournamentChange"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option :value="null">Todos los torneos</option>
        <option v-for="t in tournaments" :key="t.id" :value="t">{{ t.name }}</option>
      </select>

      <!-- Categoría -->
      <select v-model="selCategory" @change="applyFilters"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary"
        :disabled="!categories.length">
        <option :value="null">Todas las categorías</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>

      <!-- Estado -->
      <div class="flex bg-slate-100 rounded-xl p-0.5 gap-0.5 flex-wrap">
        <button v-for="f in filters" :key="f.key" @click="activeFilter = f.key"
          class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          :class="activeFilter === f.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'">
          {{ f.label }}
          <span v-if="f.count > 0" class="ml-1 text-[10px] font-black">({{ f.count }})</span>
        </button>
      </div>

      <!-- Chip categoría activa -->
      <div v-if="selCategory" class="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-xl text-xs font-bold text-primary">
        <IconTag class="w-3.5 h-3.5"/>
        {{ categories.find(c => c.id === selCategory)?.name }}
        <button @click="selCategory = null; applyFilters()" class="hover:text-red-500 ml-1">
          <IconX class="w-3 h-3"/>
        </button>
      </div>
    </div>

    <div v-if="loading" class="grid md:grid-cols-2 gap-4">
      <div v-for="i in 4" :key="i" class="card animate-pulse h-32 bg-muted/40"></div>
    </div>

    <!-- Sin resultados -->
    <div v-else-if="!filteredMatches.length" class="card text-center py-16 text-slate-400">
      <IconShield class="w-10 h-10 mx-auto mb-3 opacity-20"/>
      <p class="font-semibold">No hay partidos en esta vista</p>
    </div>

    <!-- Grid de partidos -->
    <div v-else class="grid md:grid-cols-2 gap-4">
      <div v-for="m in filteredMatches" :key="m.id"
        class="card overflow-hidden hover:shadow-md transition-all cursor-pointer"
        :class="m.status === 'live' ? 'border-red-300' : m.status === 'finished' ? 'border-slate-100 opacity-70' : ''"
        @click="openPanel(m)">

        <!-- Status bar -->
        <div class="h-1.5 w-full"
          :class="m.status === 'live' ? 'bg-red-500' : m.status === 'finished' ? 'bg-emerald-400' : 'bg-slate-200'">
        </div>

        <div class="p-4 space-y-3">
          <!-- Meta -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span v-if="m.status === 'live'"
                class="flex items-center gap-1 text-[10px] font-black text-red-600 uppercase">
                <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping inline-block"></span> EN VIVO
              </span>
              <span v-else-if="m.status === 'finished'"
                class="text-[10px] font-black text-emerald-600 uppercase">FINALIZADO</span>
              <span v-else class="text-[10px] font-bold text-slate-400">{{ fmtDateTime(m.date) }}</span>
            </div>
            <span class="text-[10px] text-slate-400">{{ m.categoryName || m.tournamentName }}</span>
          </div>

          <!-- Equipos y marcador -->
          <div class="flex items-center gap-3">
            <div class="flex-1 flex items-center gap-2 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                <img v-if="m.homeLogo" :src="m.homeLogo" class="w-full h-full object-contain p-0.5"/>
                <IconShirt v-else class="w-4 h-4 text-slate-400"/>
              </div>
              <span class="font-black text-slate-900 text-sm truncate">{{ m.homeTeam }}</span>
            </div>

            <div class="text-center shrink-0">
              <span v-if="m.status !== 'scheduled'"
                class="text-2xl font-black text-slate-900 tabular-nums">
                {{ m.home_score }} - {{ m.away_score }}
              </span>
              <span v-else class="text-xl font-black text-slate-300">vs</span>
            </div>

            <div class="flex-1 flex items-center gap-2 min-w-0 flex-row-reverse">
              <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                <img v-if="m.awayLogo" :src="m.awayLogo" class="w-full h-full object-contain p-0.5"/>
                <IconShirt v-else class="w-4 h-4 text-slate-400"/>
              </div>
              <span class="font-black text-slate-900 text-sm truncate text-right">{{ m.awayTeam }}</span>
            </div>
          </div>

          <!-- Árbitro asignado -->
          <div v-if="m.refereeName"
            class="flex items-center gap-1.5 text-[11px] py-1.5 px-2 rounded-lg"
            :class="m.status==='live' ? 'bg-red-50 text-red-700' : m.status==='finished' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'">
            <IconShield class="w-3 h-3 shrink-0"/>
            <span class="font-semibold truncate">Árbitro: {{ m.refereeName }}</span>
          </div>
          <div v-else-if="m.status === 'finished'"
            class="flex items-center gap-1.5 text-[11px] py-1.5 px-2 rounded-lg bg-slate-50 text-slate-400">
            <IconAlertTriangle class="w-3 h-3 shrink-0"/>
            <span>Sin árbitro registrado</span>
          </div>

          <!-- Acción -->
          <button class="w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all"
            :class="m.status === 'live'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : m.status === 'finished'
              ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              : 'bg-primary text-white hover:bg-primary/90'">
            <IconPlay v-if="m.status === 'scheduled'" class="w-3.5 h-3.5"/>
            <IconZap  v-else-if="m.status === 'live'"    class="w-3.5 h-3.5"/>
            <IconEye  v-else                              class="w-3.5 h-3.5"/>
            {{ m.status === 'live' ? 'Abrir panel en vivo' : m.status === 'finished' ? 'Ver resumen' : 'Iniciar partido' }}
          </button>
        </div>
      </div>
    </div>

    </template><!-- end tab:matches -->

    <!-- ══════════════════════════════════════════════════
         PANEL DEL ÁRBITRO — Modal deslizante lateral
    ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="panel-slide">
        <div v-if="activeMatch" class="fixed inset-0 z-[900] flex">

          <!-- Overlay -->
          <div class="flex-1 bg-black/50 backdrop-blur-sm" @click="closePanel"></div>

          <!-- Panel -->
          <div class="w-full max-w-lg bg-slate-50 h-full overflow-y-auto shadow-2xl flex flex-col"
            style="padding-bottom: env(safe-area-inset-bottom, 0px)">

            <!-- Header del panel -->
            <div class="bg-white border-b border-muted px-5 py-4 flex items-center gap-3 shrink-0 sticky top-0 z-10">
              <button @click="closePanel" class="text-slate-400 hover:text-slate-700 transition-colors">
                <IconX class="w-5 h-5"/>
              </button>
              <div class="flex-1 min-w-0">
                <p class="font-black text-slate-900 truncate">
                  {{ activeMatch.homeTeam }} vs {{ activeMatch.awayTeam }}
                </p>
                <div class="flex items-center gap-2 flex-wrap mt-0.5">
                  <p class="text-xs text-slate-400">{{ activeMatch.categoryName }} · {{ activeMatch.tournamentName }}</p>
                  <!-- Árbitro del partido -->
                  <span v-if="activeMatch.refereeName"
                    class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    :class="activeMatch.status==='live' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'">
                    <IconShield class="w-3 h-3"/>
                    {{ activeMatch.refereeName }}
                  </span>
                  <span v-else-if="activeMatch.status==='finished'"
                    class="inline-flex items-center gap-1 text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-100">
                    <IconShield class="w-3 h-3"/>
                    Sin árbitro
                  </span>
                </div>
              </div>
              <!-- Timer -->
              <div v-if="activeMatch.status === 'live'"
                class="flex items-center gap-1.5 bg-red-600 text-white rounded-full px-3 py-1">
                <span class="w-1.5 h-1.5 bg-white rounded-full animate-ping inline-block"></span>
                <span class="text-sm font-black tabular-nums">{{ elapsedStr }}</span>
              </div>
            </div>

            <div class="flex-1 p-4 space-y-4">

              <!-- ── MARCADOR ─────────────────────────────── -->
              <div class="bg-white rounded-2xl border border-muted overflow-hidden">
                <!-- Estado -->
                <div class="py-2 text-center text-[10px] font-black uppercase tracking-widest"
                  :class="activeMatch.status === 'live'     ? 'bg-red-600 text-white' :
                          activeMatch.status === 'finished' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-primary/10 text-primary'">
                  {{ activeMatch.status === 'live' ? `EN VIVO · ${elapsedStr}` :
                     activeMatch.status === 'finished' ? 'Partido Finalizado' :
                     'Programado' }}
                </div>

                <div class="flex items-center py-5 px-4 gap-2">
                  <div class="flex-1 text-center">
                    <div class="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                      <img v-if="activeMatch.homeLogo" :src="activeMatch.homeLogo" class="w-full h-full object-contain p-1"/>
                      <IconShirt v-else class="w-7 h-7 text-slate-400"/>
                    </div>
                    <p class="font-black text-slate-900 text-sm leading-tight">{{ activeMatch.homeTeam }}</p>
                  </div>
                  <div class="text-center px-3">
                    <p v-if="activeMatch.status !== 'scheduled'"
                      class="text-4xl font-black text-slate-900 tabular-nums">
                      {{ activeMatch.home_score }}<span class="text-slate-300 mx-1">-</span>{{ activeMatch.away_score }}
                    </p>
                    <p v-else class="text-3xl font-black text-slate-300">vs</p>
                  </div>
                  <div class="flex-1 text-center">
                    <div class="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                      <img v-if="activeMatch.awayLogo" :src="activeMatch.awayLogo" class="w-full h-full object-contain p-1"/>
                      <IconShirt v-else class="w-7 h-7 text-slate-400"/>
                    </div>
                    <p class="font-black text-slate-900 text-sm leading-tight">{{ activeMatch.awayTeam }}</p>
                  </div>
                </div>

                <!-- Goleadores -->
                <div v-if="panelGoals.length" class="border-t border-muted px-4 py-2.5 flex flex-wrap gap-x-3 gap-y-1">
                  <span v-for="g in panelGoals" :key="g.id" class="text-[11px] text-slate-600 flex items-center gap-1">
                    <IconTarget class="w-3 h-3 text-green-600 shrink-0" />
                    <span class="font-semibold">{{ g.playerName || '?' }}</span>
                    <span class="text-slate-400 tabular-nums">{{ g.minute }}'<span v-if="g.second">{{ String(g.second).padStart(2,'0') }}</span></span>
                  </span>
                </div>
              </div>

              <!-- ── INICIAR ────────────────────────────────── -->
              <button v-if="activeMatch.status === 'scheduled'"
                @click="confirmStart = true"
                class="w-full py-4 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-3 shadow-md"
                style="background:linear-gradient(135deg,#16a34a,#15803d)">
                <IconPlay class="w-6 h-6"/> INICIAR PARTIDO
              </button>

              <!-- ── PANEL EN VIVO ──────────────────────────── -->
              <template v-if="activeMatch.status === 'live'">

                <!-- Registrar evento -->
                <div class="bg-white rounded-2xl border border-muted p-4 space-y-4">
                  <h3 class="font-black text-slate-900 flex items-center gap-2 text-sm">
                    <IconZap class="w-4 h-4 text-primary"/> Registrar evento
                  </h3>

                  <!-- Tipo -->
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">¿Qué ocurrió?</p>
                    <div class="grid grid-cols-5 gap-1.5">
                      <button v-for="et in eventTypes" :key="et.type"
                        @click="ev.type = et.type"
                        class="flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all"
                        :class="ev.type === et.type ? et.activeClass : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'">
                        <span class="w-5 h-5 flex items-center justify-center">
                          <span v-if="et.icon==='card-yellow'" class="inline-block w-3 h-4 rounded-sm bg-yellow-400"></span>
                          <span v-else-if="et.icon==='card-red'" class="inline-block w-3 h-4 rounded-sm bg-red-500"></span>
                          <component v-else :is="et.icon" class="w-4 h-4"
                            :class="ev.type === et.type ? '' : et.iconColor" />
                        </span>
                        <span class="text-[9px] font-bold leading-tight text-center">{{ et.label }}</span>
                      </button>
                    </div>
                  </div>

                  <!-- Equipo -->
                  <div v-if="ev.type">
                    <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">¿Qué equipo?</p>
                    <div class="grid grid-cols-2 gap-2">
                      <button @click="selectTeam(activeMatch.home_team)"
                        class="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 font-bold text-sm transition-all"
                        :class="ev.teamId === activeMatch.home_team ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600'">
                        <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                          <img v-if="activeMatch.homeLogo" :src="activeMatch.homeLogo" class="w-full h-full object-contain"/>
                          <IconShirt v-else class="w-3.5 h-3.5 text-slate-400"/>
                        </div>
                        <span class="truncate text-xs">{{ activeMatch.homeTeam }}</span>
                      </button>
                      <button @click="selectTeam(activeMatch.away_team)"
                        class="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 font-bold text-sm transition-all"
                        :class="ev.teamId === activeMatch.away_team ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600'">
                        <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                          <img v-if="activeMatch.awayLogo" :src="activeMatch.awayLogo" class="w-full h-full object-contain"/>
                          <IconShirt v-else class="w-3.5 h-3.5 text-slate-400"/>
                        </div>
                        <span class="truncate text-xs">{{ activeMatch.awayTeam }}</span>
                      </button>
                    </div>
                  </div>

                  <!-- Jugador -->
                  <div v-if="ev.type && ev.teamId">
                    <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">¿Qué jugador?</p>
                    <input v-model="playerSearch" placeholder="Buscar nombre o número..."
                      class="w-full border border-muted rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:border-primary"/>
                    <div class="max-h-44 overflow-y-auto space-y-1 pr-1">
                      <button v-for="p in filteredPlayers" :key="p.id"
                        @click="ev.playerId = p.id"
                        class="w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 text-sm transition-all text-left"
                        :class="ev.playerId === p.id ? 'border-primary bg-primary/10' : 'border-slate-100 hover:border-slate-200 bg-slate-50'">
                        <div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          <img v-if="p.photo" :src="p.photo" class="w-full h-full object-cover"/>
                          <span v-else class="text-[10px] font-black text-slate-500">{{ p.number || '?' }}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="font-bold text-slate-900 text-xs truncate">{{ p.name }}</p>
                          <p class="text-[10px] text-slate-400">{{ p.position }} · #{{ p.number }}</p>
                        </div>
                        <IconCheck v-if="ev.playerId === p.id" class="w-4 h-4 text-primary shrink-0"/>
                      </button>
                      <p v-if="!filteredPlayers.length" class="text-center text-slate-400 text-xs py-3">
                        {{ playerSearch ? 'Sin resultados' : 'Sin jugadores en este equipo' }}
                      </p>
                    </div>
                  </div>

                  <!-- Minuto : Segundo + guardar -->
                  <div v-if="ev.type && ev.teamId" class="space-y-2">
                    <div class="flex gap-2 items-end">
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Min.</p>
                        <input v-model.number="ev.minute" type="number" min="1" max="120"
                          class="w-14 border border-muted rounded-xl px-2 py-2.5 text-center text-sm font-black focus:outline-none focus:border-primary"/>
                      </div>
                      <span class="pb-3 text-slate-400 font-black text-lg">:</span>
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Seg.</p>
                        <input v-model.number="ev.second" type="number" min="0" max="59"
                          class="w-14 border border-muted rounded-xl px-2 py-2.5 text-center text-sm font-black focus:outline-none focus:border-primary"/>
                      </div>
                      <button @click="ev.minute = elapsedMin; ev.second = elapsedSec"
                        class="text-[11px] text-primary font-bold border border-primary/30 px-2.5 py-2.5 rounded-xl hover:bg-primary/5 whitespace-nowrap">
                        ← {{ elapsedStr }}
                      </button>
                      <button @click="confirmAddEvent" :disabled="evSaving"
                        class="flex-1 py-2.5 rounded-xl font-black text-white text-sm disabled:opacity-40 transition-all"
                        :class="currentEventType?.btnClass || 'bg-primary'">
                        {{ evSaving ? '...' : (currentEventType?.label || 'Registrar') }}
                      </button>
                    </div>
                    <p class="text-[10px] text-slate-400 text-right">
                      Se registrará en el minuto <strong class="text-slate-700">{{ ev.minute }}:{{ String(ev.second).padStart(2,'0') }}</strong>
                    </p>
                  </div>
                </div>

                <!-- Finalizar -->
                <button @click="confirmEnd = true"
                  class="w-full py-3 rounded-2xl font-black text-sm border-2 border-red-300 text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                  <IconSquare class="w-4 h-4 fill-red-500 text-red-500"/> FINALIZAR PARTIDO
                </button>
              </template>

              <!-- ── TIMELINE DE EVENTOS ─────────────────────── -->
              <div v-if="panelEvents.length" class="bg-white rounded-2xl border border-muted p-4">
                <h3 class="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
                  <IconClipboardList class="w-4 h-4 text-primary"/> Registro
                </h3>
                <div class="space-y-1.5">
                  <div v-for="e in [...panelEvents].reverse()" :key="e.id"
                    class="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 group transition-colors">
                    <span class="text-xs font-black text-slate-400 w-12 text-right shrink-0 tabular-nums">
                      {{ e.minute }}'<span v-if="e.second">{{ String(e.second).padStart(2,'0') }}</span>
                    </span>
                    <span class="w-5 h-5 flex items-center justify-center shrink-0">
                      <IconTarget        v-if="e.type==='goal'"        class="w-4 h-4 text-green-600" />
                      <IconAlertTriangle v-else-if="e.type==='own_goal'" class="w-4 h-4 text-orange-500" />
                      <IconZap           v-else-if="e.type==='assist'"  class="w-4 h-4 text-blue-500" />
                      <span v-else-if="e.type==='yellow_card'" class="inline-block w-2.5 h-3.5 rounded-sm bg-yellow-400"></span>
                      <span v-else-if="e.type==='red_card'"    class="inline-block w-2.5 h-3.5 rounded-sm bg-red-500"></span>
                      <IconCircle v-else class="w-3 h-3 text-slate-300" />
                    </span>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-slate-900 truncate">{{ e.playerName || 'Jugador' }}</p>
                      <p class="text-[11px] text-slate-400">{{ e.teamName }} · {{ eventLabel(e.type) }}</p>
                    </div>
                    <button @click="confirmRemoveEvent(e)"
                      class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded shrink-0">
                      <IconX class="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirmación: acción genérica -->
    <Teleport to="body">
      <div v-if="confirmDialog.show" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <IconAlertCircle class="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-base leading-tight">{{ confirmDialog.title }}</h3>
              <p class="text-slate-500 text-sm mt-1 leading-snug">{{ confirmDialog.body }}</p>
            </div>
          </div>
          <div class="flex gap-3 pt-1">
            <button @click="confirmDialog.show = false"
              class="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button @click="runConfirm"
              class="flex-1 py-2.5 rounded-xl font-black text-white text-sm transition"
              :class="confirmDialog.confirmClass">
              {{ confirmDialog.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ Modal: Crear/Editar árbitro ══ -->
    <Teleport to="body">
      <div v-if="refModal.show" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">

          <!-- Header -->
          <div class="flex items-center justify-between">
            <h3 class="font-black text-slate-900 text-base flex items-center gap-2">
              <IconShield class="w-4 h-4 text-primary"/>
              {{ refModal.editing ? 'Editar árbitro' : 'Nuevo árbitro' }}
            </h3>
            <button @click="refModal.show=false" class="text-slate-400 hover:text-slate-600">
              <IconX class="w-4 h-4"/>
            </button>
          </div>

          <div class="space-y-3">
            <!-- Nombre -->
            <div>
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nombre completo</label>
              <input v-model="refModal.name" placeholder="Ej: Carlos Pérez"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary"/>
            </div>
            <!-- Email -->
            <div>
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Correo electrónico</label>
              <input v-model="refModal.email" type="email" placeholder="arbitro@ejemplo.com"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary"/>
            </div>

            <!-- Torneo asignado -->
            <div>
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Torneo asignado</label>
              <select v-model="refModal.tournamentId"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary">
                <option :value="null">Sin asignar</option>
                <option v-for="t in tournaments" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <p class="text-[10px] text-slate-400 mt-1">El árbitro solo verá los partidos de este torneo en su portal</p>
            </div>

            <!-- ── CONTRASEÑA (crear) ── -->
            <div v-if="!refModal.editing">
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña</label>
                <button type="button" @click="refModal.password = genPasswordFrontend()"
                  class="text-[11px] text-primary font-bold hover:underline flex items-center gap-1">
                  <IconRefreshCw class="w-3 h-3"/> Generar nueva
                </button>
              </div>
              <div class="relative">
                <input v-model="refModal.password" :type="refModal.showPwd ? 'text' : 'password'"
                  placeholder="Mín. 6 caracteres"
                  class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary pr-10 font-mono"/>
                <button type="button" @click="refModal.showPwd=!refModal.showPwd"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <IconEyeOff v-if="refModal.showPwd" class="w-4 h-4"/><IconEye v-else class="w-4 h-4"/>
                </button>
              </div>
              <p class="text-[10px] text-slate-400 mt-1">Puedes editarla antes de guardar. Se mostrará una sola vez al crear.</p>
            </div>

            <!-- ── CONTRASEÑA (editar) ── -->
            <div v-else>
              <label class="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                <input type="checkbox" v-model="refModal.changePassword" class="rounded accent-primary"/>
                <span class="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <IconKey class="w-3.5 h-3.5 text-amber-500"/> Cambiar contraseña
                </span>
              </label>
              <div v-if="refModal.changePassword" class="mt-2 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-500">Nueva contraseña</span>
                  <button type="button" @click="refModal.password=genPasswordFrontend(); refModal.showPwd=true"
                    class="text-[11px] text-primary font-bold hover:underline flex items-center gap-1">
                    <IconRefreshCw class="w-3 h-3"/> Sugerir
                  </button>
                </div>
                <div class="relative">
                  <input v-model="refModal.password" :type="refModal.showPwd ? 'text' : 'password'"
                    placeholder="Nueva contraseña (mín. 6 chars)"
                    class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary pr-10 font-mono"/>
                  <button type="button" @click="refModal.showPwd=!refModal.showPwd"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <IconEyeOff v-if="refModal.showPwd" class="w-4 h-4"/><IconEye v-else class="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-1">
            <button @click="refModal.show=false" class="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button @click="saveRef"
              :disabled="!refModal.name.trim()||!refModal.email.trim()||(!refModal.editing&&refModal.password.length<6)"
              class="flex-1 py-2.5 rounded-xl font-black text-white text-sm bg-primary hover:bg-primary/90 disabled:opacity-40 transition">
              {{ refModal.editing ? 'Guardar cambios' : 'Crear árbitro' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ Modal: Mostrar credenciales generadas ══ -->
    <Teleport to="body">
      <div v-if="newCredentials.show" class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
          <div class="text-center">
            <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <IconShield class="w-7 h-7 text-green-600"/>
            </div>
            <h3 class="font-black text-slate-900 text-lg">Credenciales de acceso</h3>
            <p class="text-slate-500 text-sm mt-1">Para <strong>{{ newCredentials.name }}</strong></p>
          </div>
          <div class="bg-slate-50 rounded-xl border border-muted p-4 space-y-3">
            <div>
              <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Correo</p>
              <div class="flex items-center gap-2">
                <code class="flex-1 font-mono text-sm bg-white border border-muted rounded-lg px-3 py-2 text-slate-900">{{ newCredentials.email }}</code>
                <button @click="copy(newCredentials.email)" class="text-primary hover:text-primary/70 text-xs font-bold border border-primary/30 px-2.5 py-2 rounded-lg">Copiar</button>
              </div>
            </div>
            <div>
              <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Contraseña</p>
              <div class="flex items-center gap-2">
                <code class="flex-1 font-mono text-sm bg-white border border-muted rounded-lg px-3 py-2 text-slate-900 break-all">{{ newCredentials.password }}</code>
                <button @click="copy(newCredentials.password)" class="text-primary hover:text-primary/70 text-xs font-bold border border-primary/30 px-2.5 py-2 rounded-lg">Copiar</button>
              </div>
            </div>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <IconAlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
            <p class="text-xs text-amber-800 font-semibold leading-relaxed">
              Guarda estas credenciales — la contraseña no volverá a mostrarse.
              El árbitro inicia sesión en <strong>/login</strong> con su correo.
            </p>
          </div>
          <button @click="newCredentials.show=false"
            class="w-full py-3 rounded-xl font-black text-white text-sm bg-primary hover:bg-primary/90 transition">
            Entendido, ya la guardé
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Confirmación: Iniciar -->
    <Teleport to="body">
      <div v-if="confirmStart" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
          <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <IconPlay class="w-8 h-8 text-green-600"/>
          </div>
          <div>
            <h3 class="font-black text-slate-900 text-xl">¿Iniciar partido?</h3>
            <p class="text-slate-500 text-sm mt-1">{{ activeMatch?.homeTeam }} vs {{ activeMatch?.awayTeam }}</p>
            <p class="text-slate-400 text-xs mt-2">El cronómetro iniciará y el partido quedará EN VIVO para todos.</p>
          </div>
          <div class="grid grid-cols-2 gap-3 pt-2">
            <button @click="confirmStart = false" class="py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm">Cancelar</button>
            <button @click="startMatch" class="py-3 rounded-xl font-black text-white text-sm" style="background:linear-gradient(135deg,#16a34a,#15803d)">¡Iniciar!</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirmación: Finalizar -->
    <Teleport to="body">
      <div v-if="confirmEnd" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
          <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <IconSquare class="w-8 h-8 fill-red-600 text-red-600"/>
          </div>
          <div>
            <h3 class="font-black text-slate-900 text-xl">¿Finalizar partido?</h3>
            <div class="mt-3 p-4 rounded-xl bg-slate-50 border border-muted">
              <p class="text-xs text-slate-400 uppercase tracking-wider mb-2">Resultado final</p>
              <div class="flex items-center justify-center gap-4">
                <div class="text-center">
                  <p class="text-xs text-slate-500 truncate max-w-[80px]">{{ activeMatch?.homeTeam }}</p>
                  <p class="text-4xl font-black text-slate-900">{{ activeMatch?.home_score }}</p>
                </div>
                <p class="text-slate-300 font-black text-2xl">—</p>
                <div class="text-center">
                  <p class="text-xs text-slate-500 truncate max-w-[80px]">{{ activeMatch?.awayTeam }}</p>
                  <p class="text-4xl font-black text-slate-900">{{ activeMatch?.away_score }}</p>
                </div>
              </div>
              <p class="text-xs text-slate-400 mt-2">Duración: {{ elapsedStr }}</p>
            </div>
            <p class="text-slate-400 text-xs mt-3">Las estadísticas y tabla se actualizarán automáticamente.</p>
          </div>
          <div class="grid grid-cols-2 gap-3 pt-2">
            <button @click="confirmEnd = false" class="py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm">Seguir jugando</button>
            <button @click="endMatch" class="py-3 rounded-xl font-black text-white text-sm bg-red-600 hover:bg-red-700">Finalizar</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import api from '@/api'

// ── Data ──────────────────────────────────────────────────
const tournaments   = ref([])
const categories    = ref([])
const allMatches    = ref([])
const loading       = ref(false)
const selTournament = ref(null)
const selCategory   = ref(null)
const activeFilter  = ref('all')
const activeTab     = ref('matches')   // 'matches' | 'referees'

// Panel state
const activeMatch  = ref(null)
const panelEvents  = ref([])
const homePlayers  = ref([])
const awayPlayers  = ref([])
const playerSearch = ref('')
const evSaving     = ref(false)
const confirmStart = ref(false)
const confirmEnd   = ref(false)

// Timer
const elapsed    = ref(0)
let   timerHandle = null

const ev = ref({ type: '', teamId: null, playerId: null, minute: 1, second: 0 })

// ── Referee management state ───────────────────────────────
const referees    = ref([])
const refLoading  = ref(false)
const refModal    = reactive({
  show: false, editing: null,
  name: '', email: '',
  tournamentId: null,
  // Contraseña: editable antes de crear, también al editar
  password: '', showPwd: false,
  changePassword: false  // en modo edición: mostrar campo contraseña
})
const newCredentials = reactive({ show: false, username: '', password: '', name: '' })

// Genera contraseña segura en el frontend (sugerencia editable)
function genPasswordFrontend() {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const symbols = '#%&!?+'
  const all     = upper + lower + digits + symbols
  const arr     = Array.from({ length: 14 }, (_, i) => {
    if (i === 0) return upper[Math.floor(Math.random() * upper.length)]
    if (i === 1) return lower[Math.floor(Math.random() * lower.length)]
    if (i === 2) return digits[Math.floor(Math.random() * digits.length)]
    if (i === 3) return symbols[Math.floor(Math.random() * symbols.length)]
    return all[Math.floor(Math.random() * all.length)]
  })
  // Mezclar
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}

const confirmDialog = reactive({ show: false, title: '', body: '', confirmLabel: '', confirmClass: '', onConfirm: null })

function askConfirm({ title, body, confirmLabel, confirmClass, onConfirm }) {
  Object.assign(confirmDialog, { show: true, title, body, confirmLabel, confirmClass, onConfirm })
}
function runConfirm() {
  confirmDialog.show = false
  confirmDialog.onConfirm?.()
}

// ── Filters ───────────────────────────────────────────────
const liveCount = computed(() => allMatches.value.filter(m => m.status === 'live').length)

const filters = computed(() => [
  { key: 'all',       label: 'Todos',       count: 0 },
  { key: 'live',      label: 'En vivo',     count: liveCount.value },
  { key: 'today',     label: 'Hoy',         count: todayMatches.value.length },
  { key: 'scheduled', label: 'Programados', count: allMatches.value.filter(m => m.status === 'scheduled').length },
  { key: 'finished',  label: 'Finalizados', count: 0 },
])

const today = new Date().toISOString().slice(0, 10)
const todayMatches = computed(() =>
  allMatches.value.filter(m => m.status === 'scheduled' && m.date?.slice(0, 10) === today)
)

const filteredMatches = computed(() => {
  let list = allMatches.value

  // Filtro por categoría
  if (selCategory.value) {
    list = list.filter(m => m.category_id === selCategory.value)
  }

  // Filtro por estado
  switch (activeFilter.value) {
    case 'live':      list = list.filter(m => m.status === 'live');      break
    case 'today':     list = list.filter(m => m.status === 'scheduled' && m.date?.slice(0,10) === today); break
    case 'scheduled': list = list.filter(m => m.status === 'scheduled'); break
    case 'finished':  list = list.filter(m => m.status === 'finished');  break
  }
  return list
})

function applyFilters() { /* reactivo — el computed se recalcula solo */ }

// ── Event types ───────────────────────────────────────────
const eventTypes = [
  { type: 'goal',        icon: 'IconTarget',       label: 'Gol',      iconColor: 'text-green-500',  activeClass: 'border-green-500 bg-green-50 text-green-700',   btnClass: 'bg-green-600' },
  { type: 'own_goal',    icon: 'IconAlertTriangle', label: 'En propia',iconColor: 'text-orange-500', activeClass: 'border-orange-500 bg-orange-50 text-orange-700', btnClass: 'bg-orange-500' },
  { type: 'assist',      icon: 'IconZap',           label: 'Asist.',   iconColor: 'text-blue-500',   activeClass: 'border-blue-500 bg-blue-50 text-blue-700',      btnClass: 'bg-blue-600' },
  { type: 'yellow_card', icon: 'card-yellow',       label: 'Amarilla', iconColor: '',                activeClass: 'border-yellow-500 bg-yellow-50 text-yellow-700', btnClass: 'bg-yellow-500' },
  { type: 'red_card',    icon: 'card-red',          label: 'Roja',     iconColor: '',                activeClass: 'border-red-500 bg-red-50 text-red-700',         btnClass: 'bg-red-600' },
]
const currentEventType = computed(() => eventTypes.find(e => e.type === ev.value.type))

// ── Computed helpers ──────────────────────────────────────
const elapsedMin = computed(() => Math.floor(elapsed.value / 60) + 1)
const elapsedSec = computed(() => elapsed.value % 60)
const elapsedStr = computed(() => {
  const m = String(Math.floor(elapsed.value / 60)).padStart(2, '0')
  const s = String(elapsed.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

const panelGoals = computed(() =>
  panelEvents.value.filter(e => e.type === 'goal' || e.type === 'own_goal')
)

const currentPlayers = computed(() =>
  ev.value.teamId === activeMatch.value?.home_team ? homePlayers.value : awayPlayers.value
)
const filteredPlayers = computed(() => {
  const q = playerSearch.value.toLowerCase().trim()
  if (!q) return currentPlayers.value
  return currentPlayers.value.filter(p =>
    p.name.toLowerCase().includes(q) || String(p.number || '').includes(q)
  )
})

function copy(text) { navigator.clipboard?.writeText(text) }

function eventLabel(t) {
  return { goal:'Gol', own_goal:'Gol en propia', assist:'Asistencia', yellow_card:'Tarjeta amarilla', red_card:'Tarjeta roja' }[t] || t
}
function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
}

// ── Timer ─────────────────────────────────────────────────
function startTimer(startedAt) {
  stopTimer()
  if (startedAt) elapsed.value = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  else elapsed.value = 0
  timerHandle = setInterval(() => elapsed.value++, 1000)
}
function stopTimer() { clearInterval(timerHandle); timerHandle = null }

// ── Load ──────────────────────────────────────────────────
async function loadTournaments() {
  const { data } = await api.get('/tournaments')
  tournaments.value = data
}

async function onTournamentChange() {
  selCategory.value = null
  categories.value  = []
  if (selTournament.value?.slug) {
    try {
      const { data } = await api.get(`/tournaments/${selTournament.value.slug}/categories`)
      categories.value = data
    } catch {}
  }
  await loadMatches()
}

async function loadMatches() {
  loading.value = true
  try {
    const slug = selTournament.value?.slug
    const url  = slug ? `/tournaments/${slug}/matches` : '/admin/all-matches'
    const { data } = await api.get(url)
    allMatches.value = data
  } catch {} finally { loading.value = false }
}

// ── Panel ─────────────────────────────────────────────────
async function openPanel(m) {
  activeMatch.value = { ...m }
  ev.value = { type: '', teamId: null, playerId: null, minute: 1 }
  playerSearch.value = ''
  panelEvents.value  = []

  if (m.status === 'live') startTimer(m.started_at)

  const [evRes, hp, ap] = await Promise.allSettled([
    api.get(`/matches/${m.id}/events`),
    api.get(`/teams/${m.home_team}/players`),
    api.get(`/teams/${m.away_team}/players`),
  ])
  panelEvents.value = evRes.status === 'fulfilled' ? evRes.value.data : []
  homePlayers.value  = hp.status  === 'fulfilled' ? hp.value.data  : []
  awayPlayers.value  = ap.status  === 'fulfilled' ? ap.value.data  : []
}

function closePanel() {
  stopTimer()
  activeMatch.value = null
}

function selectTeam(id) {
  ev.value.teamId   = id
  ev.value.playerId = null
  playerSearch.value = ''
}

// ── Actions ───────────────────────────────────────────────
async function startMatch() {
  const { data } = await api.patch(`/matches/${activeMatch.value.id}/start`)
  activeMatch.value = { ...activeMatch.value, ...data, status: 'live' }
  // Update list
  const idx = allMatches.value.findIndex(m => m.id === activeMatch.value.id)
  if (idx >= 0) allMatches.value[idx] = { ...allMatches.value[idx], status: 'live', started_at: data.started_at }
  startTimer(data.started_at)
  confirmStart.value = false
}

async function endMatch() {
  await api.patch(`/matches/${activeMatch.value.id}/score`, {
    homeScore: activeMatch.value.home_score,
    awayScore: activeMatch.value.away_score,
    finish: true
  })
  activeMatch.value = { ...activeMatch.value, status: 'finished' }
  const idx = allMatches.value.findIndex(m => m.id === activeMatch.value.id)
  if (idx >= 0) allMatches.value[idx] = { ...allMatches.value[idx], status: 'finished' }
  stopTimer()
  confirmEnd.value = false
}

function confirmAddEvent() {
  if (!ev.value.type || !ev.value.teamId) return
  const teamName = ev.value.teamId === activeMatch.value?.home_team
    ? activeMatch.value?.homeTeam
    : activeMatch.value?.awayTeam
  const player = [...homePlayers.value, ...awayPlayers.value].find(p => p.id === ev.value.playerId)
  const playerStr = player ? `${player.name} (#${player.number})` : 'Sin jugador especificado'
  const evLabel = eventLabel(ev.value.type)
  const timeStr = `${ev.value.minute}:${String(ev.value.second).padStart(2,'0')}`
  askConfirm({
    title: `¿Registrar ${evLabel}?`,
    body: `${evLabel} · ${teamName} · ${playerStr} · Min. ${timeStr}`,
    confirmLabel: 'Sí, registrar',
    confirmClass: currentEventType.value?.btnClass || 'bg-primary',
    onConfirm: addEvent
  })
}

function confirmRemoveEvent(event) {
  askConfirm({
    title: '¿Anular este evento?',
    body: `Se eliminará: ${eventLabel(event.type)} de ${event.playerName || 'jugador'} (${event.teamName}) en el min. ${event.minute}. El marcador se recalculará si aplica.`,
    confirmLabel: 'Anular evento',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: () => removeEvent(event)
  })
}

async function addEvent() {
  if (!ev.value.type || !ev.value.teamId || evSaving.value) return
  evSaving.value = true
  try {
    const { data } = await api.post(`/matches/${activeMatch.value.id}/events`, {
      type:     ev.value.type,
      teamId:   ev.value.teamId,
      playerId: ev.value.playerId || null,
      minute:   ev.value.minute || elapsedMin.value,
      second:   ev.value.second ?? elapsedSec.value
    })
    activeMatch.value = { ...activeMatch.value, ...data.match }
    const idx = allMatches.value.findIndex(m => m.id === activeMatch.value.id)
    if (idx >= 0) {
      allMatches.value[idx] = { ...allMatches.value[idx], home_score: data.match.home_score, away_score: data.match.away_score }
    }
    const evRes = await api.get(`/matches/${activeMatch.value.id}/events`)
    panelEvents.value = evRes.data
    ev.value.type     = ''
    ev.value.playerId = null
    ev.value.second   = 0
    playerSearch.value = ''
  } catch (e) {
    alert(e.response?.data?.error || 'Error al registrar')
  } finally { evSaving.value = false }
}

async function removeEvent(event) {
  const { data } = await api.delete(`/match-events/${event.id}`)
  activeMatch.value = { ...activeMatch.value, ...data.match }
  const evRes = await api.get(`/matches/${activeMatch.value.id}/events`)
  panelEvents.value = evRes.data
  const idx = allMatches.value.findIndex(m => m.id === activeMatch.value.id)
  if (idx >= 0) allMatches.value[idx] = { ...allMatches.value[idx], home_score: data.match.home_score, away_score: data.match.away_score }
}

// Sync minute + second with timer when live
watch(elapsed, () => {
  if (activeMatch.value?.status === 'live') {
    ev.value.minute = elapsedMin.value
    ev.value.second = elapsedSec.value
  }
})

// ── Referee CRUD ──────────────────────────────────────────
async function loadReferees() {
  refLoading.value = true
  try {
    const { data } = await api.get('/referees')
    referees.value = data
  } catch {} finally { refLoading.value = false }
}

function openRefModal(ref) {
  if (ref) {
    Object.assign(refModal, {
      show: true, editing: ref,
      name: ref.name, email: ref.email,
      tournamentId: ref.tournament_id || null,
      password: '', showPwd: false, changePassword: false
    })
  } else {
    Object.assign(refModal, {
      show: true, editing: null,
      name: '', email: '',
      tournamentId: null,
      password: genPasswordFrontend(),
      showPwd: true, changePassword: false
    })
  }
}

async function saveRef() {
  if (!refModal.name.trim() || !refModal.email.trim()) return
  // Validar contraseña mínima al crear
  if (!refModal.editing && refModal.password.length < 6) {
    alert('La contraseña debe tener al menos 6 caracteres')
    return
  }
  try {
    if (refModal.editing) {
      const payload = {
        name: refModal.name,
        email: refModal.email,
        // Enviar siempre tournamentId — null es válido para "Sin asignar"
        tournamentId: refModal.tournamentId !== undefined ? refModal.tournamentId : refModal.editing.tournament_id
      }
      if (refModal.changePassword && refModal.password.trim()) {
        payload.newPassword = refModal.password.trim()
      }
      const { data } = await api.put(`/referees/${refModal.editing.id}`, payload)
      const idx = referees.value.findIndex(r => r.id === refModal.editing.id)
      if (idx >= 0) {
        // Reemplazar con todos los datos devueltos por el servidor
        referees.value[idx] = {
          ...referees.value[idx],
          name:           data.name,
          email:          data.email,
          tournament_id:  data.tournament_id,
          tournamentName: data.tournamentName || null
        }
      }
      if (data.plainPassword) {
        Object.assign(newCredentials, {
          show: true,
          username: data.username || refModal.editing.username,
          password: data.plainPassword,
          name: data.name
        })
      }
    } else {
      const { data } = await api.post('/referees', {
        name:         refModal.name,
        email:        refModal.email,
        password:     refModal.password.trim() || undefined,
        tournamentId: refModal.tournamentId ?? null
      })
      referees.value.push({
        ...data,
        matches_refereed: 0
      })
      Object.assign(newCredentials, {
        show: true, email: refModal.email, password: refModal.password.trim() || data.plainPassword, name: data.name
      })
    }
    refModal.show = false
  } catch (e) {
    alert(e.response?.data?.error || 'Error al guardar árbitro')
  }
}

function askToggleRef(ref) {
  askConfirm({
    title: ref.is_active ? '¿Desactivar árbitro?' : '¿Activar árbitro?',
    body: ref.is_active
      ? `${ref.name} no podrá iniciar sesión en el portal de árbitro.`
      : `${ref.name} podrá volver a iniciar sesión.`,
    confirmLabel: ref.is_active ? 'Desactivar' : 'Activar',
    confirmClass: ref.is_active ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700',
    onConfirm: async () => {
      await api.patch(`/referees/${ref.id}/toggle`)
      const idx = referees.value.findIndex(r => r.id === ref.id)
      if (idx >= 0) referees.value[idx].is_active = ref.is_active ? 0 : 1
    }
  })
}

function askDeleteRef(ref) {
  askConfirm({
    title: '¿Eliminar árbitro?',
    body: `Se eliminará la cuenta de ${ref.name}. Su historial de partidos arbitrados se conservará pero sin asociación.`,
    confirmLabel: 'Eliminar',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: async () => {
      await api.delete(`/referees/${ref.id}`)
      referees.value = referees.value.filter(r => r.id !== ref.id)
    }
  })
}

onMounted(async () => {
  await loadTournaments()
  await loadMatches()
  if (liveCount.value > 0) activeFilter.value = 'live'
})
onUnmounted(stopTimer)
</script>

<style scoped>
.panel-slide-enter-active,
.panel-slide-leave-active { transition: opacity 0.25s, transform 0.25s; }
.panel-slide-enter-from .panel-slide-leave-to { opacity: 0; }
</style>
