<template>
  <div v-if="links.length" class="flex items-center justify-end gap-3">
    <a v-for="l in links" :key="l.key" :href="l.url" target="_blank" rel="noopener noreferrer"
      class="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110 shadow-sm"
      :style="{ background: l.color }" :title="l.label">
      <IconFacebook      v-if="l.key === 'facebook'"  class="w-5 h-5" />
      <IconInstagram     v-else-if="l.key === 'instagram'" class="w-5 h-5" />
      <IconYoutube       v-else-if="l.key === 'youtube'"   class="w-5 h-5" />
      <IconMessageCircle v-else-if="l.key === 'whatsapp'"  class="w-5 h-5" />
      <svg v-else-if="l.key === 'tiktok'" viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v6.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917z" />
      </svg>
    </a>
  </div>
</template>
<script setup>
import { computed } from 'vue'

const props = defineProps({ tournament: { type: Object, default: null } })

const networks = [
  { key: 'facebook',  field: 'social_facebook',  label: 'Facebook',  color: '#1877F2' },
  { key: 'instagram', field: 'social_instagram', label: 'Instagram', color: '#E1306C' },
  { key: 'tiktok',    field: 'social_tiktok',    label: 'TikTok',    color: '#000000' },
  { key: 'youtube',   field: 'social_youtube',   label: 'YouTube',   color: '#FF0000' },
  { key: 'whatsapp',  field: 'social_whatsapp',  label: 'WhatsApp',  color: '#25D366' },
]

const links = computed(() => {
  if (!props.tournament) return []
  return networks
    .filter(n => props.tournament[n.field])
    .map(n => ({ ...n, url: props.tournament[n.field] }))
})
</script>
