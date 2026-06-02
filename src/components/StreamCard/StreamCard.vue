<template>
  <a :href="stream.url" target="_blank" rel="noopener" class="card group block hover:scale-[1.02] transition-transform">
    <!-- Thumbnail -->
    <div class="relative rounded-xl overflow-hidden mb-3 aspect-video bg-muted">
      <img v-if="stream.thumbnail" :src="stream.thumbnail" :alt="stream.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      <div v-else class="w-full h-full flex items-center justify-center"><IconRadio class="w-10 h-10 text-gray-500" /></div>
      <!-- Live overlay -->
      <div v-if="stream.isLive" class="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
        <span class="live-dot"></span> EN VIVO
      </div>
      <!-- Platform badge -->
      <div class="absolute bottom-2 right-2 bg-slate-900/70 text-white text-xs px-2 py-0.5 rounded">
        {{ stream.platform }}
      </div>
    </div>

    <h3 class="font-semibold text-slate-900 text-sm line-clamp-2">{{ stream.title }}</h3>
  </a>
</template>

<script setup>
defineProps({ stream: { type: Object, required: true } })
</script>
