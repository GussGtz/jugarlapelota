<template>
  <Transition name="fade">
    <div v-if="url" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-sheet-lg">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <h3 class="font-bold text-slate-900 truncate pr-3">{{ title || 'Documento' }}</h3>
          <button @click="$emit('close')"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors shrink-0">
            <IconX class="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div class="modal-body !p-0 bg-slate-100 flex items-center justify-center">
          <img v-if="isImage" :src="url" class="max-w-full max-h-full w-full object-contain" style="height: 75vh" />
          <iframe v-else :src="pdfSrc" class="w-full border-0" style="height: 75vh" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import api from '@/api'

const props = defineProps({
  url:   { type: String, default: '' },
  title: { type: String, default: '' },
})
defineEmits(['close'])

// Los documentos se suben como 'raw' (PDF) o 'image' (foto) — Cloudinary no
// conserva la extensión en las URLs 'raw', así que no se puede detectar por
// extensión. El segmento /raw/upload/ vs /image/upload/ de la URL sí es
// confiable, porque viene directo del resource_type usado al subir.
const isImage = computed(() => !/\/raw\/upload\//i.test(props.url || ''))
// Cloudinary sirve los 'raw' siempre como descarga forzada (Content-Disposition:
// attachment) — se pasan por nuestro propio proxy, que los reenvía con
// Content-Disposition: inline para mostrarlos en el iframe.
const pdfSrc = computed(() =>
  props.url ? `${api.defaults.baseURL}/documents/proxy?url=${encodeURIComponent(props.url)}` : ''
)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
