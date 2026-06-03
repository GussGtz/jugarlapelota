<template>
  <div class="space-y-4 md:space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Equipos</h2>
      <button @click="openForm()" class="btn-primary text-sm">+ Nuevo equipo</button>
    </div>

    <!-- ── Banner: equipos sin categoría (de inscripciones aprobadas) ── -->
    <div v-if="unassigned.length"
      class="rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 flex items-start gap-4">
      <div class="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
        <IconAlertTriangle class="w-5 h-5 text-white" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-black text-amber-900 text-sm">
          {{ unassigned.length }} {{ unassigned.length === 1 ? 'equipo requiere' : 'equipos requieren' }} asignación de categoría
        </p>
        <p class="text-amber-700 text-xs mt-0.5">
          Estos equipos fueron aprobados desde inscripciones. Asígnales categoría para que aparezcan en el fixture.
        </p>
        <div class="flex flex-wrap gap-2 mt-3">
          <button
            v-for="t in unassigned.slice(0, 5)" :key="t.id"
            @click="quickAssign(t)"
            class="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors">
            <IconShirt class="w-3.5 h-3.5" />
            {{ t.name }}
            <span class="text-amber-400">→ Asignar</span>
          </button>
          <button v-if="unassigned.length > 5"
            @click="filterCategory = null; filterTournament = filterTournament"
            class="text-xs text-amber-600 font-bold hover:underline px-2">
            +{{ unassigned.length - 5 }} más...
          </button>
        </div>
      </div>
      <button @click="showOnlyUnassigned = !showOnlyUnassigned"
        class="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">
        {{ showOnlyUnassigned ? 'Ver todos' : 'Ver solo estos' }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap">
      <select v-model="filterTournament" @change="onTournamentChange"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option v-for="t in tournaments" :key="t.id" :value="t">{{ t.name }}</option>
      </select>
      <select v-model="filterCategory" @change="loadTeams"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option :value="null">Todas las categorías</option>
        <option v-for="c in categories" :key="c.id" :value="c">{{ c.name }}</option>
      </select>
      <button v-if="showOnlyUnassigned" @click="showOnlyUnassigned = false"
        class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300">
        <IconX class="w-3.5 h-3.5" /> Quitar filtro
      </button>
    </div>

    <!-- Grid de equipos AGRUPADOS por nombre -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="group in displayedGroups" :key="group.name"
        class="card space-y-3 transition-shadow hover:shadow-md"
        :class="group.hasUnassigned ? 'border-amber-300 bg-amber-50/40' : ''">

        <!-- Logo + nombre + DT -->
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img v-if="group.logo" :src="group.logo" class="w-full h-full object-contain rounded-xl"/>
            <IconShirt v-else class="w-6 h-6 text-slate-400" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-bold text-slate-900 truncate">{{ group.name }}</h3>
              <span v-if="group.fromInscription"
                class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">
                Inscripción
              </span>
            </div>
            <p v-if="group.coach" class="text-slate-400 text-xs truncate">DT: {{ group.coach }}</p>
          </div>
        </div>

        <!-- Chips de categorías -->
        <div class="flex flex-wrap gap-1.5">
          <!-- Sin categoría -->
          <button v-if="group.hasUnassigned"
            @click="quickAssign(group.unassignedTeam)"
            class="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 transition-colors">
            <IconAlertTriangle class="w-3 h-3" /> Sin categoría · Asignar
          </button>
          <!-- Categorías asignadas -->
          <span v-for="cat in group.categories" :key="cat.id"
            class="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {{ cat.name }}
          </span>
        </div>

        <!-- Acciones -->
        <div class="flex gap-2 pt-0.5">
          <button @click="openCategoryManager(group)"
            class="flex-1 text-xs py-2 border border-primary/30 rounded-lg text-primary hover:bg-primary/10 flex items-center justify-center gap-1.5 font-semibold">
            <IconTag class="w-3.5 h-3.5" />
            Categorías ({{ group.categories.length + (group.hasUnassigned ? 0 : 0) }})
          </button>
          <button @click="openForm(group.primaryTeam)"
            class="text-xs py-2 px-3 border border-muted rounded-lg text-slate-500 hover:text-slate-900"
            title="Editar datos del equipo">
            <IconPencil class="w-4 h-4" />
          </button>
          <button @click="deleteGroup(group)"
            class="text-xs py-2 px-3 border border-red-600/30 rounded-lg text-red-400 hover:bg-red-600/10"
            title="Eliminar equipo">
            <IconTrash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <p v-if="!displayedGroups.length && !loading" class="col-span-full text-center text-slate-500 py-16">
        Sin equipos registrados.
      </p>
    </div>

    <!-- ── Modal: Gestionar categorías de un equipo ── -->
    <div v-if="showCatManager" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl border border-muted w-full max-w-md shadow-xl">
        <div class="px-6 py-4 border-b border-muted flex items-center justify-between">
          <div>
            <h3 class="font-black text-slate-900">Categorías del equipo</h3>
            <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <IconShirt class="w-3.5 h-3.5" /> {{ catManagerGroup?.name }}
            </p>
          </div>
          <button @click="showCatManager = false" class="text-slate-400 hover:text-slate-700">
            <IconX class="w-5 h-5" />
          </button>
        </div>

        <div class="px-6 py-5 space-y-4">
          <!-- Categorías actuales con opción de quitar -->
          <div v-if="catManagerGroup?.categories.length || catManagerGroup?.hasUnassigned">
            <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Asignadas actualmente</p>
            <div class="flex flex-wrap gap-2">
              <div v-if="catManagerGroup?.hasUnassigned"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 text-xs font-bold">
                <IconAlertTriangle class="w-3 h-3" />
                Sin categoría
                <button @click="deleteTeam(catManagerGroup.unassignedTeam.id); showCatManager = false"
                  class="ml-1 hover:text-red-500 transition-colors" title="Eliminar entrada sin categoría">
                  <IconX class="w-3 h-3" />
                </button>
              </div>
              <div v-for="cat in catManagerGroup?.categories" :key="cat.id"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                {{ cat.name }}
                <button @click="removeCategoryFromGroup(cat)"
                  class="ml-1 hover:text-red-500 transition-colors" title="Quitar esta categoría">
                  <IconX class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <!-- Agregar más categorías -->
          <div>
            <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Agregar categorías</p>
            <div class="flex flex-wrap gap-2">
              <button v-for="c in availableCategories" :key="c.id"
                @click="addCategoryToGroup(c)"
                class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border-2 border-dashed border-slate-300 text-slate-500 hover:border-primary hover:text-primary transition-all font-medium">
                <IconPlus class="w-3 h-3" /> {{ c.name }}
              </button>
              <p v-if="!availableCategories.length" class="text-xs text-slate-400 italic">
                El equipo ya está en todas las categorías disponibles.
              </p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-muted">
          <button @click="showCatManager = false" class="btn-primary text-sm w-full">Listo</button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════
         MODAL: Asignación rápida de categoría
    ═══════════════════════════════════ -->
    <div v-if="showQuickAssign" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl border border-muted w-full max-w-md shadow-xl">

        <div class="px-6 py-4 border-b border-muted flex items-center justify-between">
          <div>
            <h3 class="font-black text-slate-900">Asignar categoría</h3>
            <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <IconShirt class="w-3.5 h-3.5" /> {{ quickTeam?.name }}
            </p>
          </div>
          <button @click="showQuickAssign = false" class="text-slate-400 hover:text-slate-700">
            <IconX class="w-5 h-5" />
          </button>
        </div>

        <div class="px-6 py-5 space-y-4">
          <!-- Info de inscripción si aplica -->
          <div v-if="quickTeamInscription"
            class="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 space-y-1">
            <p class="font-bold flex items-center gap-1.5"><IconClipboardList class="w-3.5 h-3.5" /> Datos de la inscripción</p>
            <p>Contacto: <span class="font-semibold">{{ quickTeamInscription.contact_name }}</span></p>
            <p v-if="quickTeamInscription.contact_phone">Tel: {{ quickTeamInscription.contact_phone }}</p>
            <p>Jugadores declarados: {{ quickTeamInscription.players_count }}</p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-black uppercase tracking-wider text-slate-500">Selecciona las categorías</label>
              <div class="flex gap-2">
                <button @click="qaIds = new Set(categories.map(c => c.id))"
                  class="text-[10px] font-bold text-primary hover:underline">Todas</button>
                <span class="text-slate-300">|</span>
                <button @click="qaIds = new Set()"
                  class="text-[10px] font-bold text-slate-400 hover:underline">Ninguna</button>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-0.5">
              <button v-for="c in categories" :key="c.id"
                @click="toggleQa(c.id)"
                class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border-2 font-medium transition-all"
                :class="qaIds.has(c.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'">
                <span class="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0"
                  :class="qaIds.has(c.id) ? 'bg-primary border-primary' : 'border-slate-300'">
                  <IconCheck v-if="qaIds.has(c.id)" class="w-2.5 h-2.5 text-white" />
                </span>
                {{ c.name }}
              </button>
            </div>
            <p v-if="qaIds.size > 0" class="text-[11px] text-primary font-semibold mt-2 flex items-center gap-1">
              <IconCheck class="w-3 h-3" />
              {{ qaIds.size === 1 ? '1 categoría' : qaIds.size + ' categorías' }} seleccionada{{ qaIds.size > 1 ? 's' : '' }}
              <span v-if="qaIds.size > 1"> — se crearán copias del equipo</span>
            </p>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-muted flex gap-3">
          <button @click="saveQuickAssign" :disabled="qaSaving || qaIds.size === 0"
            class="btn-primary text-sm flex-1 disabled:opacity-40">
            {{ qaSaving ? 'Guardando...' : qaIds.size > 1 ? `Asignar a ${qaIds.size} categorías` : 'Asignar categoría' }}
          </button>
          <button @click="showQuickAssign = false" class="btn-ghost text-sm px-5">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════
         MODAL: Crear / Editar equipo completo
    ═══════════════════════════════════ -->
    <div v-if="showForm" class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"/>
        <div class="modal-header">
          <h3 class="font-bold text-slate-900 text-base">{{ editing ? 'Editar equipo' : 'Nuevo equipo' }}</h3>
          <button @click="showForm = false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>
        <div class="modal-body space-y-4">

          <!-- Torneo -->
          <div>
            <label class="text-xs font-bold text-slate-600 mb-1.5 block">Torneo *</label>
            <select v-model="form.tournamentId" @change="onFormTournamentChange"
              class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
              <option v-for="t in tournaments" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>

          <!-- Categorías (chips en ambos modos) -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-slate-600">
                Categorías
                <span class="text-slate-400 font-normal ml-1">
                  {{ editing ? '(marca o desmarca)' : '(una o varias)' }}
                </span>
              </label>
              <div class="flex gap-2">
                <button type="button" @click="form.categoryIds = new Set(formCategories.map(c => c.id))"
                  class="text-[10px] font-bold text-primary hover:underline">Todas</button>
                <span class="text-slate-300">|</span>
                <button type="button" @click="form.categoryIds = new Set()"
                  class="text-[10px] font-bold text-slate-400 hover:underline">Ninguna</button>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
              <button v-for="c in formCategories" :key="c.id"
                type="button" @click="toggleCat(c.id)"
                class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border-2 font-medium transition-all"
                :class="form.categoryIds.has(c.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 opacity-60'">
                <span class="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all"
                  :class="form.categoryIds.has(c.id) ? 'bg-primary border-primary' : 'border-slate-300'">
                  <IconCheck v-if="form.categoryIds.has(c.id)" class="w-2.5 h-2.5 text-white" />
                </span>
                {{ c.name }}
              </button>
              <p v-if="!formCategories.length" class="text-xs text-slate-400 italic p-1">
                Sin categorías — créalas primero.
              </p>
            </div>

            <p class="text-[11px] mt-1.5 flex items-center gap-1"
              :class="form.categoryIds.size > 0 ? 'text-primary font-semibold' : 'text-slate-400'">
              <IconCheck v-if="form.categoryIds.size > 0" class="w-3 h-3" />
              <template v-if="form.categoryIds.size > 0">
                {{ form.categoryIds.size }} {{ form.categoryIds.size === 1 ? 'categoría' : 'categorías' }} seleccionada{{ form.categoryIds.size > 1 ? 's' : '' }}
                <span v-if="!editing && form.categoryIds.size > 1"> — se creará una entrada por cada una</span>
                <span v-if="editing"> — se sincronizarán al guardar</span>
              </template>
              <template v-else>Sin categoría seleccionada</template>
            </p>
          </div>

          <!-- Nombre -->
          <div>
            <label class="text-xs font-bold text-slate-600 mb-1.5 block">Nombre del equipo *</label>
            <input v-model="form.name"
              class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"
              placeholder="Nombre del equipo"/>
          </div>

          <!-- Logo -->
          <ImageUpload v-model="form.logo" label="Logo del equipo" :height="110" />

          <!-- Coach & Captain -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-bold text-slate-600 mb-1.5 block">Director técnico</label>
              <input v-model="form.coach"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
            </div>
            <div>
              <label class="text-xs font-bold text-slate-600 mb-1.5 block">Capitán</label>
              <input v-model="form.captain"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-slate-600 mb-1.5 block">Descripción</label>
            <input v-model="form.description"
              class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"
              placeholder="Opcional"/>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="save" :disabled="saving" class="btn-primary text-sm flex-1 disabled:opacity-50">
            <span v-if="saving">Guardando...</span>
            <span v-else-if="editing">Guardar cambios</span>
            <span v-else-if="form.categoryIds.size > 1">Crear en {{ form.categoryIds.size }} categorías</span>
            <span v-else>Crear equipo</span>
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
import ImageUpload from '@/components/ImageUpload/ImageUpload.vue'

const teams          = ref([])
const tournaments    = ref([])
const categories     = ref([])
const formCategories = ref([])
const showForm       = ref(false)
const editing        = ref(null)
const loading        = ref(false)
const saving         = ref(false)

const filterTournament  = ref(null)
const filterCategory    = ref(null)
const showOnlyUnassigned = ref(false)

// Quick-assign state
const showQuickAssign      = ref(false)
const quickTeam            = ref(null)
const quickTeamInscription = ref(null)
const qaIds                = ref(new Set())
const qaSaving             = ref(false)

// Category manager state
const showCatManager  = ref(false)
const catManagerGroup = ref(null)

const form = reactive({
  tournamentId: null,
  categoryId:   null,
  categoryIds:  new Set(),
  name: '', logo: '', coach: '', captain: '', description: ''
})

// ── Computed ──────────────────────────────────────────────
const unassigned = computed(() => teams.value.filter(t => !t.category_id))

// Agrupa equipos por nombre (mismo equipo en varias categorías = 1 tarjeta)
const groupedTeams = computed(() => {
  const map = new Map()
  for (const team of teams.value) {
    const key = team.name.trim().toLowerCase()
    if (!map.has(key)) {
      map.set(key, {
        name:           team.name,
        logo:           team.logo || '',
        coach:          team.coach || '',
        captain:        team.captain || '',
        description:    team.description || '',
        fromInscription: !!team.inscription_id,
        primaryTeam:    team,           // para editar datos generales
        unassignedTeam: null,
        hasUnassigned:  false,
        categories:     [],             // { id, name, teamId }
        allTeamIds:     [],
      })
    }
    const g = map.get(key)
    g.allTeamIds.push(team.id)
    if (!team.category_id) {
      g.hasUnassigned  = true
      g.unassignedTeam = team
    } else {
      g.categories.push({ id: team.category_id, name: team.categoryName, teamId: team.id })
    }
    // Logo/coach del primero que los tenga
    if (!g.logo && team.logo) g.logo = team.logo
    if (!g.coach && team.coach) g.coach = team.coach
    if (team.inscription_id) g.fromInscription = true
  }
  return [...map.values()]
})

const displayedGroups = computed(() => {
  let list = groupedTeams.value
  if (showOnlyUnassigned.value) list = list.filter(g => g.hasUnassigned)
  else if (filterCategory.value) {
    list = list.filter(g => g.categories.some(c => c.id === filterCategory.value.id))
  }
  return list
})

// Categorías disponibles que NO tiene ya el grupo seleccionado
const availableCategories = computed(() => {
  if (!catManagerGroup.value) return categories.value
  const assigned = new Set(catManagerGroup.value.categories.map(c => c.id))
  return categories.value.filter(c => !assigned.has(c.id))
})

// ── Helpers ───────────────────────────────────────────────
function toggleCat(id) {
  const s = new Set(form.categoryIds)
  s.has(id) ? s.delete(id) : s.add(id)
  form.categoryIds = s
}
function toggleQa(id) {
  const s = new Set(qaIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  qaIds.value = s
}

// ── Carga ─────────────────────────────────────────────────
async function onTournamentChange() {
  filterCategory.value = null
  showOnlyUnassigned.value = false
  await Promise.all([loadCategories(), loadTeams()])
}

async function loadCategories() {
  if (!filterTournament.value) return
  const { data } = await api.get(`/tournaments/${filterTournament.value.slug}/categories`)
  categories.value = data
}

async function loadTeams() {
  if (!filterTournament.value) return
  loading.value = true
  // Siempre carga todos (el filtro lo hace el computed)
  try {
    const { data } = await api.get(`/tournaments/${filterTournament.value.slug}/teams`)
    teams.value = data
  } catch {} finally { loading.value = false }
}

async function onFormTournamentChange() {
  form.categoryId  = null
  form.categoryIds = new Set()
  const t = tournaments.value.find(t => t.id === form.tournamentId)
  if (!t) return
  const { data } = await api.get(`/tournaments/${t.slug}/categories`)
  formCategories.value = data
}

// ── Quick-assign ──────────────────────────────────────────
async function quickAssign(team) {
  quickTeam.value = team
  qaIds.value     = new Set()
  quickTeamInscription.value = null

  // Cargar datos de inscripción si existe
  if (team.inscription_id && filterTournament.value) {
    try {
      const { data } = await api.get(`/tournaments/${filterTournament.value.slug}/inscriptions`)
      quickTeamInscription.value = data.find(i => i.id === team.inscription_id) || null
    } catch {}
  }

  showQuickAssign.value = true
}

async function saveQuickAssign() {
  if (!quickTeam.value || qaIds.value.size === 0) return
  qaSaving.value = true
  try {
    const ids = [...qaIds.value]

    if (ids.length === 1) {
      // Solo una categoría: actualiza el equipo existente
      await api.put(`/teams/${quickTeam.value.id}`, {
        ...quickTeam.value,
        categoryId: ids[0],
        tournamentId: quickTeam.value.tournament_id
      })
    } else {
      // Varias: actualiza el equipo original con la primera, crea copias para el resto
      await api.put(`/teams/${quickTeam.value.id}`, {
        ...quickTeam.value,
        categoryId: ids[0],
        tournamentId: quickTeam.value.tournament_id
      })
      await Promise.all(ids.slice(1).map(catId =>
        api.post('/teams', {
          name:         quickTeam.value.name,
          logo:         quickTeam.value.logo || '',
          coach:        quickTeam.value.coach || '',
          captain:      quickTeam.value.captain || '',
          description:  quickTeam.value.description || '',
          categoryId:   catId,
          tournamentId: quickTeam.value.tournament_id
        })
      ))
    }

    await loadTeams()
    showQuickAssign.value = false
  } catch (e) {
    alert(e.response?.data?.error || 'Error al asignar')
  } finally {
    qaSaving.value = false
  }
}

// ── Crear / Editar ────────────────────────────────────────
async function openForm(team = null) {
  editing.value = team
  if (team) {
    // Buscar el grupo completo para pre-cargar TODAS las categorías del equipo
    const group = groupedTeams.value.find(
      g => g.name.trim().toLowerCase() === team.name.trim().toLowerCase()
    )
    const preselectedCatIds = new Set(
      (group?.categories || []).map(c => c.id).concat(
        team.category_id ? [team.category_id] : []
      )
    )
    // Guardar referencia al grupo completo para sincronizar al guardar
    form._group = group || null

    Object.assign(form, {
      tournamentId: team.tournament_id,
      categoryId:   team.category_id || null,
      categoryIds:  preselectedCatIds,
      name:         team.name,
      logo:         team.logo || group?.logo || '',
      coach:        team.coach || group?.coach || '',
      captain:      team.captain || group?.captain || '',
      description:  team.description || group?.description || ''
    })
    const t = tournaments.value.find(t => t.id === team.tournament_id)
    if (t) {
      const { data } = await api.get(`/tournaments/${t.slug}/categories`)
      formCategories.value = data
    }
  } else {
    form._group = null
    const t = filterTournament.value || tournaments.value[0]
    Object.assign(form, {
      tournamentId: t?.id,
      categoryId:   null,
      categoryIds:  filterCategory.value ? new Set([filterCategory.value.id]) : new Set(),
      name: '', logo: '', coach: '', captain: '', description: ''
    })
    await onFormTournamentChange()
    if (filterCategory.value) form.categoryIds = new Set([filterCategory.value.id])
  }
  showForm.value = true
}

async function save() {
  if (!form.name.trim()) return alert('El nombre del equipo es requerido')
  saving.value = true

  const payload = {
    name:         form.name.trim(),
    logo:         form.logo,
    coach:        form.coach,
    captain:      form.captain,
    description:  form.description,
    tournamentId: form.tournamentId
  }

  try {
    if (editing.value) {
      // ── EDITAR: sincroniza categorías del grupo ──
      const group     = form._group
      const newCatIds = new Set(form.categoryIds)

      // IDs de las categorías que el grupo ya tenía
      const oldCatMap = new Map() // catId → teamId
      if (group) {
        for (const c of group.categories) oldCatMap.set(c.id, c.teamId)
        if (group.unassignedTeam) oldCatMap.set(null, group.unassignedTeam.id)
      } else {
        oldCatMap.set(editing.value.category_id || null, editing.value.id)
      }

      const allOldIds  = new Set(oldCatMap.keys())
      const toAdd      = [...newCatIds].filter(id => !allOldIds.has(id))
      const toRemove   = [...allOldIds].filter(id => id !== null && !newCatIds.has(id))
      const toKeep     = [...newCatIds].filter(id => allOldIds.has(id))

      // Actualizar datos comunes en todos los que se quedan
      const updateIds = [...toKeep].map(catId => oldCatMap.get(catId)).filter(Boolean)
      if (updateIds.length === 0 && group) {
        // Si eliminaron todas, actualiza al menos el primario
        updateIds.push(editing.value.id)
      }
      await Promise.all(updateIds.map(id =>
        api.put(`/teams/${id}`, { ...payload, categoryId: [...oldCatMap.entries()].find(([,v]) => v === id)?.[0] || null })
      ))

      // Quitar categorías desmarcadas
      await Promise.all(toRemove.map(catId => {
        const teamId = oldCatMap.get(catId)
        return teamId ? api.delete(`/teams/${teamId}`) : Promise.resolve()
      }))

      // Quitar entrada sin categoría si ahora tiene categorías
      if (newCatIds.size > 0 && group?.unassignedTeam) {
        await api.delete(`/teams/${group.unassignedTeam.id}`)
      }

      // Agregar categorías nuevas
      await Promise.all(toAdd.map(catId =>
        api.post('/teams', { ...payload, categoryId: catId })
      ))

    } else {
      // ── CREAR: una entrada por cada categoría seleccionada ──
      const catIds = form.categoryIds.size > 0 ? [...form.categoryIds] : [null]
      await Promise.all(catIds.map(catId =>
        api.post('/teams', { ...payload, categoryId: catId })
      ))
    }

    await loadTeams()
    showForm.value = false
  } catch (e) {
    alert(e.response?.data?.error || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

async function deleteTeam(id) {
  if (!confirm('¿Eliminar este equipo? Se eliminarán sus jugadores.')) return
  await api.delete(`/teams/${id}`)
  await loadTeams()
}

async function deleteGroup(group) {
  const msg = group.allTeamIds.length > 1
    ? `¿Eliminar "${group.name}" de TODAS sus categorías (${group.allTeamIds.length} entradas)?`
    : `¿Eliminar el equipo "${group.name}"?`
  if (!confirm(msg)) return
  await Promise.all(group.allTeamIds.map(id => api.delete(`/teams/${id}`)))
  await loadTeams()
}

// Category manager
function openCategoryManager(group) {
  catManagerGroup.value = { ...group, categories: [...group.categories] }
  showCatManager.value  = true
}

async function addCategoryToGroup(cat) {
  const g = catManagerGroup.value
  if (!g) return
  // Crear nuevo equipo con esa categoría copiando datos del primario
  await api.post('/teams', {
    name:         g.name,
    logo:         g.logo,
    coach:        g.coach,
    captain:      g.captain,
    description:  g.description,
    categoryId:   cat.id,
    tournamentId: g.primaryTeam.tournament_id
  })
  await loadTeams()
  // Refrescar el grupo en el manager
  const updated = groupedTeams.value.find(gr => gr.name.toLowerCase() === g.name.toLowerCase())
  if (updated) catManagerGroup.value = { ...updated, categories: [...updated.categories] }
}

async function removeCategoryFromGroup(cat) {
  if (!confirm(`¿Quitar a "${catManagerGroup.value?.name}" de la categoría "${cat.name}"?`)) return
  await api.delete(`/teams/${cat.teamId}`)
  await loadTeams()
  const updated = groupedTeams.value.find(gr => gr.name.toLowerCase() === catManagerGroup.value?.name.toLowerCase())
  if (updated) catManagerGroup.value = { ...updated, categories: [...updated.categories] }
  else showCatManager.value = false
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
