<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Sponsors</h2>
      <button @click="openForm()" class="btn-primary text-sm">+ Nuevo sponsor</button>
    </div>
    <select v-model="selectedTournament" @change="load" class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
      <option v-for="t in tournaments" :key="t.slug" :value="t">{{ t.name }}</option>
    </select>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="s in sponsors" :key="s.id" class="card flex items-center gap-4">
        <div class="w-14 h-14 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
          <img v-if="s.logo" :src="s.logo" class="w-full h-full object-contain rounded-xl p-1"/>
          <IconHandshake v-else class="w-6 h-6 text-slate-400" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-slate-900 truncate">{{ s.name }}</p>
          <a v-if="s.url" :href="s.url" target="_blank" class="text-primary text-xs hover:underline truncate block">{{ s.url }}</a>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button @click="openForm(s)" class="text-xs text-slate-500 hover:text-slate-900 px-2 py-1 border border-muted rounded-lg"><IconPencil class="w-4 h-4" /></button>
          <button @click="deleteSponsor(s.id)" class="text-xs text-red-500 px-2 py-1 border border-red-600/30 rounded-lg"><IconTrash2 class="w-4 h-4" /></button>
        </div>
      </div>
      <p v-if="!sponsors.length" class="col-span-full text-center text-slate-500 py-16">Sin sponsors.</p>
    </div>

    <!-- Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-card rounded-2xl border border-muted w-full max-w-md p-6 space-y-4">
        <h3 class="font-bold text-slate-900 text-lg">{{ editing ? 'Editar sponsor' : 'Nuevo sponsor' }}</h3>
        <div v-for="f in fields" :key="f.key">
          <label class="text-xs text-slate-700 mb-1 block">{{ f.label }}</label>
          <input v-model="form[f.key]" :placeholder="f.placeholder||''" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
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
import { ref, reactive, onMounted } from 'vue'
import api from '@/api'
const sponsors          = ref([])
const tournaments       = ref([])
const selectedTournament = ref(null)
const showForm          = ref(false)
const editing           = ref(null)
const saving            = ref(false)
const form = reactive({ name:'', logo:'', url:'' })
const fields = [
  { key:'name', label:'Nombre del sponsor *' },
  { key:'logo', label:'Logo URL', placeholder:'https://...' },
  { key:'url',  label:'Sitio web', placeholder:'https://...' },
]
function openForm(s=null) {
  editing.value = s
  if (s) Object.assign(form, { name:s.name, logo:s.logo||'', url:s.url||'' })
  else   Object.assign(form, { name:'', logo:'', url:'' })
  showForm.value = true
}
async function save() {
  if (!form.name) return alert('El nombre es requerido')
  saving.value = true
  try {
    if (editing.value) {
      await api.put(`/sponsors/${editing.value.id}`, form)
    } else {
      await api.post('/sponsors', { ...form, tournamentId: selectedTournament.value?.id })
    }
    await load(); showForm.value = false
  } catch { alert('Error') } finally { saving.value = false }
}
async function deleteSponsor(id) {
  if (!confirm('¿Eliminar este sponsor?')) return
  await api.delete(`/sponsors/${id}`); await load()
}
async function load() {
  if (!selectedTournament.value) return
  const { data } = await api.get(`/tournaments/${selectedTournament.value.slug}/sponsors`)
  sponsors.value = data
}
onMounted(async () => {
  const { data } = await api.get('/tournaments'); tournaments.value = data
  if (data.length) { selectedTournament.value = data[0]; await load() }
})
</script>
