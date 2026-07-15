<template>
  <!-- Banner: servidor despertando -->
  <Transition name="slide-down">
    <div v-if="waking"
      class="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-xs font-semibold text-center py-2 flex items-center justify-center gap-2 shadow-lg">
      <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      Conectando con el servidor... un momento
    </div>
  </Transition>

  <component :is="layout">
    <router-view v-slot="{ Component, route }">
      <Transition :name="route.meta.transition || 'page'" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </router-view>
  </component>
  <InstallPWA />
  <OfflineOverlay />
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import PublicLayout  from '@/layouts/PublicLayout.vue'
import AdminLayout   from '@/layouts/AdminLayout.vue'
import RefereeLayout from '@/layouts/RefereeLayout.vue'
import InstallPWA    from '@/components/InstallPWA/InstallPWA.vue'
import OfflineOverlay from '@/components/OfflineOverlay/OfflineOverlay.vue'
import { connectSocket, disconnectSocket, requestNotificationPermission } from '@/services/socket'
import { serverWaking } from '@/api'
const waking = ref(false)
let wakingInterval = setInterval(() => { waking.value = serverWaking.value }, 500)

const route  = useRoute()
const layout = computed(() => {
  if (route.meta.layout === 'admin')   return AdminLayout
  if (route.meta.layout === 'referee') return RefereeLayout
  return PublicLayout
})

// Conectar socket globalmente una sola vez
onMounted(async () => {
  await requestNotificationPermission()
  connectSocket()
})
onUnmounted(() => { disconnectSocket(); clearInterval(wakingInterval) })
</script>
