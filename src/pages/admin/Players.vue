<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Jugadores</h2>
      <button @click="openForm()" class="btn-primary text-sm">+ Nuevo jugador</button>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap">
      <select v-model="filterTournament" @change="onTournamentChange"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option v-for="t in tournaments" :key="t.slug" :value="t">{{ t.name }}</option>
      </select>
      <select v-model="filterCategory" @change="loadPlayers"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option :value="null">Todas las categorías</option>
        <option v-for="c in categories" :key="c.id" :value="c">{{ c.name }}</option>
      </select>
      <select v-model="filterTeam"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option :value="null">Todos los equipos</option>
        <option v-for="t in filteredTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
    </div>

    <!-- Spinner / vacío -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
    <p v-else-if="!displayed.length" class="text-center text-slate-500 py-8">Sin jugadores.</p>

    <!-- Mobile: cards -->
    <div v-else class="md:hidden space-y-2">
      <div v-for="p in displayed" :key="p.id"
        class="card !p-3 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
          <img v-if="p.photo" :src="p.photo" class="w-full h-full object-cover"/>
          <IconUser v-else class="w-5 h-5 text-slate-400"/>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-slate-900 text-sm truncate">{{ p.name }}</p>
          <p class="text-xs text-slate-400 truncate">{{ p.teamName }} · {{ p.position }}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0 text-xs font-bold text-accent">
          <IconCircle class="w-3.5 h-3.5"/>
          {{ p.goals }}
        </div>
        <div class="flex gap-1.5 shrink-0">
          <button @click="openForm(p)"
            class="text-xs text-slate-500 px-2.5 py-1.5 border border-muted rounded-lg hover:text-slate-900 transition-colors">
            Editar
          </button>
          <button @click="deletePlayer(p.id)"
            class="text-red-500 px-2 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
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
            <th class="py-3 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in displayed" :key="p.id"
            class="border-t border-slate-200 hover:bg-slate-50 transition-colors">
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
            <td class="py-3 px-4 text-right">
              <div class="flex gap-2 justify-end">
                <button @click="openForm(p)"
                  class="text-xs text-slate-500 hover:text-slate-900 px-2 py-1 border border-muted rounded-lg">
                  Editar
                </button>
                <button @click="deletePlayer(p.id)"
                  class="text-xs text-red-500 px-2 py-1 border border-red-600/30 rounded-lg hover:bg-red-600/10">
                  <IconTrash2 class="w-4 h-4"/>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Modal ─────────────────────────────────────────────── -->
    <div v-if="showForm" class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"/>
        <div class="modal-header">
          <h3 class="font-bold text-slate-900 text-base">{{ editing ? 'Editar jugador' : 'Nuevo jugador' }}</h3>
          <button @click="showForm = false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>
        <div class="modal-body space-y-4">

          <!-- Alerta de duplicado -->
          <div v-if="dupWarning" class="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
            :class="dupWarning.hard ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'">
            <IconAlertTriangle class="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p class="font-bold">{{ dupWarning.hard ? 'Registro bloqueado' : 'Posible duplicado' }}</p>
              <p class="text-xs mt-0.5">{{ dupWarning.message }}</p>
              <p v-if="dupWarning.teamName" class="text-xs mt-1 font-semibold">
                Ya registrado en: {{ dupWarning.teamName }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- Torneo -->
            <div class="col-span-2">
              <label class="text-xs text-slate-700 mb-1 block">Torneo</label>
              <select v-model="form.tournamentId" @change="onFormTournamentChange"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option v-for="t in tournaments" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>
            <!-- Categoría -->
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Categoría</label>
              <select v-model="form.categoryId" @change="onFormCategoryChange"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option v-for="c in formCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <!-- Equipo -->
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Equipo *</label>
              <select v-model="form.teamId" @change="checkDuplicate"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option :value="null" disabled>Selecciona equipo</option>
                <option v-for="t in formTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>

            <!-- Nombre — con chequeo en vivo -->
            <div class="col-span-2">
              <label class="text-xs text-slate-700 mb-1 block">Nombre completo *</label>
              <div class="relative">
                <input v-model="form.name"
                  @input="onNameInput"
                  class="w-full bg-white border rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none transition-colors"
                  :class="dupWarning?.hard
                    ? 'border-red-400 focus:border-red-500'
                    : dupWarning
                    ? 'border-amber-400 focus:border-amber-500'
                    : 'border-muted focus:border-primary'"
                  placeholder="Nombre completo del jugador" />
                <!-- Spinner de chequeo -->
                <div v-if="checking" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <IconCheck v-else-if="form.name.length > 2 && !dupWarning"
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              </div>
            </div>

            <!-- Número & Posición -->
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

            <!-- Foto del jugador — cámara o galería (PWA) -->
            <div class="col-span-2">
              <label class="text-xs text-slate-700 mb-2 block">Foto del jugador</label>

              <!-- Preview -->
              <div v-if="form.photo" class="relative mb-3 flex justify-center">
                <div class="relative w-28 h-28">
                  <img :src="form.photo"
                    class="w-28 h-28 rounded-2xl object-cover border-2 border-primary/20 shadow-sm"/>
                  <button @click="form.photo = ''"
                    class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow">
                    <IconX class="w-3.5 h-3.5 text-white"/>
                  </button>
                </div>
              </div>

              <!-- Botones de captura -->
              <div class="grid grid-cols-2 gap-2">
                <!-- Cámara (PWA: abre cámara directamente en móvil) -->
                <button type="button" @click="$refs.cameraInput.click()"
                  :disabled="photoUploading"
                  class="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary transition-all text-xs font-bold disabled:opacity-50">
                  <IconCamera class="w-4 h-4"/>
                  Tomar foto
                </button>
                <!-- Galería -->
                <button type="button" @click="$refs.galleryInput.click()"
                  :disabled="photoUploading"
                  class="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-all text-xs font-bold disabled:opacity-50">
                  <IconImage class="w-4 h-4"/>
                  Cargar imagen
                </button>
              </div>

              <!-- Spinner de subida -->
              <div v-if="photoUploading" class="flex items-center justify-center gap-2 mt-2 text-xs text-slate-500">
                <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Subiendo foto...
              </div>

              <!-- Error -->
              <p v-if="photoError" class="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <IconAlertCircle class="w-3.5 h-3.5"/> {{ photoError }}
              </p>

              <!-- Inputs ocultos: cámara usa capture, galería no -->
              <input ref="cameraInput"  type="file" accept="image/*" capture="user"
                class="hidden" @change="onPhotoSelected"/>
              <input ref="galleryInput" type="file" accept="image/*"
                class="hidden" @change="onPhotoSelected"/>
            </div>
          </div>
        </div>

          <!-- Stats manuales — solo al editar un jugador ya registrado -->
          <div v-if="editing" class="border-t border-muted pt-4 space-y-3">
            <p class="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <IconBarChart2 class="w-3.5 h-3.5"/> Estadísticas manuales
            </p>
            <p class="text-[11px] text-slate-400 -mt-1">
              Úsalo solo para corregir datos. Los eventos del árbitro actualizan estas cifras automáticamente.
            </p>
            <div class="grid grid-cols-2 gap-3">
              <div v-for="stat in statFields" :key="stat.key">
                <label class="text-xs font-bold mb-1.5 flex items-center gap-1.5" :class="stat.color">
                  <component :is="stat.icon" class="w-3.5 h-3.5"/>
                  {{ stat.label }}
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

        <div class="modal-footer">
          <button @click="save" :disabled="saving || dupWarning?.hard"
            class="btn-primary text-sm flex-1 disabled:opacity-40 disabled:cursor-not-allowed">
            {{ saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar jugador' }}
          </button>
          <button @click="showForm = false" class="btn-ghost text-sm px-4">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { Target, Zap, AlertCircle as AlertCircleIcon } from 'lucide-vue-next'

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
const dupWarning     = ref(null)   // null | { hard, message, teamName }

const filterTournament = ref(null)
const filterCategory   = ref(null)
const filterTeam       = ref(null)

let dupTimer = null

const photoUploading = ref(false)
const photoError     = ref('')

const form = reactive({
  tournamentId: null, categoryId: null, teamId: null,
  name: '', number: '', position: 'Delantero', photo: '',
  goals: 0, assists: 0, yellow_cards: 0, red_cards: 0
})

const statFields = [
  { key: 'goals',        label: 'Goles',           color: 'text-green-600',  icon: Target },
  { key: 'assists',      label: 'Asistencias',      color: 'text-blue-500',   icon: Zap },
  { key: 'yellow_cards', label: 'T. Amarillas',     color: 'text-yellow-500', icon: AlertCircleIcon },
  { key: 'red_cards',    label: 'T. Rojas',         color: 'text-red-500',    icon: AlertCircleIcon },
]

async function onPhotoSelected(e) {
  const file = e.target.files?.[0]
  e.target.value = ''           // reset input para permitir misma foto de nuevo
  if (!file) return
  if (!file.type.startsWith('image/')) { photoError.value = 'Solo se permiten imágenes'; return }
  if (file.size > 5 * 1024 * 1024)    { photoError.value = 'La imagen no debe superar 5 MB'; return }
  photoError.value     = ''
  photoUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    form.photo = data.url
  } catch {
    photoError.value = 'Error al subir la foto. Intenta de nuevo.'
  } finally {
    photoUploading.value = false
  }
}

// ── Filtros de tabla ────────────────────────────────────────
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

// ── Carga de datos ──────────────────────────────────────────
async function onTournamentChange() {
  filterCategory.value = null
  filterTeam.value = null
  await Promise.all([loadCategories(), loadTeams(), loadPlayers()])
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

// ── Formulario ──────────────────────────────────────────────
async function onFormTournamentChange() {
  form.categoryId = null; form.teamId = null; dupWarning.value = null
  const t = tournaments.value.find(t => t.id === form.tournamentId)
  if (!t) return
  const [cats, teams] = await Promise.all([
    api.get(`/tournaments/${t.slug}/categories`),
    api.get(`/tournaments/${t.slug}/teams`)
  ])
  formCategories.value = cats.data
  formTeams.value      = teams.data
}

async function onFormCategoryChange() {
  form.teamId = null; dupWarning.value = null
  const t = tournaments.value.find(t => t.id === form.tournamentId)
  if (!t) return
  const params = form.categoryId ? `?cat=${form.categoryId}` : ''
  const { data } = await api.get(`/tournaments/${t.slug}/teams${params}`)
  formTeams.value = data
}

// Chequeo en vivo con debounce (300ms)
function onNameInput() {
  dupWarning.value = null
  clearTimeout(dupTimer)
  if (!form.teamId || form.name.trim().length < 2) return
  dupTimer = setTimeout(checkDuplicate, 300)
}

async function checkDuplicate() {
  if (!form.teamId || form.name.trim().length < 2) {
    dupWarning.value = null; return
  }
  checking.value = true
  try {
    const { data } = await api.post('/players/check-duplicate', {
      teamId: form.teamId,
      name:   form.name.trim(),
      excludePlayerId: editing.value?.id || null
    })
    if (data.duplicate) {
      dupWarning.value = {
        hard:     true,
        message:  `"${form.name.trim()}" ya está registrado en esta categoría en otro equipo. Un jugador no puede estar en dos equipos.`,
        teamName: data.duplicate.teamName
      }
    } else {
      dupWarning.value = null
    }
  } catch {
    dupWarning.value = null
  } finally {
    checking.value = false
  }
}

async function openForm(player = null) {
  editing.value  = player
  dupWarning.value = null
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
    Object.assign(form, {
      tournamentId: t?.id, categoryId: filterCategory.value?.id || null,
      teamId: null, name: '', number: '', position: 'Delantero', photo: ''
    })
    await onFormTournamentChange()
    if (filterCategory.value) {
      form.categoryId = filterCategory.value.id
      await onFormCategoryChange()
    }
  }
  showForm.value = true
}

async function save() {
  if (!form.teamId || !form.name.trim()) return alert('Nombre y equipo son requeridos')
  if (dupWarning.value?.hard) return   // bloqueado

  // Chequeo final antes de guardar
  await checkDuplicate()
  if (dupWarning.value?.hard) return

  saving.value = true
  try {
    if (editing.value) {
      await api.put(`/players/${editing.value.id}`, form)
    } else {
      await api.post('/players', form)
    }
    await loadPlayers()
    showForm.value = false
  } catch (e) {
    const msg = e.response?.data?.error || 'Error al guardar'
    dupWarning.value = { hard: true, message: msg, teamName: e.response?.data?.duplicate?.teamName }
  } finally {
    saving.value = false
  }
}

async function deletePlayer(id) {
  if (!confirm('¿Eliminar este jugador?')) return
  await api.delete(`/players/${id}`)
  await loadPlayers()
}

onMounted(async () => {
  const { data } = await api.get('/tournaments')
  tournaments.value = data
  if (data.length) {
    filterTournament.value = data[0]
    await onTournamentChange()
  }
})
</script>
