<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h2 class="section-title mb-6">Patrocinadores</h2>
    <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <div v-for="i in 4" :key="i" class="card animate-pulse h-24 bg-muted/50"></div>
    </div>
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <a v-for="s in sponsors" :key="s.id" :href="s.url || '#'" target="_blank" rel="noopener"
        class="card flex flex-col items-center gap-3 py-6 hover:border-primary transition-colors text-center">
        <img v-if="s.logo" :src="s.logo" class="h-12 object-contain"/>
        <div v-else class="w-12 h-12 bg-muted rounded-xl flex items-center justify-center"><IconHandshake class="w-6 h-6 text-gray-500" /></div>
        <p class="font-semibold text-slate-900 text-sm">{{ s.name }}</p>
      </a>
    </div>
    <p v-if="!loading && !sponsors.length" class="text-center text-slate-500 py-16">Sin patrocinadores registrados.</p>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useTournament } from '@/composables/useTournament'
import api from '@/api'
const { slug } = useTournament()
const sponsors = ref([])
const loading = ref(true)
onMounted(async () => {
  try { const { data } = await api.get(`/tournaments/${slug.value}/sponsors`); sponsors.value = data }
  catch {} finally { loading.value = false }
})
</script>
