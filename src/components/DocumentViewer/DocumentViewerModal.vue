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
          <iframe v-else :src="url" class="w-full border-0" style="height: 75vh" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  url:   { type: String, default: '' },
  title: { type: String, default: '' },
})
defineEmits(['close'])

const isImage = computed(() => !/\.pdf(\?|#|$)/i.test(props.url || ''))
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
