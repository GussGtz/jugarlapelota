<template>
  <header class="sticky top-0 z-50 transition-all duration-300 relative safe-top"
    :class="isTransparent
      ? 'bg-transparent border-transparent shadow-none'
      : 'bg-white border-b border-muted shadow-sm'">
    <nav class="max-w-7xl mx-auto px-3 md:px-4 flex items-center justify-between h-12 md:h-16">

      <!-- Logo -->
      <router-link to="/" class="flex items-center gap-2 shrink-0">
        <img src="@/assets/images/LOGO.png" alt="JugarLaPelota" class="h-8 w-8 md:h-10 md:w-10 object-contain" />
        <span class="text-base md:text-xl font-black hidden sm:block transition-colors duration-300"
          :class="isTransparent ? 'text-white' : 'gradient-text'">JugarLaPelota</span>
      </router-link>

      <!-- Desktop nav links — solo fuera del torneo -->
      <ul v-if="!inTournament" class="hidden md:flex items-center gap-6 text-sm font-medium transition-colors duration-300"
        :class="isTransparent ? 'text-white/90' : 'text-slate-700'">
        <li><router-link to="/" class="hover:text-primary transition-colors">Inicio</router-link></li>
        <li>
          <button @click="goToSection('torneos')"
            class="hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium text-sm"
            :class="isTransparent ? 'text-white/90' : 'text-slate-700'">
            Torneos
          </button>
        </li>
        <li>
          <button @click="goToSection('caracteristicas')"
            class="hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium text-sm"
            :class="isTransparent ? 'text-white/90' : 'text-slate-700'">
            Características
          </button>
        </li>
        <li>
          <router-link to="/contratar"
            class="font-bold px-4 py-1.5 rounded-xl text-sm transition-all"
            :class="isTransparent
              ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30'
              : 'bg-primary text-white hover:bg-sky-600 shadow-sm'">
            Contratar
          </router-link>
        </li>
      </ul>

      <!-- Actions -->
      <div class="flex items-center gap-2 md:gap-3">
        <LiveBadge v-if="liveCount > 0" :count="liveCount" />

        <!-- Bell solo si tiene notificaciones o es fan sin notifs -->
        <PushBell v-if="auth.isLoggedIn" class="hidden sm:block" />

        <!-- No logueado -->
        <template v-if="!auth.isLoggedIn">
          <router-link to="/login"
            class="bg-primary text-white font-bold px-3 md:px-5 py-1.5 md:py-2 rounded-xl text-xs md:text-sm hover:bg-sky-600 transition-all shadow-sm flex items-center gap-1.5">
            <IconLogIn class="w-3.5 h-3.5" /> Acceder
          </router-link>
        </template>

        <!-- Admin -->
        <template v-else-if="auth.isAdmin">
          <router-link to="/admin"
            class="border border-primary text-primary px-3 md:px-5 py-1.5 md:py-2 rounded-xl text-xs md:text-sm hover:bg-primary hover:text-white transition-all hidden sm:inline-flex items-center gap-1.5">
            <IconLayoutDashboard class="w-3.5 h-3.5" /> Dashboard
          </router-link>
          <router-link to="/admin" class="sm:hidden text-primary">
            <IconLayoutDashboard class="w-5 h-5" />
          </router-link>
        </template>

        <!-- Fan (Google) -->
        <template v-else-if="auth.isFan">
          <div class="relative" ref="profileMenuRef">
            <button @click.stop="profileOpen = !profileOpen"
              class="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-slate-100 transition-colors">
              <img v-if="auth.user?.avatar" :src="auth.user.avatar" referrerpolicy="no-referrer" class="w-7 h-7 rounded-full object-cover" />
              <div v-else class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <IconUser class="w-4 h-4 text-primary" />
              </div>
              <span class="text-sm font-semibold text-slate-800 hidden sm:block max-w-[100px] truncate">
                {{ auth.user?.name?.split(' ')[0] }}
              </span>
              <IconChevronDown class="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            <!-- Dropdown -->
            <Transition name="fade-down">
              <div v-if="profileOpen"
                class="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-muted shadow-xl overflow-hidden z-50">
                <div class="px-4 py-3 border-b border-muted">
                  <p class="font-bold text-slate-900 text-sm truncate">{{ auth.user?.name }}</p>
                  <p class="text-xs text-slate-400 truncate">{{ auth.user?.email }}</p>
                </div>
                <div v-if="following.count" class="px-4 py-2.5 border-b border-muted">
                  <p class="text-xs text-slate-500 flex items-center gap-1.5">
                    <IconHeart class="w-3.5 h-3.5 text-red-400" />
                    Siguiendo {{ following.count }} {{ following.count === 1 ? 'equipo' : 'equipos' }}
                  </p>
                </div>
                <button @click="handleLogout"
                  class="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                  <IconLogOut class="w-4 h-4" /> Cerrar sesión
                </button>
              </div>
            </Transition>
          </div>
        </template>

        <!-- ── Hamburguesa mobile (solo home, fuera de torneo) ── -->
        <div v-if="!inTournament && route.path === '/'" class="relative md:hidden" ref="mobileMenuRef">
          <button @click.stop="mobileMenuOpen = !mobileMenuOpen"
            class="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
            :class="mobileMenuOpen
              ? 'bg-primary text-white shadow-sm'
              : isTransparent
                ? 'text-white hover:bg-white/15'
                : 'text-slate-600 hover:bg-slate-100 border border-muted'">
            <IconMenu v-if="!mobileMenuOpen" class="w-5 h-5" />
            <IconX    v-else                 class="w-4 h-4" />
          </button>

          <!-- Panel flotante anclado a la derecha -->
          <Transition name="menu-pop">
            <div v-if="mobileMenuOpen"
              class="absolute right-0 top-[calc(100%+8px)] w-56 bg-white rounded-2xl border border-muted shadow-2xl overflow-hidden z-50">

              <!-- Cabecera decorativa -->
              <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Navegar</p>
              </div>

              <div class="p-2 flex flex-col gap-0.5">
                <router-link to="/" @click="mobileMenuOpen = false"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors">
                  <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <IconHome class="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  Inicio
                </router-link>

                <button @click="goToSection('torneos')"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left w-full">
                  <div class="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <IconTrophy class="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  Torneos
                </button>

                <button @click="goToSection('caracteristicas')"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left w-full">
                  <div class="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <IconStar class="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  Características
                </button>

                <div class="pt-1 pb-0.5 px-1">
                  <router-link to="/contratar" @click="mobileMenuOpen = false"
                    class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-sky-600 transition-colors shadow-sm shadow-primary/30">
                    <IconZap class="w-4 h-4" /> Contratar
                  </router-link>
                </div>
              </div>
            </div>
          </Transition>
        </div>

      </div>
    </nav>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMatchesStore } from '@/stores/matches'
import { useFollowingStore } from '@/stores/following'
import LiveBadge from '@/components/LiveBadge/LiveBadge.vue'
import PushBell  from '@/components/PushBell/PushBell.vue'

const auth      = useAuthStore()
const matches   = useMatchesStore()
const following = useFollowingStore()
const route     = useRoute()
const router    = useRouter()

const liveCount    = computed(() => matches.live.length)
const inTournament = computed(() => !!route.params.slug)

const profileOpen    = ref(false)
const profileMenuRef = ref(null)
const mobileMenuRef  = ref(null)
const scrollY        = ref(0)
const mobileMenuOpen = ref(false)

const isTransparent = computed(() =>
  route.path === '/' && scrollY.value < 60
)

function onScroll() { scrollY.value = window.scrollY }

function goToSection(id) {
  mobileMenuOpen.value = false
  if (route.path !== '/') {
    router.push('/').then(() => {
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    })
  } else {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function handleLogout() {
  auth.logout()
  profileOpen.value = false
  router.push('/')
}

function onClickOutside(e) {
  if (profileMenuRef.value && !profileMenuRef.value.contains(e.target)) {
    profileOpen.value = false
  }
  if (mobileMenuRef.value && !mobileMenuRef.value.contains(e.target)) {
    mobileMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.safe-top {
  padding-top: env(safe-area-inset-top);
}

.fade-down-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.fade-down-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.fade-down-enter-from, .fade-down-leave-to { opacity: 0; transform: translateY(-6px); }

/* Menú mobile: aparece desde arriba-derecha con escala */
.menu-pop-enter-active { transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1); }
.menu-pop-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.menu-pop-enter-from  { opacity: 0; transform: scale(0.9) translateY(-8px); transform-origin: top right; }
.menu-pop-leave-to    { opacity: 0; transform: scale(0.95) translateY(-4px); transform-origin: top right; }
</style>
