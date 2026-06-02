<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Galería</h2>
      <button @click="openGalleryForm()" class="btn-primary text-sm">+ Nueva galería</button>
    </div>
    <select v-model="selectedTournament" @change="onTournamentChange" class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
      <option v-for="t in tournaments" :key="t.slug" :value="t">{{ t.name }}</option>
    </select>

    <div class="space-y-4 md:space-y-6">
      <div v-for="g in galleries" :key="g.id" class="card space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900">{{ g.title }}</h3>
            <p class="text-slate-400 text-xs">{{ g.images?.length || 0 }} imagen(es)</p>
          </div>
          <div class="flex gap-2">
            <button @click="openImageForm(g)" class="text-xs text-primary px-3 py-1.5 border border-primary/30 rounded-lg hover:bg-primary/10">+ Imagen</button>
            <button @click="deleteGallery(g.id)" class="text-xs text-red-500 px-2 py-1.5 border border-red-600/30 rounded-lg"><IconTrash2 class="w-4 h-4" /></button>
          </div>
        </div>
        <!-- Image grid -->
        <div v-if="g.images?.length" class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <div v-for="img in g.images" :key="img.id" class="relative group aspect-square">
            <img :src="img.image_url" class="w-full h-full object-cover rounded-lg"/>
            <button @click="deleteImage(img.id, g)"
              class="absolute top-1 right-1 w-6 h-6 bg-red-600/90 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              ×
            </button>
          </div>
        </div>
        <p v-else class="text-slate-400 text-sm text-center py-4 border border-dashed border-muted rounded-xl">
          Sin imágenes. Haz clic en "+ Imagen" para agregar.
        </p>
      </div>
      <p v-if="!galleries.length" class="text-center text-slate-500 py-16">Sin galerías.</p>
    </div>

    <!-- New gallery modal -->
    <div v-if="showGalleryForm" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-card rounded-2xl border border-muted w-full max-w-md p-6 space-y-4">
        <h3 class="font-bold text-slate-900 text-lg">Nueva galería</h3>
        <div>
          <label class="text-xs text-slate-700 mb-1 block">Título</label>
          <input v-model="galleryForm.title" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
        </div>
        <div>
          <label class="text-xs text-slate-700 mb-1 block">Categoría (opcional)</label>
          <select v-model="galleryForm.categoryId" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary">
            <option :value="null">Todas las categorías</option>
            <option v-for="c in tournamentCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="flex gap-3">
          <button @click="saveGallery" :disabled="saving" class="btn-primary text-sm flex-1 disabled:opacity-50">{{ saving?'Creando...':'Crear galería' }}</button>
          <button @click="showGalleryForm=false" class="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Add image modal -->
    <div v-if="showImageForm" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-card rounded-2xl border border-muted w-full max-w-md p-6 space-y-4">
        <h3 class="font-bold text-slate-900 text-lg">Agregar imagen a "{{ activeGallery?.title }}"</h3>
        <div>
          <label class="text-xs text-slate-700 mb-1 block">URL de la imagen *</label>
          <input v-model="imageForm.imageUrl" placeholder="https://res.cloudinary.com/..." class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
        </div>
        <div>
          <label class="text-xs text-slate-700 mb-1 block">Descripción (opcional)</label>
          <input v-model="imageForm.description" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
        </div>
        <!-- Preview -->
        <div v-if="imageForm.imageUrl" class="rounded-xl overflow-hidden aspect-video bg-muted">
          <img :src="imageForm.imageUrl" class="w-full h-full object-contain" @error="previewError=true"/>
          <p v-if="previewError" class="text-slate-500 text-center py-4 text-sm">No se pudo cargar la imagen</p>
        </div>
        <div class="flex gap-3">
          <button @click="saveImage" :disabled="saving||!imageForm.imageUrl" class="btn-primary text-sm flex-1 disabled:opacity-50">{{ saving?'Guardando...':'Agregar imagen' }}</button>
          <button @click="showImageForm=false" class="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/api'
const galleries          = ref([])
const tournaments        = ref([])
const selectedTournament  = ref(null)
const activeGallery      = ref(null)
const showGalleryForm    = ref(false)
const showImageForm      = ref(false)
const saving             = ref(false)
const previewError       = ref(false)
const galleryForm = reactive({ title:'', categoryId: null })
const imageForm   = reactive({ imageUrl:'', description:'' })
const tournamentCategories = ref([])

function openGalleryForm() { galleryForm.title=''; galleryForm.categoryId=null; showGalleryForm.value=true }
function openImageForm(g) { activeGallery.value=g; imageForm.imageUrl=''; imageForm.description=''; previewError.value=false; showImageForm.value=true }

async function saveGallery() {
  if (!galleryForm.title) return alert('El título es requerido')
  saving.value = true
  try { await api.post('/galleries',{ tournamentId:selectedTournament.value?.id, title:galleryForm.title, categoryId:galleryForm.categoryId||null }); await load(); showGalleryForm.value=false }
  catch { alert('Error') } finally { saving.value=false }
}

async function saveImage() {
  if (!imageForm.imageUrl) return
  saving.value = true
  try { await api.post('/gallery-images',{ galleryId:activeGallery.value.id, imageUrl:imageForm.imageUrl, description:imageForm.description }); await load(); showImageForm.value=false }
  catch { alert('Error al guardar imagen') } finally { saving.value=false }
}

async function deleteImage(id, gallery) {
  if (!confirm('¿Eliminar esta imagen?')) return
  await api.delete(`/gallery-images/${id}`)
  gallery.images = gallery.images.filter(i => i.id !== id)
}

async function deleteGallery(id) {
  if (!confirm('¿Eliminar esta galería y todas sus imágenes?')) return
  await api.delete(`/galleries/${id}`); await load()
}

async function onTournamentChange() {
  await load()
  if (selectedTournament.value) {
    const { data } = await api.get(`/tournaments/${selectedTournament.value.slug}/categories`)
    tournamentCategories.value = data
  }
}

async function load() {
  if (!selectedTournament.value) return
  const { data } = await api.get(`/tournaments/${selectedTournament.value.slug}/galleries`)
  galleries.value = data
}

onMounted(async () => {
  const { data } = await api.get('/tournaments'); tournaments.value = data
  if (data.length) {
    selectedTournament.value = data[0]
    await onTournamentChange()
  }
})
</script>
