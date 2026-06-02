<template>
  <Transition name="slide-up-pwa">
    <div v-if="showBanner"
      class="block md:hidden fixed bottom-[72px] left-3 right-3 z-40 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      style="bottom: calc(env(safe-area-inset-bottom, 0px) + 72px)">
      <!-- Top row -->
      <div class="flex items-start gap-3 px-4 pt-4 pb-3">
        <div class="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <IconSmartphone class="w-5 h-5 text-primary" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-slate-900 text-sm">Instala JugarLaPelota</p>
          <p class="text-xs text-slate-500 mt-0.5">Accede como una app nativa</p>
        </div>
        <button @click="dismiss"
          class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors shrink-0 -mt-1 -mr-1">
          <IconX class="w-4 h-4 text-slate-400" />
        </button>
      </div>
      <!-- Divider -->
      <div class="border-t border-slate-100 mx-4"></div>
      <!-- Install button -->
      <div class="px-4 py-3">
        <button @click="install"
          class="w-full bg-primary text-white font-bold text-sm py-2.5 rounded-xl hover:bg-sky-600 transition-colors shadow-sm">
          Instalar app
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePWA } from '@/composables/usePWA'

const { installPrompt, isInstalled, promptInstall } = usePWA()
const dismissed = ref(false)

onMounted(() => {
  dismissed.value = localStorage.getItem('pwa-dismissed') === 'true'
})

const showBanner = computed(() =>
  installPrompt.value && !isInstalled.value && !dismissed.value
)

function dismiss() {
  dismissed.value = true
  localStorage.setItem('pwa-dismissed', 'true')
}

async function install() {
  const accepted = await promptInstall()
  if (accepted) dismissed.value = true
}
</script>

<style scoped>
.slide-up-pwa-enter-active { animation: slideUpIn 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.slide-up-pwa-leave-active { animation: slideUpIn 0.2s ease-in reverse; }
@keyframes slideUpIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
