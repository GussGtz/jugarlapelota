<template>
  <div class="min-h-screen flex bg-slate-50">

    <!-- Overlay mobile -->
    <Transition name="fade">
      <div v-if="mobileOpen"
        class="fixed inset-0 bg-black/40 z-30 xl:hidden"
        @click="mobileOpen = false" />
    </Transition>

    <!-- Sidebar -->
    <div class="fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out"
      :class="[
        // Mobile: slide-in drawer
        mobileOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0',
        // Desktop: ancho según collapsed
        collapsed ? 'xl:w-16' : 'xl:w-64'
      ]">
      <AdminSidebar
        :collapsed="collapsed"
        @close="mobileOpen = false"
        @toggle-collapse="toggleCollapse"
      />
    </div>

    <!-- Main content — margen dinámico -->
    <div class="flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out"
      :class="collapsed ? 'xl:ml-16' : 'xl:ml-64'">
      <AdminTopbar
        :collapsed="collapsed"
        @toggle-sidebar="mobileOpen = !mobileOpen"
        @toggle-collapse="toggleCollapse"
      />
      <main class="flex-1 px-2 py-3 xl:p-6 overflow-x-hidden overflow-y-auto bg-slate-50 main-scroll xl:pb-6">
        <slot />
      </main>
    </div>

    <!-- Admin Bottom Nav — mobile only (oculto para superadmin) -->
    <nav v-if="!auth.isSuperAdmin" class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg xl:hidden admin-bottom-nav">
      <div class="flex justify-around items-center py-1">
        <router-link v-for="item in adminBottomTabs" :key="item.to" :to="item.to"
          class="flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all"
          :class="isActive(item.to) ? 'text-primary' : 'text-slate-400'">
          <component :is="item.icon" class="w-5 h-5" />
          <span class="text-[10px] font-medium">{{ item.label }}</span>
        </router-link>
        <button @click="quickDrawer = true"
          class="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-400">
          <IconMenu class="w-5 h-5" />
          <span class="text-[10px] font-medium">Más</span>
        </button>
      </div>
    </nav>

    <!-- Quick Drawer (mobile) — acceso rápido a secciones + logout -->
    <Transition name="fade">
      <div v-if="quickDrawer" class="fixed inset-0 bg-black/40 z-[60] xl:hidden" @click="quickDrawer = false"/>
    </Transition>
    <Transition name="slide-up">
      <div v-if="quickDrawer"
        class="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl xl:hidden"
        style="padding-bottom: env(safe-area-inset-bottom, 0px)">
        <!-- Handle -->
        <div class="flex justify-center pt-3 pb-2">
          <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
        </div>
        <p class="px-5 pb-2 text-xs font-black uppercase tracking-widest text-slate-400">Panel de administración</p>

        <!-- Grid de accesos rápidos -->
        <div class="overflow-y-auto" style="max-height: calc(75vh - 90px)">
        <div class="grid grid-cols-3 gap-2 px-4 pb-4">
          <router-link v-for="item in drawerQuickLinks" :key="item.to" :to="item.to"
            @click="quickDrawer = false"
            class="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all">
            <component :is="item.icon" class="w-5 h-5 text-slate-600" />
            <span class="text-[10px] font-medium text-slate-700 text-center leading-tight">{{ item.label }}</span>
          </router-link>
        </div>

        </div><!-- /scroll wrapper -->
        <!-- Cerrar sesión — siempre visible y destacado -->
        <div class="px-4 pb-4 border-t border-slate-100 pt-3">
          <button @click="handleLogout"
            class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors">
            <IconLogOut class="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminSidebar from '@/components/Admin/AdminSidebar.vue'
import AdminTopbar  from '@/components/Admin/AdminTopbar.vue'
import { useAuthStore } from '@/stores/auth'

const mobileOpen  = ref(false)
const collapsed   = ref(false)
const quickDrawer = ref(false)
const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

onMounted(() => {
  collapsed.value = localStorage.getItem('admin-sidebar-collapsed') === 'true'
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem('admin-sidebar-collapsed', collapsed.value)
}

function isActive(to) {
  return route.path === to || (to !== '/admin' && route.path.startsWith(to))
}

async function handleLogout() {
  quickDrawer.value = false
  await auth.logout?.()
  router.push('/login')
}

const adminBottomTabs = [
  { to: '/admin',            label: 'Inicio',    icon: 'IconLayoutDashboard' },
  { to: '/admin/partidos',   label: 'Partidos',  icon: 'IconCircleDot' },
  { to: '/admin/fases',      label: 'Fases',     icon: 'IconTrophy' },
  { to: '/admin/arbitraje',  label: 'Arbitraje', icon: 'IconShield' },
]

const drawerQuickLinks = [
  { to: '/admin/torneos',        label: 'Torneos',        icon: 'IconTrophy' },
  { to: '/admin/categorias',     label: 'Categorías',     icon: 'IconLayers' },
  { to: '/admin/fases',          label: 'Fases',          icon: 'IconShuffle' },
  { to: '/admin/equipos',        label: 'Equipos',        icon: 'IconShield' },
  { to: '/admin/jugadores',      label: 'Jugadores',      icon: 'IconUser' },
  { to: '/admin/partidos',       label: 'Partidos',       icon: 'IconCircleDot' },
  { to: '/admin/arbitraje',      label: 'Arbitraje',      icon: 'IconShieldCheck' },
  { to: '/admin/inscripciones',  label: 'Inscripciones',  icon: 'IconClipboardList' },
  { to: '/admin/tabla',          label: 'Resultados',     icon: 'IconBarChart2' },
  { to: '/admin/premios',        label: 'Premios',        icon: 'IconMedal' },
  { to: '/admin/transmisiones',  label: 'Transmisiones',  icon: 'IconRadio' },
  { to: '/admin/galeria',        label: 'Galería',        icon: 'IconImage' },
  { to: '/admin/noticias',       label: 'Noticias',       icon: 'IconNewspaper' },
  { to: '/admin/analytics',      label: 'Analytics',      icon: 'IconTrendingUp' },
  { to: '/admin/config',         label: 'Config',         icon: 'IconSettings' },
]
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* El nav cubre la zona inferior incluyendo safe-area con su propio fondo */
.admin-bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: white;
}

/* El main deja espacio = altura del nav (56px aprox) + safe-area inferior */
@media (max-width: 1279px) {
  .main-scroll {
    padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
