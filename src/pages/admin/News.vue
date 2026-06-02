<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Noticias</h2>
      <button @click="openForm()" class="btn-primary text-sm">+ Nueva noticia</button>
    </div>
    <div class="space-y-3">
      <div v-for="n in news" :key="n.id" class="card flex items-start gap-4">
        <img v-if="n.cover" :src="n.cover" class="w-20 h-20 object-cover rounded-xl flex-shrink-0"/>
        <div class="flex-1 min-w-0">
          <p class="text-slate-400 text-xs mb-1">{{ fmtDate(n.created_at) }}</p>
          <h3 class="font-bold text-slate-900 truncate">{{ n.title }}</h3>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button @click="openForm(n)" class="text-xs text-slate-500 hover:text-slate-900 px-3 py-1.5 border border-muted rounded-lg">Editar</button>
          <button @click="deleteNews(n.id)" class="text-xs text-red-500 px-2 py-1.5 border border-red-600/30 rounded-lg"><IconTrash2 class="w-4 h-4" /></button>
        </div>
      </div>
      <p v-if="!news.length" class="text-center text-slate-500 py-16">Sin noticias.</p>
    </div>

    <!-- Modal con RichEditor -->
    <div v-if="showForm" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-card rounded-2xl border border-muted w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 class="font-bold text-slate-900 text-lg">{{ editing ? 'Editar noticia' : 'Nueva noticia' }}</h3>
        <div>
          <label class="text-xs text-slate-700 mb-1 block">Torneo</label>
          <select v-model="form.tournamentId" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
            <option v-for="t in tournaments" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-slate-700 mb-1 block">Título *</label>
          <input v-model="form.title" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
        </div>
        <div>
          <label class="text-xs text-slate-700 mb-1 block">URL de imagen de portada</label>
          <input v-model="form.cover" placeholder="https://..." class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
        </div>
        <div>
          <label class="text-xs text-slate-500 mb-2 block">Contenido *</label>
          <RichEditor v-model="form.content" />
        </div>
        <div class="flex gap-3 pt-2">
          <button @click="save" :disabled="saving" class="btn-primary text-sm flex-1 disabled:opacity-50">{{ saving?'Publicando...':'Publicar' }}</button>
          <button @click="showForm=false" class="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/api'
import RichEditor from '@/components/RichEditor/RichEditor.vue'

const news       = ref([])
const tournaments = ref([])
const showForm    = ref(false)
const editing     = ref(null)
const saving      = ref(false)
const form = reactive({tournamentId:null, title:'', content:'', cover:''})
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}) : ''

function openForm(n=null) {
  editing.value=n
  if(n) Object.assign(form,{tournamentId:n.tournament_id,title:n.title,content:n.content||'',cover:n.cover||''})
  else  Object.assign(form,{tournamentId:tournaments.value[0]?.id,title:'',content:'',cover:''})
  showForm.value=true
}

async function save() {
  if(!form.title) return alert('El título es requerido')
  saving.value=true
  try {
    if(editing.value) await api.put(`/news/${editing.value.id}`,form)
    else await api.post('/news',form)
    await load(); showForm.value=false
  } catch {alert('Error')} finally {saving.value=false}
}

async function deleteNews(id) {
  if(!confirm('¿Eliminar esta noticia?')) return
  await api.delete(`/news/${id}`); await load()
}

async function load() {
  const {data:ts} = await api.get('/tournaments'); tournaments.value=ts
  if(ts.length) { const {data}=await api.get(`/tournaments/${ts[0].slug}/news`); news.value=data }
}

onMounted(load)
</script>
