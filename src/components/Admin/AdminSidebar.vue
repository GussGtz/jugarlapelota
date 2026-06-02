<template>
  <!-- Ancho dinámico: 64px colapsado / 256px expandido -->
  <aside
    class="h-full bg-white border-r border-muted flex flex-col shadow-sm overflow-hidden transition-all duration-300 ease-in-out"
    :class="collapsed ? 'w-16' : 'w-64'"
  >
    <!-- Logo + toggle -->
    <div class="flex items-center border-b border-muted shrink-0"
      :class="collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4 gap-3'">
      <!-- Logo siempre visible -->
      <img src="@/assets/images/LOGO.png" alt="JugarLaPelota"
        class="h-9 w-9 object-contain flex-shrink-0" />
      <!-- Texto solo cuando está expandido -->
      <div v-if="!collapsed" class="flex-1 min-w-0">
        <p class="text-sm font-black gradient-text leading-tight truncate">JugarLaPelota</p>
        <p class="text-slate-400 text-xs">Panel Admin</p>
      </div>
      <!-- Botón colapsar en desktop -->
      <button
        v-if="!collapsed"
        @click="emit('toggle-collapse')"
        class="hidden md:flex w-7 h-7 items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors flex-shrink-0"
        title="Colapsar sidebar"
      >
        <IconPanelLeftClose class="w-4 h-4" />
      </button>
    </div>

    <!-- Botón expandir (solo visible cuando colapsado) -->
    <div v-if="collapsed" class="hidden md:flex justify-center pt-2 pb-1">
      <button
        @click="emit('toggle-collapse')"
        class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
        title="Expandir sidebar"
      >
        <IconPanelLeftOpen class="w-4 h-4" />
      </button>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
      <!-- Grupos (solo en modo expandido) -->
      <template v-for="(group, gi) in groupedItems" :key="gi">
        <p v-if="!collapsed && group.label"
          class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-3 pb-1">
          {{ group.label }}
        </p>
        <div v-else-if="!collapsed && !group.label && gi > 0" class="h-px bg-muted mx-2 my-1" />

        <router-link
          v-for="item in group.items" :key="item.to"
          :to="item.to"
          @click="emit('close')"
          class="flex items-center rounded-xl text-sm font-medium transition-all group/link relative"
          :class="[
            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5 w-full',
            isActive(item.to)
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-slate-600 hover:bg-slate-100 hover:text-primary'
          ]"
        >
          <component :is="item.icon" class="w-4 h-4 flex-shrink-0" />
          <span v-if="!collapsed" class="truncate">{{ item.label }}</span>

          <!-- Tooltip en modo colapsado -->
          <div v-if="collapsed"
            class="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/link:opacity-100 transition-opacity z-50 shadow-lg">
            {{ item.label }}
            <div class="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
          </div>
        </router-link>
      </template>
    </nav>

    <!-- Logout -->
    <div class="border-t border-muted shrink-0"
      :class="collapsed ? 'p-2 flex justify-center' : 'px-3 py-3'">
      <button
        @click="handleLogout"
        class="flex items-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors rounded-xl"
        :class="collapsed ? 'w-10 h-10 justify-center' : 'gap-2 px-3 py-2 w-full text-sm'"
        :title="collapsed ? 'Cerrar sesión' : ''"
      >
        <IconLogOut class="w-4 h-4 flex-shrink-0" />
        <span v-if="!collapsed">Cerrar sesión</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  BarChart2, Trophy, Layers, Shuffle, Shirt, User, Circle,
  ClipboardList, FileText, Award, Radio, Image, Newspaper,
  Handshake, Bookmark, TrendingUp, Settings,
  PanelLeftClose, PanelLeftOpen, ShieldCheck, Users
} from 'lucide-vue-next'

const props = defineProps({ collapsed: { type: Boolean, default: false } })
const emit  = defineEmits(['close', 'toggle-collapse'])

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const isActive = (to) => route.path === to || (to !== '/admin' && route.path.startsWith(to + '/'))

function handleLogout() {
  auth.logout()
  router.push('/')
}

// Agrupados para mostrar separadores y encabezados de grupo
const navGroups = [
  {
    label: null,
    items: [
      { icon: BarChart2, label: 'Dashboard', to: '/admin' }
    ]
  },
  {
    label: 'Estructura',
    items: [
      { icon: Trophy,       label: 'Torneos',        to: '/admin/torneos' },
      { icon: Layers,       label: 'Categorías',     to: '/admin/categorias' },
      { icon: Shuffle,      label: 'Fases y Rondas', to: '/admin/fases' },
    ]
  },
  {
    label: 'Gestión',
    items: [
      { icon: Shirt,        label: 'Equipos',        to: '/admin/equipos' },
      { icon: User,         label: 'Jugadores',      to: '/admin/jugadores' },
      { icon: Circle,       label: 'Partidos',       to: '/admin/partidos' },
      { icon: ShieldCheck,  label: 'Arbitraje',      to: '/admin/arbitraje' },
      { icon: ClipboardList,label: 'Resultados',      to: '/admin/tabla' },
      { icon: FileText,     label: 'Inscripciones',  to: '/admin/inscripciones' },
      { icon: Award,        label: 'Premios',        to: '/admin/premios' },
    ]
  },
  {
    label: 'Contenido',
    items: [
      { icon: Radio,        label: 'Transmisiones',  to: '/admin/transmisiones' },
      { icon: Image,        label: 'Galería',        to: '/admin/galeria' },
      { icon: Newspaper,    label: 'Noticias',       to: '/admin/noticias' },
    ]
  },
  {
    label: 'Marketing',
    items: [
      { icon: Handshake,    label: 'Sponsors',       to: '/admin/sponsors' },
      { icon: Bookmark,     label: 'Banners',        to: '/admin/banners' },
    ]
  },
  {
    label: null,
    items: [
      { icon: TrendingUp,   label: 'Analytics',      to: '/admin/analytics' },
      { icon: Settings,     label: 'Configuración',  to: '/admin/config' },
    ]
  }
]

const superAdminOnlyGroups = [
  {
    label: 'Sistema',
    items: [
      { icon: Users, label: 'Administradores', to: '/admin/superadmin' }
    ]
  }
]

const groupedItems = computed(() =>
  auth.isSuperAdmin ? superAdminOnlyGroups : navGroups
)
</script>
