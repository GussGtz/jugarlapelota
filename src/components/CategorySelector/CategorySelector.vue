<template>
  <div class="bg-white border-b border-muted">
    <div class="max-w-7xl mx-auto px-3 md:px-4 py-2 flex items-center gap-2">

      <!-- ── MOBILE: Select nativo tipo app ── -->
      <div class="flex md:hidden items-center gap-2 w-full">
        <!-- Select de categoría completo con nombre de grupo -->
        <div class="relative flex-1">
          <select
            v-model="selectedId"
            @change="onSelectChange"
            class="w-full appearance-none bg-slate-50 border border-muted rounded-xl pl-3 pr-8 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          >
            <optgroup
              v-for="group in groups" :key="group.key"
              :label="group.label.toUpperCase()"
            >
              <option v-for="cat in group.cats" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </optgroup>
          </select>
          <IconChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <!-- Badge categoría activa -->
        <div class="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0">
          <component :is="activeGroupIcon" class="w-3 h-3" />
          {{ activeGroupLabel }}
        </div>
      </div>

      <!-- ── DESKTOP: Grupos + chips ── -->
      <div class="hidden md:flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        <!-- Grupos como segmented tabs -->
        <div class="flex items-center bg-slate-100 rounded-xl p-0.5 gap-0.5 shrink-0">
          <button
            v-for="group in groups" :key="group.key"
            @click="selectGroup(group.key)"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            :class="activeGroup === group.key
              ? 'bg-white text-primary shadow-sm'
              : 'text-slate-500 hover:text-slate-700'"
          >
            <component :is="group.icon" class="w-3 h-3" />
            {{ group.label }}
            <span class="text-[9px] font-bold opacity-60">{{ group.cats.length }}</span>
          </button>
        </div>

        <!-- Separador -->
        <div v-if="activeCats.length > 1" class="w-px h-5 bg-muted shrink-0" />

        <!-- Chips de categorías -->
        <template v-if="activeCats.length > 1">
          <button
            v-for="cat in activeCats" :key="cat.id"
            @click="select(cat)"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0"
            :class="selectedId === cat.id
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'border-muted text-slate-600 hover:border-primary/40 hover:text-primary'"
          >
            <IconStar v-if="cat.gender === 'femenil'" class="w-3 h-3" />
            {{ cat.name }}
          </button>
        </template>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCategoriesStore } from '@/stores/categories'

const cats  = useCategoriesStore()
const route = useRoute()
const emit  = defineEmits(['change'])
const props = defineProps({ modelValue: { type: Number, default: null } })

const activeGroup = ref(null)
const selectedId  = ref(props.modelValue)

const groups          = computed(() => cats.grouped())
const activeCats      = computed(() => groups.value.find(g => g.key === activeGroup.value)?.cats || [])
const activeGroupIcon = computed(() => groups.value.find(g => g.key === activeGroup.value)?.icon || null)
const activeGroupLabel = computed(() => groups.value.find(g => g.key === activeGroup.value)?.label || '')

// Fetch categories on mount
onMounted(async () => {
  const slug = route.params.slug
  if (slug) await cats.fetchByTournament(slug)
})

// Sync local state whenever the store list changes (initial load or tournament change)
watch(() => cats.list, (list) => {
  if (!list.length) return
  const target = cats.selected || list[0]
  selectedId.value  = target.id
  activeGroup.value = target.group_name
  if (!cats.selected) cats.selected = target
  // Always emit so pages load their data on mount, regardless of prior selection state
  emit('change', target)
}, { immediate: true })

// Sync when external modelValue changes
watch(() => props.modelValue, (id) => {
  if (id && id !== selectedId.value) {
    const cat = cats.list.find(c => c.id === id)
    if (cat) {
      selectedId.value  = cat.id
      activeGroup.value = cat.group_name
    }
  }
})

// When user clicks a group tab → auto-select its first category
function selectGroup(groupKey) {
  if (activeGroup.value === groupKey) return
  activeGroup.value = groupKey
  const firstCat = groups.value.find(g => g.key === groupKey)?.cats[0]
  if (firstCat) select(firstCat)
}

// Mobile select handler.
// IMPORTANTE: se usa v-model (no :value + parsear e.target.value a mano).
// Un <select> nativo siempre reporta e.target.value como STRING, así que
// leerlo a mano y compararlo contra cat.id con === (o incluso parseInt +
// ===) se rompe en cuanto cat.id no es un número — que es EXACTAMENTE lo
// que pasa en producción (Postgres serializa columnas BIGINT como string
// en el JSON) aunque en local (SQLite) cat.id sea número y todo parezca
// funcionar. v-model delega la lectura en Vue: cachea el valor original
// (sin convertir a string) de cada <option :value="cat.id"> en su nodo del
// DOM y se lo devuelve tal cual a `selectedId` al disparar 'change' — por
// eso selectedId.value SIEMPRE coincide en tipo con los ids de cats.list,
// sin importar si vienen como número o como string. Este es el fix
// definitivo: ya no hay ninguna comparación string-vs-número que pueda
// fallar en producción y no en local.
function onSelectChange() {
  const cat = cats.list.find(c => c.id === selectedId.value)
  if (cat) select(cat)
}

function select(cat) {
  selectedId.value  = cat.id
  activeGroup.value = cat.group_name
  cats.selected     = cat
  emit('change', cat)
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
