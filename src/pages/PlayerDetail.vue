<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <div v-if="loading" class="card animate-pulse h-64 bg-muted/50"></div>
    <div v-else-if="player" class="space-y-6">
      <div class="card flex items-center gap-6">
        <div class="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center text-5xl flex-shrink-0">
          <img v-if="player.photo" :src="player.photo" class="w-full h-full object-cover rounded-2xl"/>
          <IconUser v-else class="w-10 h-10 text-gray-500" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-slate-500 text-sm">#{{ player.number }} · {{ player.position }}</p>
          <h1 class="text-3xl font-black text-slate-900">{{ player.name }}</h1>
          <p class="text-primary text-sm mt-1">{{ player.teamName }}</p>
        </div>
        <button @click="toggleFollow"
          class="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all border"
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
      <div class="grid grid-cols-4 gap-3">
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
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'
import { useFollowingStore } from '@/stores/following'

const route = useRoute()
const player = ref(null)
const loading = ref(true)
const following = useFollowingStore()

const isFollowed = computed(() => player.value ? following.isFollowingPlayer(player.value.id) : false)

async function toggleFollow() {
  await following.togglePlayer(player.value.id)
  player.value.followerCount = (player.value.followerCount || 0) + (isFollowed.value ? 1 : -1)
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/players/${route.params.id}`)
    player.value = data
  } catch {} finally { loading.value = false }
})
</script>
