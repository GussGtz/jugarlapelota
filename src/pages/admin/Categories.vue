<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Categorías</h2>
      <button @click="openManager()" class="btn-primary text-sm">+ Administrar categorías</button>
    </div>

    <!-- Tournament selector -->
    <div class="flex items-center gap-3">
      <label class="text-sm text-slate-500">Torneo:</label>
      <select v-model="selectedTournament" @change="load"
        class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option v-for="t in tournaments" :key="t.id" :value="t">{{ t.name }}</option>
      </select>
    </div>

    <!-- Category list -->
    <div v-if="!loading" class="space-y-6">
      <div v-for="group in grouped" :key="group.key">
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <component :is="group.icon" class="w-4 h-4" />
          {{ group.label }}
          <span class="bg-muted rounded-full px-2 py-0.5 text-xs">{{ group.cats.length }}</span>
        </h3>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="cat in group.cats" :key="cat.id"
            class="card flex items-center justify-between gap-3"
            :class="cat.gender === 'femenil' ? 'border-pink-500/20' : ''">
            <div>
              <div class="flex items-center gap-2">
                <IconStar   v-if="cat.gender === 'femenil'" class="w-4 h-4 text-pink-400" />
                <IconCircle v-else class="w-4 h-4 text-accent" />
                <p class="font-semibold text-slate-900">{{ cat.name }}</p>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">{{ cat.gender }} · {{ cat.group_name }}</p>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <button @click="openEditForm(cat)"
                class="text-xs text-slate-500 hover:text-slate-900 px-2 py-1 border border-muted rounded-lg">
                Editar
              </button>
              <button @click="deleteCat(cat)"
                class="text-xs text-red-500 px-2 py-1 border border-red-600/30 rounded-lg">
                <IconTrash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <p v-if="!categories.length && selectedTournament" class="text-center text-slate-500 py-16">
        Sin categorías. Usa "+ Administrar categorías" para agregar.
      </p>
    </div>
    <div v-else class="grid sm:grid-cols-3 gap-3">
      <div v-for="i in 6" :key="i" class="card animate-pulse h-16 bg-muted/50"></div>
    </div>

    <!-- ══════════════════════════════════════════
         MODAL: GESTIONAR CATEGORÍAS (agregar/quitar)
    ═══════════════════════════════════════════ -->
    <div v-if="showManager" class="modal-overlay">
      <div class="modal-sheet-lg">

        <!-- Header -->
        <div class="px-6 py-4 border-b border-muted flex items-center justify-between shrink-0">
          <div>
            <h3 class="font-bold text-slate-900 text-lg">Categorías</h3>
            <p class="text-xs text-slate-400 mt-0.5">{{ selectedTournament?.name }}</p>
          </div>
          <button @click="showManager = false" class="text-slate-400 hover:text-slate-700">
            <IconX class="w-5 h-5" />
          </button>
        </div>

        <!-- Loading overlay -->
        <div v-if="managerLoading" class="flex-1 flex items-center justify-center py-16">
          <div class="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>

        <template v-else>
          <div class="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            <!-- Encabezado con acciones masivas -->
            <div class="flex items-center justify-between">
              <p class="text-xs font-black uppercase tracking-wider text-slate-500">
                Selecciona las categorías que quieres agregar
              </p>
              <div class="flex gap-3">
                <button @click="selectAll" class="text-[11px] font-bold text-primary hover:underline">Todas</button>
                <span class="text-slate-200">|</span>
                <button @click="selectNone" class="text-[11px] font-bold text-slate-400 hover:text-slate-700 hover:underline">Ninguna</button>
              </div>
            </div>

            <!-- Secciones de presets -->
            <div v-for="section in presetSections" :key="section.label" class="space-y-2">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <component :is="section.icon" class="w-3.5 h-3.5" /> {{ section.label }}
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in section.opts" :key="opt.name"
                  @click="togglePreset(opt)"
                  :disabled="isBlocked(opt.name)"
                  :title="isBlocked(opt.name) ? 'Tiene fases/rondas configuradas — elimínalas primero para remover esta categoría' : ''"
                  class="relative flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border-2 transition-all font-medium select-none"
                  :class="chipClass(opt)">

                  <!-- Checkbox visual -->
                  <span class="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-all"
                    :class="isSelected(opt.name)
                      ? opt.gender === 'femenil' ? 'bg-pink-400 border-pink-400' : 'bg-primary border-primary'
                      : 'border-slate-300 bg-white'">
                    <IconCheck v-if="isSelected(opt.name)" class="w-2.5 h-2.5 text-white" />
                  </span>

                  <IconStar v-if="opt.gender === 'femenil'" class="w-3 h-3 text-pink-400 shrink-0" />
                  {{ opt.name }}

                  <!-- Badge "tiene fases" -->
                  <span v-if="isBlocked(opt.name)"
                    class="ml-0.5 text-[8px] font-black bg-amber-100 text-amber-600 px-1 py-0.5 rounded uppercase tracking-wide">
                    Activa
                  </span>
                </button>
              </div>
            </div>

            <!-- Separador + categoría personalizada -->
            <div class="relative">
              <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-muted"></div></div>
              <div class="relative flex justify-center">
                <span class="bg-white px-3 text-[11px] text-slate-400 font-medium">o crea una personalizada</span>
              </div>
            </div>

            <div class="grid gap-3">
              <div>
                <label class="text-xs text-slate-700 mb-1 block">Nombre</label>
                <input v-model="customForm.name"
                  class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"
                  placeholder="Ej: Sub-8 Femenil Especial" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-700 mb-1 block">Género</label>
                  <select v-model="customForm.gender"
                    class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                    <option value="varonil">Varonil</option>
                    <option value="femenil">Femenil</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-slate-700 mb-1 block">Grupo</label>
                  <select v-model="customForm.group_name"
                    class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                    <option value="infantil">Infantil</option>
                    <option value="juvenil">Juvenil</option>
                    <option value="libre">Libre</option>
                    <option value="veteranos">Veteranos</option>
                    <option value="femenil">Femenil</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Resumen de cambios -->
            <div v-if="pendingAdds.length || pendingRemoves.length"
              class="rounded-xl border overflow-hidden text-xs">
              <div v-if="pendingAdds.length" class="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                <IconCheck class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span class="text-emerald-700 font-semibold">
                  Se agregarán: {{ pendingAdds.join(', ') }}
                </span>
              </div>
              <div v-if="pendingRemoves.length" class="px-4 py-2.5 bg-red-50 flex items-center gap-2">
                <IconTrash2 class="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span class="text-red-600 font-semibold">
                  Se eliminarán: {{ pendingRemoves.join(', ') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-muted flex gap-3 shrink-0">
            <button @click="applyChanges" :disabled="saving || (!pendingAdds.length && !pendingRemoves.length && !customForm.name.trim())"
              class="btn-primary text-sm flex-1 disabled:opacity-40 disabled:cursor-not-allowed">
              {{ saving ? 'Guardando...' : summaryLabel }}
            </button>
            <button @click="showManager = false" class="btn-ghost text-sm px-5">Cancelar</button>
          </div>
        </template>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         MODAL: EDITAR CATEGORÍA EXISTENTE
    ═══════════════════════════════════════════ -->
    <div v-if="showEditForm" class="modal-overlay">
      <div class="modal-sheet overflow-y-auto p-5">
        <h3 class="font-bold text-slate-900 text-lg">Editar categoría</h3>
        <div class="grid gap-3">
          <div>
            <label class="text-xs text-slate-700 mb-1 block">Nombre</label>
            <input v-model="editForm.name"
              class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Género</label>
              <select v-model="editForm.gender"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option value="varonil">Varonil</option>
                <option value="femenil">Femenil</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Grupo</label>
              <select v-model="editForm.group_name"
                class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
                <option value="infantil">Infantil</option>
                <option value="juvenil">Juvenil</option>
                <option value="libre">Libre</option>
                <option value="veteranos">Veteranos</option>
                <option value="femenil">Femenil</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-700 mb-1 block">Orden</label>
            <input v-model.number="editForm.order_index" type="number" min="0"
              class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
          </div>
        </div>
        <div class="flex gap-3">
          <button @click="saveEdit" :disabled="saving" class="btn-primary text-sm flex-1 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
          <button @click="showEditForm = false" class="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api'
import { useCategoriesStore } from '@/stores/categories'
import { Circle, Activity, Trophy, Crown, Star } from 'lucide-vue-next'

const catsStore = useCategoriesStore()
const { CATEGORY_OPTIONS } = catsStore

const tournaments        = ref([])
const selectedTournament = ref(null)
const categories         = ref([])
const loading            = ref(false)
const saving             = ref(false)

// ── Manager state ───────────────────────────────────────
const showManager    = ref(false)
const managerLoading = ref(false)
const selectedNames  = ref(new Set()) // nombres actualmente seleccionados en el modal
const blockedNames   = ref(new Set()) // categorías que no se pueden desmarcar (tienen fases)
const originalNames  = ref(new Set()) // nombres que ya existían al abrir el modal

// ── Edit form state ─────────────────────────────────────
const showEditForm = ref(false)
const editingCat   = ref(null)
const editForm     = reactive({ name: '', gender: 'varonil', group_name: 'libre', order_index: 0 })

// ── Custom category form dentro del manager ─────────────
const customForm = reactive({ name: '', gender: 'varonil', group_name: 'libre' })

// ── Agrupación para el listado ───────────────────────────
const GROUPS = {
  infantil:  { label: 'Infantil',  icon: Circle,   key: 'infantil'  },
  juvenil:   { label: 'Juvenil',   icon: Activity, key: 'juvenil'   },
  libre:     { label: 'Libre',     icon: Trophy,   key: 'libre'     },
  veteranos: { label: 'Veteranos', icon: Crown,    key: 'veteranos' },
  femenil:   { label: 'Femenil',   icon: Star,     key: 'femenil'   },
}

const grouped = computed(() => {
  const groups = {}
  for (const cat of categories.value) {
    const g = cat.group_name || 'libre'
    if (!groups[g]) groups[g] = { ...GROUPS[g], cats: [] }
    groups[g].cats.push(cat)
  }
  return Object.values(groups)
})

// ── Presets agrupados para el selector ─────────────────
const presetSections = computed(() => {
  const map = {}
  for (const opt of CATEGORY_OPTIONS) {
    const g = opt.group_name || 'libre'
    if (!map[g]) map[g] = { label: GROUPS[g]?.label || g, icon: GROUPS[g]?.icon || Circle, opts: [] }
    map[g].opts.push(opt)
  }
  return Object.values(map)
})

// ── Helpers de estado de cada chip ──────────────────────
function isSelected(name) { return selectedNames.value.has(name) }
function isBlocked(name)  { return blockedNames.value.has(name) }

function chipClass(opt) {
  const sel     = isSelected(opt.name)
  const blocked = isBlocked(opt.name)
  if (blocked) {
    return opt.gender === 'femenil'
      ? 'border-pink-300 bg-pink-50 text-pink-700 cursor-not-allowed'
      : 'border-primary/40 bg-primary/5 text-primary/70 cursor-not-allowed'
  }
  if (sel) {
    return opt.gender === 'femenil'
      ? 'border-pink-400 bg-pink-50 text-pink-700 cursor-pointer'
      : 'border-primary bg-primary/10 text-primary cursor-pointer'
  }
  return 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
}

// ── Cambios pendientes ───────────────────────────────────
const pendingAdds = computed(() =>
  [...selectedNames.value].filter(n => !originalNames.value.has(n))
)
const pendingRemoves = computed(() =>
  [...originalNames.value].filter(n => !selectedNames.value.has(n) && !blockedNames.value.has(n))
)

const summaryLabel = computed(() => {
  const adds    = pendingAdds.value.length
  const removes = pendingRemoves.value.length
  const custom  = customForm.name.trim() ? 1 : 0
  const total   = adds + removes + custom
  if (!total) return 'Sin cambios'
  const parts = []
  if (adds + custom > 0) parts.push(`agregar ${adds + custom}`)
  if (removes > 0)       parts.push(`quitar ${removes}`)
  return `Aplicar (${parts.join(', ')})`
})

// ── Toggle de presets ────────────────────────────────────
function togglePreset(opt) {
  if (isBlocked(opt.name)) return
  const s = new Set(selectedNames.value)
  s.has(opt.name) ? s.delete(opt.name) : s.add(opt.name)
  selectedNames.value = s
}

function selectAll() {
  selectedNames.value = new Set([
    ...blockedNames.value,                  // mantener las bloqueadas
    ...CATEGORY_OPTIONS.map(o => o.name)
  ])
}

function selectNone() {
  // Solo deseleccionar las que no están bloqueadas
  selectedNames.value = new Set(blockedNames.value)
}

// ── Abrir el manager ─────────────────────────────────────
async function openManager() {
  if (!selectedTournament.value) return
  showManager.value    = true
  managerLoading.value = true
  customForm.name      = ''
  customForm.gender    = 'varonil'
  customForm.group_name = 'libre'

  try {
    // Cargar categorías actuales
    const { data: cats } = await api.get(`/tournaments/${selectedTournament.value.slug}/categories`)

    // Cargar fases para saber cuáles están bloqueadas
    const { data: phases } = await api.get(`/tournaments/${selectedTournament.value.slug}/phases`)
    const catIdsWithPhases = new Set(phases.filter(p => p.category_id).map(p => p.category_id))

    const existingNames = new Set(cats.map(c => c.name))
    const blocked       = new Set(
      cats.filter(c => catIdsWithPhases.has(c.id)).map(c => c.name)
    )

    originalNames.value = new Set(existingNames)
    selectedNames.value = new Set(existingNames)
    blockedNames.value  = blocked
  } catch {} finally {
    managerLoading.value = false
  }
}

// ── Aplicar cambios ──────────────────────────────────────
async function applyChanges() {
  if (!selectedTournament.value) return
  saving.value = true
  try {
    const catMap = Object.fromEntries(categories.value.map(c => [c.name, c]))

    // 1. Agregar las nuevas seleccionadas (que no existen)
    const toAdd = pendingAdds.value
    if (toAdd.length) {
      const opts = CATEGORY_OPTIONS.filter(o => toAdd.includes(o.name))
      await Promise.all(opts.map((opt, i) =>
        api.post('/categories', {
          name:         opt.name,
          gender:       opt.gender,
          group_name:   opt.group_name,
          order_index:  categories.value.length + i,
          tournamentId: selectedTournament.value.id
        })
      ))
    }

    // 2. Eliminar las que se desmarcaron (que no están bloqueadas)
    const toRemove = pendingRemoves.value
    if (toRemove.length) {
      await Promise.all(
        toRemove
          .filter(n => catMap[n] && !blockedNames.value.has(n))
          .map(n => api.delete(`/categories/${catMap[n].id}`))
      )
    }

    // 3. Crear categoría personalizada si se escribió
    if (customForm.name.trim()) {
      await api.post('/categories', {
        name:         customForm.name.trim(),
        gender:       customForm.gender,
        group_name:   customForm.group_name,
        order_index:  categories.value.length,
        tournamentId: selectedTournament.value.id
      })
    }

    await load()
    showManager.value = false
  } catch (e) {
    alert(e.response?.data?.error || 'Error al aplicar cambios')
  } finally {
    saving.value = false
  }
}

// ── Carga principal ──────────────────────────────────────
async function load() {
  if (!selectedTournament.value) return
  loading.value = true
  try {
    const { data } = await api.get(`/tournaments/${selectedTournament.value.slug}/categories`)
    categories.value = data
  } catch {} finally { loading.value = false }
}

// ── Editar categoría existente ──────────────────────────
function openEditForm(cat) {
  editingCat.value = cat
  Object.assign(editForm, { name: cat.name, gender: cat.gender, group_name: cat.group_name, order_index: cat.order_index })
  showEditForm.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    await api.put(`/categories/${editingCat.value.id}`, editForm)
    await load()
    showEditForm.value = false
  } catch (e) {
    alert(e.response?.data?.error || 'Error al guardar')
  } finally { saving.value = false }
}

// ── Eliminar categoría ───────────────────────────────────
async function deleteCat(cat) {
  // Verificar si tiene fases antes de preguntar
  try {
    const { data: phases } = await api.get(
      `/tournaments/${selectedTournament.value.slug}/phases?cat=${cat.id}`
    )
    if (phases.length > 0) {
      alert(`No se puede eliminar "${cat.name}" porque tiene ${phases.length} fase(s) configurada(s).\n\nElimina primero las fases y rondas de esta categoría.`)
      return
    }
  } catch {}
  if (!confirm(`¿Eliminar la categoría "${cat.name}"? Se eliminarán los equipos relacionados.`)) return
  await api.delete(`/categories/${cat.id}`)
  await load()
}

onMounted(async () => {
  const { data } = await api.get('/tournaments')
  tournaments.value = data
  if (data.length) { selectedTournament.value = data[0]; await load() }
})
</script>
