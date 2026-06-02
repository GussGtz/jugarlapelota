<template>
  <div class="flex items-center gap-2 flex-wrap">
    <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Compartir:</span>

    <!-- WhatsApp -->
    <a :href="`https://wa.me/?text=${encoded}`" target="_blank" rel="noopener"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-600/20 text-green-400 text-xs font-semibold hover:bg-green-600/30 transition-colors">
      <IconSmartphone class="w-3 h-3" /> WhatsApp
    </a>

    <!-- Facebook -->
    <a :href="`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`" target="_blank" rel="noopener"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/20 text-blue-400 text-xs font-semibold hover:bg-blue-600/30 transition-colors">
      <IconFacebook class="w-3 h-3" /> Facebook
    </a>

    <!-- X/Twitter -->
    <a :href="`https://twitter.com/intent/tweet?text=${encoded}`" target="_blank" rel="noopener"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 transition-colors">
      <IconTwitter class="w-3 h-3" /> Twitter
    </a>

    <!-- Copy link -->
    <button @click="copyLink"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-slate-600 text-xs font-semibold hover:bg-primary/20 hover:text-primary transition-colors">
      <IconCheck v-if="copied" class="w-3 h-3 text-accent" />
      <IconLink v-else class="w-3 h-3" />
      {{ copied ? 'Copiado' : 'Copiar enlace' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  title: { type: String, default: 'JugarLaPelota' },
  url:   { type: String, default: '' }
})

const copied = ref(false)
const pageUrl = computed(() => props.url || window.location.href)
const encodedUrl = computed(() => encodeURIComponent(pageUrl.value))
const encoded    = computed(() => encodeURIComponent(`${props.title} - ${pageUrl.value}`))

async function copyLink() {
  try {
    await navigator.clipboard.writeText(pageUrl.value)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch {}
}
</script>
