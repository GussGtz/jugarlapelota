<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <div v-if="loading" class="card animate-pulse h-64 bg-muted/50"></div>
    <div v-else-if="player" class="space-y-6">
      <div class="card flex items-center gap-6">
        <div class="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center text-5xl flex-shrink-0">
          <img v-if="player.photo" :src="player.photo" class="w-full h-full object-cover rounded-2xl"/>
          <IconUser v-else class="w-10 h-10 text-gray-500" />
        </div>
        <div>
          <p class="text-slate-500 text-sm">#{{ player.number }} · {{ player.position }}</p>
          <h1 class="text-3xl font-black text-slate-900">{{ player.name }}</h1>
          <p class="text-primary text-sm mt-1">{{ player.teamName }}</p>
        </div>
      </div>
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
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'
const route = useRoute()
const player = ref(null)
const loading = ref(true)
onMounted(async () => {
  try {
    const { data } = await api.get(`/tournaments/${route.params.slug}/players`)
    player.value = data.find(p => p.id == route.params.id)
  } catch {} finally { loading.value = false }
})
</script>
