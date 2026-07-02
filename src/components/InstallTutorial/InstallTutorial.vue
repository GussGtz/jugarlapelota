<template>
  <div id="instalar-app" class="text-center scroll-mt-20">
    <span class="inline-block text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">
      Instala la app
    </span>
    <h2 class="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
      Instálala en tu celular
      <span class="text-primary"> en 30 segundos</span>
    </h2>
    <p class="text-slate-500 mt-3 text-base max-w-sm mx-auto">
      Sin descargas pesadas ni tiendas de apps. Más rápido, más ligero y sin ocupar espacio en tu memoria.
    </p>

    <div class="grid grid-cols-2 gap-5 max-w-sm mx-auto mt-8">
      <button v-for="t in tutorials" :key="t.key" @click="open(t)"
        class="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[9/16] w-full">
        <video :src="t.src" :poster="t.poster" class="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity"
          muted playsinline preload="none"></video>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <IconPlay class="w-5 h-5 text-primary ml-0.5" />
          </div>
          <span class="text-white font-bold text-xs bg-black/40 px-3 py-1 rounded-full">{{ t.label }}</span>
        </div>
      </button>
    </div>

    <!-- Modal — video acotado (no ocupa toda la pantalla); el usuario puede
         ampliarlo con el botón de pantalla completa nativo de los controles -->
    <Transition name="fade">
      <div v-if="active" class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" @click.self="close">
        <div class="relative inline-block max-w-full max-h-full">
          <video :src="active.src" class="block mx-auto max-h-[65vh] max-w-[80vw] sm:max-w-xs w-auto h-auto rounded-2xl shadow-2xl"
            controls autoplay playsinline></video>
          <button @click="close"
            class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center shadow-lg">
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
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
