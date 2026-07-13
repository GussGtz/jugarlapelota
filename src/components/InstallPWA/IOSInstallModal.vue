<template>
  <Transition name="fade">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-sheet">
        <div class="modal-handle"/>
        <div class="modal-header">
          <h3 class="font-bold text-slate-900 text-base">📲 Instala la aplicación</h3>
          <button @click="$emit('close')" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>
        <div class="modal-body space-y-5">
          <p class="text-sm text-slate-500 -mt-1">
            Safari no permite instalar apps con un solo toque — sigue estos 2 pasos:
          </p>

          <div class="flex items-center gap-4 bg-primary/5 border border-primary/10 rounded-2xl p-4">
            <div class="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
              <IconShare class="w-7 h-7 text-white"/>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-black text-primary uppercase tracking-wider">Paso 1</p>
              <p class="font-bold text-slate-900">Pulsa el botón Compartir</p>
              <p class="text-xs text-slate-500 mt-0.5">Está en la barra inferior (o superior) de Safari</p>
            </div>
          </div>

          <div class="flex items-center gap-4 bg-accent/5 border border-accent/10 rounded-2xl p-4">
            <div class="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shrink-0">
              <IconSquarePlus class="w-7 h-7 text-white"/>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-black text-accent uppercase tracking-wider">Paso 2</p>
              <p class="font-bold text-slate-900">Añadir a pantalla de inicio</p>
              <p class="text-xs text-slate-500 mt-0.5">Búscalo en la lista de opciones al compartir</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="$emit('watch-video')" class="btn-primary text-sm flex-1">Ver video paso a paso</button>
          <button @click="$emit('close')" class="btn-ghost text-sm px-4">Entendido</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { X as IconX, Share as IconShare, SquarePlus as IconSquarePlus } from 'lucide-vue-next'

defineProps({ show: { type: Boolean, default: false } })
defineEmits(['close', 'watch-video'])
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
