<template>
  <div class="topbar bg-white border-b border-muted shadow-sm shrink-0">
    <!-- Safe-area spacer (solo mobile PWA) -->
    <div class="safe-area-top xl:hidden" />

    <div class="flex items-center justify-between px-4 md:px-4 h-14">
      <div class="flex items-center gap-3">
        <!-- Desktop: colapsar sidebar -->
        <button @click="$emit('toggle-collapse')"
          class="hidden xl:flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
          :title="collapsed ? 'Expandir menú' : 'Colapsar menú'">
          <IconPanelLeftClose v-if="!collapsed" class="w-4 h-4" />
          <IconPanelLeftOpen  v-else            class="w-4 h-4" />
        </button>

        <h1 class="text-slate-900 font-bold text-lg md:text-base">{{ pageTitle }}</h1>
      </div>

      <div class="flex items-center gap-2">
        <span class="hidden xl:block text-sm text-slate-600">{{ auth.user?.name || 'Admin' }}</span>
        <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
          {{ initials }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineProps({ collapsed: { type: Boolean, default: false } })
defineEmits(['toggle-sidebar', 'toggle-collapse'])

const route = useRoute()
const auth  = useAuthStore()

const titles = {
  '/admin':                   'Dashboard',
  '/admin/torneos':           'Torneos',
  '/admin/categorias':        'Categorías',
  '/admin/fases':             'Fases y Rondas',
  '/admin/equipos':           'Equipos',
  '/admin/jugadores':         'Jugadores',
  '/admin/partidos':          'Partidos',
  '/admin/tabla':             'Resultados',
  '/admin/inscripciones':     'Inscripciones',
  '/admin/premios':           'Premios y Reconocimientos',
  '/admin/transmisiones':     'Transmisiones',
  '/admin/galeria':           'Galería',
  '/admin/noticias':          'Noticias',
  '/admin/analytics':         'Analytics',
  '/admin/config':            'Configuración',
  '/admin/superadmin':        'Administradores',
  '/admin/arbitraje':         'Arbitraje'
}

const pageTitle = computed(() => titles[route.path] || 'Panel Admin')
const initials  = computed(() => {
  const name = auth.user?.name || 'A'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})
</script>

<style scoped>
.safe-area-top {
  height: env(safe-area-inset-top);
}
</style>
