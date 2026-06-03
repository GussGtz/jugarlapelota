<template>
  <div class="min-h-screen flex flex-col bg-slate-50">
    <AppNavbar v-if="!hideNav" />
    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>
    <AppFooter class="hidden md:block" />
    <BottomNav v-if="(auth.isLoggedIn || slug) && !hideNav" :slug="slug" />
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

// Ocultar nav cuando admin/referee está en la página de inscripción
const hideNav = computed(() =>
  route.name === 'Inscription' && (auth.isAdmin || auth.user?.role === 'referee')
)

onMounted(() => following.purgeStale())
</script>
