<template>
  <div v-if="pushSupported" class="relative" ref="bellRef">

    <!-- Activo: muestra equipo count si hay follows -->
    <button v-if="pushGranted"
      @click="open = !open"
      class="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
      title="Notificaciones">
      <IconBellRing class="w-5 h-5 text-emerald-500" />
      <span v-if="following.count"
        class="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
        {{ following.count }}
      </span>
    </button>

    <!-- Sin permiso -->
    <button v-else
      @click="subscribe"
      :disabled="loading"
      class="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
      :class="{ 'bell-wiggle': wiggle }"
      @animationend="wiggle = false"
      title="Activar notificaciones">
      <IconBell class="w-5 h-5 text-slate-500" />
      <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
    </button>

    <!-- Dropdown de notificaciones activas -->
    <Transition name="fade-down">
      <div v-if="open && pushGranted"
        class="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-muted shadow-xl overflow-hidden z-50">
        <div class="px-4 py-3 border-b border-muted">
          <p class="font-bold text-slate-900 text-sm flex items-center gap-2">
            <IconBellRing class="w-4 h-4 text-emerald-500" /> Notificaciones activas
          </p>
        </div>

        <div v-if="following.count" class="px-4 py-3 border-b border-muted">
          <p class="text-xs text-slate-500 mb-2">Recibirás alertas de:</p>
          <ul class="space-y-1 text-xs text-slate-700">
            <li class="flex items-center gap-1.5"><IconCircleDot class="w-3 h-3 text-red-500" /> Partidos en vivo de tus equipos</li>
            <li class="flex items-center gap-1.5"><IconCircleCheck class="w-3 h-3 text-accent" /> Resultados de tus equipos</li>
            <li class="flex items-center gap-1.5"><IconNewspaper class="w-3 h-3 text-primary" /> Noticias del torneo</li>
          </ul>
        </div>
        <div v-else class="px-4 py-3 border-b border-muted">
          <p class="text-xs text-slate-400">Sigue equipos para recibir notificaciones personalizadas.</p>
        </div>

        <button @click="handleUnsubscribe"
          class="w-full text-left px-4 py-3 text-xs text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
          <IconBellOff class="w-3.5 h-3.5" /> Desactivar notificaciones
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { usePWA } from '@/composables/usePWA'
import { useFollowingStore } from '@/stores/following'

const { pushSupported, pushGranted, subscribePush, unsubscribePush, pushEndpoint } = usePWA()
const following = useFollowingStore()

const wiggle  = ref(false)
const loading = ref(false)
const open    = ref(false)
const bellRef = ref(null)

onMounted(() => {
  if (!pushGranted.value) setTimeout(() => { wiggle.value = true }, 800)
  document.addEventListener('click', onClickOutside)
})
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

function onClickOutside(e) {
  if (bellRef.value && !bellRef.value.contains(e.target)) open.value = false
}

async function subscribe() {
  loading.value = true
  await subscribePush()
  if (pushEndpoint.value) await following.syncFromServer(pushEndpoint.value)
  loading.value = false
}

async function handleUnsubscribe() {
  open.value = false
  await unsubscribePush()
}
</script>

<style scoped>
@keyframes bellWiggle {
  0%, 100% { transform: rotate(0deg); }
  15%       { transform: rotate(15deg); }
  30%       { transform: rotate(-12deg); }
  45%       { transform: rotate(10deg); }
  60%       { transform: rotate(-8deg); }
  75%       { transform: rotate(5deg); }
}
.bell-wiggle { animation: bellWiggle 0.6s ease; }

.fade-down-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.fade-down-leave-active { transition: opacity 0.1s ease; }
.fade-down-enter-from, .fade-down-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
