<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Partidos</h2>
      <button @click="openCreateForm()" class="btn-primary text-sm">+ Nuevo partido</button>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap">
      <select v-model="filterTournament" @change="onTournamentChange" class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option v-for="t in tournaments" :key="t.slug" :value="t">{{ t.name }}</option>
      </select>
      <select v-model="filterCategory" @change="loadMatches" class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option :value="null">Todas las categorías</option>
        <option v-for="c in categories" :key="c.id" :value="c">{{ c.name }}</option>
      </select>
      <select v-model="filterStatus" class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option value="">Todos</option>
        <option value="scheduled">Programados</option>
        <option value="live">En vivo</option>
        <option value="finished">Finalizados</option>
      </select>
      <!-- Filtro rápido: sin horario/cancha -->
      <button @click="filterPending = !filterPending"
        class="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all"
        :class="filterPending
          ? 'bg-amber-500 border-amber-500 text-white'
          : 'bg-white border-muted text-slate-600 hover:border-amber-400 hover:text-amber-600'">
        <IconAlertTriangle class="w-3.5 h-3.5"/>
        Sin horario/cancha
        <span v-if="pendingCount > 0" class="bg-white/30 text-white rounded-full px-1.5 py-0 text-[10px] font-black">
          {{ pendingCount }}
        </span>
      </button>
    </div>

    <!-- List -->
    <div class="space-y-3">
      <div v-for="m in displayed" :key="m.id"
        class="card flex items-center justify-between gap-4 flex-wrap"
        :class="missingSchedule(m) ? 'border-amber-300 bg-amber-50/50' : ''">
        <div class="flex items-center gap-4 flex-1 min-w-0">
          <span class="text-xs font-bold uppercase flex-shrink-0 w-20"
            :class="m.status==='live'?'text-red-400':m.status==='scheduled'?'text-primary':'text-slate-400'">
            <template v-if="m.status==='live'">
              <IconCircle class="w-2 h-2 fill-red-500 text-red-500 animate-pulse inline-block mr-1" /> VIVO
            </template>
            <template v-else>{{ m.status==='scheduled'? 'PROG.' : 'FIN.' }}</template>
          </span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-900 text-sm truncate">{{ m.homeTeam }} vs {{ m.awayTeam }}</p>
            <!-- Horario, cancha y árbitro -->
            <div class="flex items-center gap-3 mt-0.5 flex-wrap">
              <span class="flex items-center gap-1 text-xs"
                :class="m.date ? 'text-slate-500' : 'text-amber-600 font-bold'">
                <IconClock class="w-3 h-3"/>
                {{ m.date ? fmtDate(m.date) : 'Sin horario' }}
              </span>
              <span class="flex items-center gap-1 text-xs"
                :class="m.location ? 'text-slate-500' : 'text-amber-600 font-bold'">
                <IconMapPin class="w-3 h-3"/>
                {{ m.location || 'Sin cancha' }}
              </span>
              <span v-if="m.categoryName" class="text-[10px] text-slate-400">· {{ m.categoryName }}</span>
            </div>
            <!-- Árbitro — visible solo en partidos en vivo o finalizados -->
            <div v-if="m.status !== 'scheduled' && m.refereeName"
              class="flex items-center gap-1 mt-1">
              <IconShield class="w-3 h-3 shrink-0"
                :class="m.status==='live' ? 'text-red-500' : 'text-emerald-500'"/>
              <span class="text-[11px] font-semibold"
                :class="m.status==='live' ? 'text-red-600' : 'text-emerald-700'">
                Árbitro: {{ m.refereeName }}
              </span>
            </div>
            <!-- Partido finalizado SIN árbitro registrado -->
            <div v-else-if="m.status === 'finished' && !m.refereeName"
              class="flex items-center gap-1 mt-1">
              <IconAlertTriangle class="w-3 h-3 text-slate-300 shrink-0"/>
              <span class="text-[11px] text-slate-400">Sin árbitro registrado</span>
            </div>
          </div>
          <span v-if="m.status !== 'scheduled'" class="font-black text-primary text-lg flex-shrink-0">
            {{ m.home_score }} - {{ m.away_score }}
          </span>
        </div>
        <div class="flex gap-2 flex-shrink-0 flex-wrap justify-end w-full md:w-auto">
          <!-- Botón destacado si falta horario/cancha -->
          <button v-if="missingSchedule(m)" @click="openEditForm(m)"
            class="text-xs font-black text-amber-700 px-3 py-2 border border-amber-400 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center gap-1">
            <IconClock class="w-3.5 h-3.5"/><span class="hidden sm:inline">Asignar horario</span>
          </button>
          <button @click="openScoreModal(m)" class="text-xs text-accent px-3 py-2 border border-accent/30 rounded-lg hover:bg-accent/10 flex items-center gap-1" title="Actualizar marcador">
            <IconCircle class="w-3.5 h-3.5"/><span class="hidden sm:inline ml-1">Marcador</span>
          </button>
          <button @click="openEditForm(m)" class="text-xs text-slate-500 hover:text-slate-900 px-3 py-2 border border-muted rounded-lg flex items-center gap-1" title="Editar partido">
            <IconPenLine class="w-3.5 h-3.5"/><span class="hidden sm:inline">Editar</span>
          </button>
          <button v-if="m.status !== 'live'" @click="confirmSetLive(m)" class="text-xs text-red-500 px-3 py-2 border border-red-600/30 rounded-lg flex items-center gap-1" title="Iniciar en vivo">
            <IconPlay class="w-3.5 h-3.5"/><span class="hidden sm:inline">En Vivo</span>
          </button>
          <button v-if="m.status === 'live'" @click="confirmFinishMatch(m)" class="text-xs text-slate-500 px-3 py-2 border border-muted rounded-lg flex items-center gap-1">
            <IconSquare class="w-3.5 h-3.5"/><span class="hidden sm:inline">Finalizar</span>
          </button>
          <button @click="confirmDeleteMatch(m)" class="text-xs text-red-500 px-2.5 py-2 border border-red-600/30 rounded-lg hover:bg-red-600/10" title="Eliminar">
            <IconTrash2 class="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>
      <div v-if="loading" class="flex justify-center py-8">
        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p v-if="!loading && !displayed.length" class="text-center text-slate-400 py-12">No hay partidos.</p>
    </div>

    <!-- Score modal -->
    <div v-if="showScore" class="modal-overlay">
      <div class="modal-sheet overflow-y-auto p-5">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900">Actualizar marcador</h3>
          <span v-if="scoreMatch?.phaseType === 'knockout'"
            class="text-[10px] bg-primary/10 text-primary font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <IconTrophy class="w-3 h-3" /> Eliminatoria
          </span>
        </div>
        <p class="text-slate-500 text-sm text-center font-medium">
          {{ scoreMatch?.homeTeam }} <span class="text-slate-300 mx-1">vs</span> {{ scoreMatch?.awayTeam }}
        </p>

        <!-- Score inputs -->
        <div class="grid grid-cols-3 gap-3 items-center">
          <div class="text-center">
            <label class="text-xs text-slate-500 mb-2 block truncate">{{ scoreMatch?.homeTeam }}</label>
            <input v-model.number="scoreForm.home" type="number" min="0"
              class="w-full bg-slate-50 border-2 border-muted rounded-2xl px-2 py-3 text-slate-900 text-3xl font-black text-center focus:outline-none focus:border-primary"/>
          </div>
          <div class="text-center">
            <span class="text-2xl font-black text-slate-300">-</span>
          </div>
          <div class="text-center">
            <label class="text-xs text-slate-500 mb-2 block truncate">{{ scoreMatch?.awayTeam }}</label>
            <input v-model.number="scoreForm.away" type="number" min="0"
              class="w-full bg-slate-50 border-2 border-muted rounded-2xl px-2 py-3 text-slate-900 text-3xl font-black text-center focus:outline-none focus:border-primary"/>
          </div>
        </div>

        <!-- Winner indicator -->
        <div v-if="scoreForm.home !== scoreForm.away" class="text-center">
          <span class="text-xs font-bold text-accent bg-accent/10 px-3 py-1 rounded-full">
            <IconTrophy class="w-3 h-3 inline mr-1" />
            Gana: {{ scoreForm.home > scoreForm.away ? scoreMatch?.homeTeam : scoreMatch?.awayTeam }}
          </span>
        </div>
        <div v-else class="text-center">
          <span class="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Empate</span>
        </div>

        <!-- Actions -->
        <div class="space-y-2">
          <!-- Guardar + Finalizar (auto-advance) -->
          <button @click="confirmSaveAndFinish" :disabled="saving"
            class="w-full bg-primary text-white font-bold py-3 rounded-xl text-sm hover:bg-sky-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
            <IconCheckCircle class="w-4 h-4" />
            {{ saving ? 'Procesando...' : 'Guardar y Finalizar partido' }}
          </button>
          <!-- Solo guardar (actualizar en vivo) -->
          <button @click="confirmUpdateScore" :disabled="saving"
            class="w-full border border-muted text-slate-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition disabled:opacity-50 flex items-center justify-center gap-2">
            <IconRefreshCw class="w-4 h-4" />
            Solo actualizar marcador
          </button>
          <button @click="showScore=false" class="w-full text-slate-400 text-sm py-1.5 hover:text-slate-600 transition">
            Cancelar
          </button>
        </div>

        <!-- Info knockout -->
        <p v-if="scoreMatch?.phaseType === 'knockout'" class="text-[10px] text-slate-400 text-center">
          Al finalizar, el ganador avanzará automáticamente al siguiente round
        </p>
      </div>
    </div>

    <!-- Confirm dialog -->
    <div v-if="confirmDialog.show" class="modal-overlay">
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

    <!-- Create/Edit match modal -->
    <div v-if="showForm" class="modal-overlay">
      <div class="modal-sheet overflow-y-auto p-5">
        <h3 class="font-bold text-slate-900 text-lg">{{ editingMatch ? 'Editar partido' : 'Nuevo partido' }}</h3>
        <div class="grid gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Torneo</label>
              <select v-model="form.tournamentId" @change="onFormTournamentChange" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option v-for="t in tournaments" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Categoría</label>
              <select v-model="form.categoryId" @change="onFormCategoryChange" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option :value="null">Sin categoría</option>
                <option v-for="c in formCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Equipo local *</label>
              <select v-model="form.homeTeam" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option v-for="t in formTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Equipo visitante *</label>
              <select v-model="form.awayTeam" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option v-for="t in formTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Fecha y hora</label>
              <input v-model="form.date" type="datetime-local" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
            </div>
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Estado</label>
              <select v-model="form.status" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option value="scheduled">Programado</option>
                <option value="live">En vivo</option>
                <option value="finished">Finalizado</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-700 mb-1 block">Sede</label>
            <input v-model="form.location" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
          </div>
        </div>
        <div class="flex gap-3">
          <button @click="confirmSaveMatch" :disabled="saving" class="btn-primary text-sm flex-1 disabled:opacity-50">{{ saving?'Guardando...':'Guardar' }}</button>
          <button @click="showForm=false" class="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'
import { useAutoRefresh } from '@/composables/useAutoRefresh'

const allMatches      = ref([])
const tournaments     = ref([])
const categories      = ref([])
const formCategories  = ref([])
const formTeams       = ref([])
const loading         = ref(false)
const saving          = ref(false)
const showForm        = ref(false)
const showScore       = ref(false)
const editingMatch    = ref(null)
const scoreMatch      = ref(null)
const filterStatus    = ref('')
const filterTournament = ref(null)
const filterCategory   = ref(null)
const filterPending    = ref(false)  // filtro: sin horario/cancha

const form      = reactive({ tournamentId:null, categoryId:null, homeTeam:null, awayTeam:null, date:'', location:'', status:'scheduled' })
const scoreForm = reactive({ home:0, away:0 })

const confirmDialog = reactive({ show: false, title: '', body: '', confirmLabel: '', confirmClass: '', onConfirm: null })

function askConfirm({ title, body, confirmLabel, confirmClass, onConfirm }) {
  Object.assign(confirmDialog, { show: true, title, body, confirmLabel, confirmClass, onConfirm })
}

function runConfirm() {
  confirmDialog.show = false
  confirmDialog.onConfirm?.()
}

function missingSchedule(m) {
  return m.status !== 'finished' && (!m.date || !m.location)
}

const pendingCount = computed(() =>
  allMatches.value.filter(m => missingSchedule(m)).length
)

const displayed = computed(() => {
  let list = allMatches.value
  if (filterStatus.value)  list = list.filter(m => m.status === filterStatus.value)
  if (filterPending.value) list = list.filter(m => missingSchedule(m))
  return list
})

const fmtDate = d => d ? new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''

async function onTournamentChange() {
  filterCategory.value = null
  if (!filterTournament.value) return
  const { data } = await api.get(`/tournaments/${filterTournament.value.slug}/categories`)
  categories.value = data
  await loadMatches()
}

async function loadMatches() {
  if (!filterTournament.value) return
  loading.value = true
  try {
    const params = filterCategory.value ? `?cat=${filterCategory.value.id}` : ''
    const { data } = await api.get(`/tournaments/${filterTournament.value.slug}/matches${params}`)
    allMatches.value = data
  } catch {} finally { loading.value = false }
}

async function onFormTournamentChange() {
  form.categoryId = null; form.homeTeam = null; form.awayTeam = null
  const t = tournaments.value.find(t => t.id === form.tournamentId)
  if (!t) return
  const [cats, teams] = await Promise.all([api.get(`/tournaments/${t.slug}/categories`), api.get(`/tournaments/${t.slug}/teams`)])
  formCategories.value = cats.data; formTeams.value = teams.data
}

async function onFormCategoryChange() {
  form.homeTeam = null; form.awayTeam = null
  const t = tournaments.value.find(t => t.id === form.tournamentId)
  if (!t) return
  const params = form.categoryId ? `?cat=${form.categoryId}` : ''
  const { data } = await api.get(`/tournaments/${t.slug}/teams${params}`)
  formTeams.value = data
}

async function openCreateForm() {
  editingMatch.value = null
  const t = filterTournament.value || tournaments.value[0]
  Object.assign(form, { tournamentId:t?.id, categoryId:filterCategory.value?.id||null, homeTeam:null, awayTeam:null, date:'', location:'', status:'scheduled' })
  await onFormTournamentChange()
  if (filterCategory.value) { form.categoryId = filterCategory.value.id; await onFormCategoryChange() }
  showForm.value = true
}

async function openEditForm(m) {
  editingMatch.value = m
  Object.assign(form, { tournamentId:m.tournament_id, categoryId:m.category_id||null, homeTeam:m.home_team, awayTeam:m.away_team, date:m.date?.slice(0,16)||'', location:m.location||'', status:m.status })
  await onFormTournamentChange()
  form.categoryId = m.category_id||null
  if (m.category_id) { await onFormCategoryChange() }
  form.homeTeam = m.home_team; form.awayTeam = m.away_team
  showForm.value = true
}

function openScoreModal(m) {
  scoreMatch.value = m; scoreForm.home = m.home_score; scoreForm.away = m.away_score; showScore.value = true
}

async function saveScore(finish = false) {
  saving.value = true
  try {
    await api.patch(`/matches/${scoreMatch.value.id}/score`, {
      homeScore: scoreForm.home,
      awayScore: scoreForm.away,
      finish    // si true → backend pone status='finished' + auto-advance bracket
    })
    await loadMatches()
    showScore.value = false
  } catch { alert('Error') } finally { saving.value = false }
}

async function saveMatch() {
  if (!form.homeTeam || !form.awayTeam) return alert('Selecciona ambos equipos')
  saving.value = true
  try {
    if (editingMatch.value) await api.put(`/matches/${editingMatch.value.id}`, form)
    else await api.post('/matches', form)
    await loadMatches(); showForm.value = false
  } catch { alert('Error al guardar') } finally { saving.value = false }
}

function confirmSetLive(m) {
  askConfirm({
    title: '¿Marcar como EN VIVO?',
    body: `El partido ${m.homeTeam} vs ${m.awayTeam} aparecerá como activo para todos los usuarios.`,
    confirmLabel: 'Sí, En Vivo',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: () => setStatus(m, 'live')
  })
}

function confirmFinishMatch(m) {
  askConfirm({
    title: '¿Finalizar partido?',
    body: `Se cerrará el partido ${m.homeTeam} vs ${m.awayTeam} y se actualizarán las estadísticas.`,
    confirmLabel: 'Finalizar',
    confirmClass: 'bg-slate-700 hover:bg-slate-900',
    onConfirm: () => setStatus(m, 'finished')
  })
}

function confirmDeleteMatch(m) {
  askConfirm({
    title: '¿Eliminar partido?',
    body: `Se eliminará permanentemente el partido ${m.homeTeam} vs ${m.awayTeam}. Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: () => deleteMatch(m.id)
  })
}

function confirmSaveAndFinish() {
  askConfirm({
    title: '¿Guardar y finalizar partido?',
    body: `El marcador ${scoreForm.home}-${scoreForm.away} quedará registrado y el partido se cerrará. Las estadísticas y la tabla se actualizarán automáticamente.`,
    confirmLabel: 'Sí, finalizar',
    confirmClass: 'bg-primary hover:bg-sky-600',
    onConfirm: () => saveScore(true)
  })
}

function confirmUpdateScore() {
  askConfirm({
    title: '¿Actualizar marcador?',
    body: `Se guardará el marcador ${scoreForm.home}-${scoreForm.away} para ${scoreMatch.value?.homeTeam} vs ${scoreMatch.value?.awayTeam}. El partido seguirá en curso.`,
    confirmLabel: 'Actualizar',
    confirmClass: 'bg-slate-700 hover:bg-slate-900',
    onConfirm: () => saveScore(false)
  })
}

function confirmSaveMatch() {
  if (editingMatch.value) {
    askConfirm({
      title: '¿Guardar cambios?',
      body: `Se modificarán los datos del partido ${editingMatch.value.homeTeam} vs ${editingMatch.value.awayTeam}. Asegúrate de que los cambios son correctos.`,
      confirmLabel: 'Guardar cambios',
      confirmClass: 'bg-primary hover:bg-sky-600',
      onConfirm: saveMatch
    })
  } else {
    saveMatch()
  }
}

async function setStatus(m, status) {
  await api.patch(`/matches/${m.id}/status`,{status}); await loadMatches()
}

async function deleteMatch(id) {
  await api.delete(`/matches/${id}`); await loadMatches()
}

const route = useRoute()

onMounted(async () => {
  const { data } = await api.get('/tournaments')
  tournaments.value = data
  if (data.length) { filterTournament.value = data[0]; await onTournamentChange() }
  // Activar filtro desde el dashboard (?filter=pending-schedule)
  if (route.query.filter === 'pending-schedule') {
    filterPending.value = true
  }
})
</script>
