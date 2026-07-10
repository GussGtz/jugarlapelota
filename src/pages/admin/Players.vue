<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Jugadores y Responsables</h2>
      <div class="flex items-center gap-2">
        <button v-if="activeTab === 'players' && displayed.length" @click="exportPDF"
          class="flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
          <IconFileDown class="w-4 h-4" />
          Exportar PDF
        </button>
        <button v-if="activeTab === 'players'" @click="openForm()" class="btn-primary text-sm">+ Nuevo jugador</button>
      </div>
    </div>

    <!-- Pestañas -->
    <div class="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
      <button @click="activeTab = 'players'"
        class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
        :class="activeTab === 'players' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'">
        <span class="flex items-center gap-2"><IconShirt class="w-4 h-4"/> Jugadores</span>
      </button>
      <button @click="activeTab = 'responsables'; loadResponsables()"
        class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
        :class="activeTab === 'responsables' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'">
        <span class="flex items-center gap-2"><IconUsers class="w-4 h-4"/> Responsables</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap">
      <select v-model="filterTournament" @change="onTournamentChange"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option v-for="t in tournaments" :key="t.slug" :value="t">{{ t.name }}</option>
      </select>
      <select v-model="filterCategory" @change="activeTab === 'players' ? loadPlayers() : loadResponsables()"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option :value="null">Todas las categorías</option>
        <option v-for="c in categories" :key="c.id" :value="c">{{ c.name }}</option>
      </select>
      <select v-if="activeTab === 'players'" v-model="filterTeam"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option :value="null">Todos los equipos</option>
        <option v-for="t in filteredTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
    </div>

    <!-- ══ TAB: JUGADORES ══ -->
    <template v-if="activeTab === 'players'">
      <div v-if="loading" class="flex justify-center py-8">
        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p v-else-if="!displayed.length" class="text-center text-slate-500 py-8">Sin jugadores.</p>

      <!-- Mobile: cards -->
      <div v-else class="md:hidden space-y-2">
        <div v-for="p in displayed" :key="p.id" class="card !p-3 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
            <img v-if="p.photo" :src="p.photo" class="w-full h-full object-cover"/>
            <IconUser v-else class="w-5 h-5 text-slate-400"/>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-slate-900 text-sm truncate">{{ p.name }}</p>
            <p class="text-xs text-slate-400 truncate">{{ p.teamName }} · {{ p.position }}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0 text-xs font-bold text-accent">
            <IconCircle class="w-3.5 h-3.5"/>{{ p.goals }}
          </div>
          <div class="flex gap-1.5 shrink-0">
            <button v-if="p.documento_oficial" type="button" @click="viewingDoc = p"
              class="text-primary px-2 py-1.5 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
              <IconIdCard class="w-4 h-4"/>
            </button>
            <span v-else class="text-red-400 px-2 py-1.5 border border-red-200 rounded-lg" title="Sin documento">
              <IconAlertCircle class="w-4 h-4"/>
            </span>
            <button @click="openForm(p)" class="text-xs text-slate-500 px-2.5 py-1.5 border border-muted rounded-lg hover:text-slate-900 transition-colors">Editar</button>
            <button @click="deletePlayer(p.id)" class="text-red-500 px-2 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <IconTrash2 class="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>

      <!-- Desktop: tabla -->
      <div v-if="!loading && displayed.length" class="hidden md:block rounded-2xl border border-muted overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-100 text-slate-500 uppercase text-xs tracking-wider">
            <tr>
              <th class="py-3 px-4 text-left">Jugador</th>
              <th class="py-3 px-4 text-left">Equipo</th>
              <th class="py-3 px-4 text-left">Categoría</th>
              <th class="py-3 px-4 text-center">#</th>
              <th class="py-3 px-4 text-left">Pos.</th>
              <th class="py-3 px-4 text-center text-accent"><IconCircle class="w-4 h-4 inline"/></th>
              <th class="py-3 px-4 text-center text-primary">A</th>
              <th class="py-3 px-4 text-center text-yellow-400"><IconSquare class="w-4 h-4 inline fill-yellow-400 text-yellow-400"/></th>
              <th class="py-3 px-4 text-center text-red-400"><IconSquare class="w-4 h-4 inline fill-red-500 text-red-500"/></th>
              <th class="py-3 px-4 text-center">Doc.</th>
              <th class="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in displayed" :key="p.id" class="border-t border-slate-200 hover:bg-slate-50 transition-colors">
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <img v-if="p.photo" :src="p.photo" class="w-full h-full object-cover rounded-full"/>
                    <IconUser v-else class="w-4 h-4"/>
                  </div>
                  <span class="font-semibold text-slate-900">{{ p.name }}</span>
                </div>
              </td>
              <td class="py-3 px-4 text-slate-500">{{ p.teamName }}</td>
              <td class="py-3 px-4 text-slate-400 text-xs">{{ p.categoryName }}</td>
              <td class="py-3 px-4 text-center text-slate-500">{{ p.number }}</td>
              <td class="py-3 px-4 text-slate-500">{{ p.position }}</td>
              <td class="py-3 px-4 text-center font-bold text-accent">{{ p.goals }}</td>
              <td class="py-3 px-4 text-center text-primary">{{ p.assists }}</td>
              <td class="py-3 px-4 text-center text-yellow-400">{{ p.yellow_cards }}</td>
              <td class="py-3 px-4 text-center text-red-400">{{ p.red_cards }}</td>
              <td class="py-3 px-4 text-center">
                <button v-if="p.documento_oficial" type="button" @click="viewingDoc = p"
                  class="inline-flex items-center gap-1 text-xs text-primary font-semibold border border-primary/30 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors">
                  <IconIdCard class="w-3.5 h-3.5"/> Ver
                </button>
                <span v-else class="text-[11px] text-red-400 font-semibold flex items-center justify-center gap-1">
                  <IconAlertCircle class="w-3.5 h-3.5"/> Falta
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex gap-2 justify-end">
                  <button @click="openForm(p)" class="text-xs text-slate-500 hover:text-slate-900 px-2 py-1 border border-muted rounded-lg">Editar</button>
                  <button @click="deletePlayer(p.id)" class="text-xs text-red-500 px-2 py-1 border border-red-600/30 rounded-lg hover:bg-red-600/10">
                    <IconTrash2 class="w-4 h-4"/>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ══ TAB: RESPONSABLES ══ -->
    <template v-if="activeTab === 'responsables'">
      <div v-if="loadingResp" class="flex justify-center py-8">
        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="!filterTournament" class="card text-center py-10 text-slate-400">
        <IconUsers class="w-8 h-8 mx-auto mb-3 opacity-30"/>
        <p class="font-semibold text-sm">Selecciona un torneo para ver los responsables</p>
      </div>

      <p v-else-if="!responsables.length" class="text-center text-slate-500 py-8">
        Sin responsables registrados{{ filterCategory ? ` en ${filterCategory.name}` : '' }}.
      </p>

      <template v-else>
        <!-- Agrupar por categoría -->
        <div v-for="catGroup in responsablesByCategory" :key="catGroup.categoryName" class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="h-px flex-1 bg-slate-200"></div>
            <span class="text-xs font-black uppercase tracking-widest text-primary px-3 py-1 bg-primary/10 rounded-full">{{ catGroup.categoryName }}</span>
            <div class="h-px flex-1 bg-slate-200"></div>
          </div>

          <!-- Por equipo dentro de la categoría -->
          <div v-for="teamGroup in catGroup.teams" :key="teamGroup.teamName" class="card !p-0 overflow-hidden">
            <div class="bg-slate-50 border-b border-muted px-4 py-2.5 flex items-center gap-2">
              <IconShirt class="w-4 h-4 text-slate-400"/>
              <span class="font-bold text-slate-800 text-sm">{{ teamGroup.teamName }}</span>
              <span class="text-xs text-slate-400 ml-auto">{{ teamGroup.members.length }} responsable{{ teamGroup.members.length !== 1 ? 's' : '' }}</span>
            </div>
            <!-- Mobile: cards -->
            <div class="divide-y divide-slate-100 md:hidden">
              <div v-for="r in teamGroup.members" :key="r.id" class="flex items-center gap-3 px-4 py-3">
                <img v-if="r.foto" :src="r.foto" class="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"/>
                <div v-else class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                  <IconUser class="w-5 h-5 text-slate-400"/>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-slate-900 text-sm">{{ r.nombre }} {{ r.apellidos }}</p>
                  <p class="text-[10px] text-slate-400 font-mono mt-0.5">{{ r.curp || '—' }}</p>
                </div>
                <span class="text-[10px] bg-primary/10 text-primary font-bold px-2 py-1 rounded-full shrink-0">R{{ r.orden }}</span>
              </div>
            </div>
            <!-- Desktop: tabla -->
            <table class="w-full text-sm hidden md:table">
              <thead class="bg-slate-50/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th class="py-2 px-4 text-left w-16">Foto</th>
                  <th class="py-2 px-4 text-left">Nombre completo</th>
                  <th class="py-2 px-4 text-left">CURP</th>
                  <th class="py-2 px-4 text-center w-16">Rol</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in teamGroup.members" :key="r.id" class="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td class="py-3 px-4">
                    <img v-if="r.foto" :src="r.foto" class="w-10 h-10 rounded-lg object-cover border border-slate-200"/>
                    <div v-else class="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <IconUser class="w-4 h-4 text-slate-400"/>
                    </div>
                  </td>
                  <td class="py-3 px-4 font-semibold text-slate-900">{{ r.nombre }} {{ r.apellidos }}</td>
                  <td class="py-3 px-4 font-mono text-xs text-slate-500">{{ r.curp || '—' }}</td>
                  <td class="py-3 px-4 text-center">
                    <span class="text-[10px] bg-primary/10 text-primary font-bold px-2 py-1 rounded-full">R{{ r.orden }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>

    <!-- ── Modal jugador ───────────────────────────────────────── -->
    <div v-if="showForm" class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"/>
        <div class="modal-header">
          <h3 class="font-bold text-slate-900 text-base">{{ editing ? 'Editar jugador' : 'Nuevo jugador' }}</h3>
          <button @click="showForm = false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>
        <div class="modal-body space-y-4">
          <div v-if="dupWarning" class="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
            :class="dupWarning.hard ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'">
            <IconAlertTriangle class="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p class="font-bold">{{ dupWarning.hard ? 'Registro bloqueado' : 'Posible duplicado' }}</p>
              <p class="text-xs mt-0.5">{{ dupWarning.message }}</p>
              <p v-if="dupWarning.teamName" class="text-xs mt-1 font-semibold">Ya registrado en: {{ dupWarning.teamName }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="text-xs text-slate-700 mb-1 block">Torneo</label>
              <select v-model="form.tournamentId" @change="onFormTournamentChange"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option v-for="t in tournaments" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Categoría</label>
              <select v-model="form.categoryId" @change="onFormCategoryChange"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option v-for="c in formCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Equipo *</label>
              <select v-model="form.teamId" @change="checkDuplicate"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option :value="null" disabled>Selecciona equipo</option>
                <option v-for="t in formTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="text-xs text-slate-700 mb-1 block">Nombre completo *</label>
              <div class="relative">
                <input v-model="form.name" @input="onNameInput"
                  class="w-full bg-white border rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none transition-colors"
                  :class="dupWarning?.hard ? 'border-red-400' : dupWarning ? 'border-amber-400' : 'border-muted focus:border-primary'"
                  placeholder="Nombre completo del jugador" />
                <div v-if="checking" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <IconCheck v-else-if="form.name.length > 2 && !dupWarning"
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Número</label>
              <input v-model.number="form.number" type="number" min="1" max="99"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
            </div>
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Posición</label>
              <select v-model="form.position"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option value="Portero">Portero</option>
                <option value="Defensa">Defensa</option>
                <option value="Mediocampista">Mediocampista</option>
                <option value="Delantero">Delantero</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="text-xs text-slate-700 mb-2 block">Foto del jugador</label>
              <div v-if="form.photo" class="relative mb-3 flex justify-center">
                <div class="relative w-28 h-28">
                  <img :src="form.photo" class="w-28 h-28 rounded-2xl object-cover border-2 border-primary/20 shadow-sm"/>
                  <button @click="form.photo = ''" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow">
                    <IconX class="w-3.5 h-3.5 text-white"/>
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" @click="$refs.cameraInput.click()" :disabled="photoUploading"
                  class="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-all text-xs font-bold disabled:opacity-50">
                  <IconCamera class="w-4 h-4"/> Tomar foto
                </button>
                <button type="button" @click="$refs.galleryInput.click()" :disabled="photoUploading"
                  class="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 transition-all text-xs font-bold disabled:opacity-50">
                  <IconImage class="w-4 h-4"/> Cargar imagen
                </button>
              </div>
              <div v-if="photoUploading" class="flex items-center justify-center gap-2 mt-2 text-xs text-slate-500">
                <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Subiendo foto...
              </div>
              <p v-if="photoError" class="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <IconAlertCircle class="w-3.5 h-3.5"/> {{ photoError }}
              </p>
              <input ref="cameraInput"  type="file" accept="image/*" capture="user" class="hidden" @change="onPhotoSelected"/>
              <input ref="galleryInput" type="file" accept="image/*" class="hidden" @change="onPhotoSelected"/>
            </div>
          </div>
          <div v-if="editing" class="border-t border-muted pt-4 space-y-3">
            <p class="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <IconBarChart2 class="w-3.5 h-3.5"/> Estadísticas manuales
            </p>
            <p class="text-[11px] text-slate-400 -mt-1">Úsalo solo para corregir datos. Los eventos del árbitro actualizan estas cifras automáticamente.</p>
            <div class="grid grid-cols-2 gap-3">
              <div v-for="stat in statFields" :key="stat.key">
                <label class="text-xs font-bold mb-1.5 flex items-center gap-1.5" :class="stat.color">
                  <component :is="stat.icon" class="w-3.5 h-3.5"/>{{ stat.label }}
                </label>
                <div class="flex items-center gap-2">
                  <button @click="form[stat.key] = Math.max(0, (form[stat.key] || 0) - 1)"
                    class="w-8 h-8 rounded-lg border border-muted text-slate-600 hover:bg-slate-100 font-black text-sm flex items-center justify-center transition">−</button>
                  <input v-model.number="form[stat.key]" type="number" min="0"
                    class="flex-1 border border-muted rounded-xl px-2 py-1.5 text-center text-sm font-black text-slate-900 focus:outline-none focus:border-primary"/>
                  <button @click="form[stat.key] = (form[stat.key] || 0) + 1"
                    class="w-8 h-8 rounded-lg border border-muted text-slate-600 hover:bg-slate-100 font-black text-sm flex items-center justify-center transition">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="save" :disabled="saving || dupWarning?.hard"
            class="btn-primary text-sm flex-1 disabled:opacity-40 disabled:cursor-not-allowed">
            {{ saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar jugador' }}
          </button>
          <button @click="showForm = false" class="btn-ghost text-sm px-4">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Visor de documento oficial (imagen o PDF) -->
    <DocumentViewerModal
      :url="viewingDoc?.documento_oficial"
      :title="viewingDoc ? `Documento — ${viewingDoc.name}` : ''"
      @close="viewingDoc = null"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import DocumentViewerModal from '@/components/DocumentViewer/DocumentViewerModal.vue'
import { Target, Zap, AlertCircle as AlertCircleIcon } from 'lucide-vue-next'

const activeTab = ref('players')

// ── Estado jugadores ────────────────────────────────────────
const players        = ref([])
const tournaments    = ref([])
const categories     = ref([])
const allTeams       = ref([])
const formCategories = ref([])
const formTeams      = ref([])
const loading        = ref(false)
const saving         = ref(false)
const checking       = ref(false)
const showForm       = ref(false)
const editing        = ref(null)
const dupWarning     = ref(null)
const viewingDoc     = ref(null)
const filterTournament = ref(null)
const filterCategory   = ref(null)
const filterTeam       = ref(null)
let dupTimer = null

// ── Estado responsables ─────────────────────────────────────
const responsables   = ref([])
const loadingResp    = ref(false)

const responsablesByCategory = computed(() => {
  const catMap = {}
  for (const r of responsables.value) {
    const cn = r.categoryName || 'Sin categoría'
    if (!catMap[cn]) catMap[cn] = { categoryName: cn, teams: {} }
    const tn = r.team_name || 'Sin equipo'
    if (!catMap[cn].teams[tn]) catMap[cn].teams[tn] = { teamName: tn, members: [] }
    catMap[cn].teams[tn].members.push(r)
  }
  return Object.values(catMap).map(cg => ({
    ...cg,
    teams: Object.values(cg.teams)
  }))
})

async function loadResponsables() {
  if (!filterTournament.value) return
  loadingResp.value = true
  try {
    const params = filterCategory.value ? `?cat=${filterCategory.value.id}` : ''
    const { data } = await api.get(`/tournaments/${filterTournament.value.slug}/responsables${params}`)
    responsables.value = data
  } catch { responsables.value = [] }
  finally { loadingResp.value = false }
}

// ── Foto jugador ────────────────────────────────────────────
const photoUploading = ref(false)
const photoError     = ref('')

const form = reactive({
  tournamentId: null, categoryId: null, teamId: null,
  name: '', number: '', position: 'Delantero', photo: '',
  goals: 0, assists: 0, yellow_cards: 0, red_cards: 0
})

const statFields = [
  { key: 'goals',        label: 'Goles',        color: 'text-green-600',  icon: Target },
  { key: 'assists',      label: 'Asistencias',  color: 'text-blue-500',   icon: Zap },
  { key: 'yellow_cards', label: 'T. Amarillas', color: 'text-yellow-500', icon: AlertCircleIcon },
  { key: 'red_cards',    label: 'T. Rojas',     color: 'text-red-500',    icon: AlertCircleIcon },
]

async function onPhotoSelected(e) {
  const file = e.target.files?.[0]; e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) { photoError.value = 'Solo se permiten imágenes'; return }
  if (file.size > 5 * 1024 * 1024)    { photoError.value = 'La imagen no debe superar 5 MB'; return }
  photoError.value = ''; photoUploading.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const { data } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    form.photo = data.url
  } catch { photoError.value = 'Error al subir la foto.' }
  finally { photoUploading.value = false }
}

// ── Filtros ─────────────────────────────────────────────────
const filteredTeams = computed(() =>
  filterCategory.value
    ? allTeams.value.filter(t => t.category_id === filterCategory.value.id)
    : allTeams.value.filter(t => !filterTournament.value || t.tournament_id === filterTournament.value.id)
)

const displayed = computed(() => {
  let list = players.value
  if (filterTeam.value) list = list.filter(p => p.team_id === filterTeam.value)
  return list
})

async function onTournamentChange() {
  filterCategory.value = null; filterTeam.value = null
  await Promise.all([loadCategories(), loadTeams(), loadPlayers()])
  if (activeTab.value === 'responsables') loadResponsables()
}

async function loadCategories() {
  if (!filterTournament.value) return
  const { data } = await api.get(`/tournaments/${filterTournament.value.slug}/categories`)
  categories.value = data
}

async function loadTeams() {
  if (!filterTournament.value) return
  const params = filterCategory.value ? `?cat=${filterCategory.value.id}` : ''
  const { data } = await api.get(`/tournaments/${filterTournament.value.slug}/teams${params}`)
  allTeams.value = data
}

async function loadPlayers() {
  if (!filterTournament.value) return
  loading.value = true
  try {
    const params = filterCategory.value ? `?cat=${filterCategory.value.id}` : ''
    const { data } = await api.get(`/tournaments/${filterTournament.value.slug}/players${params}`)
    players.value = data
  } catch {} finally { loading.value = false }
}

// ── Formulario jugador ──────────────────────────────────────
async function onFormTournamentChange() {
  form.categoryId = null; form.teamId = null; dupWarning.value = null
  const t = tournaments.value.find(t => t.id === form.tournamentId)
  if (!t) return
  const [cats, teams] = await Promise.all([
    api.get(`/tournaments/${t.slug}/categories`),
    api.get(`/tournaments/${t.slug}/teams`)
  ])
  formCategories.value = cats.data; formTeams.value = teams.data
}

async function onFormCategoryChange() {
  form.teamId = null; dupWarning.value = null
  const t = tournaments.value.find(t => t.id === form.tournamentId)
  if (!t) return
  const params = form.categoryId ? `?cat=${form.categoryId}` : ''
  const { data } = await api.get(`/tournaments/${t.slug}/teams${params}`)
  formTeams.value = data
}

function onNameInput() {
  dupWarning.value = null; clearTimeout(dupTimer)
  if (!form.teamId || form.name.trim().length < 2) return
  dupTimer = setTimeout(checkDuplicate, 300)
}

async function checkDuplicate() {
  if (!form.teamId || form.name.trim().length < 2) { dupWarning.value = null; return }
  checking.value = true
  try {
    const { data } = await api.post('/players/check-duplicate', {
      teamId: form.teamId, name: form.name.trim(),
      excludePlayerId: editing.value?.id || null
    })
    dupWarning.value = data.duplicate ? {
      hard: true,
      message: `"${form.name.trim()}" ya está registrado en esta categoría en otro equipo.`,
      teamName: data.duplicate.teamName
    } : null
  } catch { dupWarning.value = null }
  finally { checking.value = false }
}

async function openForm(player = null) {
  editing.value = player; dupWarning.value = null
  if (player) {
    const t = tournaments.value.find(t =>
      allTeams.value.find(team => team.id === player.team_id && team.tournament_id === t.id)
    ) || tournaments.value[0]
    Object.assign(form, {
      tournamentId: t?.id, categoryId: player.category_id || null,
      teamId: player.team_id, name: player.name, number: player.number || '',
      position: player.position || 'Delantero', photo: player.photo || '',
      goals: player.goals || 0, assists: player.assists || 0,
      yellow_cards: player.yellow_cards || 0, red_cards: player.red_cards || 0
    })
    await onFormTournamentChange()
    form.categoryId = player.category_id || null
    await onFormCategoryChange()
    form.teamId = player.team_id
  } else {
    const t = filterTournament.value || tournaments.value[0]
    Object.assign(form, { tournamentId: t?.id, categoryId: filterCategory.value?.id || null, teamId: null, name: '', number: '', position: 'Delantero', photo: '' })
    await onFormTournamentChange()
    if (filterCategory.value) { form.categoryId = filterCategory.value.id; await onFormCategoryChange() }
  }
  showForm.value = true
}

async function save() {
  if (!form.teamId || !form.name.trim()) return alert('Nombre y equipo son requeridos')
  if (dupWarning.value?.hard) return
  await checkDuplicate()
  if (dupWarning.value?.hard) return
  saving.value = true
  try {
    if (editing.value) await api.put(`/players/${editing.value.id}`, form)
    else await api.post('/players', form)
    await loadPlayers()
    showForm.value = false
  } catch (e) {
    const msg = e.response?.data?.error || 'Error al guardar'
    dupWarning.value = { hard: true, message: msg, teamName: e.response?.data?.duplicate?.teamName }
  } finally { saving.value = false }
}

function exportPDF() {
  const t = filterTournament.value?.name || 'Torneo'
  const cat = filterCategory.value?.name || 'Todas las categorías'
  const team = filterTeam.value
    ? (allTeams.value.find(t => t.id === filterTeam.value)?.name || '')
    : 'Todos los equipos'
  const rows = displayed.value.map((p, i) => `
    <tr class="${i % 2 === 0 ? 'even' : ''}">
      <td>${p.number ?? '—'}</td><td class="name">${p.name}</td><td>${p.position || '—'}</td>
      <td>${p.teamName || '—'}</td><td>${p.categoryName || '—'}</td>
      <td class="stat">${p.goals ?? 0}</td><td class="stat">${p.assists ?? 0}</td>
      <td class="stat">${p.yellow_cards ?? 0}</td><td class="stat">${p.red_cards ?? 0}</td>
    </tr>`).join('')
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Jugadores — ${t}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1e293b;padding:24px;}
h1{font-size:18px;font-weight:800;color:#0f172a;margin-bottom:4px;}.meta{font-size:10px;color:#64748b;margin-bottom:16px;}
table{width:100%;border-collapse:collapse;}thead{background:#0f172a;color:white;}
th{padding:8px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;}
td{padding:7px 10px;border-bottom:1px solid #e2e8f0;}td.name{font-weight:600;}td.stat,th.stat{text-align:center;font-weight:700;}
tr.even{background:#f8fafc;}.footer{margin-top:20px;font-size:9px;color:#94a3b8;text-align:right;}
@media print{body{padding:12px;}}</style></head>
<body><h1>Lista de Jugadores — ${t}</h1>
<div class="meta">Categoría: <strong>${cat}</strong> &nbsp;|&nbsp; Equipo: <strong>${team}</strong> &nbsp;|&nbsp; Total: <strong>${displayed.value.length} jugadores</strong></div>
<table><thead><tr><th>#</th><th>Nombre</th><th>Posición</th><th>Equipo</th><th>Categoría</th>
<th class="stat">G</th><th class="stat">A</th><th class="stat">TA</th><th class="stat">TR</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">Generado el ${new Date().toLocaleDateString('es-MX',{dateStyle:'long'})} — JugarLaPelota</div>
</body></html>`
  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(html); win.document.close(); win.focus()
  setTimeout(() => win.print(), 400)
}

async function deletePlayer(id) {
  if (!confirm('¿Eliminar este jugador?')) return
  await api.delete(`/players/${id}`)
  await loadPlayers()
}

onMounted(async () => {
  const { data } = await api.get('/tournaments')
  tournaments.value = data
  if (data.length) { filterTournament.value = data[0]; await onTournamentChange() }
})
</script>
