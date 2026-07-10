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

        <!-- Imagen -->
        <div v-if="isImage" class="modal-body !p-0 bg-slate-100 flex items-center justify-center">
          <img :src="url" class="max-w-full max-h-full w-full object-contain" style="height: 75vh" />
        </div>

        <!-- PDF — renderizado propio con PDF.js (no depende del visor nativo del
             navegador: Safari iOS no muestra bien un PDF dentro de un <iframe>) -->
        <div v-else class="modal-body bg-slate-200" style="height: 75vh">
          <div v-if="pdfError" class="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <IconAlertCircle class="w-8 h-8 text-slate-400" />
            <p class="text-slate-500 text-sm">No se pudo mostrar el documento aquí.</p>
            <a :href="pdfSrc" target="_blank" rel="noopener"
              class="text-primary font-semibold text-sm underline underline-offset-2">
              Abrir en una pestaña nueva
            </a>
          </div>
          <div v-else class="h-full overflow-y-auto flex flex-col items-center gap-4 py-4">
            <p v-if="pdfLoading" class="text-slate-400 text-sm py-10">Cargando documento…</p>
            <canvas v-for="p in pageCount" :key="p" :ref="el => setCanvasRef(el, p)"
              class="shadow-md max-w-full bg-white"></canvas>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import api from '@/api'

// pdfjs-dist pesa ~500KB — se carga sólo bajo demanda (al abrir un PDF real),
// no en el bundle principal de la página que usa este modal.
let pdfjsLib = null
async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib
  const [lib, workerUrl] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  lib.GlobalWorkerOptions.workerSrc = workerUrl.default
  pdfjsLib = lib
  return lib
}

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
// Content-Disposition: inline (necesario también para que PDF.js pueda leerlos).
const pdfSrc = computed(() =>
  props.url ? `${api.defaults.baseURL}/documents/proxy?url=${encodeURIComponent(props.url)}` : ''
)

const pageCount  = ref(0)
const pdfLoading = ref(false)
const pdfError   = ref(false)
const canvasRefs = {}
function setCanvasRef(el, page) { if (el) canvasRefs[page] = el }

async function renderPdf() {
  pageCount.value = 0
  pdfError.value = false
  Object.keys(canvasRefs).forEach(k => delete canvasRefs[k])
  if (isImage.value || !props.url) return

  pdfLoading.value = true
  try {
    const lib = await getPdfjs()
    const pdf = await lib.getDocument(pdfSrc.value).promise
    pageCount.value = pdf.numPages
    await nextTick()
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 1.4 })
      const canvas = canvasRefs[i]
      if (!canvas) continue
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    }
  } catch (e) {
    console.error('[DocumentViewerModal] error al renderizar PDF:', e)
    pdfError.value = true
  } finally {
    pdfLoading.value = false
  }
}

watch(() => props.url, renderPdf, { immediate: true })
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
