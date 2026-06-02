<template>
  <div class="h-12 md:h-14 bg-white border-b border-muted flex items-center justify-between px-3 md:px-4 shadow-sm shrink-0">
    <div class="flex items-center gap-2">
      <!-- Mobile: hamburger para abrir drawer -->
      <button @click="$emit('toggle-sidebar')"
        class="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-primary hover:bg-slate-100 transition-colors">
        <IconMenu class="w-5 h-5" />
      </button>

      <!-- Desktop: botón para colapsar/expandir sidebar -->
      <button @click="$emit('toggle-collapse')"
        class="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
        :title="collapsed ? 'Expandir menú' : 'Colapsar menú'"
      >
        <IconPanelLeftClose v-if="!collapsed" class="w-4 h-4" />
        <IconPanelLeftOpen  v-else            class="w-4 h-4" />
      </button>

      <h1 class="text-slate-900 font-semibold text-sm md:text-base">{{ pageTitle }}</h1>
    </div>

    <div class="flex items-center gap-2 text-sm text-slate-500">
      <span class="hidden md:block text-slate-600">{{ auth.user?.name || 'Admin' }}</span>
      <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
        {{ initials }}
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
  '/admin/tabla':             'Tabla de Posiciones',
  '/admin/inscripciones':     'Inscripciones',
  '/admin/premios':           'Premios y Reconocimientos',
  '/admin/transmisiones':     'Transmisiones',
  '/admin/galeria':           'Galería',
  '/admin/noticias':          'Noticias',
  '/admin/analytics':         'Analytics',
  '/admin/config':            'Configuración',
  '/admin/superadmin':        'Administradores'
}

const pageTitle = computed(() => titles[route.path] || 'Panel Admin')
const initials  = computed(() => {
  const name = auth.user?.name || 'A'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})
</script>
