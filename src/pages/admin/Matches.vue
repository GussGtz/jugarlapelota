<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Partidos</h2>
      <button @click="openCreateForm()" class="btn-primary text-sm">+ Nuevo partido</button>
    </div>

    <!-- Filters — grid en mobile para que cada select sea full-width -->
    <div class="grid grid-cols-2 gap-2 md:flex md:gap-3 md:flex-wrap">
      <select v-model="filterTournament" @change="onTournamentChange"
        class="w-full bg-white border border-muted rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option v-for="t in tournaments" :key="t.slug" :value="t">{{ t.name }}</option>
      </select>
      <select v-model="filterCategory" @change="loadMatches"
        class="w-full bg-white border border-muted rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option :value="null">Todas las categorías</option>
        <option v-for="c in categories" :key="c.id" :value="c">{{ c.name }}</option>
      </select>
      <select v-model="filterStatus"
        class="w-full bg-white border border-muted rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option value="">Todos los estados</option>
        <option value="scheduled">Programados</option>
        <option value="live">En vivo</option>
        <option value="finished">Finalizados</option>
      </select>
      <button @click="filterPending = !filterPending"
        class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all"
        :class="filterPending
          ? 'bg-amber-500 border-amber-500 text-white'
          : 'bg-white border-muted text-slate-600'">
        <IconAlertTriangle class="w-3.5 h-3.5 shrink-0"/>
        Sin horario
        <span v-if="pendingCount > 0" class="ml-auto bg-amber-600 text-white rounded-full px-1.5 text-[10px] font-black">
          {{ pendingCount }}
        </span>
      </button>
    </div>

    <!-- List -->
    <div class="space-y-3">
      <div v-for="m in displayed" :key="m.id"
        class="card !p-0 overflow-hidden"
        :class="missingSchedule(m) ? 'border-amber-300' : m.status==='live' ? 'border-red-300' : ''">

        <!-- Cabecera: estado + categoría + marcador -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-muted"
          :class="m.status==='live' ? 'bg-red-50' : m.status==='finished' ? 'bg-slate-50' : 'bg-white'">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-black uppercase"
              :class="m.status==='live'?'text-red-500':m.status==='scheduled'?'text-primary':'text-slate-400'">
              <template v-if="m.status==='live'">
                <span class="inline-flex items-center gap-1">
                  <IconCircle class="w-2 h-2 fill-red-500 text-red-500 animate-pulse"/> EN VIVO
                </span>
              </template>
              <template v-else-if="m.status==='finished'">Finalizado</template>
              <template v-else>Programado</template>
            </span>
            <span v-if="m.categoryName" class="text-[10px] text-slate-400">· {{ m.categoryName }}</span>
          </div>
          <span v-if="m.status !== 'scheduled'" class="font-black text-primary text-base">
            {{ m.home_score }} – {{ m.away_score }}
          </span>
        </div>

        <!-- Cuerpo: equipos + info -->
        <div class="px-3 py-2.5">
          <p class="font-bold text-slate-900 text-sm">{{ m.homeTeam }} <span class="text-slate-400 font-normal">vs</span> {{ m.awayTeam }}</p>
          <div class="flex items-center gap-3 mt-1 flex-wrap">
            <span class="flex items-center gap-1 text-[11px]"
              :class="m.date ? 'text-slate-500' : 'text-amber-600 font-bold'">
              <IconClock class="w-3 h-3 shrink-0"/>{{ m.date ? fmtDate(m.date) : 'Sin horario' }}
            </span>
            <span class="flex items-center gap-1 text-[11px]"
              :class="m.location ? 'text-slate-500' : 'text-amber-600 font-bold'">
              <IconMapPin class="w-3 h-3 shrink-0"/>{{ m.location || 'Sin cancha' }}
            </span>
          </div>
          <div v-if="m.status !== 'scheduled' && m.refereeName" class="flex items-center gap-1 mt-1">
            <IconShield class="w-3 h-3 shrink-0" :class="m.status==='live' ? 'text-red-500' : 'text-emerald-500'"/>
            <span class="text-[11px] font-semibold" :class="m.status==='live' ? 'text-red-600' : 'text-emerald-700'">
              {{ m.refereeName }}
            </span>
          </div>
        </div>

        <!-- Acciones: fila completa de botones accesibles en mobile -->
        <div class="flex items-center gap-1.5 px-3 pb-3 flex-wrap">
          <!-- Marcador — siempre disponible y destacado -->
          <button @click="openScoreModal(m)"
            class="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-colors"
            :class="m.status !== 'scheduled'
              ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
              : 'bg-slate-100 text-slate-600 border-muted hover:bg-slate-200'">
            <IconCircleDot class="w-3.5 h-3.5 shrink-0"/>
            {{ m.status !== 'scheduled' ? m.home_score+' – '+m.away_score : 'Marcador' }}
          </button>
          <!-- Editar -->
          <button @click="openEditForm(m)"
            class="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-bold border border-muted text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <IconPenLine class="w-3.5 h-3.5 shrink-0"/><span class="hidden sm:inline">Editar</span>
          </button>
          <!-- En Vivo / Finalizar -->
          <button v-if="m.status !== 'live'" @click="confirmSetLive(m)"
            class="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-bold border border-red-300 text-red-500 hover:bg-red-50 transition-colors">
            <IconPlay class="w-3.5 h-3.5 shrink-0"/><span class="hidden sm:inline">Vivo</span>
          </button>
          <button v-else @click="confirmFinishMatch(m)"
            class="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-bold border border-muted text-slate-500 hover:bg-slate-100 transition-colors">
            <IconSquare class="w-3.5 h-3.5 shrink-0"/><span class="hidden sm:inline">Fin.</span>
          </button>
          <!-- Eliminar -->
          <button @click="confirmDeleteMatch(m)"
            class="flex items-center justify-center py-2 px-2.5 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-colors">
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
      <div class="modal-sheet">
        <div class="modal-handle"/>
        <div class="modal-header">
          <div>
            <h3 class="font-bold text-slate-900 text-base">
              {{ scoreMatch?.status === 'finished' ? 'Corregir resultado' : 'Actualizar marcador' }}
            </h3>
            <p class="text-xs text-slate-400 truncate mt-0.5">{{ scoreMatch?.homeTeam }} vs {{ scoreMatch?.awayTeam }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="scoreMatch?.phaseType === 'knockout'"
              class="text-[10px] bg-primary/10 text-primary font-bold px-2 py-1 rounded-full hidden sm:flex items-center gap-1">
              <IconTrophy class="w-3 h-3"/> Eliminatoria
            </span>
            <button @click="showScore=false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
          </div>
        </div>

        <div class="modal-body space-y-4">
          <!-- Score inputs -->
          <div class="grid grid-cols-3 gap-3 items-center">
            <div class="text-center">
              <label class="text-xs text-slate-500 mb-2 block font-medium truncate">{{ scoreMatch?.homeTeam }}</label>
              <input v-model.number="scoreForm.home" type="number" min="0"
                class="w-full bg-slate-50 border-2 border-muted rounded-2xl px-2 py-4 text-slate-900 text-4xl font-black text-center focus:outline-none focus:border-primary"/>
            </div>
            <div class="text-center">
              <span class="text-3xl font-black text-slate-300">–</span>
            </div>
            <div class="text-center">
              <label class="text-xs text-slate-500 mb-2 block font-medium truncate">{{ scoreMatch?.awayTeam }}</label>
              <input v-model.number="scoreForm.away" type="number" min="0"
                class="w-full bg-slate-50 border-2 border-muted rounded-2xl px-2 py-4 text-slate-900 text-4xl font-black text-center focus:outline-none focus:border-primary"/>
            </div>
          </div>

          <!-- Resultado -->
          <div class="text-center">
            <span v-if="scoreForm.home !== scoreForm.away"
              class="inline-flex items-center gap-1.5 text-sm font-bold text-accent bg-accent/10 px-4 py-2 rounded-full">
              <IconTrophy class="w-4 h-4"/>
              Gana: {{ scoreForm.home > scoreForm.away ? scoreMatch?.homeTeam : scoreMatch?.awayTeam }}
            </span>
            <span v-else class="inline-block text-sm text-slate-400 bg-slate-100 px-4 py-2 rounded-full">Empate</span>
          </div>

          <!-- Aviso corrección -->
          <div v-if="scoreMatch?.status === 'finished'"
            class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
            <IconAlertTriangle class="w-4 h-4 shrink-0 mt-0.5"/>
            Corregir el resultado recalculará la tabla de posiciones y el bracket automáticamente.
          </div>

          <p v-if="scoreMatch?.phaseType === 'knockout'" class="text-[10px] text-slate-400 text-center">
            Al finalizar, el ganador avanzará al siguiente round automáticamente.
          </p>
        </div>

        <div class="modal-footer flex-col gap-2">
          <template v-if="scoreMatch?.status === 'finished'">
            <button @click="confirmCorrectResult" :disabled="saving"
              class="w-full bg-primary text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              <IconCheckCircle class="w-4 h-4"/>
              {{ saving ? 'Actualizando...' : 'Guardar corrección y recalcular' }}
            </button>
          </template>
          <template v-else>
            <button @click="confirmSaveAndFinish" :disabled="saving"
              class="w-full bg-primary text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              <IconCheckCircle class="w-4 h-4"/>
              {{ saving ? 'Procesando...' : 'Guardar y Finalizar partido' }}
            </button>
            <button @click="confirmUpdateScore" :disabled="saving"
              class="w-full border border-muted text-slate-600 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              <IconRefreshCw class="w-4 h-4"/>
              Solo actualizar (partido en curso)
            </button>
          </template>
          <button @click="showScore=false" class="w-full text-slate-400 text-sm py-1 hover:text-slate-600 transition">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm dialog -->
    <div v-if="confirmDialog.show" class="confirm-overlay">
      <div class="confirm-card space-y-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <IconAlertCircle class="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 class="font-black text-slate-900 text-base leading-tight">{{ confirmDialog.title }}</h3>
            <p class="text-slate-500 text-sm mt-1 leading-snug">{{ confirmDialog.body }}</p>
          </div>
        </div>
        <div class="flex gap-3">
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

function confirmCorrectResult() {
  askConfirm({
    title: '¿Corregir resultado final?',
    body: `El nuevo marcador ${scoreForm.home}-${scoreForm.away} (${scoreMatch.value?.homeTeam} vs ${scoreMatch.value?.awayTeam}) recalculará la tabla de posiciones y el bracket automáticamente.`,
    confirmLabel: 'Guardar corrección',
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
