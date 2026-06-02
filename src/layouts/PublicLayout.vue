<template>
  <div class="min-h-screen flex flex-col bg-slate-50">
    <AppNavbar />
    <!-- En torneo: respeta home bar de iPhone (env safe-area) -->
    <!-- Fuera de torneo: espacio para el BottomNav (80px) + home bar -->
    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>
    <AppFooter class="hidden md:block" />
    <BottomNav v-if="auth.isLoggedIn || slug" :slug="slug" />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/Navbar/AppNavbar.vue'
import AppFooter from '@/components/Footer/AppFooter.vue'
import BottomNav from '@/components/BottomNav/BottomNav.vue'
import { useAuthStore } from '@/stores/auth'
import { useFollowingStore } from '@/stores/following'

const route     = useRoute()
const auth      = useAuthStore()
const following = useFollowingStore()
const slug      = computed(() => route.params.slug || null)

onMounted(() => following.purgeStale())
</script>
