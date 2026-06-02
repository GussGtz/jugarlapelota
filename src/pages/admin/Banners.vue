<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Banners y Publicidad</h2>
      <button @click="openForm()" class="btn-primary text-sm">+ Nuevo banner</button>
    </div>

    <select v-model="selTournament" @change="load" class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
      <option v-for="t in tournaments" :key="t.slug" :value="t">{{ t.name }}</option>
    </select>

    <!-- Grouped by position -->
    <div v-for="group in grouped" :key="group.position" class="space-y-3">
      <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
        <component :is="positionIcon(group.position)" class="w-4 h-4" /> {{ positionLabel(group.position) }}
        <span class="text-xs font-normal">· {{ group.banners.length }} banner(s)</span>
      </h3>
      <div class="grid sm:grid-cols-2 gap-4">
        <div v-for="b in group.banners" :key="b.id" class="card space-y-3">
          <div class="rounded-xl overflow-hidden bg-slate-100 aspect-video flex items-center justify-center">
            <img :src="b.image_url" :alt="b.alt_text" class="max-w-full max-h-full object-contain"/>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-slate-900 text-sm truncate">{{ b.alt_text || 'Sin descripción' }}</p>
              <p class="text-slate-400 text-xs truncate">{{ b.link_url || 'Sin enlace' }}</p>
              <p v-if="b.ends_at" class="text-slate-400 text-xs">Vence: {{ fmtDate(b.ends_at) }}</p>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full font-bold ml-2" :class="b.is_active?'bg-green-600/20 text-green-400':'bg-gray-700 text-slate-400'">
              {{ b.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          <div class="flex gap-2">
            <button @click="openForm(b)" class="flex-1 text-xs py-1.5 border border-primary/30 rounded-lg text-primary hover:bg-primary/10">Editar</button>
            <button @click="toggleActive(b)" class="text-xs py-1.5 px-3 border border-muted rounded-lg text-slate-500 hover:text-slate-900">
              {{ b.is_active ? 'Desactivar' : 'Activar' }}
            </button>
            <button @click="deleteBanner(b.id)" class="text-xs py-1.5 px-2 border border-red-600/30 rounded-lg text-red-400"><IconTrash2 class="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
    <p v-if="!banners.length && !loading" class="text-center text-slate-500 py-16">Sin banners. Crea el primero.</p>

    <!-- Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-card rounded-2xl border border-muted w-full max-w-lg p-6 space-y-4">
        <h3 class="font-bold text-slate-900 text-lg">{{ editing ? 'Editar banner' : 'Nuevo banner' }}</h3>
        <div class="grid gap-3">
          <div>
            <label class="text-xs text-slate-700 mb-1 block">Posición *</label>
            <select v-model="form.position" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
              <option v-for="p in positions" :key="p.value" :value="p.value">{{ p.label }} — {{ p.size }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-700 mb-1 block">URL de la imagen *</label>
            <input v-model="form.image_url" placeholder="https://..." class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
          </div>
          <!-- Preview -->
          <div v-if="form.image_url" class="rounded-xl overflow-hidden bg-slate-100">
            <img :src="form.image_url" class="w-full object-contain max-h-24" @error="()=>{}"/>
          </div>
          <div>
            <label class="text-xs text-slate-700 mb-1 block">URL destino (al hacer click)</label>
            <input v-model="form.link_url" placeholder="https://..." class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
          </div>
          <div>
            <label class="text-xs text-slate-700 mb-1 block">Texto alternativo / Descripción</label>
            <input v-model="form.alt_text" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Fecha inicio</label>
              <input v-model="form.starts_at" type="date" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
            </div>
            <div>
              <label class="text-xs text-slate-700 mb-1 block">Fecha vencimiento</label>
              <input v-model="form.ends_at" type="date" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <button @click="save" :disabled="saving" class="btn-primary text-sm flex-1 disabled:opacity-50">{{ saving?'Guardando...':'Guardar' }}</button>
          <button @click="showForm=false" class="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api'
import { Bookmark, ArrowRight, SlidersHorizontal, Tag } from 'lucide-vue-next'

const banners       = ref([])
const tournaments   = ref([])
const selTournament = ref(null)
const showForm      = ref(false)
const editing       = ref(null)
const saving        = ref(false)
const loading       = ref(false)

const form = reactive({position:'header',image_url:'',link_url:'',alt_text:'',starts_at:'',ends_at:'',is_active:1})

const positions = [
  {value:'header',            icon:Bookmark,          label:'Header',            size:'1200×120px'},
  {value:'between-sections',  icon:ArrowRight,        label:'Entre secciones',   size:'800×100px'},
  {value:'sidebar',           icon:SlidersHorizontal, label:'Sidebar',           size:'300×250px'},
  {value:'footer',            icon:Tag,               label:'Footer',            size:'1200×80px'},
]

const positionLabelMap = Object.fromEntries(positions.map(p=>[p.value,p.label]))
const positionIconMap  = Object.fromEntries(positions.map(p=>[p.value,p.icon]))
const positionLabel = v => positionLabelMap[v] || v
const positionIcon  = v => positionIconMap[v]  || Bookmark

const grouped = computed(() => {
  const groups = {}
  for (const b of banners.value) {
    if (!groups[b.position]) groups[b.position] = {position:b.position, banners:[]}
    groups[b.position].banners.push(b)
  }
  return Object.values(groups)
})

const fmtDate = d => d ? new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : ''

function openForm(b=null) {
  editing.value = b
  if (b) Object.assign(form, {position:b.position,image_url:b.image_url,link_url:b.link_url||'',alt_text:b.alt_text||'',starts_at:b.starts_at||'',ends_at:b.ends_at||'',is_active:b.is_active})
  else   Object.assign(form, {position:'header',image_url:'',link_url:'',alt_text:'',starts_at:'',ends_at:'',is_active:1})
  showForm.value = true
}

async function save() {
  if (!form.image_url) return alert('La URL de la imagen es requerida')
  saving.value = true
  try {
    if (editing.value) await api.put(`/banners/${editing.value.id}`, form)
    else await api.post('/banners', {...form, tournamentId: selTournament.value?.id})
    await load(); showForm.value=false
  } catch {alert('Error')} finally {saving.value=false}
}

async function toggleActive(b) {
  await api.put(`/banners/${b.id}`, {...b, is_active: b.is_active ? 0 : 1})
  b.is_active = b.is_active ? 0 : 1
}

async function deleteBanner(id) {
  if (!confirm('¿Eliminar este banner?')) return
  await api.delete(`/banners/${id}`); await load()
}

async function load() {
  if (!selTournament.value) return
  loading.value = true
  try { const {data} = await api.get(`/tournaments/${selTournament.value.slug}/banners`); banners.value=data }
  catch {} finally {loading.value=false}
}

onMounted(async () => {
  const {data} = await api.get('/tournaments'); tournaments.value=data
  if (data.length) { selTournament.value=data[0]; await load() }
})
</script>
