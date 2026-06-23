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
            <span class="ml-1 text-xs opacity-70">({{ playersForCat(cat.id).length }}j)</span>
          </button>
        </div>

        <!-- Active category panel -->
        <div v-for="cat in inscription.categories" :key="cat.id" v-show="activeCategory === cat.id" class="space-y-5">

          <!-- ══ RESPONSABLES ══ -->
          <div class="card space-y-5">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconUsers class="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 class="font-bold text-slate-900">Responsables / Cuerpo Técnico</h3>
                <p class="text-xs text-slate-500">Mínimo 2 obligatorios · 3ro opcional · Cada uno con foto de hombros hacia arriba</p>
              </div>
            </div>

            <!-- Responsables ya guardados -->
            <div v-if="responsablesForCat(cat.id).length" class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <IconCheckCircle class="w-3.5 h-3.5"/> Responsables registrados
                </p>
                <button type="button" @click="editingResp[cat.id] = !editingResp[cat.id]"
                  class="text-[10px] text-primary font-semibold border border-primary/30 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors">
                  {{ editingResp[cat.id] ? 'Cancelar edición' : 'Editar' }}
                </button>
              </div>
              <div v-for="r in responsablesForCat(cat.id)" :key="r.id"
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
            <div v-if="!responsablesForCat(cat.id).length || editingResp[cat.id]" class="space-y-4">
              <div v-for="(r, idx) in newResponsables[cat.id]" :key="idx"
                class="border border-muted rounded-2xl p-4 space-y-3 bg-slate-50/50">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-black uppercase tracking-widest text-slate-500">
                    Responsable {{ idx + 1 }}{{ idx >= 2 ? ' (opcional)' : ' *' }}
                  </span>
                  <button v-if="idx === 2" type="button" @click="removeResponsable(cat.id, idx)"
                    class="text-red-400 hover:text-red-600 text-xs font-semibold">Quitar</button>
                </div>

                <!-- Foto + datos -->
                <div class="flex gap-3 items-start">
                  <!-- Foto -->
                  <div class="flex flex-col items-center gap-1.5 shrink-0">
                    <div class="relative w-16 h-16 rounded-xl border-2 border-dashed border-muted bg-white overflow-hidden flex items-center justify-center cursor-pointer group"
                      @click="triggerRespPhoto(cat.id, idx)">
                      <img v-if="r.foto" :src="r.foto" class="w-full h-full object-cover"/>
                      <IconUser v-else class="w-7 h-7 text-slate-300 group-hover:text-primary transition-colors"/>
                      <div v-if="r.photoLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <input :ref="el => setRespPhotoRef(el, cat.id, idx)" type="file" accept="image/*" class="hidden"
                      @change="e => onRespPhotoChange(e, cat.id, idx)"/>
                    <button type="button" @click="triggerRespPhoto(cat.id, idx)"
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
              <button v-if="newResponsables[cat.id]?.length === 2" type="button"
                @click="addResponsable(cat.id)"
                class="w-full py-3 border-2 border-dashed border-muted rounded-xl text-slate-400 hover:border-primary/40 hover:text-primary transition-all text-xs font-semibold">
                + Agregar 3er responsable (opcional)
              </button>
            </div>

            <!-- Errores de responsables -->
            <div v-if="responsableErrors[cat.id]?.length" class="space-y-1">
              <p v-for="err in responsableErrors[cat.id]" :key="err"
                class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                {{ err }}
              </p>
            </div>

            <!-- Guardar responsables — solo cuando el formulario está activo -->
            <button v-if="!responsablesForCat(cat.id).length || editingResp[cat.id]"
              @click="saveResponsables(cat)"
              :disabled="savingResp[cat.id] || !canSaveResponsables(cat.id)"
              class="btn-primary w-full disabled:opacity-50">
              <span class="flex items-center justify-center gap-2">
                <IconLoader2 v-if="savingResp[cat.id]" class="w-4 h-4 animate-spin"/>
                <IconUsers v-else class="w-4 h-4" />
                {{ savingResp[cat.id] ? 'Guardando...' : `Guardar responsables de ${cat.name}` }}
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
                  <h3 class="font-bold text-slate-900 text-lg">Jugadores — {{ cat.name }}</h3>
                </div>
                <p v-if="cat.min_birth_year" class="text-xs text-slate-500 mt-1.5 ml-12">
                  Nacidos en
                  <span class="font-semibold text-slate-700">{{ cat.min_birth_year }}{{ cat.max_birth_year ? ` – ${cat.max_birth_year}` : ' o después' }}</span>
                  <span v-if="cat.min_birth_year_girls" class="text-pink-600 ml-2">· Niñas desde {{ cat.min_birth_year_girls }}</span>
                </p>
                <p v-if="cat.max_players_per_team" class="text-xs mt-0.5 ml-12">
                  <span class="font-semibold text-slate-700">{{ playersForCat(cat.id).length }} / {{ cat.max_players_per_team }}</span>
                  <span class="text-slate-400"> jugadores</span>
                  <span v-if="playersForCat(cat.id).length >= cat.max_players_per_team" class="ml-2 text-red-500 font-semibold">— Cupo lleno</span>
                </p>
              </div>
              <button @click="addPlayerRow(cat.id)"
                class="text-xs text-accent border border-accent/30 px-3 py-1.5 rounded-lg hover:bg-accent/10 transition-colors font-semibold shrink-0">
                + Agregar jugador
              </button>
            </div>

            <!-- Players already registered -->
            <div v-if="playersForCat(cat.id).length" class="space-y-2">
              <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Registrados</p>
              <div v-for="p in playersForCat(cat.id)" :key="p.id"
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
              </div>
            </div>

            <!-- Input rows for new players -->
            <div class="space-y-3">
              <p v-if="newPlayers[cat.id]?.length" class="text-xs font-bold text-slate-500 uppercase tracking-wider">Agregar</p>
              <div v-for="(p, idx) in newPlayers[cat.id]" :key="idx" class="grid gap-2">
                <!-- Row 1: photo + name + # + position -->
                <div class="grid grid-cols-12 gap-2 items-start">
                  <!-- Photo -->
                  <div class="col-span-2 flex flex-col items-center gap-1">
                    <label class="text-[10px] text-slate-400 mb-0.5 block w-full">Foto</label>
                    <div class="relative w-14 h-14 rounded-xl border-2 border-dashed border-muted bg-slate-50 overflow-hidden flex items-center justify-center cursor-pointer group"
                      @click="triggerPhoto(cat.id, idx)">
                      <img v-if="p.photo" :src="p.photo" class="w-full h-full object-cover"/>
                      <IconUser v-else class="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors"/>
                      <div v-if="p.photoLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <input :ref="el => setPhotoRef(el, cat.id, idx, 'file')" type="file" accept="image/*" class="hidden"
                      @change="e => onPhotoChange(e, cat.id, idx)"/>
                    <input :ref="el => setPhotoRef(el, cat.id, idx, 'cam')" type="file" accept="image/*" capture="user" class="hidden"
                      @change="e => onPhotoChange(e, cat.id, idx)"/>
                    <div class="flex gap-1">
                      <button type="button" @click.stop="triggerFileInput(cat.id, idx)"
                        class="text-slate-400 hover:text-primary transition-colors" title="Subir foto">
                        <IconUpload class="w-3.5 h-3.5"/>
                      </button>
                      <button type="button" @click.stop="triggerCameraInput(cat.id, idx)"
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
                    <button @click="removePlayerRow(cat.id, idx)" class="text-red-400 hover:text-red-600 transition-colors text-lg leading-none">×</button>
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
                      @click="triggerDocInput(cat.id, idx)">
                      <img v-if="p.documento_oficial" :src="p.documento_oficial" class="w-full h-full object-cover"/>
                      <IconIdCard v-else class="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors"/>
                      <div v-if="p.docLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div class="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <input :ref="el => setDocRef(el, cat.id, idx)" type="file" accept="image/*,application/pdf" class="hidden"
                      @change="e => onDocChange(e, cat.id, idx)"/>
                    <div class="flex-1">
                      <button type="button" @click="triggerDocInput(cat.id, idx)"
                        class="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors">
                        {{ p.documento_oficial ? 'Cambiar documento' : 'Subir documento' }}
                      </button>
                      <p class="text-[10px] text-slate-400 mt-1">JPG, PNG o PDF · máx 10 MB</p>
                      <button v-if="p.documento_oficial" type="button" @click="p.documento_oficial = ''"
                        class="text-[10px] text-red-400 hover:text-red-600 mt-0.5">Quitar</button>
                    </div>
                    <div v-if="p.documento_oficial" class="shrink-0">
                      <a :href="p.documento_oficial" target="_blank"
                        class="text-[10px] text-primary font-semibold underline">Ver</a>
                    </div>
                  </div>
                </div>
                <div v-if="idx < (newPlayers[cat.id].length - 1)" class="h-px bg-slate-100"></div>
              </div>

              <button v-if="!newPlayers[cat.id]?.length" @click="addPlayerRow(cat.id)"
                class="w-full py-6 border-2 border-dashed border-muted rounded-xl text-slate-400 hover:border-primary/40 hover:text-primary transition-all text-sm">
                + Agregar jugador en {{ cat.name }}
              </button>
            </div>

            <!-- Errors -->
            <div v-if="categoryErrors[cat.id]?.length" class="space-y-1">
              <p v-for="err in categoryErrors[cat.id]" :key="err"
                class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                {{ err }}
              </p>
            </div>

            <!-- Save players -->
            <button v-if="newPlayers[cat.id]?.some(p => p.name.trim())"
              @click="savePlayers(cat)"
              :disabled="saving[cat.id] || newPlayers[cat.id]?.some(p => p.name.trim() && curpStatus(p) !== 'valid')"
              class="btn-primary w-full disabled:opacity-50">
              <span class="flex items-center justify-center gap-2">
                <IconLoader2 v-if="saving[cat.id]" class="w-4 h-4 animate-spin"/>
                {{ saving[cat.id] ? 'Guardando...' : `Guardar jugadores en ${cat.name}` }}
              </span>
            </button>
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

const inscription    = ref(null)
const loading        = ref(true)
const loadError      = ref('')
const saving     = reactive({}) // categoryId → bool
const savingResp = reactive({}) // categoryId → bool
const done           = ref(false)
const activeCategory = ref(null)
const newPlayers     = reactive({}) // categoryId → [{name, number, position, curp, photo}]
const categoryErrors = reactive({}) // categoryId → [string]
const newResponsables   = reactive({}) // categoryId → [{nombre, apellidos, curp, foto}]
const responsableErrors = reactive({}) // categoryId → [string]
const editingResp       = reactive({}) // categoryId → bool (mostrar form de edición)

const registeredPlayers     = ref([])
const registeredResponsables = ref([])

function playersForCat(catId) {
  return registeredPlayers.value.filter(p => String(p.category_id) === String(catId))
}
function responsablesForCat(catId) {
  return registeredResponsables.value.filter(r => String(r.category_id) === String(catId))
}

// ── Photo refs for players ────────────────────────────────────────────────────
const photoRefs = {}
function setPhotoRef(el, catId, idx, type) {
  if (el) photoRefs[`${catId}-${idx}-${type}`] = el
}
function triggerPhoto(catId, idx) { photoRefs[`${catId}-${idx}-file`]?.click() }
function triggerFileInput(catId, idx) { photoRefs[`${catId}-${idx}-file`]?.click() }
function triggerCameraInput(catId, idx) { photoRefs[`${catId}-${idx}-cam`]?.click() }

async function onPhotoChange(e, catId, idx) {
  const file = e.target.files?.[0]; if (!file) return
  const player = newPlayers[catId]?.[idx]; if (!player) return
  player.photoLoading = true
  try { player.photo = await uploadImagePublic(file) }
  catch { alert('Error al subir la foto') }
  finally { player.photoLoading = false; e.target.value = '' }
}

// ── Document refs for players ─────────────────────────────────────────────────
const docRefs = {}
function setDocRef(el, catId, idx) {
  if (el) docRefs[`${catId}-${idx}`] = el
}
function triggerDocInput(catId, idx) { docRefs[`${catId}-${idx}`]?.click() }

async function onDocChange(e, catId, idx) {
  const file = e.target.files?.[0]; if (!file) return
  const player = newPlayers[catId]?.[idx]; if (!player) return
  player.docLoading = true
  try { player.documento_oficial = await uploadImagePublic(file) }
  catch (err) { alert(err.message || 'Error al subir el documento') }
  finally { player.docLoading = false; e.target.value = '' }
}

// ── Photo refs for responsables ───────────────────────────────────────────────
const respPhotoRefs = {}
function setRespPhotoRef(el, catId, idx) {
  if (el) respPhotoRefs[`${catId}-${idx}`] = el
}
function triggerRespPhoto(catId, idx) { respPhotoRefs[`${catId}-${idx}`]?.click() }

async function onRespPhotoChange(e, catId, idx) {
  const file = e.target.files?.[0]; if (!file) return
  const resp = newResponsables[catId]?.[idx]; if (!resp) return
  resp.photoLoading = true
  try { resp.foto = await uploadImagePublic(file) }
  catch { alert('Error al subir la foto') }
  finally { resp.photoLoading = false; e.target.value = '' }
}

// ── Player helpers ────────────────────────────────────────────────────────────
function addPlayerRow(catId) {
  if (!newPlayers[catId]) newPlayers[catId] = []
  newPlayers[catId].push({ name: '', number: null, position: '', curp: '', photo: '', photoLoading: false, documento_oficial: '', docLoading: false })
}

function removePlayerRow(catId, idx) {
  newPlayers[catId].splice(idx, 1)
}

// ── Responsable helpers ───────────────────────────────────────────────────────
function initResponsables(catId) {
  if (!newResponsables[catId]) {
    newResponsables[catId] = [
      { nombre: '', apellidos: '', curp: '', foto: '', photoLoading: false },
      { nombre: '', apellidos: '', curp: '', foto: '', photoLoading: false },
    ]
  }
}

function addResponsable(catId) {
  if (newResponsables[catId]?.length < 3) {
    newResponsables[catId].push({ nombre: '', apellidos: '', curp: '', foto: '', photoLoading: false })
  }
}

function removeResponsable(catId, idx) {
  newResponsables[catId].splice(idx, 1)
}

function canSaveResponsables(catId) {
  const rs = newResponsables[catId] || []
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

function respCurpStatus(resp) {
  const curp = resp.curp?.trim()
  if (!curp || curp.length < 18) return 'empty'
  return parseCURP(curp) ? 'valid' : 'invalid'
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function saveResponsables(cat) {
  const rs = (newResponsables[cat.id] || []).filter(r => r.nombre.trim())
  responsableErrors[cat.id] = []
  savingResp[cat.id] = true
  try {
    const res = await api.post(`/inscriptions/${inscriptionId}/responsables`, {
      categoryId: cat.id,
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
    newResponsables[cat.id] = [
      { nombre: '', apellidos: '', curp: '', foto: '', photoLoading: false },
      { nombre: '', apellidos: '', curp: '', foto: '', photoLoading: false },
    ]
    editingResp[cat.id] = false
  } catch (e) {
    const err = e.response?.data
    responsableErrors[cat.id] = [err?.error || 'Error al guardar responsables']
  } finally {
    savingResp[cat.id] = false
  }
}

async function savePlayers(cat) {
  const players = (newPlayers[cat.id] || []).filter(p => p.name.trim())
  if (!players.length) return

  // Validación rápida de duplicados en el mismo envío
  const curpsEnvio = players.map(p => p.curp?.trim().toUpperCase()).filter(Boolean)
  if (new Set(curpsEnvio).size !== curpsEnvio.length) {
    categoryErrors[cat.id] = ['Hay CURPs duplicadas entre los jugadores que intentas registrar']
    return
  }
  const numsEnvio = players.map(p => p.number).filter(n => n != null && n !== '')
  if (new Set(numsEnvio).size !== numsEnvio.length) {
    categoryErrors[cat.id] = ['Hay números de dorsal duplicados entre los jugadores que intentas registrar']
    return
  }

  saving[cat.id] = true
  categoryErrors[cat.id] = []
  try {
    const res = await api.post(`/inscriptions/${inscriptionId}/players`, {
      categoryId: cat.id,
      players
    })
    const inserted = res.data.inserted || []
    registeredPlayers.value.push(...inserted.map(p => ({ ...p, category_id: cat.id })))
    // Solo eliminar del formulario los que se insertaron correctamente
    const insertedCurps = new Set(inserted.map(p => p.curp?.toUpperCase()).filter(Boolean))
    const insertedNames = new Set(inserted.map(p => p.name?.toLowerCase()).filter(Boolean))
    newPlayers[cat.id] = (newPlayers[cat.id] || []).filter(p => {
      const curp = p.curp?.trim().toUpperCase()
      if (curp && insertedCurps.has(curp)) return false
      if (!curp && insertedNames.has(p.name?.trim().toLowerCase())) return false
      return true
    })
    if (res.data.errors?.length) categoryErrors[cat.id] = res.data.errors
  } catch (e) {
    const err = e.response?.data
    categoryErrors[cat.id] = err?.errors || [err?.error || 'Error al guardar jugadores']
  } finally {
    saving[cat.id] = false
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/inscriptions/${inscriptionId}/register`)
    inscription.value = data
    registeredPlayers.value    = data.players || []
    registeredResponsables.value = data.responsables || []
    if (data.categories?.length) {
      activeCategory.value = data.categories[0].id
      for (const cat of data.categories) {
        initResponsables(cat.id)
      }
    }
  } catch (e) {
    loadError.value = e.response?.data?.error || 'No se pudo cargar la inscripción'
  } finally {
    loading.value = false
  }
})
</script>
