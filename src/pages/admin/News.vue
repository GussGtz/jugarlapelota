<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Noticias</h2>
      <button @click="openForm()" class="btn-primary text-sm">+ Nueva noticia</button>
    </div>
    <div class="space-y-3">
      <div v-for="n in news" :key="n.id" class="card !p-3 md:!p-4">
        <div class="flex items-start gap-3">
          <img v-if="n.cover" :src="n.cover" class="w-14 h-14 md:w-20 md:h-20 object-cover rounded-xl flex-shrink-0"/>
          <div class="flex-1 min-w-0">
            <p class="text-slate-400 text-xs mb-0.5 flex items-center gap-2">
              {{ fmtDate(n.created_at) }}
              <span v-if="n.view_count > 0" class="flex items-center gap-1"><IconEye class="w-3 h-3" /> {{ n.view_count }}</span>
            </p>
            <h3 class="font-bold text-slate-900 text-sm leading-snug line-clamp-2">{{ n.title }}</h3>
          </div>
        </div>
        <div class="flex gap-2 mt-2 justify-end">
          <button @click="openForm(n)" class="text-xs text-slate-500 hover:text-slate-900 px-3 py-1.5 border border-muted rounded-lg">Editar</button>
          <button @click="deleteNews(n.id)" class="text-xs text-red-500 px-2 py-1.5 border border-red-600/30 rounded-lg hover:bg-red-50"><IconTrash2 class="w-4 h-4" /></button>
        </div>
      </div>
      <p v-if="!news.length" class="text-center text-slate-500 py-16">Sin noticias.</p>
    </div>

    <!-- Modal con RichEditor -->
    <div v-if="showForm" class="modal-overlay">
      <div class="modal-sheet-xl">
        <div class="modal-handle"/>
        <div class="modal-header">
          <h3 class="font-bold text-slate-900 text-base">{{ editing ? 'Editar noticia' : 'Nueva noticia' }}</h3>
          <button @click="showForm=false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>
        <div class="modal-body space-y-4">
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
          <label class="text-xs text-slate-700 mb-1.5 block font-semibold">Imagen de portada</label>
          <input ref="coverInput" type="file" accept="image/*,.heic,.heif" class="hidden" @change="onCoverChange"/>
          <div v-if="!form.cover"
            @click="coverInput.click()"
            @dragover.prevent @drop.prevent="onCoverDrop"
            class="border-2 border-dashed border-muted rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
            <div class="text-2xl mb-1">🖼️</div>
            <p class="text-sm font-semibold text-slate-700">Haz clic o arrastra una imagen</p>
            <p class="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP · máx 5 MB</p>
          </div>
          <div v-else class="relative rounded-xl overflow-hidden aspect-video bg-muted">
            <img :src="form.cover" class="w-full h-full object-cover"/>
            <button type="button" @click="form.cover=''"
              class="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg font-bold hover:bg-red-600">
              Quitar
            </button>
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-500 mb-2 block">Contenido *</label>
          <RichEditor v-model="form.content" />
        </div>
        </div>
        <div class="modal-footer">
          <button @click="save" :disabled="saving" class="btn-primary text-sm flex-1 disabled:opacity-50">{{ saving?'Publicando...':'Publicar' }}</button>
          <button @click="showForm=false" class="btn-ghost text-sm px-4">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/api'
import { uploadImage, isImageFile } from '@/utils/upload'
import RichEditor from '@/components/RichEditor/RichEditor.vue'

const news       = ref([])
const tournaments = ref([])
const showForm    = ref(false)
const editing     = ref(null)
const saving      = ref(false)
const coverInput  = ref(null)
const uploading   = ref(false)
const form = reactive({tournamentId:null, title:'', content:'', cover:''})

async function onCoverChange(e) {
  const file = e.target.files[0]; if (!file) return
  uploading.value = true
  try { form.cover = await uploadImage(file) } catch { alert('Error al subir imagen') }
  uploading.value = false; e.target.value = ''
}
async function onCoverDrop(e) {
  const file = e.dataTransfer.files[0]; if (!file || !isImageFile(file)) return
  uploading.value = true
  try { form.cover = await uploadImage(file) } catch { alert('Error al subir imagen') }
  uploading.value = false
}
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}) : ''

function openForm(n=null) {
  editing.value=n
  if(n) Object.assign(form,{tournamentId:n.tournament_id,title:n.title,content:n.content||'',cover:n.cover||null})
  else  Object.assign(form,{tournamentId:tournaments.value[0]?.id,title:'',content:'',cover:null})
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
