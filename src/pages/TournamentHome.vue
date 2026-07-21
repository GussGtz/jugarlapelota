<template>
  <div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 1 — Hero épico                                    -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section class="relative min-h-[85vh] md:min-h-screen flex flex-col items-center justify-center text-center overflow-hidden">
      <!-- Fondo -->
      <div class="absolute inset-0">
        <img v-if="tournament?.banner" :src="tournament.banner" class="w-full h-full object-cover" />
        <div v-else class="w-full h-full" :style="{ background: tournament?.primary_color || '#1a4a1a' }"></div>
        <!-- Overlay degradado oscuro -->
        <div class="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/85"></div>
      </div>

      <!-- Contenido centrado -->
      <div class="relative z-10 px-4 py-20 space-y-6 w-full max-w-4xl mx-auto">
        <!-- Logo en círculo con borde dorado -->
        <div class="th-hero-anim mx-auto w-36 h-36 md:w-48 md:h-48 rounded-full border-4 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-hidden"
          style="animation-delay: 0.05s"
          :style="{ borderColor: tournament?.secondary_color || '#FFD700' }">
          <img v-if="tournament?.logo" :src="tournament.logo" class="w-full h-full object-contain p-4" />
          <IconTrophy v-else class="w-16 h-16 text-white" />
        </div>

        <!-- Nombre del torneo -->
        <div class="th-hero-anim" style="animation-delay: 0.18s">
          <h1 class="text-4xl md:text-7xl font-black text-white uppercase tracking-wider leading-none drop-shadow-2xl">
            {{ tournament?.name }}
          </h1>
          <p class="text-lg md:text-2xl font-bold uppercase tracking-widest mt-2"
            :style="{ color: tournament?.secondary_color || '#FFD700' }">
            {{ tournament?.location }}
          </p>
        </div>

        <!-- Descripción -->
        <p v-if="tournament?.description" class="th-hero-anim text-white/80 text-base md:text-lg max-w-xl mx-auto leading-relaxed" style="animation-delay: 0.3s">
          {{ tournament.description }}
        </p>

        <!-- Stats row — solo muestra datos reales, nunca inventados.
             flex-wrap + separadores ocultos en móvil: con 4 stats + números
             grandes (text-4xl+) no caben en una sola fila en pantallas
             angostas — antes se salían del viewport por los lados (el `flex`
             sin wrap centraba la fila completa y la sección con overflow
             hidden cortaba Equipos/Seguidores en los extremos). Al envolver,
             caen en 2 filas de 2 sin perder ningún número. -->
        <div class="th-hero-anim flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-8 md:gap-x-16 py-4" style="animation-delay: 0.4s">
          <button type="button" @click="scrollToTeams" class="text-center cursor-pointer" :disabled="!uniqueTeams.length">
            <p class="text-3xl sm:text-4xl md:text-6xl font-black" :style="{ color: tournament?.secondary_color || '#FFD700' }">{{ stats.teams }}</p>
            <p class="text-white/60 text-[10px] sm:text-xs md:text-sm uppercase tracking-widest font-semibold mt-1">Equipos</p>
          </button>
          <template v-if="stats.players > 0">
            <div class="w-px h-12 bg-white/20 hidden sm:block"></div>
            <button type="button" @click="scrollToTeams" class="text-center cursor-pointer" :disabled="!uniqueTeams.length">
              <p class="text-3xl sm:text-4xl md:text-6xl font-black" :style="{ color: tournament?.secondary_color || '#FFD700' }">{{ stats.players }}</p>
              <p class="text-white/60 text-[10px] sm:text-xs md:text-sm uppercase tracking-widest font-semibold mt-1">Jugadores</p>
            </button>
          </template>
          <div class="w-px h-12 bg-white/20 hidden sm:block"></div>
          <button type="button" @click="router.push(`/${slug}/partidos`)" class="text-center cursor-pointer">
            <p class="text-3xl sm:text-4xl md:text-6xl font-black" :style="{ color: tournament?.secondary_color || '#FFD700' }">{{ stats.matches }}</p>
            <p class="text-white/60 text-[10px] sm:text-xs md:text-sm uppercase tracking-widest font-semibold mt-1">Partidos</p>
          </button>
          <template v-if="stats.followers > 0">
            <div class="w-px h-12 bg-white/20 hidden sm:block"></div>
            <div class="text-center">
              <p class="text-3xl sm:text-4xl md:text-6xl font-black" :style="{ color: tournament?.secondary_color || '#FFD700' }">{{ stats.followers }}</p>
              <p class="text-white/60 text-[10px] sm:text-xs md:text-sm uppercase tracking-widest font-semibold mt-1">Seguidores</p>
            </div>
          </template>
        </div>

        <!-- CTAs -->
        <div class="th-hero-anim flex flex-col sm:flex-row gap-3 justify-center pt-2" style="animation-delay: 0.5s">
          <router-link :to="`/${slug}/partidos`"
            class="px-8 py-3 rounded-xl font-bold uppercase tracking-wide text-sm transition-all hover:opacity-90 hover:scale-105 text-white shadow-lg"
            :style="{ background: tournament?.primary_color || '#0ea5e9' }">
            Ver Partidos
          </router-link>
          <button v-if="pushSupported" @click="toggleFollow" :disabled="followLoading"
            class="px-8 py-3 rounded-xl font-bold uppercase tracking-wide text-sm transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
            :class="isFollowed
              ? 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30'
              : 'bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20'">
            <IconBell v-if="!isFollowed" class="w-4 h-4" />
            <IconBellRing v-else class="w-4 h-4 text-yellow-300" />
            {{ isFollowed ? 'Siguiendo' : 'Seguir torneo' }}
          </button>
        </div>

        <!-- Scroll indicator -->
        <div class="th-hero-anim mt-4" style="animation-delay: 0.7s">
          <div class="animate-bounce">
            <IconChevronDown class="w-6 h-6 text-white/40 mx-auto" />
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 2 — Partidos En Vivo / Resultados Recientes       -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="liveMatches.length || recentMatches.length || upcomingMatches.length" class="py-16 md:py-24" style="background:#F7F9FC">
      <div class="max-w-7xl mx-auto px-4">

        <!-- En vivo banner -->
        <div v-if="liveMatches.length" class="mb-10">
          <div v-reveal class="flex items-center justify-center gap-3 mb-6">
            <span class="inline-flex items-center gap-2 bg-red-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg animate-pulse">
              <IconCircle class="w-2.5 h-2.5 fill-white" /> En Vivo
            </span>
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <MatchCard v-for="(m, i) in liveMatches" :key="m.id" v-reveal="{ delay: i * 100 }" :match="m" :tournament-slug="slug" />
          </div>
        </div>

        <!-- Últimos Resultados -->
        <div v-if="recentMatches.length" class="mb-12">
          <div v-reveal class="text-center mb-8">
            <h2 class="text-3xl md:text-4xl font-black uppercase text-slate-900 tracking-wide">Últimos Resultados</h2>
            <div class="mt-3 flex items-center justify-center gap-3">
              <div class="h-px w-16 bg-slate-200"></div>
              <div class="w-2 h-2 rounded-full" :style="{ background: tournament?.primary_color || '#0ea5e9' }"></div>
              <div class="h-px w-16 bg-slate-200"></div>
            </div>
          </div>
          <div class="grid sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
            <div v-for="(m, i) in recentMatches" :key="m.id"
              v-reveal="{ delay: (i % 6) * 70 }"
              class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5 transition-all"
              @click="$router.push(`/${slug}/partido/${m.id}`)">
              <!-- Badge de categoría -->
              <div v-if="m.categoryName" class="px-4 pt-2.5 pb-0 flex items-center gap-1.5">
                <span class="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  :style="{ color: tournament?.primary_color || '#0ea5e9', background: (tournament?.primary_color || '#0ea5e9') + '18' }">
                  {{ m.categoryName }}
                </span>
                <span v-if="m.phaseName" class="text-[10px] text-slate-400 font-medium">· {{ m.phaseName }}</span>
              </div>
              <!-- Contenido del partido -->
              <div class="flex items-center justify-between gap-3 px-4 py-3">
                <span class="text-xs text-slate-400 w-14 shrink-0 font-medium">{{ fmtDate(m.date) }}</span>
                <div class="flex items-center justify-between flex-1 gap-2 min-w-0">
                  <span class="text-sm font-bold text-slate-900 truncate text-right flex-1">{{ m.homeTeam }}</span>
                  <span class="font-black text-base shrink-0 px-2" :style="{ color: tournament?.primary_color || '#0ea5e9' }">
                    {{ m.home_score }} - {{ m.away_score }}
                  </span>
                  <span class="text-sm font-bold text-slate-900 truncate flex-1">{{ m.awayTeam }}</span>
                </div>
                <span class="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                  <IconCheckCircle class="w-3 h-3" /> Final
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Próximos Encuentros -->
        <div v-if="upcomingMatches.length">
          <div v-reveal class="text-center mb-8">
            <h2 class="text-3xl md:text-4xl font-black uppercase text-slate-900 tracking-wide">Próximos Encuentros</h2>
            <div class="mt-3 flex items-center justify-center gap-3">
              <div class="h-px w-16 bg-slate-200"></div>
              <div class="w-2 h-2 rounded-full" :style="{ background: tournament?.primary_color || '#0ea5e9' }"></div>
              <div class="h-px w-16 bg-slate-200"></div>
            </div>
          </div>
          <div class="grid sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
            <div v-for="(m, i) in upcomingMatches" :key="m.id"
              v-reveal="{ delay: (i % 6) * 70 }"
              class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5 transition-all"
              @click="$router.push(`/${slug}/partido/${m.id}`)">
              <!-- Badge de categoría -->
              <div v-if="m.categoryName" class="px-4 pt-2.5 pb-0 flex items-center gap-1.5">
                <span class="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  :style="{ color: tournament?.primary_color || '#0ea5e9', background: (tournament?.primary_color || '#0ea5e9') + '18' }">
                  {{ m.categoryName }}
                </span>
                <span v-if="m.phaseName" class="text-[10px] text-slate-400 font-medium">· {{ m.phaseName }}</span>
              </div>
              <!-- Contenido del partido -->
              <div class="flex items-center justify-between gap-3 px-4 py-3">
                <span class="text-xs text-slate-400 w-14 shrink-0 font-medium">{{ fmtDate(m.date) }}</span>
                <div class="flex items-center justify-between flex-1 gap-2 min-w-0">
                  <span class="text-sm font-bold text-slate-900 truncate text-right flex-1">{{ m.homeTeam }}</span>
                  <span class="text-xs text-slate-400 shrink-0 px-2 font-bold uppercase tracking-widest">vs</span>
                  <span class="text-sm font-bold text-slate-900 truncate flex-1">{{ m.awayTeam }}</span>
                </div>
                <span class="text-xs text-slate-500 font-semibold shrink-0">{{ fmtTime(m.date) }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 3 — Dinámica: Grupos / Eliminatorias / Campeones  -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="activeStandings.length || knockoutMatches.length"
      class="py-16 md:py-24 relative overflow-hidden" style="background:#0f172a">
      <!-- Fondo decorativo -->
      <div class="absolute inset-0 opacity-5"
        style="background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 40px 40px;"></div>
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10 pointer-events-none"
        :style="{ background: tournament?.primary_color || '#0ea5e9' }"></div>

      <!-- Transición suave entre modos -->
      <Transition name="section-fade" mode="out-in">

        <!-- ════════════════════════════════════════════════════ -->
        <!-- MODO A: FASE DE GRUPOS / LIGA                       -->
        <!-- ════════════════════════════════════════════════════ -->
        <div v-if="tournamentMode === 'groups'" key="groups" class="relative max-w-5xl mx-auto px-4">
          <!-- Título -->
          <div v-reveal class="text-center mb-14">
            <p class="text-[10px] font-black uppercase tracking-[0.3em] mb-3"
              :style="{ color: tournament?.secondary_color || '#FFD700' }">Rendimiento General</p>
            <h2 class="text-3xl md:text-5xl font-black uppercase text-white tracking-wide">Mejores Equipos</h2>
            <div class="mt-4 flex items-center justify-center gap-3">
              <div class="h-px w-16 bg-white/10"></div>
              <div class="w-2 h-2 rounded-full" :style="{ background: tournament?.secondary_color || '#FFD700' }"></div>
              <div class="h-px w-16 bg-white/10"></div>
            </div>
            <p class="text-slate-500 text-sm mt-3">Líderes en todas las categorías del torneo</p>
          </div>

          <!-- PODIO TOP 3 por puntos -->
          <div v-if="topTeams.length" class="flex items-end justify-center gap-3 md:gap-6 mb-14">
            <!-- 2° lugar -->
            <div v-if="topTeams[1]" v-reveal="{ delay: 100 }" class="flex-1 max-w-[200px] flex flex-col items-center">
              <router-link :to="`/${slug}/equipo/${topTeams[1].team_id}`"
                class="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-slate-500 bg-slate-700 flex items-center justify-center mb-3 shadow-xl hover:scale-105 transition-transform cursor-pointer">
                <img v-if="topTeams[1].logo" :src="topTeams[1].logo" class="w-full h-full object-contain p-1.5" />
                <span v-else class="font-black text-white text-lg md:text-xl">{{ teamInitials(topTeams[1].teamName) }}</span>
              </router-link>
              <p class="font-bold text-white text-xs md:text-sm text-center leading-tight mb-0.5 truncate w-full text-center">{{ topTeams[1].teamName }}</p>
              <p v-if="topTeams[1].categoryName" class="text-[10px] text-slate-500 mb-2 text-center truncate w-full">{{ topTeams[1].categoryName }}</p>
              <div class="flex items-center gap-2 mb-3">
                <span class="text-2xl font-black text-slate-300">{{ topTeams[1].points }}</span>
                <span class="text-[10px] text-slate-500 uppercase tracking-wider">pts</span>
              </div>
              <div class="w-full rounded-t-2xl flex items-center justify-center pt-5 pb-4 relative"
                style="background:linear-gradient(180deg,#64748b,#475569); min-height:80px">
                <span class="text-4xl font-black text-white/30 absolute top-2 right-3">2</span>
                <IconMedal class="w-6 h-6 text-slate-200 relative z-10" />
              </div>
            </div>
            <!-- 1° lugar -->
            <div v-if="topTeams[0]" v-reveal class="flex-1 max-w-[220px] flex flex-col items-center -mb-3">
              <div class="relative mb-3">
                <div class="absolute -top-5 left-1/2 -translate-x-1/2">
                  <IconCrown class="w-6 h-6 text-yellow-400 drop-shadow" />
                </div>
                <router-link :to="`/${slug}/equipo/${topTeams[0].team_id}`"
                  class="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-4 bg-slate-800 flex items-center justify-center shadow-2xl hover:scale-105 transition-transform cursor-pointer"
                  :style="{ borderColor: tournament?.secondary_color || '#FFD700' }">
                  <img v-if="topTeams[0].logo" :src="topTeams[0].logo" class="w-full h-full object-contain p-2" />
                  <span v-else class="font-black text-white text-2xl md:text-3xl">{{ teamInitials(topTeams[0].teamName) }}</span>
                </router-link>
              </div>
              <p class="font-black text-white text-sm md:text-base text-center leading-tight mb-0.5 truncate w-full text-center">{{ topTeams[0].teamName }}</p>
              <p v-if="topTeams[0].categoryName" class="text-[10px] text-slate-400 mb-2 text-center truncate w-full">{{ topTeams[0].categoryName }}</p>
              <div class="flex items-center gap-2 mb-3">
                <span class="text-3xl font-black" :style="{ color: tournament?.secondary_color || '#FFD700' }">{{ topTeams[0].points }}</span>
                <span class="text-[10px] text-slate-400 uppercase tracking-wider">pts</span>
              </div>
              <div class="w-full rounded-t-2xl flex items-center justify-center pt-7 pb-5 relative shadow-2xl"
                :style="{ background: `linear-gradient(180deg, ${tournament?.secondary_color || '#FFD700'}, ${darkenColor(tournament?.secondary_color || '#d97706')})`, minHeight: '120px' }">
                <span class="text-5xl font-black text-black/10 absolute top-2 right-3">1</span>
                <IconTrophy class="w-8 h-8 text-white/80 relative z-10" />
              </div>
            </div>
            <!-- 3° lugar -->
            <div v-if="topTeams[2]" v-reveal="{ delay: 150 }" class="flex-1 max-w-[200px] flex flex-col items-center">
              <router-link :to="`/${slug}/equipo/${topTeams[2].team_id}`"
                class="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-amber-700 bg-slate-800 flex items-center justify-center mb-3 shadow-xl hover:scale-105 transition-transform cursor-pointer">
                <img v-if="topTeams[2].logo" :src="topTeams[2].logo" class="w-full h-full object-contain p-1.5" />
                <span v-else class="font-black text-amber-500 text-lg md:text-xl">{{ teamInitials(topTeams[2].teamName) }}</span>
              </router-link>
              <p class="font-bold text-white text-xs md:text-sm text-center leading-tight mb-0.5 truncate w-full text-center">{{ topTeams[2].teamName }}</p>
              <p v-if="topTeams[2].categoryName" class="text-[10px] text-slate-500 mb-2 text-center truncate w-full">{{ topTeams[2].categoryName }}</p>
              <div class="flex items-center gap-2 mb-3">
                <span class="text-2xl font-black text-amber-600">{{ topTeams[2].points }}</span>
                <span class="text-[10px] text-slate-500 uppercase tracking-wider">pts</span>
              </div>
              <div class="w-full rounded-t-2xl flex items-center justify-center pt-4 pb-3 relative"
                style="background:linear-gradient(180deg,#92400e,#78350f); min-height:60px">
                <span class="text-3xl font-black text-white/20 absolute top-1 right-3">3</span>
                <IconAward class="w-5 h-5 text-amber-200 relative z-10" />
              </div>
            </div>
          </div>

          <!-- TARJETAS DE LÍDERES ESTADÍSTICOS -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <router-link v-if="leaderWins" v-reveal="{ delay: 0 }" :to="`/${slug}/equipo/${leaderWins.team_id}`"
              class="rounded-2xl p-4 border border-white/5 text-center block hover:border-white/20 hover:scale-[1.02] transition-all"
              style="background:#1e293b">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Más Victorias</p>
              <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center mx-auto mb-2 border-2 border-emerald-500/30">
                <img v-if="leaderWins.logo" :src="leaderWins.logo" class="w-full h-full object-contain p-1" />
                <span v-else class="font-black text-emerald-400 text-sm">{{ teamInitials(leaderWins.teamName) }}</span>
              </div>
              <p class="font-black text-white text-xs leading-tight truncate">{{ leaderWins.teamName }}</p>
              <p v-if="leaderWins.categoryName" class="text-[9px] text-slate-600 truncate mt-0.5">{{ leaderWins.categoryName }}</p>
              <p class="text-2xl font-black text-emerald-400 mt-2">{{ leaderWins.won }}</p>
              <p class="text-[9px] text-slate-500 uppercase tracking-wide">victorias</p>
            </router-link>
            <router-link v-if="leaderGoals" v-reveal="{ delay: 60 }" :to="`/${slug}/equipo/${leaderGoals.team_id}`"
              class="rounded-2xl p-4 border border-white/5 text-center block hover:border-white/20 hover:scale-[1.02] transition-all"
              style="background:#1e293b">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Máximo Goleador</p>
              <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center mx-auto mb-2 border-2 border-sky-500/30">
                <img v-if="leaderGoals.logo" :src="leaderGoals.logo" class="w-full h-full object-contain p-1" />
                <span v-else class="font-black text-sky-400 text-sm">{{ teamInitials(leaderGoals.teamName) }}</span>
              </div>
              <p class="font-black text-white text-xs leading-tight truncate">{{ leaderGoals.teamName }}</p>
              <p v-if="leaderGoals.categoryName" class="text-[9px] text-slate-600 truncate mt-0.5">{{ leaderGoals.categoryName }}</p>
              <p class="text-2xl font-black text-sky-400 mt-2">{{ leaderGoals.goals_for }}</p>
              <p class="text-[9px] text-slate-500 uppercase tracking-wide">goles a favor</p>
            </router-link>
            <router-link v-if="leaderDefense" v-reveal="{ delay: 120 }" :to="`/${slug}/equipo/${leaderDefense.team_id}`"
              class="rounded-2xl p-4 border border-white/5 text-center block hover:border-white/20 hover:scale-[1.02] transition-all"
              style="background:#1e293b">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Mejor Defensa</p>
              <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center mx-auto mb-2 border-2 border-violet-500/30">
                <img v-if="leaderDefense.logo" :src="leaderDefense.logo" class="w-full h-full object-contain p-1" />
                <span v-else class="font-black text-violet-400 text-sm">{{ teamInitials(leaderDefense.teamName) }}</span>
              </div>
              <p class="font-black text-white text-xs leading-tight truncate">{{ leaderDefense.teamName }}</p>
              <p v-if="leaderDefense.categoryName" class="text-[9px] text-slate-600 truncate mt-0.5">{{ leaderDefense.categoryName }}</p>
              <p class="text-2xl font-black text-violet-400 mt-2">{{ leaderDefense.goals_against }}</p>
              <p class="text-[9px] text-slate-500 uppercase tracking-wide">goles recibidos</p>
            </router-link>
            <router-link v-if="leaderGD" v-reveal="{ delay: 180 }" :to="`/${slug}/equipo/${leaderGD.team_id}`"
              class="rounded-2xl p-4 border border-white/5 text-center block hover:border-white/20 hover:scale-[1.02] transition-all"
              style="background:#1e293b">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Mejor Diferencia</p>
              <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center mx-auto mb-2 border-2 border-amber-500/30">
                <img v-if="leaderGD.logo" :src="leaderGD.logo" class="w-full h-full object-contain p-1" />
                <span v-else class="font-black text-amber-400 text-sm">{{ teamInitials(leaderGD.teamName) }}</span>
              </div>
              <p class="font-black text-white text-xs leading-tight truncate">{{ leaderGD.teamName }}</p>
              <p v-if="leaderGD.categoryName" class="text-[9px] text-slate-600 truncate mt-0.5">{{ leaderGD.categoryName }}</p>
              <p class="text-2xl font-black text-amber-400 mt-2">
                {{ (leaderGD.goals_for - leaderGD.goals_against) >= 0 ? '+' : '' }}{{ leaderGD.goals_for - leaderGD.goals_against }}
              </p>
              <p class="text-[9px] text-slate-500 uppercase tracking-wide">diferencia de gol</p>
            </router-link>
          </div>

          <!-- Ver tabla completa (solo si el torneo tiene liga) -->
          <div v-if="hasLeaguePhase" class="text-center">
            <router-link :to="`/${slug}/tabla`"
              class="inline-flex items-center gap-2 border border-white/20 text-white hover:bg-white/10 px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all">
              Ver tabla completa <IconArrowRight class="w-4 h-4" />
            </router-link>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════ -->
        <!-- MODO B: ELIMINATORIAS EN CURSO — POR CATEGORÍA     -->
        <!-- ════════════════════════════════════════════════════ -->
        <div v-else-if="tournamentMode === 'playoffs'" key="playoffs" class="relative max-w-5xl mx-auto px-4">
          <!-- Título -->
          <div v-reveal class="text-center mb-12">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-xs font-black uppercase tracking-widest border"
              style="background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.3); color:#f87171">
              <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              En curso
            </div>
            <p class="text-[10px] font-black uppercase tracking-[0.3em] mb-3"
              :style="{ color: tournament?.secondary_color || '#FFD700' }">Fase Eliminatoria</p>
            <h2 class="text-3xl md:text-5xl font-black uppercase text-white tracking-wide">Eliminatorias</h2>
            <div class="mt-4 flex items-center justify-center gap-3">
              <div class="h-px w-16 bg-white/10"></div>
              <div class="w-2 h-2 rounded-full animate-pulse" :style="{ background: tournament?.secondary_color || '#FFD700' }"></div>
              <div class="h-px w-16 bg-white/10"></div>
            </div>
            <p class="text-slate-500 text-sm mt-3">Estado actual por categoría</p>
          </div>

          <!-- UNA CARD POR CATEGORÍA -->
          <div class="space-y-6 mb-10">
            <div v-for="(cat, i) in playoffCategories" :key="cat.categoryName"
              v-reveal="{ delay: (i % 5) * 100 }"
              class="rounded-2xl border border-white/5 overflow-hidden" style="background:#1e293b">

              <!-- Header categoría con ronda actual -->
              <div class="px-5 py-3 border-b border-white/5 flex items-center justify-between"
                :style="{ background: (tournament?.primary_color || '#0ea5e9') + '12' }">
                <p class="text-xs font-black uppercase tracking-widest text-white">{{ cat.categoryName }}</p>
                <span v-if="cat.activeMatches.length" class="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                  :style="{ background: (tournament?.secondary_color || '#FFD700') + '20', color: tournament?.secondary_color || '#FFD700' }">
                  <span class="w-1.5 h-1.5 rounded-full animate-pulse" :style="{ background: tournament?.secondary_color || '#FFD700' }"></span>
                  {{ cat.activeMatches[0].roundName || 'En curso' }}
                </span>
              </div>

              <!-- Mini-podio: equipos activos de esta categoría -->
              <div class="p-5">
                <!-- Si es la final (2 equipos) → mostrar duelo destacado -->
                <template v-if="cat.activeMatches.length <= 2">
                  <div class="flex items-center gap-4">
                    <div v-for="(m, mi) in cat.activeMatches.slice(0,1)" :key="m.id" class="flex items-center gap-3 w-full">
                      <!-- Equipo local -->
                      <router-link :to="`/${slug}/equipo/${m.home_team}`"
                        class="flex flex-col items-center gap-2 flex-1 hover:opacity-80 transition-opacity">
                        <div class="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 bg-slate-700"
                          :style="{ borderColor: mi === 0 ? (tournament?.secondary_color || '#FFD700') : '#64748b' }">
                          <img v-if="m.homeLogo" :src="m.homeLogo" class="w-full h-full object-contain p-1" />
                          <span v-else class="font-black text-white text-sm flex items-center justify-center h-full">{{ teamInitials(m.homeTeam || '?') }}</span>
                        </div>
                        <p class="text-xs font-black text-white text-center leading-tight truncate w-full max-w-[80px]">{{ m.homeTeam || 'Por definir' }}</p>
                      </router-link>

                      <!-- Score / VS central -->
                      <div class="flex flex-col items-center gap-1 flex-shrink-0 px-2">
                        <template v-if="m.status === 'finished'">
                          <div class="flex items-center gap-2">
                            <span class="text-2xl font-black text-white tabular-nums">{{ m.home_score ?? 0 }}</span>
                            <span class="text-slate-500 font-bold">-</span>
                            <span class="text-2xl font-black text-white tabular-nums">{{ m.away_score ?? 0 }}</span>
                          </div>
                          <p class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Final</p>
                        </template>
                        <template v-else>
                          <div class="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center"
                            :style="{ background: (tournament?.primary_color || '#0ea5e9') + '20' }">
                            <IconGitBranch class="w-4 h-4" :style="{ color: tournament?.primary_color || '#0ea5e9' }" />
                          </div>
                          <p class="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1">VS</p>
                        </template>
                      </div>

                      <!-- Equipo visitante -->
                      <router-link :to="`/${slug}/equipo/${m.away_team}`"
                        class="flex flex-col items-center gap-2 flex-1 hover:opacity-80 transition-opacity">
                        <div class="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-slate-600 bg-slate-700">
                          <img v-if="m.awayLogo" :src="m.awayLogo" class="w-full h-full object-contain p-1" />
                          <span v-else class="font-black text-slate-300 text-sm flex items-center justify-center h-full">{{ teamInitials(m.awayTeam || '?') }}</span>
                        </div>
                        <p class="text-xs font-bold text-slate-300 text-center leading-tight truncate w-full max-w-[80px]">{{ m.awayTeam || 'Por definir' }}</p>
                      </router-link>
                    </div>
                  </div>
                </template>

                <!-- Si hay múltiples partidos → tabla de partidos -->
                <template v-else>
                  <div class="space-y-2">
                    <div v-for="m in cat.activeMatches.slice(0,4)" :key="m.id"
                      class="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                      <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        <p class="text-xs font-bold text-white truncate">{{ m.homeTeam || 'TBD' }}</p>
                        <div class="w-7 h-7 rounded-full overflow-hidden bg-slate-700 border border-white/10 flex-shrink-0">
                          <img v-if="m.homeLogo" :src="m.homeLogo" class="w-full h-full object-contain p-0.5" />
                          <span v-else class="text-[9px] font-black text-white flex items-center justify-center h-full">{{ teamInitials(m.homeTeam||'?') }}</span>
                        </div>
                      </div>
                      <div class="flex-shrink-0 text-center w-16">
                        <span v-if="m.status==='finished'" class="text-sm font-black text-white tabular-nums">{{ m.home_score??0 }}-{{ m.away_score??0 }}</span>
                        <span v-else class="text-[10px] font-black text-slate-500">VS</span>
                      </div>
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="w-7 h-7 rounded-full overflow-hidden bg-slate-700 border border-white/10 flex-shrink-0">
                          <img v-if="m.awayLogo" :src="m.awayLogo" class="w-full h-full object-contain p-0.5" />
                          <span v-else class="text-[9px] font-black text-white flex items-center justify-center h-full">{{ teamInitials(m.awayTeam||'?') }}</span>
                        </div>
                        <p class="text-xs font-bold text-white truncate">{{ m.awayTeam || 'TBD' }}</p>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- CTA ver bracket -->
          <div class="text-center">
            <router-link :to="`/${slug}/fixture`"
              class="inline-flex items-center gap-2 border border-white/20 text-white hover:bg-white/10 px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all">
              Ver bracket completo <IconArrowRight class="w-4 h-4" />
            </router-link>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════ -->
        <!-- MODO C: TORNEO FINALIZADO — PODIO POR CATEGORÍA    -->
        <!-- ════════════════════════════════════════════════════ -->
        <div v-else key="finished" class="relative max-w-5xl mx-auto px-4">
          <!-- Título -->
          <div v-reveal class="text-center mb-12">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-xs font-black uppercase tracking-widest border"
              style="background:rgba(234,179,8,0.15); border-color:rgba(234,179,8,0.3); color:#fbbf24">
              <IconTrophy class="w-3.5 h-3.5"/> Torneo Finalizado
            </div>
            <p class="text-[10px] font-black uppercase tracking-[0.3em] mb-3"
              :style="{ color: tournament?.secondary_color || '#FFD700' }">Hall of Fame</p>
            <h2 class="text-3xl md:text-5xl font-black uppercase text-white tracking-wide">Campeones</h2>
            <div class="mt-4 flex items-center justify-center gap-3">
              <div class="h-px w-16 bg-white/10"></div>
              <div class="w-2 h-2 rounded-full" :style="{ background: tournament?.secondary_color || '#FFD700' }"></div>
              <div class="h-px w-16 bg-white/10"></div>
            </div>
            <p class="text-slate-500 text-sm mt-3">Campeones por categoría</p>
          </div>

          <!-- ── PODIO POR CADA CATEGORÍA ─────────────────────── -->
          <div class="space-y-10 mb-10">
            <div v-for="(cat, i) in tournamentChampions" :key="cat.categoryName" v-reveal="{ delay: (i % 5) * 100 }">

              <!-- Label de categoría -->
              <div class="flex items-center gap-3 mb-6">
                <div class="h-px flex-1 bg-white/10"></div>
                <span class="text-[10px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full border"
                  :style="{ color: tournament?.secondary_color || '#FFD700', borderColor: (tournament?.secondary_color||'#FFD700')+'30', background: (tournament?.secondary_color||'#FFD700')+'0d' }">
                  {{ cat.categoryName }}
                </span>
                <div class="h-px flex-1 bg-white/10"></div>
              </div>

              <!-- Podio olímpico: 2° izquierda | 1° centro elevado | 3° derecha -->
              <div class="flex items-end justify-center gap-3 md:gap-6">

                <!-- 🥈 2° Subcampeón (izquierda) -->
                <div class="flex-1 max-w-[170px] flex flex-col items-center">
                  <router-link :to="`/${slug}/equipo/${cat.runnerUp.team_id}`"
                    class="w-14 h-14 md:w-[72px] md:h-[72px] rounded-full overflow-hidden border-4 border-slate-500 bg-slate-700 flex items-center justify-center mb-3 shadow-xl hover:scale-105 transition-transform">
                    <img v-if="cat.runnerUp.logo" :src="cat.runnerUp.logo" class="w-full h-full object-contain p-1.5" />
                    <span v-else class="font-black text-slate-200 text-base md:text-lg">{{ teamInitials(cat.runnerUp.teamName) }}</span>
                  </router-link>
                  <p class="font-bold text-white text-xs text-center leading-tight mb-0.5 truncate w-full">{{ cat.runnerUp.teamName }}</p>
                  <p class="text-[10px] text-slate-400 mb-3 font-semibold flex items-center justify-center gap-1"><IconMedal class="w-3.5 h-3.5 text-slate-400"/> Subcampeón</p>
                  <div class="w-full rounded-t-xl flex items-center justify-center pt-5 pb-4 relative"
                    style="background:linear-gradient(180deg,#64748b,#475569); min-height:72px">
                    <span class="text-4xl font-black text-white/25 absolute top-1 right-3">2</span>
                    <IconMedal class="w-5 h-5 text-slate-200 relative z-10" />
                  </div>
                </div>

                <!-- 🏆 1° Campeón (centro, más alto) -->
                <div class="flex-1 max-w-[200px] flex flex-col items-center -mb-3">
                  <div class="relative mb-3">
                    <div class="absolute -top-7 left-1/2 -translate-x-1/2">
                      <IconCrown class="w-6 h-6 text-yellow-400 drop-shadow-lg"/>
                    </div>
                    <router-link :to="`/${slug}/equipo/${cat.champion.team_id}`"
                      class="w-[80px] h-[80px] md:w-24 md:h-24 rounded-full overflow-hidden border-4 bg-slate-800 flex items-center justify-center shadow-2xl hover:scale-105 transition-transform ring-4 ring-yellow-400/25"
                      :style="{ borderColor: tournament?.secondary_color || '#FFD700' }">
                      <img v-if="cat.champion.logo" :src="cat.champion.logo" class="w-full h-full object-contain p-2" />
                      <span v-else class="font-black text-white text-xl md:text-2xl">{{ teamInitials(cat.champion.teamName) }}</span>
                    </router-link>
                  </div>
                  <p class="font-black text-white text-sm text-center leading-tight mb-0.5 truncate w-full">{{ cat.champion.teamName }}</p>
                  <p class="text-xs font-black mb-1 flex items-center justify-center gap-1" :style="{ color: tournament?.secondary_color || '#FFD700' }"><IconTrophy class="w-3.5 h-3.5"/> Campeón</p>
                  <!-- Score final -->
                  <div class="flex items-center gap-1 mb-3">
                    <span class="font-black text-white tabular-nums text-sm">{{ cat.finalMatch.home_score ?? 0 }}</span>
                    <span class="text-[10px] text-slate-600 mx-0.5">-</span>
                    <span class="font-black text-white tabular-nums text-sm">{{ cat.finalMatch.away_score ?? 0 }}</span>
                    <span class="text-[9px] text-slate-600 uppercase ml-1 font-bold">Final</span>
                  </div>
                  <div class="w-full rounded-t-xl flex items-center justify-center pt-7 pb-5 relative shadow-2xl"
                    :style="{ background: `linear-gradient(180deg, ${tournament?.secondary_color||'#FFD700'}, ${darkenColor(tournament?.secondary_color||'#d97706')})`, minHeight:'108px' }">
                    <span class="text-5xl font-black text-black/10 absolute top-2 right-3">1</span>
                    <IconTrophy class="w-7 h-7 text-white/80 relative z-10" />
                  </div>
                </div>

                <!-- 🥉 3° Lugar (derecha) — si hay partido de tercer lugar -->
                <div class="flex-1 max-w-[170px] flex flex-col items-center">
                  <template v-if="cat.thirdPlace">
                    <router-link :to="`/${slug}/equipo/${cat.thirdPlace.team_id}`"
                      class="w-14 h-14 md:w-[72px] md:h-[72px] rounded-full overflow-hidden border-4 border-amber-700 bg-slate-800 flex items-center justify-center mb-3 shadow-xl hover:scale-105 transition-transform">
                      <img v-if="cat.thirdPlace.logo" :src="cat.thirdPlace.logo" class="w-full h-full object-contain p-1.5" />
                      <span v-else class="font-black text-amber-400 text-base md:text-lg">{{ teamInitials(cat.thirdPlace.teamName) }}</span>
                    </router-link>
                    <p class="font-bold text-white text-xs text-center leading-tight mb-0.5 truncate w-full">{{ cat.thirdPlace.teamName }}</p>
                    <!-- Score del 3er lugar -->
                    <div v-if="cat.thirdMatch" class="flex items-center gap-1 mb-1">
                      <span class="text-xs font-black text-white tabular-nums">{{ cat.thirdMatch.home_score ?? 0 }}</span>
                      <span class="text-[10px] text-slate-600">-</span>
                      <span class="text-xs font-black text-white tabular-nums">{{ cat.thirdMatch.away_score ?? 0 }}</span>
                    </div>
                    <p class="text-[10px] text-amber-600 mb-3 font-semibold flex items-center justify-center gap-1"><IconAward class="w-3.5 h-3.5"/> 3er Lugar</p>
                    <div class="w-full rounded-t-xl flex items-center justify-center pt-4 pb-3 relative"
                      style="background:linear-gradient(180deg,#92400e,#78350f); min-height:52px">
                      <span class="text-3xl font-black text-white/20 absolute top-1 right-3">3</span>
                      <IconAward class="w-5 h-5 text-amber-300 relative z-10" />
                    </div>
                  </template>
                  <!-- Si no hay partido de 3er lugar: slot vacío para mantener simetría -->
                  <template v-else>
                    <div class="w-14 h-14 md:w-[72px] md:h-[72px] rounded-full border-2 border-dashed border-white/10 bg-slate-800/50 flex items-center justify-center mb-3">
                      <span class="text-slate-700 text-lg font-black">?</span>
                    </div>
                    <p class="text-[10px] text-slate-700 mb-3">3er Lugar</p>
                    <div class="w-full rounded-t-xl flex items-center justify-center pt-4 pb-3 relative opacity-30"
                      style="background:linear-gradient(180deg,#334155,#1e293b); min-height:52px">
                      <span class="text-3xl font-black text-white/20 absolute top-1 right-3">3</span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- CTA ver fixture -->
          <div class="text-center">
            <router-link :to="`/${slug}/fixture`"
              class="inline-flex items-center gap-2 border border-white/20 text-white hover:bg-white/10 px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all">
              Ver resultados finales <IconArrowRight class="w-4 h-4" />
            </router-link>
          </div>
        </div>

      </Transition>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 4 — Noticias (fondo blanco, 3 cards en grid)      -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="news.length" class="py-16 md:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4">
        <div v-reveal class="text-center mb-12">
          <h2 class="text-3xl md:text-5xl font-black uppercase text-slate-900 tracking-wide">Últimas Noticias</h2>
          <div class="mt-3 flex items-center justify-center gap-3">
            <div class="h-px w-16 bg-slate-200"></div>
            <div class="w-2 h-2 rounded-full" :style="{ background: tournament?.primary_color || '#0ea5e9' }"></div>
            <div class="h-px w-16 bg-slate-200"></div>
          </div>
          <p class="text-slate-500 mt-3">Mantente informado sobre {{ tournament?.name }}</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <router-link v-for="(n, i) in news.slice(0, 3)" :key="n.id"
            v-reveal="{ delay: i * 100 }"
            :to="`/${slug}/noticias`"
            class="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden">
            <!-- Imagen con fecha badge -->
            <div class="relative overflow-hidden">
              <img v-if="n.cover" :src="n.cover" class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
              <div v-else class="w-full h-48 flex items-center justify-center" :style="{ background: `${tournament?.primary_color || '#0ea5e9'}22` }">
                <IconNewspaper class="w-12 h-12 opacity-20" />
              </div>
              <!-- Fecha badge -->
              <div class="absolute top-3 left-3 rounded-xl overflow-hidden shadow-lg"
                :style="{ background: tournament?.primary_color || '#0ea5e9' }">
                <div class="px-3 py-2 text-center">
                  <p class="text-white text-lg font-black leading-none">{{ fmtDay(n.created_at) }}</p>
                  <p class="text-white/80 text-xs uppercase font-bold tracking-wide">{{ fmtMonth(n.created_at) }}</p>
                </div>
              </div>
            </div>
            <div class="p-5">
              <span class="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded"
                :style="{ color: tournament?.primary_color || '#0ea5e9', background: `${tournament?.primary_color || '#0ea5e9'}15` }">Noticias</span>
              <h3 class="font-bold text-slate-900 text-lg leading-snug mt-2 group-hover:text-slate-600 transition-colors">{{ n.title }}</h3>
              <p class="text-slate-400 text-xs mt-2 flex items-center gap-1">
                <IconClock class="w-3 h-3" /> {{ timeAgo(n.created_at) }}
              </p>
            </div>
          </router-link>
        </div>

        <div class="text-center mt-8">
          <router-link :to="`/${slug}/noticias`"
            class="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wide">
            Ver todas las noticias <IconArrowRight class="w-4 h-4" />
          </router-link>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 5 — Galería (carrusel horizontal)                 -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section class="py-16 md:py-24" style="background:#F7F9FC">
      <div class="max-w-7xl mx-auto px-4">
        <div v-reveal class="text-center mb-10">
          <h2 class="text-3xl md:text-5xl font-black uppercase text-slate-900 tracking-wide">Galería</h2>
          <div class="mt-3 flex items-center justify-center gap-3">
            <div class="h-px w-16 bg-slate-200"></div>
            <div class="w-2 h-2 rounded-full" :style="{ background: tournament?.primary_color || '#0ea5e9' }"></div>
            <div class="h-px w-16 bg-slate-200"></div>
          </div>
          <p class="text-slate-500 mt-3">Momentos inolvidables en la cancha</p>
        </div>

        <!-- Carrusel -->
        <div v-if="allPhotos.length" v-reveal="{ delay: 100 }" class="relative"
          @mouseenter="pauseSlider = true"
          @mouseleave="pauseSlider = false">
          <div class="overflow-hidden rounded-2xl shadow-xl">
            <div class="flex transition-transform duration-500 ease-in-out"
              :style="{ transform: `translateX(-${currentSlide * 100}%)` }">
              <div v-for="(photo, idx) in allPhotos" :key="idx" class="w-full shrink-0">
                <img :src="photo.image_url || photo.url || photo" class="w-full h-72 md:h-[500px] object-cover" />
              </div>
            </div>
          </div>

          <!-- Flechas -->
          <button @click="prevSlide"
            class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-all">
            <IconChevronLeft class="w-5 h-5" />
          </button>
          <button @click="nextSlide"
            class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-all">
            <IconChevronRight class="w-5 h-5" />
          </button>

          <!-- Puntos de navegación -->
          <div class="flex items-center justify-center gap-2 mt-5">
            <button v-for="(_, idx) in allPhotos" :key="idx"
              class="w-2 h-2 rounded-full transition-all"
              :style="{ background: idx === currentSlide ? (tournament?.primary_color || '#0ea5e9') : '#CBD5E1', width: idx === currentSlide ? '24px' : '8px' }"
              @click="currentSlide = idx">
            </button>
          </div>
        </div>

        <!-- Placeholder sin fotos -->
        <div v-else class="rounded-2xl border-2 border-dashed border-slate-200 h-64 flex flex-col items-center justify-center text-slate-400">
          <IconImage class="w-14 h-14 mb-3 opacity-30" />
          <p class="font-semibold text-lg">Las fotos del torneo aparecerán aquí</p>
          <p class="text-sm mt-1">El álbum de imágenes se publicará durante el torneo</p>
        </div>

        <!-- Ver galería completa -->
        <div v-if="allPhotos.length" class="text-center mt-6">
          <router-link :to="`/${slug}/galeria`"
            class="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wide">
            Ver galería completa <IconArrowRight class="w-4 h-4" />
          </router-link>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 6 — Equipos participantes (fondo oscuro navy)      -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="uniqueTeams.length" id="equipos-participantes" class="py-16 md:py-24" style="background:#0f172a">
      <div class="max-w-7xl mx-auto px-4">
        <div v-reveal class="text-center mb-12">
          <h2 class="text-3xl md:text-5xl font-black uppercase text-white tracking-wide">Equipos Participantes</h2>
          <div class="mt-3 flex items-center justify-center gap-3">
            <div class="h-px w-16 bg-white/10"></div>
            <div class="w-2 h-2 rounded-full" :style="{ background: tournament?.secondary_color || '#FFD700' }"></div>
            <div class="h-px w-16 bg-white/10"></div>
          </div>
          <p class="text-slate-400 mt-3 text-sm uppercase tracking-widest font-semibold">
            {{ uniqueTeams.length }} equipo{{ uniqueTeams.length !== 1 ? 's' : '' }} registrado{{ uniqueTeams.length !== 1 ? 's' : '' }}
          </p>
        </div>

        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
          <router-link v-for="(team, i) in uniqueTeams" :key="team.id"
            v-reveal="{ delay: (i % 8) * 60 }"
            :to="`/${slug}/equipo/${team.id}`"
            class="flex flex-col items-center gap-2 group cursor-pointer">
            <div class="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg group-hover:scale-110 transition-transform duration-200 overflow-hidden border-2 border-white/10"
              :style="{ background: team.logo ? 'transparent' : teamColor(team.name) }">
              <img v-if="team.logo" :src="team.logo" class="w-full h-full object-cover" />
              <span v-else>{{ teamInitials(team.name) }}</span>
            </div>
            <span class="text-white/70 text-xs font-semibold text-center leading-tight group-hover:text-white transition-colors">
              {{ team.name }}
            </span>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SECCIÓN 7 — Reconocimientos / Premios                      -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="awards.length" class="py-16 md:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4">

        <!-- Título -->
        <div v-reveal class="text-center mb-12">
          <span class="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4"
            :style="{ color: tournament?.primary_color || '#0ea5e9', background: (tournament?.primary_color || '#0ea5e9') + '18' }">
            <IconAward class="w-3.5 h-3.5" /> Premios y reconocimientos
          </span>
          <h2 class="text-3xl md:text-5xl font-black uppercase text-slate-900 tracking-wide">Reconocimientos</h2>
          <div class="mt-3 flex items-center justify-center gap-3">
            <div class="h-px w-16 bg-slate-200"></div>
            <div class="w-2 h-2 rounded-full" :style="{ background: tournament?.primary_color || '#0ea5e9' }"></div>
            <div class="h-px w-16 bg-slate-200"></div>
          </div>
        </div>

        <!-- Agrupado por categoría -->
        <div v-for="(group, catName) in awardsByCategory" :key="catName" class="mb-12 last:mb-0">
          <!-- Subtítulo categoría (solo si hay varias) -->
          <p v-if="Object.keys(awardsByCategory).length > 1"
            class="text-xs font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
            <span class="h-px flex-1 bg-slate-100"></span>
            {{ catName }}
            <span class="h-px flex-1 bg-slate-100"></span>
          </p>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div v-for="(award, i) in group" :key="award.id"
              v-reveal="{ delay: (i % 10) * 60 }"
              class="rounded-2xl border border-slate-100 bg-slate-50 p-5 flex flex-col items-center text-center gap-3 hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5 transition-all">

              <!-- Ícono del tipo de premio -->
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                :style="{ background: (awardMeta(award.type).color) + '18' }">
                <component :is="awardMeta(award.type).icon" class="w-6 h-6"
                  :style="{ color: awardMeta(award.type).color }" />
              </div>

              <!-- Nombre del premio -->
              <p class="text-[11px] font-black uppercase tracking-widest text-slate-400 leading-tight">
                {{ awardMeta(award.type).label }}
              </p>

              <!-- Foto / logo -->
              <div v-if="award.playerPhoto || award.teamLogo"
                class="w-14 h-14 rounded-full overflow-hidden border-2 bg-white"
                :style="{ borderColor: awardMeta(award.type).color + '60' }">
                <img :src="award.playerPhoto || award.teamLogo" class="w-full h-full object-cover" />
              </div>
              <div v-else
                class="w-14 h-14 rounded-full flex items-center justify-center font-black text-lg border-2"
                :style="{ background: awardMeta(award.type).color + '18', borderColor: awardMeta(award.type).color + '40', color: awardMeta(award.type).color }">
                {{ initials(award.playerName || award.teamName) }}
              </div>

              <!-- Nombre ganador -->
              <div>
                <p class="font-black text-slate-900 text-sm leading-tight">
                  {{ award.playerName || award.teamName || '—' }}
                </p>
                <p v-if="award.description" class="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  {{ award.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>



  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournament } from '@/composables/useTournament'
import { onTournamentMatch, onStandingsUpdate } from '@/services/socket'
import api from '@/api'
import MatchCard from '@/components/MatchCard/MatchCard.vue'
import { useFollowingStore } from '@/stores/following'
import { useAuthStore } from '@/stores/auth'
import { usePWA } from '@/composables/usePWA'

const route  = useRoute()
const router = useRouter()
const { slug, tournament } = useTournament()
const following = useFollowingStore()
const auth = useAuthStore()
const { pushSupported, pushGranted, subscribePush, pushEndpoint, pushError } = usePWA()

const isFollowed = computed(() => tournament.value ? following.isFollowingTournament(tournament.value.id) : false)
const followLoading = ref(false)

function scrollToTeams() {
  document.getElementById('equipos-participantes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function toggleFollow() {
  if (!tournament.value) return
  if (!auth.isLoggedIn) {
    // Igual que con equipos: manda a login primero, guardando la ruta para volver
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }
  followLoading.value = true
  if (!pushGranted.value) {
    const ok = await subscribePush()
    if (!ok) {
      followLoading.value = false
      if (pushError.value) alert(pushError.value)
      return
    }
    await following.syncFromServer(pushEndpoint.value)
  }
  await following.toggleTournament(tournament.value.id, pushEndpoint.value)
  followLoading.value = false
}

const matches      = ref([])
const standings    = ref([])
const news         = ref([])
const teams        = ref([])
const galleries    = ref([])
const awards       = ref([])
const playerCount  = ref(0)
const loading      = ref(false)
const currentSlide = ref(0)
const pauseSlider  = ref(false)

const allPhotos = computed(() => galleries.value.flatMap(g => g.images || []))

const liveMatches     = computed(() => matches.value.filter(m => m.status === 'live'))
const recentMatches   = computed(() => matches.value.filter(m => m.status === 'finished').slice(-4).reverse())
const upcomingMatches = computed(() =>
  [...matches.value.filter(m => m.status === 'scheduled')]
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(a.date) - new Date(b.date)
    })
    .slice(0, 6)
)

// Deduplicar equipos por nombre
const uniqueTeams = computed(() => {
  const seen = new Set()
  return teams.value.filter(t => {
    const key = t.name.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const stats = computed(() => ({
  teams:     uniqueTeams.value.length,
  players:   playerCount.value,
  matches:   matches.value.length,
  followers: tournament.value?.followerCount || 0
}))

// ── Standings helpers ──────────────────────────────────────────
// Solo equipos con al menos 1 partido jugado
const activeStandings = computed(() =>
  standings.value.filter(s => (s.played || 0) > 0)
)

// Top 3 por puntos (desempate: DG, GF)
const topTeams = computed(() =>
  [...activeStandings.value]
    .sort((a, b) =>
      (b.points - a.points) ||
      ((b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)) ||
      (b.goals_for - a.goals_for)
    )
    .slice(0, 3)
)

// Líder en victorias
const leaderWins = computed(() =>
  [...activeStandings.value].sort((a, b) => (b.won - a.won) || (b.points - a.points))[0] || null
)

// Líder en goles a favor
const leaderGoals = computed(() =>
  [...activeStandings.value].sort((a, b) => (b.goals_for - a.goals_for))[0] || null
)

// Mejor defensa (menos goles recibidos, mínimo 2 partidos)
const leaderDefense = computed(() => {
  const eligible = activeStandings.value.filter(s => (s.played || 0) >= 2)
  if (!eligible.length) return activeStandings.value.sort((a, b) => a.goals_against - b.goals_against)[0] || null
  return [...eligible].sort((a, b) => a.goals_against - b.goals_against)[0]
})

// Mayor diferencia de gol
const leaderGD = computed(() =>
  [...activeStandings.value].sort((a, b) =>
    ((b.goals_for - b.goals_against) - (a.goals_for - a.goals_against))
  )[0] || null
)

// Mostrar "Ver tabla completa" solo si hay fase de liga
const hasLeaguePhase = ref(false)

// ── Detección de fase del torneo ───────────────────────────────────────────
// Usamos los matches ya cargados que incluyen phaseType
const knockoutMatches = computed(() =>
  matches.value.filter(m => m.phaseType === 'knockout' && m.home_team && m.away_team)
)

/**
 * tournamentMode:
 *  'groups'   → Solo fase de grupos/liga activa (comportamiento actual)
 *  'playoffs' → Hay partidos de eliminatorias (algunos pendientes)
 *  'finished' → Todos los partidos (knockout Y regulares) están terminados
 *
 * NOTA: "finished" solo se activa cuando NO quedan partidos pendientes en
 * ninguna fase de ninguna categoría, para evitar mostrar "Torneo Finalizado"
 * cuando algunas categorías aún siguen en grupos o semifinales.
 */
const tournamentMode = computed(() => {
  const km = knockoutMatches.value
  if (!km.length) return 'groups'

  // Si hay partidos knockout aún pendientes → eliminatorias en curso
  if (km.some(m => m.status !== 'finished')) return 'playoffs'

  // Todos los knockout terminaron, pero ¿hay categorías aún en fase regular?
  const regularPending = matches.value.filter(
    m => m.phaseType !== 'knockout' && m.status !== 'finished'
  )
  if (regularPending.length > 0) return 'playoffs'

  // Todo terminó: grupos + eliminatorias de todas las categorías
  return 'finished'
})

// Para cada categoría, extraer el estado actual de las eliminatorias
const playoffCategories = computed(() => {
  if (tournamentMode.value === 'groups') return []
  const km = knockoutMatches.value
  const byCategory = {}
  for (const m of km) {
    const key = m.category_id ?? 'general'
    if (!byCategory[key]) byCategory[key] = { categoryName: m.categoryName || '', matches: [] }
    byCategory[key].matches.push(m)
  }
  return Object.values(byCategory).map(cat => {
    // Ordenar rondas por orden de avance (mayor bracket_slot = más avanzada)
    const pending  = cat.matches.filter(m => m.status !== 'finished')
    const finished = cat.matches.filter(m => m.status === 'finished')
    // Ronda "actual": la más avanzada con partidos en juego (o la última terminada)
    const activeMatches = pending.length ? pending : finished.slice(-4)
    const finalMatch    = cat.matches.find(m => /final/i.test(m.roundName) && !/semi/i.test(m.roundName))
    return { ...cat, activeMatches, finalMatch }
  })
})

// Equipos finalistas (para modo playoffs): de la ronda "Final" o la más avanzada
const playoffFinalists = computed(() => {
  if (tournamentMode.value === 'groups') return []
  const all = []
  for (const cat of playoffCategories.value) {
    // Buscar la ronda final, si no la más avanzada con partidos
    const targetMatches = cat.finalMatch
      ? [cat.finalMatch]
      : cat.activeMatches.slice(0, 2)
    for (const m of targetMatches) {
      if (m.home_team && !m.home_is_tbd) all.push({
        team_id: m.home_team, teamName: m.homeTeam, logo: m.homeLogo,
        categoryName: m.categoryName, roundName: m.roundName, matchId: m.id
      })
      if (m.away_team && !m.away_is_tbd) all.push({
        team_id: m.away_team, teamName: m.awayTeam, logo: m.awayLogo,
        categoryName: m.categoryName, roundName: m.roundName, matchId: m.id
      })
    }
  }
  // Deduplicar por team_id
  const seen = new Set()
  return all.filter(t => { if (seen.has(t.team_id)) return false; seen.add(t.team_id); return true })
})

// Determina el ganador de un partido terminado
function matchWinner(m) {
  const hs = m.home_score ?? 0, as = m.away_score ?? 0
  if (hs > as) return { team_id: m.home_team, teamName: m.homeTeam, logo: m.homeLogo }
  if (as > hs) return { team_id: m.away_team, teamName: m.awayTeam, logo: m.awayLogo }
  // Empate: home gana (criterio de desempate básico — ajustable)
  return { team_id: m.home_team, teamName: m.homeTeam, logo: m.homeLogo }
}
function matchLoser(m) {
  const hs = m.home_score ?? 0, as = m.away_score ?? 0
  if (hs > as) return { team_id: m.away_team, teamName: m.awayTeam, logo: m.awayLogo }
  if (as > hs) return { team_id: m.home_team, teamName: m.homeTeam, logo: m.homeLogo }
  return { team_id: m.away_team, teamName: m.awayTeam, logo: m.awayLogo }
}

// Campeones por categoría (para modo finished) — incluye 1°, 2° y 3° lugar
const tournamentChampions = computed(() => {
  if (tournamentMode.value !== 'finished') return []
  const result = []
  for (const cat of playoffCategories.value) {
    // Partido final: roundName que contenga "final" pero no "semi"
    const finalMatch = cat.matches.find(
      m => /final/i.test(m.roundName) && !/semi/i.test(m.roundName) && m.status === 'finished'
    ) || cat.matches.filter(m => m.status === 'finished').sort((a, b) => b.id - a.id)[0]

    if (!finalMatch) continue

    // Partido de 3er lugar: roundName que coincida con variantes comunes
    const thirdMatch = cat.matches.find(
      m => /tercer|3er|third|3.*lugar|3.*place|tercer.*puesto/i.test(m.roundName) && m.status === 'finished'
    )

    result.push({
      categoryName: cat.categoryName,
      champion:    matchWinner(finalMatch),
      runnerUp:    matchLoser(finalMatch),
      thirdPlace:  thirdMatch ? matchWinner(thirdMatch) : null,
      finalMatch,
      thirdMatch,
    })
  }
  return result
})

// (topChampions eliminado — el podio ahora es por categoría directamente)

// Ronda actual de playoffs (para mostrar en el badge del título)
const currentPlayoffRound = computed(() => {
  if (tournamentMode.value !== 'playoffs') return ''
  for (const cat of playoffCategories.value) {
    if (cat.activeMatches.length) return cat.activeMatches[0].roundName || ''
  }
  return 'Eliminatorias'
})

// ── Reconocimientos agrupados por categoría ────────────────────
const awardsByCategory = computed(() => {
  const map = {}
  for (const a of awards.value) {
    const key = a.categoryName || 'General'
    if (!map[key]) map[key] = []
    map[key].push(a)
  }
  return map
})

const AWARD_META = {
  top_scorer:  { label: 'Goleador',        color: '#f97316', icon: 'IconFlame' },
  mvp:         { label: 'MVP',             color: '#8b5cf6', icon: 'IconStar' },
  best_keeper: { label: 'Mejor Portero',   color: '#0ea5e9', icon: 'IconShield' },
  best_team:   { label: 'Campeón',         color: '#f59e0b', icon: 'IconTrophy' },
  fair_play:   { label: 'Fair Play',       color: '#10b981', icon: 'IconHeart' },
  best_player: { label: 'Mejor Jugador',   color: '#ec4899', icon: 'IconMedal' },
  top_assist:  { label: 'Mejor Asistidor', color: '#6366f1', icon: 'IconHandshake' },
}
function awardMeta(type) {
  return AWARD_META[type] || { label: type, color: '#64748b', icon: 'IconAward' }
}
function initials(name) {
  if (!name) return '?'
  const p = name.trim().split(/\s+/)
  return p.length === 1 ? name.slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase()
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '' }
function fmtTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}
function fmtDay(d)   { return d ? new Date(d).getDate().toString().padStart(2, '0') : '' }
function fmtMonth(d) { return d ? new Date(d).toLocaleDateString('es-MX', { month: 'short' }).toUpperCase() : '' }

function timeAgo(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7)  return `Hace ${days} días`
  if (days < 14) return 'Hace 1 semana'
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`
  return `Hace ${Math.floor(days / 30)} meses`
}

function teamColor(name) {
  if (!name) return '#94a3b8'
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return `hsl(${Math.abs(h) % 360},60%,40%)`
}

function teamInitials(name) {
  if (!name) return '?'
  const p = name.trim().split(/\s+/)
  return p.length === 1 ? name.slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase()
}

function darkenColor(hex) {
  if (!hex || !hex.startsWith('#')) return '#0369a1'
  const num = parseInt(hex.slice(1), 16)
  const r = Math.max(0, (num >> 16) - 40)
  const g = Math.max(0, ((num >> 8) & 0xff) - 40)
  const b = Math.max(0, (num & 0xff) - 40)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function prevSlide() {
  currentSlide.value = currentSlide.value === 0 ? allPhotos.value.length - 1 : currentSlide.value - 1
}
function nextSlide() {
  currentSlide.value = (currentSlide.value + 1) % allPhotos.value.length
}

let sliderInterval = null
function startSlider() {
  sliderInterval = setInterval(() => {
    if (!pauseSlider.value && allPhotos.value.length > 1) {
      nextSlide()
    }
  }, 4000)
}

onMounted(async () => {
  startSlider()
  if (!slug.value) return
  loading.value = true
  try {
    const [m, n, t, p, g, aw] = await Promise.all([
      api.get(`/tournaments/${slug.value}/matches`),
      api.get(`/tournaments/${slug.value}/news`),
      api.get(`/tournaments/${slug.value}/teams`),
      api.get(`/tournaments/${slug.value}/players`).catch(() => ({ data: [] })),
      api.get(`/tournaments/${slug.value}/galleries`).catch(() => ({ data: [] })),
      api.get(`/tournaments/${slug.value}/awards`).catch(() => ({ data: [] })),
    ])
    matches.value     = m.data
    news.value        = n.data
    teams.value       = t.data
    playerCount.value = p.data.length
    galleries.value   = g.data
    awards.value      = aw.data

    // Standings: cargar de TODAS las categorías para mostrar mejores equipos en general
    const categoriesRes = await api.get(`/tournaments/${slug.value}/categories`).catch(() => ({ data: [] }))
    const allStandings = []
    for (const cat of categoriesRes.data) {
      try {
        const phasesRes = await api.get(`/tournaments/${slug.value}/phases?cat=${cat.id}`)
        const regularPhase = phasesRes.data.find(p => p.type === 'league' || p.type === 'groups')
        if (!regularPhase) continue
        if (regularPhase.type === 'league') hasLeaguePhase.value = true
        const stdRes = await api.get(`/phases/${regularPhase.id}/standings`)
        const raw = stdRes.data
        if (Array.isArray(raw) && raw.length && raw[0]?.standings) {
          // Fase de grupos: aplanar todos los grupos, añadir categoryName
          for (const grp of raw) {
            for (const row of (grp.standings || [])) {
              allStandings.push({ ...row, categoryName: cat.name })
            }
          }
        } else if (Array.isArray(raw)) {
          for (const row of raw) {
            allStandings.push({ ...row, categoryName: cat.name })
          }
        }
      } catch { /* omitir categorías sin datos */ }
    }
    standings.value = allStandings

    // Suscribirse al socket una vez que tengamos el tournamentId
    if (tournament.value?.id) {
      const tid = tournament.value.id
      cleanupTournamentMatch = onTournamentMatch(tid, applyMatchUpdate)
      cleanupStandings = onStandingsUpdate(tid, null, ({ categoryId }) => {
        if (categoryId) refreshStandingsForCategory(categoryId)
      })
    }
  } catch (e) { console.error(e) } finally { loading.value = false }
})

// ── Socket: actualizaciones en tiempo real ─────────────────────────────────
let cleanupTournamentMatch = null
let cleanupStandings       = null

function applyMatchUpdate(updatedMatch) {
  const idx = matches.value.findIndex(m => m.id === updatedMatch.id)
  if (idx >= 0) {
    matches.value[idx] = { ...matches.value[idx], ...updatedMatch }
  } else if (updatedMatch.status === 'live') {
    matches.value.push(updatedMatch)
  }
}

async function refreshStandingsForCategory(categoryId) {
  if (!slug.value) return
  try {
    const phasesRes = await api.get(`/tournaments/${slug.value}/phases?cat=${categoryId}`)
    const regularPhase = phasesRes.data.find(p => p.type === 'league' || p.type === 'groups')
    if (!regularPhase) return
    const stdRes = await api.get(`/phases/${regularPhase.id}/standings`)
    const raw = stdRes.data
    const newRows = []
    if (Array.isArray(raw) && raw.length && raw[0]?.standings) {
      for (const grp of raw) {
        for (const row of (grp.standings || [])) newRows.push({ ...row, categoryId })
      }
    } else if (Array.isArray(raw)) {
      raw.forEach(row => newRows.push({ ...row, categoryId }))
    }
    // Reemplazar las filas de esta categoría en standings
    standings.value = [
      ...standings.value.filter(s => s.categoryId !== categoryId),
      ...newRows
    ]
  } catch {}
}

onUnmounted(() => {
  if (sliderInterval) clearInterval(sliderInterval)
  cleanupTournamentMatch?.()
  cleanupStandings?.()
})
</script>

<style scoped>
/* Transición suave entre modos de la sección dinámica */
.section-fade-enter-active,
.section-fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.section-fade-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.section-fade-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}

/* Entrada escalonada del Hero — visible desde el primer momento (above the fold) */
@keyframes thHeroFadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
.th-hero-anim {
  opacity: 0;
  animation: thHeroFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@media (prefers-reduced-motion: reduce) {
  .th-hero-anim { animation: none; opacity: 1; }
}
</style>
