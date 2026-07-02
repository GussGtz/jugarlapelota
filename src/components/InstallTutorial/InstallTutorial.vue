<template>
  <div id="instalar-app" class="text-center scroll-mt-20">
    <span v-reveal class="inline-block text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">
      Instala la app
    </span>
    <h2 v-reveal="{ delay: 80 }" class="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
      Instálala en tu celular
      <span class="text-primary"> en 30 segundos</span>
    </h2>
    <p v-reveal="{ delay: 140 }" class="text-slate-500 mt-3 text-base max-w-sm mx-auto">
      Sin descargas pesadas ni tiendas de apps. Más rápido, más ligero y sin ocupar espacio en tu memoria.
    </p>

    <div class="grid grid-cols-2 gap-5 max-w-sm mx-auto mt-8">
      <button v-for="(t, i) in tutorials" :key="t.key" @click="open(t)"
        v-reveal="{ delay: 220 + i * 130 }"
        class="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[9/16] w-full
               shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 transition-all duration-300 ease-out">
        <video :src="t.src" :poster="t.poster" class="w-full h-full object-cover opacity-70 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
          muted playsinline preload="none"></video>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div class="relative flex items-center justify-center">
            <span class="absolute inset-0 rounded-full bg-white/50 animate-ping-slow"></span>
            <div class="relative w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <IconPlay class="w-5 h-5 text-primary ml-0.5" />
            </div>
          </div>
          <span class="text-white font-bold text-xs bg-black/40 px-3 py-1 rounded-full">{{ t.label }}</span>
        </div>
      </button>
    </div>

    <!-- Modal — video acotado (no ocupa toda la pantalla); el usuario puede
         ampliarlo con el botón de pantalla completa nativo de los controles -->
    <Transition name="modal-pop">
      <div v-if="active" class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" @click.self="close">
        <div class="relative inline-block max-w-full max-h-full">
          <video :src="active.src" class="block mx-auto max-h-[65vh] max-w-[80vw] sm:max-w-xs w-auto h-auto rounded-2xl shadow-2xl"
            controls autoplay playsinline></video>
          <button @click="close"
            class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 hover:scale-110 flex items-center justify-center shadow-lg transition-transform">
            <IconX class="w-4 h-4 text-white" />
          </button>
          <p class="text-white text-center mt-4 font-semibold text-sm">{{ active.label }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const tutorials = [
  { key: 'android', label: 'Android', src: '/videos/instalar-android.mp4', poster: '/videos/instalar-android-poster.jpg' },
  { key: 'apple',   label: 'iPhone',  src: '/videos/instalar-apple.mp4',   poster: '/videos/instalar-apple-poster.jpg' },
]

const active = ref(null)
function open(t) { active.value = t }
function close()  { active.value = null }
</script>

<style scoped>
.modal-pop-enter-active { transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-pop-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.modal-pop-enter-from, .modal-pop-leave-to { opacity: 0; transform: scale(0.94); }

@keyframes pingSlow {
  0%   { transform: scale(1);   opacity: 0.6; }
  100% { transform: scale(1.7); opacity: 0; }
}
.animate-ping-slow { animation: pingSlow 2.2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite; }
</style>
