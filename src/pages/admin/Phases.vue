<template>
  <div class="space-y-4 md:space-y-6">

    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Fases y Rondas</h2>
      <div class="flex gap-2">
        <button v-if="scheduleReady" @click="openShareModal"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 bg-accent hover:bg-emerald-600">
          <IconLink class="w-4 h-4" /> Compartir roles
        </button>
        <button @click="openWizard"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-90"
          style="background:linear-gradient(135deg,#0ea5e9,#6366f1)">
          <IconZap class="w-4 h-4" /> Generar automáticamente
        </button>
        <button @click="openPhaseForm()" class="btn-primary text-sm">+ Nueva fase</button>
      </div>
    </div>

    <!-- Modal: compartir rol de juegos -->
    <div v-if="showShareModal" class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"/>
        <div class="modal-header">
          <h3 class="font-bold text-slate-900 text-base">Compartir rol de juegos</h3>
          <button @click="showShareModal=false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>
        <div class="modal-body space-y-3">
          <p class="text-sm text-slate-500">
            Este enlace privado muestra el rol de juegos de todas las categorías del torneo — ideal para compartir con los delegados de cada equipo. Quien lo tenga puede ver y cambiar entre categorías desde ahí mismo.
          </p>
          <div v-if="shareLoading" class="flex justify-center py-6">
            <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div v-else-if="shareUrl" class="link-card">
            <p class="link-url">{{ shareUrl }}</p>
            <button @click="copyShareLink" class="link-copy" :class="{ copied: shareCopied }">
              <IconCheck v-if="shareCopied" class="w-4 h-4" />
              <IconCopy v-else class="w-4 h-4" />
              {{ shareCopied ? 'Copiado' : 'Copiar enlace' }}
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showShareModal=false" class="btn-ghost text-sm flex-1">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap items-center">
      <select v-model="selTournament" @change="onTournamentChange"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option v-for="t in tournaments" :key="t.id" :value="t">{{ t.name }}</option>
      </select>

      <!-- Selector de categoría — obligatorio, sin "Todas" -->
      <template v-if="categories.length">
        <select v-model="selCategory" @change="load"
          class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
          <option v-for="c in categories" :key="c.id" :value="c">{{ c.name }}</option>
        </select>
      </template>
      <span v-else-if="selTournament" class="text-xs text-amber-600 font-semibold px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
        Sin categorías — crea una primero
      </span>

      <!-- Indicador de categoría activa -->
      <div v-if="selCategory" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/8 border border-primary/20">
        <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
        <span class="text-xs font-bold text-primary">{{ selCategory.name }}</span>
      </div>
    </div>

    <!-- Phases -->
    <div class="space-y-4">
      <div v-for="phase in phases" :key="phase.id"
        class="rounded-2xl border overflow-hidden shadow-sm transition-shadow hover:shadow-md"
        :class="phase.is_active ? 'border-primary/30' : 'border-muted'">

        <!-- ── Cabecera de la fase ── -->
        <div class="flex items-center justify-between flex-wrap gap-3 px-5 py-4"
          :class="phase.is_active ? 'bg-gradient-to-r from-primary/8 to-transparent' : 'bg-slate-50'">

          <div class="flex items-center gap-3">
            <!-- Icono tipo fase -->
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              :class="phase.type==='knockout' ? 'bg-amber-100' : phase.type==='groups' ? 'bg-purple-100' : 'bg-emerald-100'">
              <component :is="phaseIconComponent(phase.type)"
                class="w-5 h-5"
                :class="phase.type==='knockout' ? 'text-amber-600' : phase.type==='groups' ? 'text-purple-600' : 'text-emerald-600'"/>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-black text-slate-900 text-base">{{ phase.name }}</h3>
                <span v-if="phase.is_active"
                  class="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  ACTIVA
                </span>
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  :class="phase.type==='knockout' ? 'bg-amber-100 text-amber-700' : phase.type==='groups' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'">
                  {{ phaseLabel(phase.type) }}
                </span>
              </div>
              <div class="flex items-center gap-3 mt-0.5">
                <p class="text-xs text-slate-400">{{ phase.categoryName }}</p>
                <!-- Stats de partidos -->
                <div v-if="phase.matchStats?.total > 0" class="flex items-center gap-2 text-[10px] font-semibold">
                  <span class="text-slate-500">{{ phase.matchStats.total }} partidos</span>
                  <span v-if="phase.matchStats.finished > 0" class="text-emerald-600">· {{ phase.matchStats.finished }} finalizados</span>
                  <span v-if="phase.matchStats.live > 0" class="text-red-500 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping inline-block"></span>
                    {{ phase.matchStats.live }} en vivo
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex items-center gap-2 flex-wrap">
            <button @click="toggleActive(phase)"
              class="text-xs px-3 py-1.5 border rounded-lg transition-colors font-semibold"
              :class="phase.is_active ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50' : 'border-muted text-slate-500 hover:border-primary/40 hover:text-primary'">
              {{ phase.is_active ? 'Desactivar' : 'Activar' }}
            </button>

            <!-- Generar / Regenerar partidos (oculto para knockout en grupos_eliminacion y mixto) -->
            <button v-if="!(phase.type === 'knockout' && (selTournament?.modality === 'grupos_eliminacion' || isKnockoutAfterGroups(phase)))"
              @click="openGenerateForm(phase)"
              :disabled="!canRegenerate(phase) && phase.matchStats?.total > 0"
              :title="!canRegenerate(phase) && phase.matchStats?.total > 0 ? 'Hay partidos iniciados o finalizados' : ''"
              class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
              :class="phase.matchStats?.total === 0
                ? 'bg-accent text-white hover:bg-accent/90'
                : canRegenerate(phase)
                ? 'border border-amber-400 text-amber-700 hover:bg-amber-50'
                : 'border border-slate-200 text-slate-300 cursor-not-allowed'">
              <IconZap class="w-3.5 h-3.5"/>
              {{ phase.matchStats?.total === 0 ? 'Generar partidos' : canRegenerate(phase) ? 'Regenerar' : 'Bloqueado' }}
            </button>

            <!-- Botón especial: Generar Eliminatoria (solo en fase de grupos con knockout vinculado) -->
            <button v-if="phase.type === 'groups' && linkedKnockoutPhase(phase)"
              @click="!knockoutGenerationBlocked(phase) && openKnockoutPreview(phase)"
              :title="knockoutGenerationTitle(phase)"
              class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all"
              :class="!knockoutGenerationBlocked(phase)
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'">
              <IconTrophy class="w-3.5 h-3.5"/>
              {{ knockoutAlreadyStarted(phase) ? '✓ Eliminatoria generada' : 'Generar Eliminatoria' }}
            </button>

            <button v-if="!(phase.type === 'knockout' && isKnockoutAfterGroups(phase))"
              @click="openRoundForm(phase)"
              class="text-xs text-primary px-3 py-1.5 border border-primary/30 rounded-lg hover:bg-primary/10 font-semibold">
              + Ronda
            </button>
            <button @click="editPhase(phase)"
              class="text-xs text-slate-400 hover:text-slate-700 px-2 py-1.5 border border-muted rounded-lg">
              <IconPencil class="w-4 h-4"/>
            </button>
            <button @click="deletePhase(phase.id)"
              class="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 border border-red-200 rounded-lg hover:bg-red-50">
              <IconTrash2 class="w-4 h-4"/>
            </button>
          </div>
        </div>

        <!-- ── Contenido: grupos o rondas ── -->
        <div class="bg-white">

          <!-- FASE DE GRUPOS: tabla de posiciones + partidos -->
          <template v-if="phase.type === 'groups' && phase.groups?.length">
            <div class="p-4 grid gap-4" :class="groupsGridClass(phase.groups.length)">
              <div v-for="group in phase.groups" :key="group.id"
                class="rounded-xl border border-purple-100 overflow-hidden">
                <!-- Header grupo -->
                <div class="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700">
                  <div>
                    <p class="font-black text-white text-sm">{{ group.name }}</p>
                    <p class="text-white/50 text-[10px]">{{ group.teamCount }} equipos</p>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[9px] text-white/40 uppercase tracking-wider">Clasifican</span>
                    <span class="text-white font-black text-base">{{ group.advance_count }}</span>
                  </div>
                </div>

                <!-- Tabla de posiciones del grupo -->
                <GroupTable
                  :standings="groupStandingsMap[group.id] || []"
                  :advance-count="group.advance_count"
                />

                <!-- Partidos del grupo (colapsados) -->
                <details class="border-t border-slate-100">
                  <summary class="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 select-none flex items-center gap-2">
                    <span>Partidos ({{ group.matches?.length || 0 }})</span>
                    <span class="ml-auto text-slate-300">▾</span>
                  </summary>
                  <div class="divide-y divide-slate-50">
                    <div v-for="match in group.matches" :key="match.id"
                      class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 hover:bg-slate-50 transition-colors">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-1.5 h-1.5 rounded-full shrink-0 flex-shrink-0"
                          :class="match.status==='finished' ? 'bg-emerald-400' : match.status==='live' ? 'bg-red-500 animate-ping' : 'bg-slate-200'"/>
                        <span class="text-xs font-semibold text-slate-700 truncate">{{ match.homeTeam }}</span>
                      </div>
                      <div class="text-center shrink-0 px-1">
                        <span v-if="match.status !== 'scheduled'" class="text-sm font-black text-slate-900 tabular-nums">
                          {{ match.home_score }} - {{ match.away_score }}
                        </span>
                        <span v-else class="text-[10px] font-bold text-slate-300 uppercase">vs</span>
                      </div>
                      <div class="flex items-center gap-2 min-w-0 flex-row-reverse">
                        <span class="text-xs font-semibold text-slate-700 text-right truncate">{{ match.awayTeam }}</span>
                      </div>
                    </div>
                    <div v-if="!group.matches?.length" class="px-4 py-4 text-center text-xs text-slate-400 italic">
                      Sin partidos generados
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </template>

          <!-- FASE KNOCKOUT: rondas con partidos del bracket -->
          <template v-else-if="phase.type === 'knockout' && phase.rounds?.length">
            <div class="divide-y divide-slate-50">
              <div v-for="(round, ri) in phase.rounds" :key="round.id">
                <!-- Cabecera de ronda -->
                <div class="flex items-center justify-between px-5 py-2.5 bg-slate-50/80">
                  <div class="flex items-center gap-2.5">
                    <div class="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 bg-amber-400">
                      {{ ri + 1 }}
                    </div>
                    <span class="text-sm font-bold text-slate-800">{{ round.name }}</span>
                    <span class="text-[10px] text-slate-400">
                      ({{ (knockoutMatchesMap[round.id] || []).length }} partido{{ (knockoutMatchesMap[round.id] || []).length !== 1 ? 's' : '' }})
                    </span>
                  </div>
                  <div class="flex gap-1.5" v-if="!isKnockoutAfterGroups(phase)">
                    <button @click="editRound(round)" class="text-slate-300 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
                      <IconPencil class="w-3.5 h-3.5"/>
                    </button>
                    <button @click="deleteRound(round.id)" class="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50">
                      <IconTrash2 class="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>

                <!-- Partidos de la ronda -->
                <div v-if="knockoutMatchesMap[round.id]?.length" class="divide-y divide-slate-50">
                  <div v-for="match in knockoutMatchesMap[round.id]" :key="match.id"
                    class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-3 hover:bg-amber-50/40 transition-colors">
                    <!-- Local -->
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="w-2 h-2 rounded-full shrink-0"
                        :class="match.status==='finished'?'bg-emerald-400':match.status==='live'?'bg-red-500 animate-pulse':'bg-slate-200'"/>
                      <span class="text-xs font-semibold text-slate-800 truncate">{{ match.homeTeam }}</span>
                    </div>
                    <!-- Marcador -->
                    <div class="text-center px-2 shrink-0">
                      <span v-if="match.status !== 'scheduled'"
                        class="text-sm font-black tabular-nums"
                        :class="match.status==='live'?'text-red-600':'text-slate-900'">
                        {{ match.home_score }} – {{ match.away_score }}
                      </span>
                      <span v-else class="text-[10px] font-bold text-slate-300 uppercase tracking-wider">vs</span>
                    </div>
                    <!-- Visitante -->
                    <div class="flex items-center gap-2 min-w-0 flex-row-reverse">
                      <span class="text-xs font-semibold text-slate-800 text-right truncate">{{ match.awayTeam }}</span>
                    </div>
                  </div>
                </div>
                <div v-else class="px-5 py-3 text-xs text-slate-400 italic">
                  En espera de clasificados de ronda anterior…
                </div>
              </div>
            </div>
          </template>

          <!-- FASE LIGA: lista de rondas -->
          <template v-else-if="phase.type !== 'knockout' && phase.rounds?.length">
            <div class="divide-y divide-slate-50">
              <div v-for="(round, ri) in phase.rounds" :key="round.id"
                class="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors">
                <div class="flex items-center gap-3">
                  <div class="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 bg-primary">
                    {{ ri + 1 }}
                  </div>
                  <span class="text-sm font-medium text-slate-700">{{ round.name }}</span>
                </div>
                <div class="flex gap-1.5">
                  <button @click="editRound(round)" class="text-slate-300 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <IconPencil class="w-3.5 h-3.5"/>
                  </button>
                  <button @click="deleteRound(round.id)" class="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <IconTrash2 class="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- Empty state para knockout de grupos_eliminacion -->
          <div v-else-if="phase.type === 'knockout' && (selTournament?.modality === 'grupos_eliminacion' || isKnockoutAfterGroups(phase))"
            class="px-5 py-6 text-center text-slate-400 text-sm">
            <IconTrophy class="w-8 h-8 mx-auto mb-2 opacity-20"/>
            <p>Sin partidos generados.</p>
            <p class="text-xs mt-1 text-slate-400">Usa el botón <span class="font-semibold text-amber-600">Generar Eliminatoria</span> en la fase de grupos para clasificar equipos aquí.</p>
          </div>

          <div v-else class="px-5 py-6 text-center text-slate-400 text-sm">
            <IconZap class="w-8 h-8 mx-auto mb-2 opacity-20"/>
            Sin partidos generados.
            <button @click="openGenerateForm(phase)" class="text-primary font-semibold hover:underline ml-1">
              Generar ahora →
            </button>
          </div>
        </div>

        <!-- Barra de progreso de partidos -->
        <div v-if="phase.matchStats?.total > 0"
          class="h-1 w-full bg-slate-100 flex overflow-hidden">
          <div class="bg-emerald-500 transition-all"
            :style="{ width: (phase.matchStats.finished / phase.matchStats.total * 100) + '%' }"/>
          <div class="bg-red-500 transition-all"
            :style="{ width: (phase.matchStats.live / phase.matchStats.total * 100) + '%' }"/>
        </div>
      </div>

      <!-- Empty state: sin categoría seleccionada -->
      <div v-if="!selCategory && !loading && categories.length"
        class="text-center py-16 px-8 rounded-2xl border-2 border-dashed border-muted">
        <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <IconUsers class="w-7 h-7 text-slate-400" />
        </div>
        <p class="font-bold text-slate-700 mb-1">Selecciona una categoría</p>
        <p class="text-slate-400 text-sm">Las fases y rondas se muestran por categoría.</p>
      </div>

      <!-- Empty state: sin categorías en el torneo -->
      <div v-else-if="!categories.length && !loading && selTournament"
        class="text-center py-16 px-8 rounded-2xl border-2 border-dashed border-muted">
        <div class="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <IconAlertTriangle class="w-7 h-7 text-amber-400" />
        </div>
        <p class="font-bold text-slate-700 mb-1">Sin categorías</p>
        <p class="text-slate-400 text-sm">Crea al menos una categoría en el torneo antes de configurar fases.</p>
      </div>

      <!-- Empty state: categoría seleccionada pero sin fases -->
      <div v-else-if="selCategory && !phases.length && !loading"
        class="text-center py-16 px-8 rounded-2xl border-2 border-dashed border-muted">
        <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <IconZap class="w-7 h-7 text-slate-400" />
        </div>
        <p class="font-bold text-slate-700 mb-1">Sin fases en <span class="text-primary">{{ selCategory.name }}</span></p>
        <p class="text-slate-400 text-sm mb-5">Genera toda la estructura automáticamente en segundos.</p>
        <button @click="openWizard"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm"
          style="background:linear-gradient(135deg,#0ea5e9,#6366f1)">
          <IconZap class="w-4 h-4" /> Generar automáticamente
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         WIZARD: AUTO-GENERAR (inteligente)
    ═══════════════════════════════════════════ -->
    <div v-if="showWizard" class="modal-overlay">
      <div class="modal-sheet-lg">
        <div class="modal-handle"/>
        <div class="modal-header">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
              style="background:linear-gradient(135deg,#0ea5e9,#6366f1)">
              <IconZap class="w-4 h-4"/>
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-sm leading-tight">Generador de Partidos</h3>
              <p class="text-[10px] text-slate-400 leading-tight">Basado en la modalidad del torneo</p>
            </div>
          </div>
          <button @click="showWizard = false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>
        <div class="modal-body space-y-4">

          <!-- Modalidad -->
          <div class="rounded-xl p-4 flex items-center gap-4" :class="modalityStyle(selTournament?.modality).bg">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="modalityStyle(selTournament?.modality).icon">
              <IconTrophy    v-if="selTournament?.modality==='copa'"                   class="w-5 h-5 text-white"/>
              <IconCircleDot v-else-if="selTournament?.modality==='liga'"              class="w-5 h-5 text-white"/>
              <IconShuffle   v-else-if="selTournament?.modality==='mixto'"             class="w-5 h-5 text-white"/>
              <IconUsers     v-else-if="selTournament?.modality==='grupos_eliminacion'"class="w-5 h-5 text-white"/>
              <IconZap       v-else class="w-5 h-5 text-white"/>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-black text-slate-900 text-sm">{{ modalityLabel(selTournament?.modality) }}</p>
              <p class="text-xs text-slate-500 mt-0.5">{{ modalityDesc(selTournament?.modality) }}</p>
            </div>
          </div>

          <!-- Categoría + equipos (categoría fija, viene del contexto del filtro) -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-600 block">Categoría</label>
            <div class="flex items-center gap-3">
              <!-- Categoría fija — muestra la seleccionada en el filtro principal -->
              <div class="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-primary/30 bg-primary/5">
                <span class="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                <span class="text-sm font-black text-primary">{{ selCategory?.name || '—' }}</span>
              </div>

              <!-- Chip de equipos detectados (solo lectura) -->
              <div class="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-black"
                :class="rec.errors?.length
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : wiz.teamCount > 0
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-muted bg-slate-50 text-slate-400'">
                <span v-if="wizLoadingRec"
                  class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block">
                </span>
                <IconUsers v-else class="w-4 h-4"/>
                <span>
                  {{ wizLoadingRec ? '...' : wiz.teamCount }}
                  <span class="font-normal text-xs ml-0.5">equipos</span>
                </span>
              </div>
            </div>
            <p class="text-[11px] text-slate-400 flex items-center gap-1">
              <IconInfo class="w-3 h-3 shrink-0"/>
              El sistema detecta automáticamente los equipos registrados en la categoría.
            </p>
          </div>

          <!-- Error de validación -->
          <div v-if="rec.errors?.length" class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
            <IconAlertTriangle class="w-5 h-5 text-red-500 shrink-0 mt-0.5"/>
            <div>
              <p class="font-bold text-red-700 text-sm">No se puede generar</p>
              <p class="text-red-600 text-xs mt-0.5" v-for="e in rec.errors" :key="e">{{ e }}</p>
              <p v-if="wiz.categoryId" class="text-red-500 text-xs mt-1 font-semibold">
                Registra equipos en esta categoría antes de continuar.
              </p>
            </div>
          </div>

          <!-- Notas / recomendaciones del backend -->
          <div v-else-if="rec.notes?.filter(Boolean).length" class="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-1">Análisis automático</p>
            <p v-for="n in rec.notes.filter(Boolean)" :key="n" class="text-xs text-blue-700 flex items-start gap-1.5">
              <IconCheck class="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500"/> {{ n }}
            </p>
          </div>

          <!-- ── OPCIONES POR MODALIDAD ── -->
          <div v-if="!rec.errors?.length" class="space-y-4">

            <!-- COPA: solo tercer lugar si ≥ 4 equipos -->
            <template v-if="selTournament?.modality === 'copa'">
              <label v-if="wiz.teamCount >= 4"
                class="flex items-center gap-3 p-3 rounded-xl border border-muted hover:border-primary/40 cursor-pointer transition-colors">
                <input type="checkbox" v-model="wiz.thirdPlace" class="accent-primary w-4 h-4"/>
                <div>
                  <p class="text-sm font-semibold text-slate-900">Partido por 3er lugar</p>
                  <p class="text-xs text-slate-400">Agrega ronda extra de consolación</p>
                </div>
              </label>
              <p v-else class="text-xs text-slate-400 italic">Con 2-3 equipos solo se puede jugar la Final.</p>
            </template>

            <!-- LIGA: vueltas -->
            <template v-if="selTournament?.modality === 'liga'">
              <div>
                <label class="text-xs font-bold text-slate-600 mb-2 block">Vueltas</label>
                <div class="grid grid-cols-2 gap-2">
                  <button @click="wiz.legs = 1"
                    class="py-2.5 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-0.5"
                    :class="wiz.legs===1 ? 'border-primary bg-primary/10 text-primary' : 'border-muted text-slate-500'">
                    Solo ida
                    <span class="text-[10px] font-normal opacity-70">{{ leagueJornadas(wiz.teamCount,1) }} jornadas</span>
                  </button>
                  <button @click="wiz.legs = 2"
                    class="py-2.5 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-0.5"
                    :class="wiz.legs===2 ? 'border-primary bg-primary/10 text-primary' : 'border-muted text-slate-500'">
                    Ida y vuelta
                    <span class="text-[10px] font-normal opacity-70">{{ leagueJornadas(wiz.teamCount,2) }} jornadas</span>
                  </button>
                </div>
              </div>
            </template>

            <!-- MIXTO: vueltas + equipos avanzan -->
            <template v-if="selTournament?.modality === 'mixto'">
              <div>
                <label class="text-xs font-bold text-slate-600 mb-2 block">Vueltas de la fase regular</label>
                <div class="grid grid-cols-2 gap-2">
                  <button @click="wiz.legs = 1"
                    class="py-2.5 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-0.5"
                    :class="wiz.legs===1 ? 'border-primary bg-primary/10 text-primary' : 'border-muted text-slate-500'">
                    Solo ida <span class="text-[10px] font-normal opacity-70">{{ leagueJornadas(wiz.teamCount,1) }} jornadas</span>
                  </button>
                  <button @click="wiz.legs = 2"
                    class="py-2.5 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-0.5"
                    :class="wiz.legs===2 ? 'border-primary bg-primary/10 text-primary' : 'border-muted text-slate-500'">
                    Ida y vuelta <span class="text-[10px] font-normal opacity-70">{{ leagueJornadas(wiz.teamCount,2) }} jornadas</span>
                  </button>
                </div>
              </div>
              <div v-if="rec.options?.advancingOptions?.length">
                <label class="text-xs font-bold text-slate-600 mb-2 block">Equipos a la Liguilla</label>
                <div class="flex gap-2 flex-wrap">
                  <button v-for="n in rec.options.advancingOptions" :key="n"
                    @click="wiz.advancing = n"
                    class="px-3 py-1.5 rounded-lg border-2 text-sm font-bold transition-all flex items-center gap-1"
                    :class="wiz.advancing===n ? 'border-primary bg-primary/10 text-primary' : 'border-muted text-slate-500'">
                    Top {{ n }}
                    <span v-if="n === rec.options.recommendedAdvancing"
                      class="text-[9px] bg-primary text-white px-1 rounded font-black">REC</span>
                  </button>
                </div>
              </div>
              <label class="flex items-center gap-3 p-3 rounded-xl border border-muted hover:border-primary/40 cursor-pointer transition-colors">
                <input type="checkbox" v-model="wiz.thirdPlace" class="accent-primary w-4 h-4"/>
                <div><p class="text-sm font-semibold text-slate-900">3er lugar</p><p class="text-xs text-slate-400">Partido de consolación en la liguilla</p></div>
              </label>
            </template>

            <!-- GRUPOS + ELIMINACIÓN: grupos y equipos que avanzan -->
            <template v-if="selTournament?.modality === 'grupos_eliminacion'">
              <div v-if="rec.options?.groupOptions?.length">
                <label class="text-xs font-bold text-slate-600 mb-2 block">Número de grupos</label>
                <div class="flex gap-2 flex-wrap">
                  <button v-for="opt in rec.options.groupOptions" :key="opt.groups"
                    @click="wiz.groupCount = opt.groups"
                    class="px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center min-w-[60px]"
                    :class="wiz.groupCount===opt.groups ? 'border-primary bg-primary/10 text-primary' : 'border-muted text-slate-500'">
                    <span>{{ opt.groups }}</span>
                    <span class="text-[9px] font-normal opacity-70">{{ opt.teamsPerGroup }} eq/grupo</span>
                    <span v-if="opt.groups === rec.options.recommendedGroups"
                      class="text-[8px] bg-primary text-white px-1 rounded font-black mt-0.5">REC</span>
                  </button>
                </div>
                <p class="text-[11px] text-slate-400 mt-1.5">
                  {{ Math.ceil(wiz.teamCount / wiz.groupCount) - 1 }} partidos garantizados por equipo en fase de grupos
                </p>
              </div>
              <div v-if="rec.options?.advanceOptions?.length">
                <label class="text-xs font-bold text-slate-600 mb-2 block">Equipos que avanzan por grupo</label>
                <div class="flex gap-2">
                  <button v-for="n in rec.options.advanceOptions" :key="n"
                    @click="wiz.advanceCount = n"
                    class="flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-0.5"
                    :class="wiz.advanceCount===n ? 'border-primary bg-primary/10 text-primary' : 'border-muted text-slate-500'">
                    {{ n }} equipo{{ n > 1 ? 's' : '' }}
                    <span v-if="n === rec.options.recommendedAdvance"
                      class="text-[9px] bg-primary text-white px-1.5 rounded font-black">REC</span>
                  </button>
                </div>
                <p class="text-[11px] text-slate-400 mt-1.5">
                  → {{ (wiz.groupCount || 2) * wiz.advanceCount }} equipos en la eliminatoria
                </p>
              </div>
              <div v-if="rec.errors?.length === 0 && !rec.options?.groupOptions?.length"
                class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
                No hay suficientes equipos para formar grupos válidos (mín. 3 por grupo).
              </div>
            </template>
          </div>

          <!-- Vista previa -->
          <div v-if="previewStructure.length && !rec.errors?.length" class="rounded-xl border border-muted overflow-hidden">
            <div class="px-4 py-2.5 bg-slate-50 border-b border-muted flex items-center justify-between">
              <div class="flex items-center gap-2">
                <IconClipboardList class="w-4 h-4 text-slate-400"/>
                <p class="text-xs font-black uppercase tracking-wider text-slate-500">Vista previa</p>
              </div>
              <span class="text-[10px] text-slate-400">{{ previewStructure.length }} fases · {{ totalRounds }} rondas</span>
            </div>
            <div class="divide-y divide-muted">
              <div v-for="(phase, pi) in previewStructure" :key="pi" class="px-4 py-3">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-black"
                    :class="phase.type==='knockout'?'bg-amber-500':phase.type==='groups'?'bg-purple-500':'bg-emerald-500'">{{ pi+1 }}</div>
                  <span class="font-bold text-slate-900 text-sm">{{ phase.name }}</span>
                  <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                    :class="phase.type==='knockout'?'bg-amber-100 text-amber-700':phase.type==='groups'?'bg-purple-100 text-purple-700':'bg-emerald-100 text-emerald-700'">
                    {{ phaseLabel(phase.type) }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-1.5 pl-7">
                  <span v-for="r in phase.rounds" :key="r"
                    class="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">{{ r }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button @click="runAutoSetup"
            :disabled="wizSaving || !!rec.errors?.length || !previewStructure.length"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style="background:linear-gradient(135deg,#0ea5e9,#6366f1)">
            <IconZap class="w-4 h-4"/>
            {{ wizSaving ? 'Generando...' : rec.errors?.length ? 'Corrige errores' : `Generar (${previewStructure.length} fases)` }}
          </button>
          <button @click="showWizard = false" class="btn-ghost text-sm px-4">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- ── Modal: Preview de Eliminatoria ───────────────────── -->
    <div v-if="showKnockoutPreview" class="modal-overlay">
      <div class="modal-sheet-lg">
        <div class="modal-handle"/>
        <div class="modal-header">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <IconTrophy class="w-4 h-4 text-amber-600"/>
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-sm">Generar Eliminatoria</h3>
              <p class="text-[10px] text-slate-400">Basada en resultados de grupos</p>
            </div>
          </div>
          <button @click="showKnockoutPreview = false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>
        <div class="modal-body space-y-4">

          <!-- Cargando -->
          <div v-if="kpLoading" class="flex justify-center py-8">
            <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>

          <template v-else-if="kpData">
            <!-- Bloqueo: hay partidos pendientes -->
            <div v-if="kpData.pending > 0"
              class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
              <IconAlertTriangle class="w-5 h-5 text-red-500 shrink-0 mt-0.5"/>
              <div>
                <p class="font-bold text-red-800 text-sm">{{ kpData.pending }} partido(s) sin finalizar</p>
                <p class="text-red-600 text-xs mt-0.5">
                  Todos los partidos de la fase de grupos deben terminar antes de generar la eliminatoria.
                </p>
              </div>
            </div>

            <!-- Sin fase knockout — se crea automáticamente -->
            <div v-if="!kpData.nextPhase"
              class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-start gap-3">
              <IconZap class="w-5 h-5 shrink-0 mt-0.5 text-amber-500"/>
              <div>
                <p class="font-bold">La fase eliminatoria se creará automáticamente</p>
                <p class="text-xs mt-0.5">No tienes una fase de eliminación creada, pero el sistema la generará al confirmar.</p>
              </div>
            </div>

            <!-- Fase destino -->
            <div v-if="kpData.nextPhase"
              class="rounded-xl bg-slate-50 border border-muted px-4 py-3 flex items-center gap-3">
              <IconTrophy class="w-4 h-4 text-amber-500"/>
              <div>
                <p class="text-xs text-slate-500">Se generará en la fase</p>
                <p class="font-black text-slate-900">{{ kpData.nextPhase.name }}</p>
              </div>
            </div>

            <!-- Clasificaciones por grupo -->
            <div>
              <p class="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Clasificaciones actuales</p>
              <div class="grid gap-3" :class="groupsGridClass(kpData.groupStandings.length)">
                <div v-for="gs in kpData.groupStandings" :key="gs.groupId"
                  class="rounded-xl border overflow-hidden">
                  <div class="px-4 py-2 bg-slate-800 flex items-center justify-between">
                    <p class="font-black text-white text-sm">{{ gs.groupName }}</p>
                    <span class="text-[10px] text-white/50">{{ gs.advanceCount }} clasifican</span>
                  </div>
                  <div class="divide-y divide-slate-50">
                    <div v-for="team in gs.teams" :key="team.team_id"
                      class="flex items-center gap-3 px-4 py-2"
                      :class="team.advances ? '' : 'opacity-40'">
                      <span class="font-black text-sm w-5 shrink-0"
                        :class="team.position===1 ? 'text-emerald-500' : team.advances ? 'text-blue-500' : 'text-slate-300'">
                        {{ team.position }}
                      </span>
                      <div class="w-6 h-6 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        <img v-if="team.logo" :src="team.logo" class="w-full h-full object-contain p-0.5"/>
                        <span v-else class="text-[8px] font-black text-slate-400">{{ team.teamName?.[0] }}</span>
                      </div>
                      <span class="flex-1 text-sm font-semibold text-slate-800 truncate">{{ team.teamName }}</span>
                      <div class="flex gap-2 text-xs text-slate-500 shrink-0">
                        <span class="font-black text-primary">{{ team.points }}pts</span>
                        <span>{{ team.goals_for }}-{{ team.goals_against }}</span>
                      </div>
                      <span v-if="team.advances"
                        class="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0"
                        :class="team.position===1 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'">
                        {{ team.position===1 ? '1°' : '2°' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cruces propuestos -->
            <div v-if="kpData.matchups?.length">
              <p class="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                Cruces del bracket ({{ kpData.matchups.length }} partidos)
              </p>
              <div class="space-y-2">
                <div v-for="(mu, i) in kpData.matchups" :key="i"
                  class="rounded-xl border border-muted bg-slate-50 px-4 py-3 flex items-center gap-3">
                  <span class="text-xs font-black text-slate-400 w-5 shrink-0">{{ i+1 }}</span>
                  <!-- Local -->
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-white border border-muted flex items-center justify-center shrink-0 overflow-hidden">
                      <img v-if="mu.home?.logo" :src="mu.home.logo" class="w-full h-full object-contain p-0.5"/>
                      <span v-else class="text-[9px] font-black text-slate-400">{{ mu.home?.teamName?.[0] }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="font-bold text-slate-900 text-sm truncate">{{ mu.home?.teamName }}</p>
                      <p class="text-[10px] text-emerald-600 font-semibold">{{ mu.home?.groupName }} · {{ mu.home?.position }}°</p>
                    </div>
                  </div>
                  <span class="text-xs font-black text-slate-300 shrink-0">vs</span>
                  <!-- Visitante -->
                  <div class="flex items-center gap-2 flex-1 min-w-0 flex-row-reverse">
                    <div class="w-7 h-7 rounded-lg bg-white border border-muted flex items-center justify-center shrink-0 overflow-hidden">
                      <img v-if="mu.away?.logo" :src="mu.away.logo" class="w-full h-full object-contain p-0.5"/>
                      <span v-else class="text-[9px] font-black text-slate-400">{{ mu.away?.teamName?.[0] }}</span>
                    </div>
                    <div class="min-w-0 text-right">
                      <p class="font-bold text-slate-900 text-sm truncate">{{ mu.away?.teamName }}</p>
                      <p class="text-[10px] text-blue-600 font-semibold">{{ mu.away?.groupName }} · {{ mu.away?.position }}°</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="px-6 py-4 border-t border-muted shrink-0 flex gap-3">
          <button @click="runAdvanceToKnockout"
            :disabled="kpLoading || kpSaving || !kpData?.matchups?.length || kpData?.pending > 0"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style="background:linear-gradient(135deg,#f59e0b,#d97706)">
            <IconTrophy class="w-4 h-4"/>
            {{ kpSaving ? 'Generando...' : 'Generar Eliminatoria' }}
          </button>
          <button @click="showKnockoutPreview = false" class="btn-ghost text-sm px-4">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- ── Phase modal ──────────────────────────────────────── -->
    <div v-if="showPhaseForm" class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"/>
        <div class="modal-header">
          <h3 class="font-bold text-slate-900 text-base">{{ editingPhase ? 'Editar fase' : 'Nueva fase' }}</h3>
          <button @click="showPhaseForm=false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>
        <div class="modal-body space-y-4">

        <!-- Contexto: torneo y categoría (solo lectura) -->
        <div class="rounded-xl bg-slate-50 border border-muted px-4 py-3 flex items-center gap-3">
          <div class="text-xs text-slate-500 space-y-0.5">
            <p><span class="font-semibold text-slate-700">Torneo:</span> {{ selTournament?.name }}</p>
            <p><span class="font-semibold text-slate-700">Categoría:</span>
              <span class="font-black text-primary ml-1">{{ selCategory?.name || '—' }}</span>
            </p>
          </div>
        </div>

        <div class="grid gap-3">
          <div>
            <label class="text-xs text-slate-700 mb-1 block">Nombre de la fase</label>
            <input v-model="phaseForm.name"
              class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"
              placeholder="Ej: Fase de Grupos, Eliminatoria…"/>
          </div>
          <div>
            <label class="text-xs text-slate-700 mb-1 block">Tipo</label>
            <select v-model="phaseForm.type"
              class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
              <option value="league">Liga (todos contra todos)</option>
              <option value="knockout">Eliminación directa</option>
              <option value="groups">Fase de grupos</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-700 mb-1 block">Orden</label>
            <input v-model.number="phaseForm.order_index" type="number" min="0"
              class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
          </div>
        </div>
        </div><!-- end modal-body -->
        <div class="modal-footer">
          <button @click="savePhase" :disabled="saving" class="btn-primary text-sm flex-1 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
          <button @click="showPhaseForm = false" class="btn-ghost text-sm px-4">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- ── Round modal ──────────────────────────────────────── -->
    <div v-if="showRoundForm" class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"/>
        <div class="modal-header">
          <h3 class="font-bold text-slate-900 text-base">{{ editingRound ? 'Editar ronda' : 'Nueva ronda' }}</h3>
          <button @click="showRoundForm=false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>
        <div class="modal-body space-y-4">
        <p class="text-slate-500 text-sm">Fase: <strong class="text-slate-900">{{ activePhase?.name }}</strong></p>
        <div>
          <label class="text-xs text-slate-700 mb-1 block">Nombre de la ronda</label>
          <input v-model="roundForm.name"
            class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"
            placeholder="Jornada 1"/>
        </div>
        </div><!-- end modal-body -->
        <div class="modal-footer">
          <button @click="saveRound" :disabled="saving" class="btn-primary text-sm flex-1 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
          <button @click="showRoundForm = false" class="btn-ghost text-sm px-4">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- ── Generate matches modal ──────────────────────────── -->
    <div v-if="showGenerateForm" class="modal-overlay">
      <div class="modal-sheet-lg">
        <div class="modal-handle"/>
        <div class="modal-header">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <IconZap class="w-4 h-4 text-accent"/>
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-sm">Generador de Partidos</h3>
              <p class="text-[10px] text-slate-400">{{ activePhase?.name }}</p>
            </div>
          </div>
          <button @click="showGenerateForm = false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>

        <div class="modal-body space-y-4">

        <!-- Sin equipos -->
        <div v-if="!categoryTeams.length"
          class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-4 flex items-start gap-3">
          <IconAlertTriangle class="w-5 h-5 text-amber-500 shrink-0 mt-0.5"/>
          <div>
            <p class="font-bold text-amber-800 text-sm">Sin equipos en esta categoría</p>
            <p class="text-amber-600 text-xs mt-0.5">Registra equipos antes de generar partidos.</p>
          </div>
        </div>

        <template v-else>

          <!-- Tipo de generación: bloqueado si la fase ya define el tipo -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-black uppercase tracking-wider text-slate-400">Tipo de generación</label>
              <span v-if="activePhase?.type === 'groups'"
                class="text-[9px] font-black bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full uppercase">
                Definido por la fase
              </span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="opt in genTypes" :key="opt.value"
                @click="activePhase?.type !== 'groups' && (genForm.type = opt.value)"
                class="p-3 rounded-xl border-2 text-left transition-all"
                :class="[
                  genForm.type===opt.value ? 'border-primary bg-primary/10' : 'border-muted',
                  activePhase?.type === 'groups' && opt.value !== 'groups' ? 'opacity-30 cursor-not-allowed' : 'hover:border-slate-300 cursor-pointer'
                ]">
                <p class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <component :is="opt.icon" class="w-3.5 h-3.5"/> {{ opt.label }}
                </p>
                <p class="text-slate-400 text-[10px] mt-0.5">{{ opt.desc }}</p>
              </button>
            </div>
            <!-- Nota aclaratoria para fase de grupos -->
            <div v-if="activePhase?.type === 'groups'"
              class="mt-2 flex items-start gap-2 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2.5 text-xs text-purple-700">
              <IconUsers class="w-3.5 h-3.5 shrink-0 mt-0.5"/>
              <span>Cada equipo jugará <strong>solo contra los equipos de su mismo grupo</strong>. No habrá partidos entre grupos.</span>
            </div>
          </div>

          <!-- Equipos: chips con toggle -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-black uppercase tracking-wider text-slate-400">
                Equipos ({{ genForm.teamIds.length }} de {{ categoryTeams.length }})
              </label>
              <div class="flex gap-2">
                <button @click="genForm.teamIds = categoryTeams.map(t => t.id)"
                  class="text-[10px] font-bold text-primary hover:underline">Todos</button>
                <span class="text-slate-300">|</span>
                <button @click="genForm.teamIds = []"
                  class="text-[10px] font-bold text-slate-400 hover:underline">Ninguno</button>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button v-for="t in categoryTeams" :key="t.id"
                @click="toggleTeam(t.id)"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all"
                :class="genForm.teamIds.includes(t.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-200 text-slate-400 line-through opacity-50'">
                <div class="w-4 h-4 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                  <img v-if="t.logo" :src="t.logo" class="w-full h-full object-contain"/>
                  <span v-else class="text-[8px] font-black text-slate-500">{{ t.name[0] }}</span>
                </div>
                {{ t.name }}
              </button>
            </div>
            <p v-if="genForm.teamIds.length < 2" class="text-xs text-red-500 font-semibold mt-1.5">
              Selecciona al menos 2 equipos
            </p>
          </div>

          <!-- Config grupos -->
          <div v-if="genForm.type === 'groups'" class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Número de grupos</label>
              <select v-model.number="genForm.groupCount" @change="buildGroupPreview"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option v-for="n in validGroupCounts" :key="n" :value="n">{{ n }} grupo{{ n>1?'s':'' }} · {{ Math.ceil(genForm.teamIds.length/n) }} eq/grupo</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Avanzan por grupo</label>
              <select v-model.number="genForm.advanceCount"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option v-for="n in validAdvanceCounts" :key="n" :value="n">{{ n }} equipo{{ n>1?'s':'' }}</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 block">
                Partidos por equipo <span class="text-slate-300 font-normal normal-case">(opcional — vacío = todos contra todos)</span>
              </label>
              <input type="number" min="1" :max="fullRoundRobinMatches" v-model.number="genForm.matchesPerTeam"
                :placeholder="`Máximo ${fullRoundRobinMatches} (todos contra todos)`"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
              <p class="text-[11px] text-slate-400 mt-1.5">
                Si pides menos que {{ fullRoundRobinMatches }}, habrá equipos del mismo grupo que no se enfrenten entre sí.
              </p>
            </div>
          </div>

          <!-- Preview de grupos (snake-draft) -->
          <div v-if="genForm.type === 'groups' && groupPreview.length"
            class="rounded-xl border border-purple-200 bg-purple-50 overflow-hidden">
            <div class="px-4 py-2.5 border-b border-purple-100 flex items-center gap-2">
              <IconUsers class="w-4 h-4 text-purple-500"/>
              <p class="text-xs font-black uppercase tracking-wider text-purple-600">Vista previa de grupos</p>
              <span class="text-[10px] text-purple-400 ml-auto">{{ guaranteedMatches }} partido{{ guaranteedMatches>1?'s':'' }} garantizado{{ guaranteedMatches>1?'s':'' }} por equipo</span>
            </div>
            <div class="p-3 grid gap-3" :class="groupsGridClass(groupPreview.length)">
              <div v-for="(group, gi) in groupPreview" :key="gi"
                class="bg-white rounded-xl border border-purple-100 p-3">
                <p class="text-xs font-black text-purple-700 mb-2">Grupo {{ ['A','B','C','D','E','F','G','H'][gi] }}</p>
                <div class="space-y-1">
                  <div v-for="teamId in group" :key="teamId"
                    class="flex items-center gap-2 text-xs text-slate-700">
                    <div class="w-4 h-4 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      <img v-if="teamById(teamId)?.logo" :src="teamById(teamId).logo" class="w-full h-full object-contain"/>
                      <span v-else class="text-[7px] font-black text-slate-400">{{ teamById(teamId)?.name[0] }}</span>
                    </div>
                    <span class="truncate font-medium">{{ teamById(teamId)?.name || '?' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Resultado -->
          <div v-if="genResult"
            class="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700 font-semibold text-sm">
            <IconCheckCircle class="w-5 h-5 text-emerald-500 shrink-0"/>
            {{ genResultText }}
          </div>
        </template>

        </div>

        <div class="modal-footer">
          <button @click="generate"
            :disabled="saving || genForm.teamIds.length < 2 || !categoryTeams.length"
            class="btn-accent text-sm flex-1 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <IconZap class="w-4 h-4"/>
            {{ saving ? 'Generando...' : `Generar · ${genForm.teamIds.length} equipos` }}
          </button>
          <button @click="showGenerateForm = false" class="btn-ghost text-sm px-4">Cerrar</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api'
import { ClipboardList, Trophy, Users } from 'lucide-vue-next'
import GroupTable from '@/components/GroupTable/GroupTable.vue'

const tournaments        = ref([])
const categories         = ref([])
const categoryTeams      = ref([])
const phases             = ref([])
const groupStandingsMap  = ref({}) // { [groupId]: standings[] }
const knockoutMatchesMap = ref({}) // { [roundId]: matches[] }
const loading            = ref(false)
const saving         = ref(false)
const wizSaving      = ref(false)
const selTournament  = ref(null)

// ── Knockout preview state ─────────────────────────────────
const showKnockoutPreview = ref(false)
const kpLoading           = ref(false)
const kpSaving            = ref(false)
const kpData              = ref(null)
const kpPhase             = ref(null)
const selCategory    = ref(null)

const showPhaseForm    = ref(false)
const showRoundForm    = ref(false)
const showGenerateForm = ref(false)
const showWizard       = ref(false)

const editingPhase = ref(null)
const editingRound = ref(null)
const activePhase  = ref(null)
const genResult    = ref('')
const genResultText = ref('')

const phaseForm = reactive({ tournamentId: null, categoryId: null, name: '', type: 'league', order_index: 0 })
const roundForm = reactive({ name: '', order_index: 0 })
const genForm   = reactive({ type: 'round_robin', teamIds: [], startDate: '', location: '', roundMinutes: 7, groupCount: 2, advanceCount: 2, matchesPerTeam: null })

// Wizard state
const wiz = reactive({
  categoryId:   null,
  teamCount:    8,
  legs:         1,
  thirdPlace:   false,
  advancing:    4,
  groupCount:   2,
  advanceCount: 2
})
const rec            = ref({ errors: [], notes: [], options: {} })
const wizLoadingRec  = ref(false)

const genTypes = [
  { value: 'round_robin', icon: ClipboardList, label: 'Liga',         desc: 'Todos contra todos' },
  { value: 'knockout',    icon: Trophy,        label: 'Eliminatoria', desc: 'Bracket directo' },
  { value: 'groups',      icon: Users,         label: 'Grupos',       desc: 'Divide en grupos' },
]

const phaseIconMap    = { league: ClipboardList, knockout: Trophy, groups: Users }
const phaseLabels     = { league: 'Liga', knockout: 'Eliminación directa', groups: 'Fase de grupos' }
const phaseIconComponent = t => phaseIconMap[t] || ClipboardList
const phaseLabel         = t => phaseLabels[t] || t

// ── Computed preview ─────────────────────────────────────
function knockoutRoundsPreview(n, withThird = false) {
  const r = []
  if (n > 16) r.push('Ronda de 32')
  if (n > 8)  r.push('Octavos de Final')
  if (n > 4)  r.push('Cuartos de Final')
  if (n > 2)  r.push('Semifinales')
  r.push('Final')
  if (withThird) r.push('Tercer Lugar')
  return r
}
function leagueRoundsPreview(n, legs = 1) {
  const j = n % 2 === 0 ? n - 1 : n
  const total = j * legs
  return Array.from({ length: total }, (_, i) => `Jornada ${i + 1}`)
}

const previewStructure = computed(() => {
  const mod = selTournament.value?.modality || 'copa'
  const n   = wiz.teamCount

  if (mod === 'copa') {
    return [{ name: 'Eliminatoria', type: 'knockout', rounds: knockoutRoundsPreview(n, wiz.thirdPlace) }]
  }
  if (mod === 'liga') {
    return [{ name: 'Fase Regular', type: 'league', rounds: leagueRoundsPreview(n, wiz.legs) }]
  }
  if (mod === 'mixto') {
    const adv = wiz.advancing
    return [
      { name: 'Fase Regular', type: 'league',   rounds: leagueRoundsPreview(n, wiz.legs) },
      { name: 'Liguilla',     type: 'knockout', rounds: knockoutRoundsPreview(adv, wiz.thirdPlace) }
    ]
  }
  if (mod === 'grupos_eliminacion') {
    const tpg = Math.ceil(n / wiz.groupCount)
    const adv = wiz.groupCount * wiz.advanceCount
    return [
      { name: 'Fase de Grupos', type: 'groups',   rounds: leagueRoundsPreview(tpg, 1) },
      { name: 'Eliminatoria',   type: 'knockout', rounds: knockoutRoundsPreview(adv, wiz.thirdPlace) }
    ]
  }
  return []
})

const totalRounds = computed(() => previewStructure.value.reduce((s, p) => s + p.rounds.length, 0))

function leagueJornadas(n, legs = 1) {
  return (n % 2 === 0 ? n - 1 : n) * legs
}

// Grid adaptable según número de grupos
function groupsGridClass(n) {
  if (n <= 2) return 'md:grid-cols-2'
  if (n <= 3) return 'md:grid-cols-3'
  if (n <= 4) return 'md:grid-cols-2 lg:grid-cols-4'
  if (n <= 6) return 'md:grid-cols-2 lg:grid-cols-3'
  return 'md:grid-cols-2 lg:grid-cols-4'
}

// Detecta si hay una fase de grupos en la misma lista (para ocultar botón de generar en knockout)
function isKnockoutAfterGroups(phase) {
  if (phase.type !== 'knockout') return false
  return phases.value.some(p => p.type === 'groups' && p.category_id === phase.category_id)
}

// Busca la fase knockout asociada a una fase de grupos
function linkedKnockoutPhase(groupsPhase) {
  return phases.value.find(p =>
    p.type === 'knockout' &&
    p.category_id === groupsPhase.category_id &&
    p.order_index > groupsPhase.order_index
  )
}

// True si el knockout ya tiene partidos iniciados o finalizados (no se puede regenerar)
function knockoutAlreadyStarted(groupsPhase) {
  const kp = linkedKnockoutPhase(groupsPhase)
  if (!kp) return false
  return (kp.matchStats?.finished > 0 || kp.matchStats?.live > 0)
}

// True si el botón "Generar Eliminatoria" debe estar bloqueado
function knockoutGenerationBlocked(groupsPhase) {
  if (knockoutAlreadyStarted(groupsPhase)) return true
  return groupsPhase.matchStats?.finished < groupsPhase.matchStats?.total
}

function knockoutGenerationTitle(groupsPhase) {
  if (knockoutAlreadyStarted(groupsPhase))
    return 'Ya hay partidos de eliminatoria iniciados o finalizados — no se puede regenerar'
  if (groupsPhase.matchStats?.finished < groupsPhase.matchStats?.total)
    return `Faltan ${groupsPhase.matchStats.total - groupsPhase.matchStats.finished} partido(s) de grupos por finalizar`
  return 'Generar bracket eliminatorio con los clasificados'
}

// Solo se puede regenerar si no hay partidos iniciados o finalizados
function canRegenerate(phase) {
  if (!phase.matchStats) return true
  return (phase.matchStats.finished || 0) === 0 && (phase.matchStats.live || 0) === 0
}

// Filtra las rondas que pertenecen a un grupo específico
function groupRounds(rounds, groupName) {
  return (rounds || []).filter(r => r.name.startsWith(groupName + ' —') || r.name.startsWith(groupName + ' -'))
}

// Modalidad helpers
function modalityLabel(m) {
  return { copa: 'Copa', liga: 'Liga', mixto: 'Liga + Liguilla', grupos_eliminacion: 'Grupos + Eliminación' }[m] || 'Sin modalidad'
}
function modalityDesc(m) {
  return {
    copa:               'Eliminación directa. Pierdes, quedas fuera.',
    liga:               'Todos contra todos. Gana quien sume más puntos.',
    mixto:              'Fase regular seguida de liguilla eliminatoria.',
    grupos_eliminacion: 'Fase de grupos con clasificación a bracket.'
  }[m] || ''
}
function modalityStyle(m) {
  return {
    copa:               { bg: 'bg-amber-50 border border-amber-100',   icon: 'bg-amber-500' },
    liga:               { bg: 'bg-emerald-50 border border-emerald-100', icon: 'bg-emerald-500' },
    mixto:              { bg: 'bg-blue-50 border border-blue-100',     icon: 'bg-blue-500' },
    grupos_eliminacion: { bg: 'bg-purple-50 border border-purple-100', icon: 'bg-purple-500' },
  }[m] || { bg: 'bg-slate-50 border border-muted', icon: 'bg-slate-500' }
}

// ── Carga ─────────────────────────────────────────────────
async function onTournamentChange() {
  selCategory.value = null
  phases.value = []
  groupStandingsMap.value = {}
  knockoutMatchesMap.value = {}
  if (!selTournament.value) return
  const { data } = await api.get(`/tournaments/${selTournament.value.slug}/categories`)
  categories.value = data
  // Siempre seleccionar la primera categoría automáticamente
  if (data.length) {
    selCategory.value = data[0]
    await load()
  }
}

async function load() {
  if (!selTournament.value || !selCategory.value) return
  loading.value = true
  const params = `?cat=${selCategory.value.id}`
  try {
    const { data } = await api.get(`/tournaments/${selTournament.value.slug}/phases${params}`)
    phases.value = data

    const groupMap = {}
    const knockoutMap = {}

    await Promise.all(data.map(async phase => {
      // Standings en vivo para grupos
      if (phase.type === 'groups' && phase.groups?.length) {
        await Promise.all(phase.groups.map(async group => {
          try {
            const { data: s } = await api.get(`/phase-groups/${group.id}/standings`)
            groupMap[group.id] = s
          } catch {}
        }))
      }

      // Partidos del bracket para knockout
      if (phase.type === 'knockout' && phase.rounds?.length) {
        try {
          const { data: matches } = await api.get(
            `/tournaments/${selTournament.value.slug}/matches?phase=${phase.id}`
          )
          for (const round of phase.rounds) {
            knockoutMap[round.id] = matches.filter(m => m.round_id === round.id)
          }
        } catch {}
      }
    }))

    groupStandingsMap.value  = groupMap
    knockoutMatchesMap.value = knockoutMap
  } catch {} finally { loading.value = false }
  checkScheduleReadiness()
}

// ── Compartir rol de juegos ────────────────────────────────────────────
const scheduleReady  = ref(false)
const showShareModal = ref(false)
const shareUrl       = ref('')
const shareLoading   = ref(false)
const shareCopied    = ref(false)

async function checkScheduleReadiness() {
  if (!selTournament.value) { scheduleReady.value = false; return }
  try {
    const { data } = await api.get(`/tournaments/${selTournament.value.slug}/schedule-readiness`)
    scheduleReady.value = !!data.ready
  } catch { scheduleReady.value = false }
}

async function openShareModal() {
  showShareModal.value = true
  shareUrl.value = ''
  shareLoading.value = true
  try {
    const { data } = await api.post(`/tournaments/${selTournament.value.slug}/schedule-share`)
    shareUrl.value = `${window.location.origin}/rol/${data.token}`
  } catch { alert('No se pudo generar el enlace') }
  finally { shareLoading.value = false }
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
  } catch {
    const el = document.createElement('input')
    el.value = shareUrl.value
    document.body.appendChild(el); el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
  shareCopied.value = true
  setTimeout(() => { shareCopied.value = false }, 2500)
}

// ── Wizard ────────────────────────────────────────────────
async function loadRecommendations() {
  if (!selTournament.value) return
  wizLoadingRec.value = true
  try {
    const cat = wiz.categoryId ? `&cat=${wiz.categoryId}` : ''
    const { data } = await api.get(`/tournaments/${selTournament.value.slug}/wizard-recommend?teamCount=${wiz.teamCount}${cat}`)
    rec.value = data
    // Aplicar recomendaciones automáticamente si tiene sugerencias
    if (data.options?.recommendedGroups && !wiz._manualGroups)  wiz.groupCount   = data.options.recommendedGroups
    if (data.options?.recommendedAdvance && !wiz._manualAdv)    wiz.advanceCount = data.options.recommendedAdvance
    if (data.options?.recommendedAdvancing && !wiz._manualAdv2) wiz.advancing    = data.options.recommendedAdvancing
  } catch {
    rec.value = { errors: [], notes: [], options: {} }
  } finally { wizLoadingRec.value = false }
}

async function applyRecommendations() { await loadRecommendations() }

async function openWizard() {
  Object.assign(wiz, {
    categoryId: selCategory.value?.id || null,
    teamCount: 8, legs: 1, thirdPlace: false, advancing: 4, groupCount: 2, advanceCount: 2,
    _manualGroups: false, _manualAdv: false, _manualAdv2: false
  })
  rec.value = { errors: [], notes: [], options: {} }
  showWizard.value = true
  await loadRecommendations()
}

async function onWizCategoryChange() {
  if (!selTournament.value) return
  if (wiz.categoryId) {
    const { data } = await api.get(`/tournaments/${selTournament.value.slug}/teams?cat=${wiz.categoryId}`)
    wiz.teamCount = data.length || wiz.teamCount
  }
  wiz._manualGroups = false
  wiz._manualAdv    = false
  wiz._manualAdv2   = false
  await loadRecommendations()
}

async function runAutoSetup() {
  wizSaving.value = true
  try {
    await api.post(`/tournaments/${selTournament.value.slug}/auto-setup`, {
      categoryId: wiz.categoryId,
      teamCount:  wiz.teamCount,
      options: {
        legs:         wiz.legs,
        thirdPlace:   wiz.thirdPlace,
        advancing:    wiz.advancing,
        groupCount:   wiz.groupCount,
        advanceCount: wiz.advanceCount
      }
    })
    await load()
    showWizard.value = false
  } catch (e) {
    alert(e.response?.data?.error || 'Error al generar estructura')
  } finally { wizSaving.value = false }
}

// ── Knockout preview ─────────────────────────────────────
async function openKnockoutPreview(phase) {
  kpPhase.value = phase
  kpData.value  = null
  kpLoading.value = true
  showKnockoutPreview.value = true
  try {
    const { data } = await api.get(`/phases/${phase.id}/knockout-preview`)
    kpData.value = data
  } catch (e) {
    alert(e.response?.data?.error || 'Error al obtener preview')
    showKnockoutPreview.value = false
  } finally { kpLoading.value = false }
}

async function runAdvanceToKnockout() {
  if (!kpData.value?.matchups?.length) return
  kpSaving.value = true
  try {
    const { data } = await api.post(`/phases/${kpPhase.value.id}/advance-to-knockout`, {
      nextPhaseId: kpData.value.nextPhase?.id || null
    })
    await load()
    showKnockoutPreview.value = false
    alert(data.message)
  } catch (e) {
    alert(e.response?.data?.error || 'Error al generar eliminatoria')
  } finally { kpSaving.value = false }
}

// ── Phase CRUD ────────────────────────────────────────────
function openPhaseForm(phase = null) {
  editingPhase.value = phase
  if (phase) Object.assign(phaseForm, { tournamentId: phase.tournament_id, categoryId: phase.category_id, name: phase.name, type: phase.type, order_index: phase.order_index })
  else Object.assign(phaseForm, { tournamentId: selTournament.value?.id, categoryId: selCategory.value?.id || null, name: '', type: 'league', order_index: phases.value.length })
  showPhaseForm.value = true
}
function editPhase(p) { openPhaseForm(p) }

async function savePhase() {
  saving.value = true
  try {
    if (editingPhase.value) await api.put(`/phases/${editingPhase.value.id}`, { ...phaseForm, is_active: editingPhase.value.is_active })
    else await api.post('/phases', phaseForm)
    await load(); showPhaseForm.value = false
  } catch { alert('Error') } finally { saving.value = false }
}

async function toggleActive(phase) {
  try {
    await api.put(`/phases/${phase.id}`, { ...phase, is_active: phase.is_active ? 0 : 1 })
    await load()
  } catch (e) { alert(e.response?.data?.error || 'Error al cambiar estado') }
}

async function deletePhase(id) {
  if (!confirm('¿Eliminar esta fase? Se eliminarán sus rondas y partidos.')) return
  try {
    await api.delete(`/phases/${id}`)
    await load()
  } catch (e) { alert(e.response?.data?.error || 'Error al eliminar fase') }
}

// ── Round CRUD ────────────────────────────────────────────
function openRoundForm(phase) {
  activePhase.value = phase; editingRound.value = null
  roundForm.name = ''; roundForm.order_index = phase.rounds?.length || 0
  showRoundForm.value = true
}
function editRound(r) { editingRound.value = r; roundForm.name = r.name; roundForm.order_index = r.order_index; showRoundForm.value = true }

async function saveRound() {
  saving.value = true
  try {
    if (editingRound.value) await api.put(`/rounds/${editingRound.value.id}`, roundForm)
    else await api.post('/rounds', { ...roundForm, phaseId: activePhase.value.id })
    await load(); showRoundForm.value = false
  } catch { alert('Error') } finally { saving.value = false }
}

async function deleteRound(id) {
  if (!confirm('¿Eliminar esta ronda?')) return
  try {
    await api.delete(`/rounds/${id}`)
    await load()
  } catch (e) { alert(e.response?.data?.error || 'Error al eliminar ronda') }
}

// ── Generate matches ──────────────────────────────────────
async function openGenerateForm(phase) {
  activePhase.value  = phase
  genForm.type       = phase.type === 'knockout' ? 'knockout' : phase.type === 'groups' ? 'groups' : 'round_robin'
  genForm.teamIds    = []
  genForm.matchesPerTeam = null
  genResult.value    = ''
  categoryTeams.value = []

  const t = selTournament.value
  if (t) {
    // Cargar equipos de la categoría (o todos si no hay categoría)
    const params = phase.category_id ? `?cat=${phase.category_id}` : ''
    const { data } = await api.get(`/tournaments/${t.slug}/teams${params}`)
    categoryTeams.value = data
    // Pre-seleccionar TODOS automáticamente
    genForm.teamIds = data.map(team => team.id)
  }
  buildGroupPreview()
  showGenerateForm.value = true
}

function toggleTeam(id) {
  const idx = genForm.teamIds.indexOf(id)
  idx >= 0 ? genForm.teamIds.splice(idx, 1) : genForm.teamIds.push(id)
  buildGroupPreview()
}

// Opciones válidas de grupos según equipos seleccionados (1 = fase de grupos
// única, todos los equipos en un solo grupo, seguida del bracket)
const validGroupCounts = computed(() => {
  const n = genForm.teamIds.length
  return [1,2,3,4,5,6,8].filter(g => Math.ceil(n/g) >= 2)
})

const validAdvanceCounts = computed(() => {
  const tpg = Math.ceil(genForm.teamIds.length / genForm.groupCount)
  return [1,2,3].filter(a => a < tpg)
})

// Partidos de un round-robin completo (todos contra todos dentro del grupo
// más grande) — tope superior de "partidos por equipo". Si el admin pide un
// número menor, se juega un round-robin parcial (ver backend) y quedan
// equipos del mismo grupo que nunca se enfrentan entre sí — aceptado a
// propósito para no forzar demasiados partidos en grupos grandes.
const fullRoundRobinMatches = computed(() => Math.ceil(genForm.teamIds.length / genForm.groupCount) - 1)
const guaranteedMatches = computed(() => {
  const m = genForm.matchesPerTeam
  return m && m > 0 ? Math.min(m, fullRoundRobinMatches.value) : fullRoundRobinMatches.value
})

// Preview de cómo quedan los grupos (snake-draft igual que el backend)
const groupPreview = ref([])

function buildGroupPreview() {
  if (genForm.type !== 'groups' || !genForm.teamIds.length || !genForm.groupCount) {
    groupPreview.value = []; return
  }
  const gc = genForm.groupCount
  const groups = Array.from({ length: gc }, () => [])
  let dir = 1, gi = 0
  for (const id of genForm.teamIds) {
    groups[gi].push(id)
    if (dir === 1) { if (gi === gc - 1) dir = -1; else gi++ }
    else           { if (gi === 0)      dir =  1; else gi-- }
  }
  groupPreview.value = groups
}

function teamById(id) {
  return categoryTeams.value.find(t => t.id === id)
}

async function generate() {
  saving.value = true; genResult.value = ''
  try {
    if (genForm.type === 'groups') {
      const { data } = await api.post(`/phases/${activePhase.value.id}/groups/generate`, {
        teamIds: genForm.teamIds, groupCount: genForm.groupCount,
        advanceCount: genForm.advanceCount, startDate: genForm.startDate, location: genForm.location,
        matchesPerTeam: genForm.matchesPerTeam || undefined
      })
      genResultText.value = `${data.groups?.length} grupos generados, ${data.totalMatches} partidos`
    } else {
      const { data } = await api.post('/matches/generate', {
        tournamentId: selTournament.value.id, categoryId: activePhase.value.category_id,
        phaseId: activePhase.value.id, teamIds: genForm.teamIds,
        type: genForm.type
      })
      genResultText.value = `${data.generated} partidos generados`
    }
    await load()
    showGenerateForm.value = false
  } catch (e) { alert(e.response?.data?.error || 'Error') }
  finally { saving.value = false }
}

onMounted(async () => {
  const { data } = await api.get('/tournaments')
  tournaments.value = data
  if (data.length) { selTournament.value = data[0]; await onTournamentChange() }
})
</script>

<style scoped>
.link-card {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 14px;
  padding: 12px;
  display: block;
  box-sizing: border-box;
}
.link-url {
  font-size: 11px;
  font-family: monospace;
  color: #475569;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  box-sizing: border-box;
}
.link-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 9px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  background: #0ea5e9;
  color: white;
  transition: background 0.15s;
  box-sizing: border-box;
}
.link-copy.copied { background: #10b981; }
</style>
