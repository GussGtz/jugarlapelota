<template>
  <component :is="layout">
    <router-view v-slot="{ Component, route }">
      <Transition :name="route.meta.transition || 'page'" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </router-view>
  </component>
  <InstallPWA />
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import PublicLayout  from '@/layouts/PublicLayout.vue'
import AdminLayout   from '@/layouts/AdminLayout.vue'
import RefereeLayout from '@/layouts/RefereeLayout.vue'
import InstallPWA    from '@/components/InstallPWA/InstallPWA.vue'
import { connectSocket, disconnectSocket, requestNotificationPermission } from '@/services/socket'

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
onUnmounted(() => disconnectSocket())
</script>
