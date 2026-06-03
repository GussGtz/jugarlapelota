<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Transmisiones</h2>
      <button @click="openForm()" class="btn-primary text-sm">+ Nueva transmisión</button>
    </div>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="s in streams" :key="s.id" class="card space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold px-2 py-1 rounded-full" :class="s.is_live ? 'bg-red-600/20 text-red-400' : 'bg-muted text-slate-500'">
            <template v-if="s.is_live">
              <IconCircle class="w-2 h-2 fill-red-500 text-red-500 animate-pulse inline-block mr-1" /> EN VIVO
            </template>
            <template v-else>{{ s.platform }}</template>
          </span>
          <button @click="toggleLive(s)" class="text-xs px-2 py-1 border border-muted rounded-lg text-slate-500 hover:text-slate-900">
            {{ s.is_live ? 'Finalizar' : 'Activar' }}
          </button>
        </div>
        <p class="font-semibold text-slate-900 text-sm line-clamp-2">{{ s.title }}</p>
        <a :href="s.url" target="_blank" class="text-primary text-xs hover:underline truncate block">{{ s.url }}</a>
        <button @click="deleteStream(s.id)" class="text-xs text-red-500 hover:text-red-600">Eliminar</button>
      </div>
      <p v-if="!streams.length" class="col-span-full text-center text-slate-500 py-16">Sin transmisiones.</p>
    </div>
    <!-- Modal -->
    <div v-if="showForm" class="modal-overlay">
      <div class="modal-sheet overflow-y-auto p-5">
        <h3 class="font-bold text-slate-900 text-lg">Nueva transmisión</h3>
        <div>
          <label class="text-xs text-slate-700 mb-1 block">Torneo</label>
          <select v-model="form.tournamentId" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
            <option v-for="t in tournaments" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div v-for="f in fields" :key="f.key">
          <label class="text-xs text-slate-700 mb-1 block">{{ f.label }}</label>
          <input v-model="form[f.key]" :type="f.type||'text'" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary" :placeholder="f.placeholder||''"/>
        </div>
        <div class="flex gap-3">
          <button @click="save" class="btn-primary text-sm flex-1">Guardar</button>
          <button @click="showForm=false" class="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/api'
const streams = ref([])
const tournaments = ref([])
const showForm = ref(false)
const form = reactive({ tournamentId:'', platform:'YouTube', title:'', url:'', thumbnail:'' })
const fields = [
  { key:'platform', label:'Plataforma (YouTube, Facebook, Twitch)' },
  { key:'title', label:'Título' },
  { key:'url', label:'URL del stream', placeholder:'https://youtube.com/watch?v=...' },
  { key:'thumbnail', label:'Thumbnail URL (opcional)' },
]
function openForm() { Object.assign(form, { tournamentId: tournaments.value[0]?.id||'', platform:'YouTube', title:'', url:'', thumbnail:'' }); showForm.value = true }
async function save() {
  try { await api.post('/streams', form); await load(); showForm.value = false } catch { alert('Error') }
}
async function toggleLive(s) {
  await api.patch(`/streams/${s.id}/live`, { isLive: !s.is_live })
  await load()
}
async function deleteStream(id) {
  if (!confirm('¿Eliminar transmisión?')) return
  await api.delete(`/streams/${id}`); await load()
}
async function load() {
  const [s, t] = await Promise.all([api.get('/tournaments'), api.get('/tournaments')])
  tournaments.value = t.data
  if (t.data.length) { const r = await api.get(`/tournaments/${t.data[0].slug}/streams`); streams.value = r.data }
}
onMounted(load)
</script>
