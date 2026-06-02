<template>
  <div>
    <label v-if="label" class="text-xs text-slate-600 mb-1.5 block font-medium">{{ label }}</label>

    <!-- Preview + zona de clic -->
    <div
      class="relative group rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden"
      :class="[
        dragging  ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-muted hover:border-primary/50 hover:bg-slate-50',
        modelValue ? 'border-solid border-muted' : ''
      ]"
      :style="{ height: height + 'px' }"
      @click="fileInput.click()"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop">

      <!-- Imagen actual -->
      <img v-if="modelValue" :src="modelValue"
        class="w-full h-full object-contain p-1" />

      <!-- Overlay al hacer hover cuando ya hay imagen -->
      <div v-if="modelValue"
        class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
        <IconUpload class="w-6 h-6 text-white" />
        <span class="text-white text-xs font-semibold">Cambiar imagen</span>
      </div>

      <!-- Placeholder cuando no hay imagen -->
      <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
        <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <IconUpload class="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
        </div>
        <div>
          <p class="text-xs font-semibold text-slate-500 group-hover:text-primary transition-colors">
            {{ dragging ? 'Suelta aquí' : 'Subir imagen' }}
          </p>
          <p class="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP · máx 5 MB</p>
        </div>
      </div>

      <!-- Spinner de carga -->
      <div v-if="uploading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
        <div class="flex flex-col items-center gap-2">
          <div class="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span class="text-xs text-slate-500">Subiendo...</span>
        </div>
      </div>
    </div>

    <!-- Error -->
    <p v-if="error" class="text-[11px] text-red-500 mt-1 flex items-center gap-1">
      <IconAlertCircle class="w-3 h-3" /> {{ error }}
    </p>

    <!-- Botón quitar imagen -->
    <button v-if="modelValue && !uploading" type="button"
      @click.stop="$emit('update:modelValue', ''); error = ''"
      class="mt-1.5 text-[10px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
      <IconX class="w-3 h-3" /> Quitar imagen
    </button>

    <!-- Input oculto -->
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label:      { type: String, default: '' },
  height:     { type: Number, default: 120 }
})
const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const uploading = ref(false)
const dragging  = ref(false)
const error     = ref('')

async function uploadFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) { error.value = 'Solo se permiten imágenes'; return }
  if (file.size > 5 * 1024 * 1024)    { error.value = 'La imagen no debe superar 5 MB'; return }

  error.value     = ''
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    emit('update:modelValue', data.url)
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al subir la imagen'
  } finally {
    uploading.value = false
    dragging.value  = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function onFileChange(e) { uploadFile(e.target.files[0]) }
function onDrop(e)       { uploadFile(e.dataTransfer.files[0]) }
</script>
