<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-br from-slate-50 to-sky-50 py-12 md:py-16">
      <div class="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="relative max-w-7xl mx-auto px-4 text-center">
        <p class="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-2">{{ inscription?.tournamentName }}</p>
        <h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-3">
          Registro de <span class="gradient-text">Participantes</span>
        </h1>
        <p class="text-slate-500 text-sm mb-4">
          Equipo: <strong class="text-slate-900">{{ inscription?.team_name }}</strong>
        </p>
        <div class="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-2 rounded-full">
          <IconCheckCircle class="w-3.5 h-3.5" />
          Inscripción aprobada — registra responsables y jugadores por categoría
        </div>
      </div>
    </section>

    <div class="max-w-3xl mx-auto px-4 py-10 space-y-8">

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Done state -->
      <div v-else-if="done" class="text-center py-16">
        <div class="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconCheckCircle class="w-10 h-10 text-accent" />
        </div>
        <h2 class="text-2xl font-black text-slate-900 mb-3">¡Registro completado!</h2>
        <p class="text-slate-500 mb-6">El organizador revisará la información. ¡Mucho éxito!</p>
        <router-link :to="`/${inscription?.tournamentSlug}`" class="btn-primary">Ver el torneo</router-link>
      </div>

      <template v-else-if="inscription">
        <!-- Category tabs -->
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="cat in inscription.categories" :key="cat.id"
            @click="activeCategory = cat.id"
            class="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            :class="activeCategory === cat.id
              ? 'bg-primary text-white shadow'
              : 'bg-white border border-muted text-slate-600 hover:border-primary/40'">
            {{ cat.name }}
            <span class="ml-1 text-xs opacity-70">({{ playersForCat(cat).length }}j)</span>
          </button>
        </div>

        <!-- Active category panel -->
        <div v-for="cat in inscription.categories" :key="cat.id" v-show="activeCategory === cat.id" class="space-y-5">

          <!-- Sub-tabs de equipo — solo si este club inscribió 2+ equipos en esta
               misma categoría (ej. "Club X A" / "Club X B") -->
          <div v-if="cat.teams?.length > 1" class="flex gap-2 flex-wrap">
            <button
              v-for="team in cat.teams" :key="team"
              type="button"
              @click="activeTeamByCategory[cat.id] = team"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
              :class="currentTeamName(cat) === team
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-white border-muted text-slate-500 hover:border-accent/40'">
              {{ team }}
            </button>
          </div>

          <!-- ══ RESPONSABLES ══ -->
          <div class="card space-y-5">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconUsers class="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 class="font-bold text-slate-900">Responsables / Cuerpo Técnico</h3>
                <p class="text-xs text-slate-500">Mínimo 2 obligatorios · 3ro opcional · Cada uno con foto de hombros hacia arriba</p>
                <p v-if="cat.teams?.length > 1" class="text-[11px] text-slate-400 mt-0.5">
                  Los responsables se comparten entre los {{ cat.teams.length }} equipos de esta categoría.
                </p>
              </div>
            </div>

            <!-- Responsables ya guardados -->
            <div v-if="responsablesForCat(cat).length" class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <IconCheckCircle class="w-3.5 h-3.5"/> Responsables registrados
                </p>
                <button type="button" @click="editingResp[respKey(cat)] = !editingResp[respKey(cat)]"
                  class="text-[10px] text-primary font-semibold border border-primary/30 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors">
                  {{ editingResp[respKey(cat)] ? 'Cancelar edición' : 'Editar' }}
                </button>
              </div>
              <div v-for="r in responsablesForCat(cat)" :key="r.id"
                class="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm">
                <img v-if="r.foto" :src="r.foto" class="w-10 h-10 rounded-lg object-cover shrink-0 border border-emerald-200"/>
                <div v-else class="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-200 shrink-0 flex items-center justify-center">
                  <IconUser class="w-5 h-5 text-emerald-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-slate-900 truncate">{{ r.nombre }} {{ r.apellidos }}</p>
                  <p class="text-[10px] text-slate-400 font-mono">{{ r.curp }}</p>
                </div>
                <span class="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">R{{ r.orden }}</span>
              </div>
            </div>

            <!-- Formulario de responsables (siempre visible si no hay guardados, o si está en modo edición) -->
            <div v-if="!responsablesForCat(cat).length || editingResp[respKey(cat)]" class="space-y-4">
              <div v-for="(r, idx) in newResponsables[respKey(cat)]" :key="idx"
                class="border border-muted rounded-2xl p-4 space-y-3 bg-slate-50/50">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-black uppercase tracking-widest text-slate-500">
                    Responsable {{ idx + 1 }}{{ idx >= 2 ? ' (opcional)' : ' *' }}
                  </span>
                  <button v-if="idx === 2" type="button" @click="removeResponsable(respKey(cat), idx)"
                    class="text-red-400 hover:text-red-600 text-xs font-semibold">Quitar</button>
                </div>

                <!-- Foto + datos -->
                <div class="flex gap-3 items-start">
                  <!-- Foto -->
                  <div class="flex flex-col items-center gap-1.5 shrink-0">
                    <div class="relative w-16 h-16 rounded-xl border-2 border-dashed border-muted bg-white overflow-hidden flex items-center justify-center cursor-pointer group"
                      @click="triggerRespPhoto(respKey(cat), idx)">
                      <img v-if="r.foto" :src="r.foto" class="w-full h-full object-cover"/>
                      <IconUser v-else class="w-7 h-7 text-slate-300 group-hover:text-primary transition-colors"/>
                      <div v-if="r.photoLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <input :ref="el => setRespPhotoRef(el, respKey(cat), idx)" type="file" accept="image/*,.heic,.heif" class="hidden"
                      @change="e => onRespPhotoChange(e, respKey(cat), idx)"/>
                    <button type="button" @click="triggerRespPhoto(respKey(cat), idx)"
                      class="text-[10px] text-primary hover:underline font-semibold">
                      {{ r.foto ? 'Cambiar' : 'Foto *' }}
                    </button>
                    <button v-if="r.foto" type="button" @click="r.foto = ''"
                      class="text-[10px] text-red-400 hover:text-red-600">Quitar</button>
                  </div>

                  <!-- Nombre, apellidos, CURP -->
                  <div class="flex-1 grid gap-2">
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-slate-400 mb-0.5 block">Nombre(s) *</label>
                        <input v-model="r.nombre" type="text" placeholder="Juan"
                          class="w-full bg-white border border-muted rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-all"/>
                      </div>
                      <div>
                        <label class="text-[10px] text-slate-400 mb-0.5 block">Apellidos *</label>
                        <input v-model="r.apellidos" type="text" placeholder="Pérez García"
                          class="w-full bg-white border border-muted rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-all"/>
                      </div>
                    </div>
                    <div>
                      <label class="text-[10px] text-slate-400 mb-0.5 block">CURP * <span class="text-slate-300">(18 caracteres)</span></label>
                      <div class="relative">
                        <input v-model="r.curp" type="text" maxlength="18" placeholder="XXXX000000HXXXXX00"
                          :class="['w-full bg-white border rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-primary transition-all uppercase',
                            respCurpStatus(r) === 'valid' ? 'border-emerald-400' : respCurpStatus(r) === 'invalid' ? 'border-red-400' : 'border-muted']"
                          @input="r.curp = r.curp.toUpperCase()"/>
                        <span v-if="r.curp?.length === 18" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                          :class="respCurpStatus(r) === 'valid' ? 'text-emerald-500' : 'text-red-500'">
                          {{ respCurpStatus(r) === 'valid' ? '✓' : '✗' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Botón añadir 3ro -->
              <button v-if="newResponsables[respKey(cat)]?.length === 2" type="button"
                @click="addResponsable(respKey(cat))"
                class="w-full py-3 border-2 border-dashed border-muted rounded-xl text-slate-400 hover:border-primary/40 hover:text-primary transition-all text-xs font-semibold">
                + Agregar 3er responsable (opcional)
              </button>
            </div>

            <!-- Errores de responsables -->
            <div v-if="responsableErrors[respKey(cat)]?.length" class="space-y-1">
              <p v-for="err in responsableErrors[respKey(cat)]" :key="err"
                class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                {{ err }}
              </p>
            </div>

            <!-- Guardar responsables — solo cuando el formulario está activo -->
            <button v-if="!responsablesForCat(cat).length || editingResp[respKey(cat)]"
              @click="saveResponsables(cat)"
              :disabled="savingResp[respKey(cat)] || !canSaveResponsables(respKey(cat))"
              class="btn-primary w-full disabled:opacity-50">
              <span class="flex items-center justify-center gap-2">
                <IconLoader2 v-if="savingResp[respKey(cat)]" class="w-4 h-4 animate-spin"/>
                <IconUsers v-else class="w-4 h-4" />
                {{ savingResp[respKey(cat)] ? 'Guardando...' : `Guardar responsables de ${cat.name}` }}
              </span>
            </button>
          </div>

          <!-- ══ JUGADORES ══ -->
          <div class="card space-y-5">
            <div class="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <IconShirt class="w-5 h-5 text-accent" />
                  </div>
                  <h3 class="font-bold text-slate-900 text-lg">
                    Jugadores — {{ cat.name }}<span v-if="cat.teams?.length > 1"> · {{ currentTeamName(cat) }}</span>
                  </h3>
                </div>
                <p v-if="cat.min_birth_year" class="text-xs text-slate-500 mt-1.5 ml-12">
                  Nacidos en
                  <span class="font-semibold text-slate-700">{{ cat.min_birth_year }}{{ cat.max_birth_year ? ` – ${cat.max_birth_year}` : ' o después' }}</span>
                  <span v-if="cat.min_birth_year_girls" class="text-pink-600 ml-2">· Niñas desde {{ cat.min_birth_year_girls }}</span>
                </p>
                <p v-if="cat.max_players_per_team" class="text-xs mt-0.5 ml-12">
                  <span class="font-semibold text-slate-700">{{ playersForCat(cat).length }} / {{ cat.max_players_per_team }}</span>
                  <span class="text-slate-400"> jugadores</span>
                  <span v-if="playersForCat(cat).length >= cat.max_players_per_team" class="ml-2 text-red-500 font-semibold">— Cupo lleno</span>
                </p>
              </div>
              <button @click="addPlayerRow(playerKey(cat))"
                class="text-xs text-accent border border-accent/30 px-3 py-1.5 rounded-lg hover:bg-accent/10 transition-colors font-semibold shrink-0">
                + Agregar jugador
              </button>
            </div>

            <!-- Players already registered -->
            <div v-if="playersForCat(cat).length" class="space-y-2">
              <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Registrados</p>
              <div v-for="p in playersForCat(cat)" :key="p.id">
                <!-- Vista normal -->
                <div v-if="editingPlayerId !== p.id"
                  class="flex items-center gap-3 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-sm">
                  <img v-if="p.photo" :src="p.photo" class="w-9 h-9 rounded-lg object-cover shrink-0 border border-emerald-200"/>
                  <div v-else class="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-200 shrink-0 flex items-center justify-center text-emerald-400 text-xs">✓</div>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-slate-900 truncate">{{ p.name }}</p>
                    <p class="text-[10px] text-slate-400">
                      <span v-if="p.number">#{{ p.number }}</span>
                      <span v-if="p.position"> · {{ p.position }}</span>
                      <span v-if="p.curp" class="font-mono ml-1">{{ p.curp }}</span>
                    </p>
                  </div>
                  <a v-if="p.documento_oficial" :href="p.documento_oficial" target="_blank"
                    class="shrink-0 flex items-center gap-1 text-[10px] text-primary font-semibold border border-primary/30 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors">
                    <IconIdCard class="w-3 h-3" /> Doc
                  </a>
                  <div v-else class="shrink-0 text-[10px] text-red-400 font-semibold flex items-center gap-1">
                    <IconAlertCircle class="w-3 h-3" /> Sin doc
                  </div>
                  <button type="button" @click="startEditPlayer(p)"
                    class="shrink-0 text-[10px] text-slate-500 font-semibold border border-slate-200 px-2 py-1 rounded-lg hover:bg-white transition-colors">
                    Editar
                  </button>
                </div>

                <!-- Formulario de edición -->
                <div v-else class="border border-primary/30 rounded-xl p-3 space-y-2 bg-primary/5">
                  <div class="grid grid-cols-12 gap-2 items-start">
                    <div class="col-span-2 flex flex-col items-center gap-1">
                      <div class="relative w-14 h-14 rounded-xl border-2 border-dashed border-muted bg-white overflow-hidden flex items-center justify-center cursor-pointer group"
                        @click="editPhotoInputEl?.click()">
                        <img v-if="editForm.photo" :src="editForm.photo" class="w-full h-full object-cover"/>
                        <IconUser v-else class="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors"/>
                        <div v-if="editForm.photoLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </div>
                      <input :ref="setEditPhotoInput" type="file" accept="image/*,.heic,.heif" class="hidden" @change="onEditPhotoChange"/>
                    </div>
                    <div class="col-span-4">
                      <label class="text-[10px] text-slate-400 mb-0.5 block">Nombre *</label>
                      <input v-model="editForm.name" type="text"
                        class="w-full bg-white border border-muted rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-all"/>
                    </div>
                    <div class="col-span-2">
                      <label class="text-[10px] text-slate-400 mb-0.5 block">#</label>
                      <input v-model.number="editForm.number" type="number" min="1" max="99"
                        class="w-full bg-white border border-muted rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-all"/>
                    </div>
                    <div class="col-span-4">
                      <label class="text-[10px] text-slate-400 mb-0.5 block">Posición</label>
                      <select v-model="editForm.position"
                        class="w-full bg-white border border-muted rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-all">
                        <option value="">—</option>
                        <option>Portero</option>
                        <option>Defensa</option>
                        <option>Mediocampista</option>
                        <option>Delantero</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 mb-0.5 block">CURP <span class="text-red-400 font-semibold">*</span></label>
                    <div class="relative">
                      <input v-model="editForm.curp" type="text" maxlength="18" placeholder="XXXX000000HXXXXX00"
                        :class="['w-full bg-white border rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-primary transition-all uppercase',
                          curpStatus(editForm) === 'valid' ? 'border-emerald-400' : curpStatus(editForm) === 'invalid' ? 'border-red-400' : 'border-muted']"
                        @input="editForm.curp = editForm.curp.toUpperCase()"/>
                      <span v-if="editForm.curp?.length === 18" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                        :class="curpStatus(editForm) === 'valid' ? 'text-emerald-500' : 'text-red-500'">
                        {{ curpStatus(editForm) === 'valid' ? '✓' : '✗' }}
                      </span>
                    </div>
                    <p v-if="curpAgeWarning(editForm, cat)" class="text-[10px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                      <IconAlertCircle class="w-3 h-3"/> {{ curpAgeWarning(editForm, cat) }}
                    </p>
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 mb-0.5 block">Documento oficial</label>
                    <div class="flex items-center gap-3">
                      <div class="relative w-16 h-12 rounded-lg border-2 border-dashed border-muted bg-white overflow-hidden flex items-center justify-center shrink-0 cursor-pointer group"
                        @click="editDocInputEl?.click()">
                        <img v-if="editForm.documento_oficial" :src="editForm.documento_oficial" class="w-full h-full object-cover"/>
                        <IconIdCard v-else class="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors"/>
                        <div v-if="editForm.docLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <div class="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </div>
                      <input :ref="setEditDocInput" type="file" accept="image/*,.heic,.heif,application/pdf" class="hidden" @change="onEditDocChange"/>
                      <button type="button" @click="editDocInputEl?.click()"
                        class="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-white transition-colors">
                        {{ editForm.documento_oficial ? 'Cambiar documento' : 'Subir documento' }}
                      </button>
                    </div>
                  </div>
                  <p v-if="editError" class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">{{ editError }}</p>
                  <div class="flex gap-2 pt-1">
                    <button type="button" @click="saveEditPlayer(cat.id)" :disabled="savingEdit || curpStatus(editForm) !== 'valid'"
                      class="btn-primary text-xs flex-1 disabled:opacity-50">
                      {{ savingEdit ? 'Guardando...' : 'Guardar cambios' }}
                    </button>
                    <button type="button" @click="cancelEditPlayer" class="btn-ghost text-xs px-3">Cancelar</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Input rows for new players -->
            <div class="space-y-3">
              <p v-if="newPlayers[playerKey(cat)]?.length" class="text-xs font-bold text-slate-500 uppercase tracking-wider">Agregar</p>
              <div v-for="(p, idx) in newPlayers[playerKey(cat)]" :key="idx" class="grid gap-2">
                <!-- Row 1: photo + name + # + position -->
                <div class="grid grid-cols-12 gap-2 items-start">
                  <!-- Photo -->
                  <div class="col-span-2 flex flex-col items-center gap-1">
                    <label class="text-[10px] text-slate-400 mb-0.5 block w-full">Foto</label>
                    <div class="relative w-14 h-14 rounded-xl border-2 border-dashed border-muted bg-slate-50 overflow-hidden flex items-center justify-center cursor-pointer group"
                      @click="triggerPhoto(playerKey(cat), idx)">
                      <img v-if="p.photo" :src="p.photo" class="w-full h-full object-cover"/>
                      <IconUser v-else class="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors"/>
                      <div v-if="p.photoLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <input :ref="el => setPhotoRef(el, playerKey(cat), idx, 'file')" type="file" accept="image/*,.heic,.heif" class="hidden"
                      @change="e => onPhotoChange(e, playerKey(cat), idx)"/>
                    <input :ref="el => setPhotoRef(el, playerKey(cat), idx, 'cam')" type="file" accept="image/*,.heic,.heif" capture="user" class="hidden"
                      @change="e => onPhotoChange(e, playerKey(cat), idx)"/>
                    <div class="flex gap-1">
                      <button type="button" @click.stop="triggerFileInput(playerKey(cat), idx)"
                        class="text-slate-400 hover:text-primary transition-colors" title="Subir foto">
                        <IconUpload class="w-3.5 h-3.5"/>
                      </button>
                      <button type="button" @click.stop="triggerCameraInput(playerKey(cat), idx)"
                        class="text-slate-400 hover:text-primary transition-colors" title="Tomar foto">
                        <IconCamera class="w-3.5 h-3.5"/>
                      </button>
                      <button v-if="p.photo" type="button" @click.stop="p.photo = ''"
                        class="text-red-400 hover:text-red-600 transition-colors" title="Quitar">
                        <IconX class="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>
                  <div class="col-span-4">
                    <label class="text-[10px] text-slate-400 mb-0.5 block">Nombre *</label>
                    <input v-model="p.name" type="text" placeholder="Juan Pérez"
                      class="w-full bg-white border border-muted rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-all"/>
                  </div>
                  <div class="col-span-2">
                    <label class="text-[10px] text-slate-400 mb-0.5 block">#</label>
                    <input v-model.number="p.number" type="number" min="1" max="99"
                      class="w-full bg-white border border-muted rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-all"/>
                  </div>
                  <div class="col-span-3">
                    <label class="text-[10px] text-slate-400 mb-0.5 block">Posición</label>
                    <select v-model="p.position"
                      class="w-full bg-white border border-muted rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-all">
                      <option value="">—</option>
                      <option>Portero</option>
                      <option>Defensa</option>
                      <option>Mediocampista</option>
                      <option>Delantero</option>
                    </select>
                  </div>
                  <div class="col-span-1 flex items-end pb-0.5">
                    <button @click="removePlayerRow(playerKey(cat), idx)" class="text-red-400 hover:text-red-600 transition-colors text-lg leading-none">×</button>
                  </div>
                </div>
                <!-- Row 2: CURP -->
                <div>
                  <label class="text-[10px] text-slate-400 mb-0.5 block">CURP <span class="text-red-400 font-semibold">*</span> <span class="text-slate-300">(18 caracteres — obligatoria)</span></label>
                  <div class="relative">
                    <input v-model="p.curp" type="text" maxlength="18" placeholder="XXXX000000HXXXXX00"
                      :class="['w-full bg-white border rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-primary transition-all uppercase',
                        curpStatus(p) === 'valid' ? 'border-emerald-400' : curpStatus(p) === 'invalid' ? 'border-red-400' : 'border-muted']"
                      @input="p.curp = p.curp.toUpperCase()"/>
                    <span v-if="p.curp?.length === 18" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                      :class="curpStatus(p) === 'valid' ? 'text-emerald-500' : 'text-red-500'">
                      {{ curpStatus(p) === 'valid' ? '✓' : '✗' }}
                    </span>
                  </div>
                  <div v-if="decodedCURP(p.curp)" class="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-500">
                    <span>Nacimiento: <strong>{{ decodedCURP(p.curp).birthYear }}</strong></span>
                    <span>Sexo: <strong>{{ decodedCURP(p.curp).sex === 'H' ? 'Hombre' : 'Mujer' }}</strong></span>
                  </div>
                  <p v-if="curpAgeWarning(p, cat)" class="text-[10px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                    <IconAlertCircle class="w-3 h-3"/> {{ curpAgeWarning(p, cat) }}
                  </p>
                </div>
                <!-- Row 3: Documento oficial -->
                <div>
                  <label class="text-[10px] text-slate-400 mb-0.5 block">
                    Documento oficial con fotografía <span class="text-red-400 font-semibold">*</span>
                    <span class="text-slate-300 font-normal"> — credencial escolar, INE u oficial</span>
                  </label>
                  <div class="flex items-center gap-3">
                    <!-- Preview miniatura -->
                    <div class="relative w-16 h-12 rounded-lg border-2 border-dashed border-muted bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer group"
                      @click="triggerDocInput(playerKey(cat), idx)">
                      <img v-if="p.documento_oficial" :src="p.documento_oficial" class="w-full h-full object-cover"/>
                      <IconIdCard v-else class="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors"/>
                      <div v-if="p.docLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div class="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <input :ref="el => setDocRef(el, playerKey(cat), idx)" type="file" accept="image/*,.heic,.heif,application/pdf" class="hidden"
                      @change="e => onDocChange(e, playerKey(cat), idx)"/>
                    <div class="flex-1">
                      <button type="button" @click="triggerDocInput(playerKey(cat), idx)"
                        class="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors">
                        {{ p.documento_oficial ? 'Cambiar documento' : 'Subir documento' }}
                      </button>
                      <p class="text-[10px] text-slate-400 mt-1">JPG, PNG o PDF · máx 25 MB</p>
                      <button v-if="p.documento_oficial" type="button" @click="p.documento_oficial = ''"
                        class="text-[10px] text-red-400 hover:text-red-600 mt-0.5">Quitar</button>
                    </div>
                    <div v-if="p.documento_oficial" class="shrink-0">
                      <a :href="p.documento_oficial" target="_blank"
                        class="text-[10px] text-primary font-semibold underline">Ver</a>
                    </div>
                  </div>
                </div>
                <div v-if="idx < (newPlayers[playerKey(cat)].length - 1)" class="h-px bg-slate-100"></div>
              </div>

              <button v-if="!newPlayers[playerKey(cat)]?.length" @click="addPlayerRow(playerKey(cat))"
                class="w-full py-6 border-2 border-dashed border-muted rounded-xl text-slate-400 hover:border-primary/40 hover:text-primary transition-all text-sm">
                + Agregar jugador en {{ cat.name }}
              </button>
              <!-- Botón para encadenar otro jugador justo debajo del actual, sin
                   tener que subir hasta el botón de la cabecera de la sección -->
              <button v-else @click="addPlayerRow(playerKey(cat))"
                class="w-full py-3 border-2 border-dashed border-primary/30 rounded-xl text-primary hover:bg-primary/5 transition-all text-sm font-semibold">
                + Agregar otro jugador
              </button>
            </div>

            <!-- Errors -->
            <div v-if="categoryErrors[playerKey(cat)]?.length" class="space-y-1">
              <p v-for="err in categoryErrors[playerKey(cat)]" :key="err"
                class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                {{ err }}
              </p>
            </div>

            <!-- Save players -->
            <button v-if="newPlayers[playerKey(cat)]?.some(p => p.name.trim())"
              @click="savePlayers(cat)"
              :disabled="saving[playerKey(cat)] || !newPlayers[playerKey(cat)]?.some(p => p.name.trim() && curpStatus(p) === 'valid')"
              class="btn-primary w-full disabled:opacity-50">
              <span class="flex items-center justify-center gap-2">
                <IconLoader2 v-if="saving[playerKey(cat)]" class="w-4 h-4 animate-spin"/>
                {{ saving[playerKey(cat)] ? 'Guardando...' : `Guardar jugadores en ${cat.name}` }}
              </span>
            </button>
            <p v-if="newPlayers[playerKey(cat)]?.some(p => p.name.trim() && curpStatus(p) !== 'valid')"
              class="text-[11px] text-slate-400 text-center -mt-1">
              Se guardarán solo los jugadores con nombre y CURP válidos — completa el resto para incluirlos.
            </p>
          </div>
        </div>

        <!-- Finish button -->
        <div class="text-center pt-4">
          <button @click="done = true" class="btn-ghost text-sm">
            Terminar registro →
          </button>
          <p class="text-xs text-slate-400 mt-2">Puedes agregar jugadores en cualquier momento antes del torneo</p>
        </div>
      </template>

      <!-- Error state -->
      <div v-else-if="loadError" class="text-center py-20 max-w-md mx-auto">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <IconXCircle class="w-8 h-8 text-red-500" />
        </div>
        <h2 class="text-xl font-black text-slate-900 mb-2">Acceso no disponible</h2>
        <p class="text-slate-500 text-sm mb-6">{{ loadError }}</p>
        <router-link v-if="slug" :to="`/${slug}`" class="btn-ghost text-sm">← Ver el torneo</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'
import { uploadImagePublic } from '@/utils/upload'

const route = useRoute()
const { slug, inscriptionId } = route.params
const regToken = route.query.token || ''

const inscription    = ref(null)
const loading        = ref(true)
const loadError      = ref('')
const saving     = reactive({}) // playerKey(cat) → bool
const savingResp = reactive({}) // respKey(cat) → bool
const done           = ref(false)
const activeCategory = ref(null)
const newPlayers     = reactive({}) // playerKey(cat) → [{name, number, position, curp, photo}]
const categoryErrors = reactive({}) // playerKey(cat) → [string]
const newResponsables   = reactive({}) // respKey(cat) → [{nombre, apellidos, curp, foto}]
const responsableErrors = reactive({}) // respKey(cat) → [string]
const editingResp       = reactive({}) // respKey(cat) → bool (mostrar form de edición)
// Qué equipo está activo dentro de una categoría con 2+ equipos (ej. "Club X
// A"/"Club X B") — { [categoryId]: teamName }. Para categorías de un solo
// equipo no se usa (currentTeamName resuelve directo a cat.teams[0]).
const activeTeamByCategory = reactive({})

const registeredPlayers     = ref([])
const registeredResponsables = ref([])

// ── Claves compuestas (categoría + equipo) ────────────────────────────────────
// Una categoría puede tener más de un equipo en esta inscripción (ej. "Club X
// A"/"Club X B"). Sin esto, el estado de los formularios (jugadores nuevos,
// responsables, errores, etc.) de un equipo pisaría al del otro al compartir
// la misma clave (solo categoryId). playerKey/respKey se usan idénticas hoy,
// pero se mantienen como funciones separadas por si algún día responsables
// dejara de compartirse entre equipos de la misma categoría.
function currentTeamName(cat) {
  if (!cat.teams?.length) return inscription.value?.team_name
  if (cat.teams.length === 1) return cat.teams[0]
  return activeTeamByCategory[cat.id] || cat.teams[0]
}
function playerKey(cat) { return `${cat.id}::${currentTeamName(cat)}` }
function respKey(cat)   { return `${cat.id}::${currentTeamName(cat)}` }

// ── Edición de un jugador ya registrado ────────────────────────────────────────
const editingPlayerId = ref(null)
const editForm    = reactive({ name: '', number: '', position: '', curp: '', photo: '', documento_oficial: '', photoLoading: false, docLoading: false })
const editError   = ref('')
const savingEdit   = ref(false)
// editOriginal guarda una foto de los valores con los que se abrió la edición
// actual — así, si el usuario intenta editar OTRO jugador sin haber guardado,
// se puede detectar que hay cambios sin guardar antes de descartarlos en
// silencio (antes, editingPlayerId era un solo valor global a toda la página:
// abrir la edición de un jugador distinto reasignaba el id sin avisar, y
// cualquier cambio sin guardar en la fila anterior se perdía sin aviso).
const editOriginal = ref(null)
// Refs de input file por función (no por string) porque el elemento vive dentro
// de un v-for — con ref="nombre" ahí adentro Vue lo colecciona como array.
let editPhotoInputEl = null
let editDocInputEl   = null
function setEditPhotoInput(el) { editPhotoInputEl = el }
function setEditDocInput(el)   { editDocInputEl = el }

function hasUnsavedEditChanges() {
  if (!editOriginal.value) return false
  const o = editOriginal.value
  return ['name', 'number', 'position', 'curp', 'photo', 'documento_oficial']
    .some(key => String(editForm[key] ?? '') !== String(o[key] ?? ''))
}

function startEditPlayer(p) {
  if (editingPlayerId.value && editingPlayerId.value !== p.id && hasUnsavedEditChanges()) {
    if (!confirm('Tienes cambios sin guardar en la edición actual. ¿Descartarlos y editar este otro jugador?')) return
  }
  editingPlayerId.value = p.id
  editError.value = ''
  const snapshot = {
    name: p.name || '', number: p.number || '', position: p.position || '',
    curp: p.curp || '', photo: p.photo || '', documento_oficial: p.documento_oficial || ''
  }
  Object.assign(editForm, { ...snapshot, photoLoading: false, docLoading: false })
  editOriginal.value = snapshot
}
function cancelEditPlayer() { editingPlayerId.value = null; editOriginal.value = null }

async function onEditPhotoChange(e) {
  const file = e.target.files?.[0]; if (!file) return
  if (file.size > 5 * 1024 * 1024) { alert('La foto no debe superar 5 MB.'); e.target.value = ''; return }
  editForm.photoLoading = true
  try { editForm.photo = await uploadImagePublic(file) }
  catch { alert('Error al subir la foto') }
  finally { editForm.photoLoading = false; e.target.value = '' }
}

async function onEditDocChange(e) {
  const file = e.target.files?.[0]; if (!file) return
  if (file.size > 25 * 1024 * 1024) { alert('El documento no debe superar 25 MB.'); e.target.value = ''; return }
  editForm.docLoading = true
  try { editForm.documento_oficial = await uploadImagePublic(file) }
  catch (err) { alert(err.message || 'Error al subir el documento') }
  finally { editForm.docLoading = false; e.target.value = '' }
}

async function saveEditPlayer(catId) {
  editError.value = ''
  savingEdit.value = true
  try {
    const { data } = await api.put(`/inscriptions/${inscriptionId}/players/${editingPlayerId.value}`, {
      token: regToken,
      name: editForm.name.trim(), number: editForm.number, position: editForm.position,
      curp: editForm.curp, photo: editForm.photo, documento_oficial: editForm.documento_oficial
    })
    const idx = registeredPlayers.value.findIndex(p => p.id === editingPlayerId.value)
    if (idx !== -1) registeredPlayers.value[idx] = { ...registeredPlayers.value[idx], ...data }
    editingPlayerId.value = null
    editOriginal.value = null
  } catch (e) {
    editError.value = e.response?.data?.error || 'Error al guardar los cambios'
  } finally {
    savingEdit.value = false
  }
}

// playersForCat/responsablesForCat reciben la categoría completa (no solo el
// id) porque necesitan cat.teams para saber si hay que filtrar también por
// el equipo activo (cuando la categoría tiene 2+ equipos).
function playersForCat(cat) {
  const list = registeredPlayers.value.filter(p => String(p.category_id) === String(cat.id))
  if (!cat.teams || cat.teams.length <= 1) return list
  const tn = currentTeamName(cat)
  return list.filter(p => (p.team_name || '') === tn)
}
function responsablesForCat(cat) {
  // Los responsables se comparten entre los equipos de una misma categoría —
  // no se filtran por equipo.
  return registeredResponsables.value.filter(r => String(r.category_id) === String(cat.id))
}

// ── Photo refs for players ────────────────────────────────────────────────────
const photoRefs = {}
function setPhotoRef(el, key, idx, type) {
  if (el) photoRefs[`${key}-${idx}-${type}`] = el
}
function triggerPhoto(key, idx) { photoRefs[`${key}-${idx}-file`]?.click() }
function triggerFileInput(key, idx) { photoRefs[`${key}-${idx}-file`]?.click() }
function triggerCameraInput(key, idx) { photoRefs[`${key}-${idx}-cam`]?.click() }

async function onPhotoChange(e, key, idx) {
  const file = e.target.files?.[0]; if (!file) return
  if (file.size > 5 * 1024 * 1024) { alert('La foto no debe superar 5 MB.'); e.target.value = ''; return }
  const player = newPlayers[key]?.[idx]; if (!player) return
  player.photoLoading = true
  try { player.photo = await uploadImagePublic(file) }
  catch { alert('Error al subir la foto') }
  finally { player.photoLoading = false; e.target.value = '' }
}

// ── Document refs for players ─────────────────────────────────────────────────
const docRefs = {}
function setDocRef(el, key, idx) {
  if (el) docRefs[`${key}-${idx}`] = el
}
function triggerDocInput(key, idx) { docRefs[`${key}-${idx}`]?.click() }

async function onDocChange(e, key, idx) {
  const file = e.target.files?.[0]; if (!file) return
  if (file.size > 25 * 1024 * 1024) { alert('El documento no debe superar 25 MB.'); e.target.value = ''; return }
  const player = newPlayers[key]?.[idx]; if (!player) return
  player.docLoading = true
  try { player.documento_oficial = await uploadImagePublic(file) }
  catch (err) { alert(err.message || 'Error al subir el documento') }
  finally { player.docLoading = false; e.target.value = '' }
}

// ── Photo refs for responsables ───────────────────────────────────────────────
const respPhotoRefs = {}
function setRespPhotoRef(el, key, idx) {
  if (el) respPhotoRefs[`${key}-${idx}`] = el
}
function triggerRespPhoto(key, idx) { respPhotoRefs[`${key}-${idx}`]?.click() }

async function onRespPhotoChange(e, key, idx) {
  const file = e.target.files?.[0]; if (!file) return
  if (file.size > 5 * 1024 * 1024) { alert('La foto no debe superar 5 MB.'); e.target.value = ''; return }
  const resp = newResponsables[key]?.[idx]; if (!resp) return
  resp.photoLoading = true
  try { resp.foto = await uploadImagePublic(file) }
  catch { alert('Error al subir la foto') }
  finally { resp.photoLoading = false; e.target.value = '' }
}

// ── Player helpers ────────────────────────────────────────────────────────────
function addPlayerRow(key) {
  if (!newPlayers[key]) newPlayers[key] = []
  newPlayers[key].push({ name: '', number: null, position: '', curp: '', photo: '', photoLoading: false, documento_oficial: '', docLoading: false })
}

function removePlayerRow(key, idx) {
  newPlayers[key].splice(idx, 1)
}

// ── Responsable helpers ───────────────────────────────────────────────────────
function initResponsables(key) {
  if (!newResponsables[key]) {
    newResponsables[key] = [
      { nombre: '', apellidos: '', curp: '', foto: '', photoLoading: false },
      { nombre: '', apellidos: '', curp: '', foto: '', photoLoading: false },
    ]
  }
}

function addResponsable(key) {
  if (newResponsables[key]?.length < 3) {
    newResponsables[key].push({ nombre: '', apellidos: '', curp: '', foto: '', photoLoading: false })
  }
}

function removeResponsable(key, idx) {
  newResponsables[key].splice(idx, 1)
}

function canSaveResponsables(key) {
  const rs = newResponsables[key] || []
  const withName = rs.filter(r => r.nombre.trim())
  if (withName.length < 2) return false
  return withName.every(r => r.apellidos.trim())
}

// ── CURP helpers ──────────────────────────────────────────────────────────────
function parseCURP(curp) {
  if (!curp || curp.length !== 18) return null
  const c = curp.trim().toUpperCase()
  const regex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/
  if (!regex.test(c)) return null
  const yy = parseInt(c.slice(4, 6))
  const mm = parseInt(c.slice(6, 8))
  const dd = parseInt(c.slice(8, 10))
  const sex = c[10]
  const is2000s = /[A-Z]/.test(c[16])
  const fullYear = is2000s ? 2000 + yy : 1900 + yy
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  return { birthYear: fullYear, sex }
}

function decodedCURP(curp) {
  if (!curp || curp.length < 18) return null
  return parseCURP(curp)
}

function curpStatus(player) {
  const curp = player.curp?.trim()
  if (!curp || curp.length < 18) return 'empty'
  return parseCURP(curp) ? 'valid' : 'invalid'
}

// Aviso informativo de edad — el backend sí valida esto al guardar (rango de
// nacimiento de la categoría + excepción de niñas), pero antes no había
// ninguna señal en el formulario: la CURP se veía "válida" (✓ verde, formato
// correcto) y el rechazo por edad solo aparecía como error después de darle
// a Guardar. Es informativo nada más — no bloquea el botón de guardar, eso
// lo sigue decidiendo el backend (que además cuenta el cupo de la excepción
// de niñas, algo que aquí no se puede replicar sin consultar al servidor).
function curpAgeWarning(player, cat) {
  const decoded = decodedCURP(player.curp)
  if (!decoded || !cat?.min_birth_year) return ''
  const { birthYear, sex } = decoded
  const isFemale = sex === 'M'
  const minBY = cat.min_birth_year
  const maxBY = cat.max_birth_year
  const minBYGirls = cat.min_birth_year_girls
  const effectiveMin = (isFemale && minBYGirls && minBYGirls < minBY) ? minBYGirls : minBY
  if (birthYear < effectiveMin) return `Nació en ${birthYear} — se requiere nacido en ${effectiveMin} o después para esta categoría`
  if (maxBY && birthYear > maxBY) return `Nació en ${birthYear} — el límite para esta categoría es ${maxBY}`
  return ''
}

function respCurpStatus(resp) {
  const curp = resp.curp?.trim()
  if (!curp || curp.length < 18) return 'empty'
  return parseCURP(curp) ? 'valid' : 'invalid'
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function saveResponsables(cat) {
  const key = respKey(cat)
  const rs = (newResponsables[key] || []).filter(r => r.nombre.trim())
  responsableErrors[key] = []
  savingResp[key] = true
  try {
    const res = await api.post(`/inscriptions/${inscriptionId}/responsables`, {
      categoryId: cat.id,
      token: regToken,
      responsables: rs.map(r => ({
        nombre: r.nombre.trim(),
        apellidos: r.apellidos.trim(),
        curp: r.curp?.trim().toUpperCase() || null,
        foto: r.foto || null,
      }))
    })
    // Replace registered responsables for this category
    registeredResponsables.value = [
      ...registeredResponsables.value.filter(r => String(r.category_id) !== String(cat.id)),
      ...(res.data.saved || [])
    ]
    // Reset form y cerrar modo edición
    newResponsables[key] = [
      { nombre: '', apellidos: '', curp: '', foto: '', photoLoading: false },
      { nombre: '', apellidos: '', curp: '', foto: '', photoLoading: false },
    ]
    editingResp[key] = false
  } catch (e) {
    const err = e.response?.data
    responsableErrors[key] = [err?.error || 'Error al guardar responsables']
  } finally {
    savingResp[key] = false
  }
}

async function savePlayers(cat) {
  const key = playerKey(cat)
  const teamName = currentTeamName(cat)
  // Solo se envían las filas listas (nombre + CURP válida) — así una fila que
  // todavía se está llenando (p.ej. nombre puesto pero CURP a medias) no
  // bloquea guardar las demás que ya están completas.
  const players = (newPlayers[key] || []).filter(p => p.name.trim() && curpStatus(p) === 'valid')
  if (!players.length) return

  // Validación rápida de duplicados en el mismo envío
  const curpsEnvio = players.map(p => p.curp?.trim().toUpperCase()).filter(Boolean)
  if (new Set(curpsEnvio).size !== curpsEnvio.length) {
    categoryErrors[key] = ['Hay CURPs duplicadas entre los jugadores que intentas registrar']
    return
  }
  const numsEnvio = players.map(p => p.number).filter(n => n != null && n !== '')
  if (new Set(numsEnvio).size !== numsEnvio.length) {
    categoryErrors[key] = ['Hay números de dorsal duplicados entre los jugadores que intentas registrar']
    return
  }

  saving[key] = true
  categoryErrors[key] = []
  try {
    const res = await api.post(`/inscriptions/${inscriptionId}/players`, {
      categoryId: cat.id,
      teamName,
      token: regToken,
      players: players.map(({ name, number, position, curp, photo, documento_oficial }) =>
        ({ name, number, position, curp, photo, documento_oficial })
      )
    })
    const inserted = res.data.inserted || []
    registeredPlayers.value.push(...inserted.map(p => ({ ...p, category_id: cat.id, team_name: teamName })))
    // Solo eliminar del formulario los que se insertaron correctamente
    const insertedCurps = new Set(inserted.map(p => p.curp?.toUpperCase()).filter(Boolean))
    const insertedNames = new Set(inserted.map(p => p.name?.toLowerCase()).filter(Boolean))
    newPlayers[key] = (newPlayers[key] || []).filter(p => {
      const curp = p.curp?.trim().toUpperCase()
      if (curp && insertedCurps.has(curp)) return false
      if (!curp && insertedNames.has(p.name?.trim().toLowerCase())) return false
      return true
    })
    if (res.data.errors?.length) categoryErrors[key] = res.data.errors
  } catch (e) {
    const err = e.response?.data
    categoryErrors[key] = err?.errors || [err?.error || 'Error al guardar jugadores']
  } finally {
    saving[key] = false
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/inscriptions/${inscriptionId}/register`, { params: { token: regToken } })
    inscription.value = data
    registeredPlayers.value    = data.players || []
    registeredResponsables.value = data.responsables || []
    if (data.categories?.length) {
      activeCategory.value = data.categories[0].id
      for (const cat of data.categories) {
        activeTeamByCategory[cat.id] = cat.teams?.[0]
        // Inicializar el formulario de jugadores/responsables de CADA equipo
        // de la categoría (no solo el activo) para que cambiar de sub-tab no
        // pierda lo que ya se había empezado a escribir en el otro equipo.
        // El backend siempre manda cat.teams con al menos 1 nombre.
        for (const team of (cat.teams || [])) {
          const key = `${cat.id}::${team}`
          initResponsables(key)
        }
      }
    }
  } catch (e) {
    loadError.value = e.response?.data?.error || 'No se pudo cargar la inscripción'
  } finally {
    loading.value = false
  }
})
</script>
