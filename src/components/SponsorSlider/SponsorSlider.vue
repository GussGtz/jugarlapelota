<template>
  <section class="py-10 border-y border-muted overflow-hidden">
    <p class="text-center text-xs text-gray-500 uppercase tracking-widest mb-6 font-semibold">Patrocinadores</p>
    <div class="flex gap-12 animate-scroll" :style="{ '--count': sponsors.length }">
      <a
        v-for="sponsor in [...sponsors, ...sponsors]"
        :key="sponsor.id + Math.random()"
        :href="sponsor.url" target="_blank" rel="noopener"
        class="flex-shrink-0 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
      >
        <img :src="sponsor.logo" :alt="sponsor.name" class="h-10 object-contain" />
      </a>
    </div>
  </section>
</template>

<script setup>
defineProps({ sponsors: { type: Array, default: () => [] } })
</script>

<style scoped>
@keyframes scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-scroll {
  animation: scroll 20s linear infinite;
}
.animate-scroll:hover { animation-play-state: paused; }
</style>
