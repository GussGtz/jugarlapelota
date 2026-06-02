<template>
  <a v-if="banner"
    :href="banner.link_url || '#'"
    :target="banner.link_url ? '_blank' : '_self'"
    rel="noopener"
    class="block overflow-hidden rounded-xl"
    :class="wrapClass"
  >
    <img :src="banner.image_url" :alt="banner.alt_text || 'Banner'" class="w-full h-full object-cover" />
  </a>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/api'
import { useRoute } from 'vue-router'

const props = defineProps({
  position:       { type: String, required: true },
  tournamentSlug: { type: String, default: null }
})

const banner = ref(null)
const route  = useRoute()
const slug   = computed(() => props.tournamentSlug || route.params.slug)

const wrapClass = computed(() => ({
  'h-20 md:h-28': props.position === 'header',
  'h-16 md:h-20': props.position === 'between-sections',
  'h-24 md:h-32': props.position === 'sidebar',
  'h-16':         props.position === 'footer',
}))

onMounted(async () => {
  if (!slug.value) return
  try {
    const { data } = await api.get(`/tournaments/${slug.value}/banners?position=${props.position}`)
    if (data.length) banner.value = data[Math.floor(Math.random() * data.length)]
  } catch {}
})
</script>
