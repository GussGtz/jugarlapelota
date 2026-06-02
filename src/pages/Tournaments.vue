<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <h2 class="section-title mb-6">Todos los Torneos</h2>
    <div v-if="loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="card animate-pulse h-48 bg-muted/50"></div>
    </div>
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <router-link v-for="t in list" :key="t.id" :to="`/${t.slug}`"
        class="card group hover:scale-[1.02] transition-transform block"
        :style="t.primary_color ? `--tw-ring-color:${t.primary_color}` : ''">
        <div class="h-32 rounded-xl bg-muted mb-4 overflow-hidden flex items-center justify-center text-4xl">
          <img v-if="t.banner" :src="t.banner" class="w-full h-full object-cover"/>
          <IconTrophy v-else class="w-8 h-8 text-gray-500" />
        </div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
            <img v-if="t.logo" :src="t.logo" class="w-full h-full object-contain rounded-xl"/>
            <IconTrophy v-else class="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <h3 class="font-bold text-slate-900 group-hover:text-primary transition-colors">{{ t.name }}</h3>
            <p class="text-slate-500 text-xs flex items-center gap-1"><IconMapPin class="w-3 h-3" /> {{ t.location }}</p>
          </div>
        </div>
        <div class="flex gap-4 mt-3 text-xs text-slate-500">
          <span v-if="t.start_date" class="flex items-center gap-1"><IconCalendar class="w-3 h-3" /> {{ formatDate(t.start_date) }}</span>
          <span v-if="t.end_date"> → {{ formatDate(t.end_date) }}</span>
        </div>
      </router-link>
    </div>
    <p v-if="!loading && !list.length" class="text-center text-slate-500 py-16">No hay torneos activos.</p>
  </div>
</template>
<script setup>
import { onMounted } from 'vue'
import { useTournamentsStore } from '@/stores/tournaments'
const store = useTournamentsStore()
const { list, loading } = store
const formatDate = d => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
onMounted(() => store.fetchAll())
</script>
