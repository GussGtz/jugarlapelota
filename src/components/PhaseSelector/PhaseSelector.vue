<template>
  <div v-if="phases.list.length > 0" class="bg-white border-b border-muted">
    <div class="max-w-7xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
      <button
        v-for="phase in phases.list"
        :key="phase.id"
        @click="select(phase)"
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
        :class="phases.current?.id === phase.id
          ? 'bg-primary text-white'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-muted'"
      >
        <component :is="typeIcon(phase.type)" class="w-4 h-4" />
        {{ phase.name }}
        <span v-if="phase.rounds?.length" class="bg-slate-200 rounded-full px-1.5 text-[10px]">
          {{ phase.rounds.length }} rondas
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { usePhasesStore } from '@/stores/phases'
import { Trophy, Users, ClipboardList } from 'lucide-vue-next'

const phases = usePhasesStore()
const emit   = defineEmits(['change'])

function select(phase) {
  phases.current = phase
  emit('change', phase)
}

function typeIcon(type) {
  return type === 'knockout' ? Trophy : type === 'groups' ? Users : ClipboardList
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
