<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <div v-if="loading" class="card animate-pulse h-64 bg-muted/50"></div>
    <div v-else-if="player" class="space-y-6">
      <div class="card flex items-start gap-4 md:gap-6">
        <div class="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-muted flex items-center justify-center text-5xl flex-shrink-0"
          :class="player.photo ? 'cursor-pointer' : ''" @click="player.photo && (showPhoto = true)">
          <img v-if="player.photo" :src="player.photo" class="w-full h-full object-cover rounded-2xl"/>
          <IconUser v-else class="w-10 h-10 text-gray-500" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-slate-500 text-sm">#{{ player.number }} · {{ player.position }}</p>
          <h1 class="text-2xl md:text-3xl font-black text-slate-900 break-words">{{ player.name }}</h1>
          <p class="text-primary text-sm mt-1 truncate">{{ player.teamName }}</p>
        </div>
        <button @click="toggleFollow"
          class="shrink-0 flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl font-bold text-sm transition-all border"
          :class="isFollowed
            ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
            : 'bg-white border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'">
          <IconHeart class="w-4 h-4" :class="isFollowed ? 'fill-red-400 text-red-400' : ''" />
          <span class="hidden sm:inline">{{ isFollowed ? 'Siguiendo' : 'Seguir' }}</span>
        </button>
      </div>
      <p v-if="player.followerCount > 0" class="text-slate-400 text-xs flex items-center gap-1 -mt-3 ml-1">
        <IconHeart class="w-3 h-3 text-red-400" /> {{ player.followerCount }} seguidor{{ player.followerCount !== 1 ? 'es' : '' }}
      </p>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="card text-center">
          <p class="text-3xl font-black text-accent">{{ player.goals }}</p>
          <p class="text-slate-500 text-xs mt-1">Goles</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-black text-primary">{{ player.assists }}</p>
          <p class="text-slate-500 text-xs mt-1">Asistencias</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-black text-yellow-400">{{ player.yellow_cards }}</p>
          <div class="flex justify-center mt-1"><IconSquare class="w-4 h-4 fill-yellow-400 text-yellow-400" /></div>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-black text-red-400">{{ player.red_cards }}</p>
          <div class="flex justify-center mt-1"><IconSquare class="w-4 h-4 fill-red-500 text-red-500" /></div>
        </div>
      </div>
    </div>

    <!-- ── Modal de foto de perfil ──────────────────────── -->
    <Transition name="fade">
      <div v-if="showPhoto" @click="showPhoto = false"
        class="fixed inset-0 bg-black/95 z-[200] flex flex-col cursor-pointer">
        <div class="flex justify-end px-4 py-3 shrink-0">
          <button @click="showPhoto = false" class="text-white/60 hover:text-white transition-colors">
            <IconX class="w-7 h-7" />
          </button>
        </div>
        <div class="flex-1 flex items-center justify-center px-4 pb-6 min-h-0">
          <img :src="player.photo" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl cursor-auto" @click.stop />
        </div>
      </div>
    </Transition>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import { useFollowingStore } from '@/stores/following'
import { useAuthStore } from '@/stores/auth'
import { usePWA } from '@/composables/usePWA'

const route = useRoute()
const router = useRouter()
const player = ref(null)
const loading = ref(true)
const showPhoto = ref(false)
const following = useFollowingStore()
const auth = useAuthStore()
const { pushGranted, subscribePush, pushEndpoint } = usePWA()

const isFollowed = computed(() => player.value ? following.isFollowingPlayer(player.value.id) : false)

async function toggleFollow() {
  if (!auth.isLoggedIn) {
    // Igual que con equipos/torneos: manda a login primero, guardando la ruta para volver
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }
  if (!pushGranted.value) await subscribePush()
  await following.togglePlayer(player.value.id, pushEndpoint.value)
  player.value.followerCount = (player.value.followerCount || 0) + (isFollowed.value ? 1 : -1)
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/players/${route.params.id}`)
    player.value = data
  } catch {} finally { loading.value = false }
})

function onKeydown(e) { if (e.key === 'Escape') showPhoto.value = false }
window.addEventListener('keydown', onKeydown)
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>
<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
