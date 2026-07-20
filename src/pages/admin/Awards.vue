<template>
  <div class="space-y-4 md:space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Premios y Reconocimientos</h2>
        <p class="text-slate-400 text-xs mt-0.5">Se generan automáticamente al terminar cada fase</p>
      </div>
      <button @click="openForm()" class="btn-primary text-sm">+ Premio manual</button>
    </div>

    <!-- Alerta: fases completadas sin premios -->
    <div v-if="pendingPhases.length" class="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
      <div class="flex items-center gap-2 text-amber-700 font-black text-sm">
        <IconAlertCircle class="w-4 h-4 shrink-0"/>
        {{ pendingPhases.length }} fase{{ pendingPhases.length > 1 ? 's' : '' }} completada{{ pendingPhases.length > 1 ? 's' : '' }} sin premios generados
      </div>
      <div class="flex flex-wrap gap-2">
        <button v-for="p in pendingPhases" :key="p.phase_id"
          @click="regenerate(p)"
          class="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200 transition flex items-center gap-1.5">
          <IconZap class="w-3 h-3"/>
          Generar: {{ p.tournament_name }} · {{ p.category_name }} · {{ p.phase_name }}
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="flex gap-3 flex-wrap">
      <select v-model="selTournament" @change="onTournamentChange"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option v-for="t in tournaments" :key="t.id" :value="t">{{ t.name }}</option>
      </select>
      <select v-model="selCategory" @change="load"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option :value="null">Todas las categorías</option>
        <option v-for="c in categories" :key="c.id" :value="c">{{ c.name }}</option>
      </select>
    </div>

    <!-- Grid de premios -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="award in awards" :key="award.id"
        class="card text-center py-5 space-y-2 relative group">

        <!-- Badge auto-generado -->
        <span v-if="award.auto_generated"
          class="absolute top-3 left-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
          <IconZap class="w-2.5 h-2.5"/> Auto
        </span>

        <!-- Acciones -->
        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button @click="openEdit(award)"
            class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition">
            <IconPencil class="w-3.5 h-3.5"/>
          </button>
          <button @click="confirmDelete(award)"
            class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition">
            <IconTrash2 class="w-3.5 h-3.5"/>
          </button>
        </div>

        <!-- Foto del jugador -->
        <div class="flex justify-center">
          <div v-if="award.playerPhoto" class="w-14 h-14 rounded-full overflow-hidden bg-slate-100 mx-auto">
            <img :src="award.playerPhoto" class="w-full h-full object-cover"/>
          </div>
          <div v-else-if="award.teamLogo" class="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 mx-auto flex items-center justify-center">
            <img :src="award.teamLogo" class="w-full h-full object-contain p-1"/>
          </div>
          <component v-else :is="awardIconComponent(award.type)" class="w-10 h-10" :class="awardIconClass(award.type)" />
        </div>

        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
          <component :is="awardIconComponent(award.type)" class="w-3 h-3" :class="awardIconClass(award.type)" />
          {{ awardLabel(award.type) }}
        </p>
        <p class="font-black text-slate-900 text-lg leading-tight">{{ award.playerName || award.teamName || '—' }}</p>
        <p class="text-xs text-primary font-semibold">{{ award.categoryName }}</p>
        <p v-if="award.description" class="text-slate-400 text-xs leading-snug">{{ award.description }}</p>
      </div>

      <div v-if="!awards.length && !loading" class="col-span-full text-center py-16 text-slate-400">
        <IconAward class="w-12 h-12 mx-auto mb-3 opacity-20"/>
        <p class="font-semibold">Sin premios en esta selección</p>
        <p class="text-xs mt-1">Se generarán automáticamente al terminar las fases</p>
      </div>
    </div>

    <!-- Modal crear/editar premio -->
    <div v-if="showForm" class="modal-overlay">
      <div class="modal-sheet overflow-y-auto p-5">
        <h3 class="font-bold text-slate-900 text-lg">{{ editingAward ? 'Editar premio' : 'Nuevo premio' }}</h3>
        <div class="grid gap-3">
          <template v-if="!editingAward">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-700 mb-1 block">Torneo</label>
                <select v-model="form.tournamentId" @change="onFormTournamentChange"
                  class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                  <option v-for="t in tournaments" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
              </div>
              <div>
                <label class="text-xs text-slate-700 mb-1 block">Categoría</label>
                <select v-model="form.categoryId" @change="loadFormPlayers"
                  class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                  <option :value="null">Sin categoría</option>
                  <option v-for="c in formCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
            </div>
          </template>

          <div>
            <label class="text-xs text-slate-500 mb-2 block">Tipo de premio</label>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="t in awardTypes" :key="t.value" @click="form.type=t.value"
                class="p-2.5 rounded-xl border text-center transition-colors"
                :class="form.type===t.value?'border-primary bg-primary/10':'border-muted hover:border-gray-400'">
                <div class="flex justify-center mb-1">
                  <component :is="t.icon" class="w-5 h-5" :class="t.iconClass" />
                </div>
                <p class="text-slate-900 text-[10px] font-semibold">{{ t.label }}</p>
              </button>
            </div>
          </div>

          <div>
            <label class="text-xs text-slate-700 mb-1 block">Jugador (premios individuales)</label>
            <select v-model="form.playerId"
              class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
              <option :value="null">Sin jugador</option>
              <option v-for="p in formPlayers" :key="p.id" :value="p.id">{{ p.name }} ({{ p.teamName }})</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-700 mb-1 block">Equipo (premios de equipo)</label>
            <select v-model="form.teamId"
              class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
              <option :value="null">Sin equipo</option>
              <option v-for="t in formTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-700 mb-1 block">Descripción</label>
            <input v-model="form.description"
              class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"
              placeholder="Ej. Mayor goleador del torneo"/>
          </div>
        </div>
        <div class="flex gap-3">
          <button @click="confirmSave" :disabled="saving"
            class="btn-primary text-sm flex-1 disabled:opacity-50">
            {{ saving ? 'Guardando...' : editingAward ? 'Guardar cambios' : 'Asignar premio' }}
          </button>
          <button @click="showForm=false" class="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Confirm dialog -->
    <div v-if="confirmDialog.show" class="confirm-overlay">
      <div class="confirm-card space-y-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <IconAlertCircle class="w-5 h-5 text-amber-600"/>
          </div>
          <div>
            <h3 class="font-black text-slate-900 text-base">{{ confirmDialog.title }}</h3>
            <p class="text-slate-500 text-sm mt-1">{{ confirmDialog.body }}</p>
          </div>
        </div>
        <div class="flex gap-3">
          <button @click="confirmDialog.show=false"
            class="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">
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

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/api'
import { Medal, Star, Shield, Trophy, Zap, Award } from 'lucide-vue-next'

const awards        = ref([])
const tournaments   = ref([])
const categories    = ref([])
const formCategories = ref([])
const formPlayers   = ref([])
const formTeams     = ref([])
const pendingPhases = ref([])
const selTournament = ref(null)
const selCategory   = ref(null)
const showForm      = ref(false)
const saving        = ref(false)
const loading       = ref(false)
const editingAward  = ref(null)

const form = reactive({ tournamentId:null, categoryId:null, phaseId:null, type:'top_scorer', playerId:null, teamId:null, description:'' })
const confirmDialog = reactive({ show:false, title:'', body:'', confirmLabel:'', confirmClass:'', onConfirm:null })

const awardTypes = [
  { value:'top_scorer',  icon:Medal,     iconClass:'text-yellow-400', label:'Goleador' },
  { value:'mvp',         icon:Star,      iconClass:'text-yellow-300', label:'MVP' },
  { value:'best_keeper', icon:Shield,    iconClass:'text-blue-400',   label:'Mejor Portero' },
  { value:'best_team',   icon:Trophy,    iconClass:'text-primary',    label:'Mejor Equipo' },
  { value:'revelation',  icon:Zap,       iconClass:'text-accent',     label:'Revelación' },
]
const awardIconMap      = Object.fromEntries(awardTypes.map(t=>[t.value,t.icon]))
const awardIconClassMap = Object.fromEntries(awardTypes.map(t=>[t.value,t.iconClass]))
const awardLabels       = Object.fromEntries(awardTypes.map(t=>[t.value,t.label]))
const awardIconComponent = t => awardIconMap[t] || Award
const awardIconClass     = t => awardIconClassMap[t] || 'text-primary'
const awardLabel         = t => awardLabels[t] || t

function askConfirm({ title, body, confirmLabel, confirmClass, onConfirm }) {
  Object.assign(confirmDialog, { show:true, title, body, confirmLabel, confirmClass, onConfirm })
}
function runConfirm() {
  confirmDialog.show = false
  confirmDialog.onConfirm?.()
}

async function onTournamentChange() {
  selCategory.value = null
  if (!selTournament.value) return
  const { data } = await api.get(`/tournaments/${selTournament.value.slug}/categories`)
  categories.value = data
  if (data.length === 1) selCategory.value = data[0]
  await api.post('/admin/awards/scan-all').catch(() => {})
  await load()
}

async function load() {
  if (!selTournament.value) return
  loading.value = true
  try {
    const params = selCategory.value ? `?cat=${selCategory.value.id}` : ''
    const { data } = await api.get(`/tournaments/${selTournament.value.slug}/awards${params}`)
    awards.value = data
  } catch {} finally { loading.value = false }
}

async function loadPendingPhases() {
  try {
    const { data } = await api.get('/admin/pending-awards')
    pendingPhases.value = data
  } catch {}
}

async function scanAll() {
  try {
    await api.post('/admin/awards/scan-all')
    await Promise.all([load(), loadPendingPhases()])
  } catch {}
}

async function regenerate(phase) {
  askConfirm({
    title: '¿Generar premios automáticos?',
    body: `Se calcularán y asignarán los reconocimientos para "${phase.phase_name}" en ${phase.category_name}. Podrás editarlos después.`,
    confirmLabel: 'Generar',
    confirmClass: 'bg-primary hover:bg-sky-600',
    onConfirm: async () => {
      try {
        await api.post(`/phases/${phase.phase_id}/awards/regenerate`)
        await Promise.all([load(), loadPendingPhases()])
      } catch { alert('Error al generar premios') }
    }
  })
}

async function onFormTournamentChange() {
  form.categoryId = null; form.playerId = null; form.teamId = null
  const t = tournaments.value.find(t => t.id === form.tournamentId)
  if (!t) return
  const [cats, teams] = await Promise.all([
    api.get(`/tournaments/${t.slug}/categories`),
    api.get(`/tournaments/${t.slug}/teams`)
  ])
  formCategories.value = cats.data
  formTeams.value = teams.data
}

async function loadFormPlayers() {
  // form.teamId quedaba apuntando a un equipo de la categoría anterior (ya no
  // presente en formTeams tras recargar), dejando el <select> sin coincidencia
  form.playerId = null
  form.teamId = null
  const t = tournaments.value.find(t => t.id === form.tournamentId)
  if (!t) return
  const params = form.categoryId ? `?cat=${form.categoryId}` : ''
  const [players, teams] = await Promise.all([
    api.get(`/tournaments/${t.slug}/players${params}`),
    api.get(`/tournaments/${t.slug}/teams${params}`)
  ])
  formPlayers.value = players.data
  formTeams.value = teams.data
}

function openForm() {
  editingAward.value = null
  Object.assign(form, { tournamentId:selTournament.value?.id, categoryId:selCategory.value?.id||null, type:'top_scorer', playerId:null, teamId:null, description:'' })
  if (selTournament.value) onFormTournamentChange()
  showForm.value = true
}

function openEdit(award) {
  editingAward.value = award
  Object.assign(form, { type:award.type, playerId:award.player_id||null, teamId:award.team_id||null, description:award.description||'' })
  // Cargar jugadores y equipos del torneo actual
  if (selTournament.value) {
    const params = selCategory.value ? `?cat=${selCategory.value.id}` : ''
    Promise.all([
      api.get(`/tournaments/${selTournament.value.slug}/players${params}`),
      api.get(`/tournaments/${selTournament.value.slug}/teams${params}`)
    ]).then(([p, t]) => { formPlayers.value = p.data; formTeams.value = t.data })
  }
  showForm.value = true
}

function confirmSave() {
  const action = editingAward.value ? 'guardar cambios en este premio' : 'asignar este premio'
  const recipient = form.playerId
    ? formPlayers.value.find(p => p.id === form.playerId)?.name
    : formTeams.value.find(t => t.id === form.teamId)?.name
  askConfirm({
    title: editingAward.value ? '¿Guardar cambios?' : '¿Asignar premio?',
    body: `Se ${action}: ${awardLabel(form.type)}${recipient ? ` para ${recipient}` : ''}.`,
    confirmLabel: editingAward.value ? 'Guardar' : 'Asignar',
    confirmClass: 'bg-primary hover:bg-sky-600',
    onConfirm: save
  })
}

async function save() {
  saving.value = true
  try {
    if (editingAward.value) {
      await api.put(`/awards/${editingAward.value.id}`, { type:form.type, playerId:form.playerId, teamId:form.teamId, description:form.description })
    } else {
      await api.post('/awards', form)
    }
    await load()
    showForm.value = false
  } catch { alert('Error al guardar') } finally { saving.value = false }
}

function confirmDelete(award) {
  const name = award.playerName || award.teamName || awardLabel(award.type)
  askConfirm({
    title: '¿Eliminar este premio?',
    body: `Se eliminará el reconocimiento "${awardLabel(award.type)}" de ${name}. Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: async () => {
      await api.delete(`/awards/${award.id}`)
      await Promise.all([load(), loadPendingPhases()])
    }
  })
}

onMounted(async () => {
  const { data } = await api.get('/tournaments')
  tournaments.value = data
  // Escanear fases completas sin premios al abrir la página
  await api.post('/admin/awards/scan-all').catch(() => {})
  if (data.length) { selTournament.value = data[0]; await onTournamentChange() }
  await loadPendingPhases()
})
</script>
