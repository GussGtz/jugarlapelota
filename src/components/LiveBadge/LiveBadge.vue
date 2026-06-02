<template>
  <router-link to="/" class="flex items-center gap-1.5 bg-red-600/20 border border-red-600/40 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full">
    <span class="live-dot"></span>
    EN VIVO
    <span v-if="count > 1" class="bg-red-600 text-white rounded-full px-1.5 py-0.5 text-[10px]">{{ count }}</span>
  </router-link>
</template>

<script setup>
defineProps({ count: { type: Number, default: 0 } })
</script>
