<template>
  <div style="background:#F7F9FC" class="min-h-screen">
    <div class="max-w-4xl mx-auto px-4 py-8 space-y-4">

      <!-- ── Loading ─────────────────────────────────────────── -->
      <template v-if="loading">
        <div v-for="i in 5" :key="i" class="skeleton h-28 rounded-2xl"></div>
      </template>

      <!-- ── Feed ──────────────────────────────────────────────── -->
      <template v-else>

        <!-- Portada de patrocinadores — fija arriba del contenido -->
        <div v-if="tournament?.sponsors_banner" class="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
          <img :src="tournament.sponsors_banner" alt="Patrocinadores" class="w-full h-auto object-cover" />
        </div>

        <!-- Transmisiones en vivo — siempre primero -->
        <template v-if="liveStreams.length">
          <div class="flex items-center gap-2 pt-2 pb-1 px-1">
            <span class="inline-flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full animate-pulse shadow-sm">
              <IconCircle class="w-2 h-2 fill-white" /> En Vivo
            </span>
          </div>
          <div v-for="s in liveStreams" :key="`stream-live-${s.id}`">
            <StreamCard :stream="s" class="shadow-md ring-2 ring-red-500/20" />
          </div>
          <div class="border-t border-slate-200 pt-2"></div>
        </template>

        <!-- Feed cronológico (más reciente arriba) -->
        <template v-for="item in feed" :key="`${item.type}-${item.id}`">

          <!-- ── NOTICIA ─────────────────────────────────────── -->
          <article v-if="item.type === 'news'"
            @click="expandedNews = expandedNews === item.id ? null : item.id"
            class="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer">

            <!-- Vista colapsada -->
            <template v-if="expandedNews !== item.id">
              <div class="flex gap-4 p-4">
                <!-- Imagen thumbnail -->
                <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                  <img v-if="item.cover" :src="item.cover" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <IconNewspaper class="w-7 h-7 text-slate-300" />
                  </div>
                </div>
                <!-- Texto -->
                <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div class="flex items-center gap-2 mb-1.5">
                      <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                        :style="{ color: primaryColor, background: primaryColor + '18' }">
                        Noticia
                      </span>
                      <span v-if="item.categoryName" class="text-[9px] text-slate-400 font-medium">{{ item.categoryName }}</span>
                    </div>
                    <h3 class="font-bold text-slate-900 text-sm leading-snug line-clamp-2">{{ item.title }}</h3>
                  </div>
                  <p class="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                    <IconClock class="w-3 h-3" /> {{ timeAgo(item.date) }}
                  </p>
                </div>
                <IconChevronDown class="w-4 h-4 text-slate-300 shrink-0 self-center" />
              </div>
            </template>

            <!-- Vista expandida -->
            <template v-else>
              <img v-if="item.cover" :src="item.cover" class="w-full h-52 sm:h-72 object-cover" />
              <div class="p-5">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    :style="{ color: primaryColor, background: primaryColor + '18' }">Noticia</span>
                  <span v-if="item.categoryName" class="text-[9px] text-slate-400 font-medium">{{ item.categoryName }}</span>
                  <span class="text-[9px] text-slate-400 ml-auto flex items-center gap-1">
                    <IconClock class="w-3 h-3" /> {{ timeAgo(item.date) }}
                  </span>
                </div>
                <h3 class="font-black text-slate-900 text-xl leading-snug mb-3">{{ item.title }}</h3>
                <div class="prose prose-sm text-slate-600 max-w-none leading-relaxed"
                  v-html="item.content"></div>
              </div>
            </template>
          </article>

          <!-- ── FOTO / GALERÍA ──────────────────────────────── -->
          <article v-else-if="item.type === 'photo'"
            class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <!-- Header galería -->
            <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                :style="{ background: primaryColor + '18' }">
                <IconImage class="w-4 h-4" :style="{ color: primaryColor }" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-slate-900 text-sm truncate">{{ item.title }}</p>
                <p class="text-[10px] text-slate-400">
                  {{ item.images?.length || 0 }} fotos
                  <span v-if="item.categoryName"> · {{ item.categoryName }}</span>
                  · {{ timeAgo(item.date) }}
                </p>
              </div>
            </div>
            <!-- Grid de fotos -->
            <div v-if="item.images?.length" class="grid grid-cols-3 sm:grid-cols-4 gap-0.5 p-0.5">
              <div v-for="(img, idx) in item.images.slice(0, 8)" :key="img.id"
                @click="lightbox = img.image_url"
                class="relative aspect-square overflow-hidden cursor-pointer group bg-slate-100">
                <img :src="img.image_url" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <!-- Overlay "+N más" en la última visible si hay más -->
                <div v-if="idx === 7 && item.images.length > 8"
                  class="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span class="text-white font-black text-lg">+{{ item.images.length - 8 }}</span>
                </div>
                <div v-else class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
              </div>
            </div>
          </article>

          <!-- ── TRANSMISIÓN (no en vivo) ───────────────────── -->
          <article v-else-if="item.type === 'stream'"
            class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-slate-100">
                <IconTv2 class="w-4 h-4 text-slate-500" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-slate-900 text-sm truncate">{{ item.title }}</p>
                <p class="text-[10px] text-slate-400">
                  {{ item.platform }}
                  <span v-if="item.categoryName"> · {{ item.categoryName }}</span>
                  · {{ timeAgo(item.date) }}
                </p>
              </div>
            </div>
            <StreamCard :stream="item" class="rounded-none border-0 shadow-none" />
          </article>

        </template>

        <!-- Empty state -->
        <div v-if="!feed.length && !liveStreams.length"
          class="text-center py-24 text-slate-400">
          <IconImage class="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p class="font-semibold text-lg">Sin contenido aún</p>
          <p class="text-sm mt-1 opacity-60">Las noticias, fotos y transmisiones aparecerán aquí</p>
        </div>

      </template>
    </div>

    <!-- ── Lightbox ──────────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="lightbox" @click="lightbox = null"
        class="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-pointer">
        <button @click.stop="lightbox = null"
          class="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10">
          <IconX class="w-8 h-8" />
        </button>
        <img :src="lightbox" class="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTournament } from '@/composables/useTournament'
import api from '@/api'
import StreamCard from '@/components/StreamCard/StreamCard.vue'

const { slug, tournament } = useTournament()

const news      = ref([])
const galleries = ref([])
const streams   = ref([])
const loading   = ref(false)
const lightbox  = ref(null)
const expandedNews = ref(null)

const primaryColor = computed(() => tournament.value?.primary_color || '#0ea5e9')

// Transmisiones en vivo siempre arriba
const liveStreams = computed(() => streams.value.filter(s => s.is_live))

// Feed cronológico unificado (noticias + galerías + transmisiones no-live)
const feed = computed(() => {
  const items = []

  // Noticias
  for (const n of news.value) {
    items.push({
      type: 'news',
      id:   n.id,
      date: n.created_at,
      title:   n.title,
      content: n.content,
      cover:   n.cover,
      categoryName: n.categoryName || null,
    })
  }

  // Galerías con fotos
  for (const g of galleries.value) {
    if (!g.images?.length) continue
    items.push({
      type:   'photo',
      id:     g.id,
      date:   g.created_at,
      title:  g.title,
      images: g.images,
      categoryName: g.categoryName || null,
    })
  }

  // Transmisiones (no en vivo)
  for (const s of streams.value.filter(s => !s.is_live)) {
    items.push({
      type:     'stream',
      id:       s.id,
      date:     s.created_at,
      title:    s.title,
      platform: s.platform,
      url:      s.url,
      thumbnail: s.thumbnail,
      categoryName: s.categoryName || null,
      // props para StreamCard
      ...s,
    })
  }

  // Ordenar por fecha descendente (más reciente arriba)
  return items.sort((a, b) => new Date(b.date) - new Date(a.date))
})

function timeAgo(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 60)  return `Hace ${mins}m`
  if (hours < 24)  return `Hace ${hours}h`
  if (days  === 1) return 'Ayer'
  if (days  < 7)   return `Hace ${days} días`
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  if (!slug.value) return
  loading.value = true
  try {
    const [n, g, s] = await Promise.all([
      api.get(`/tournaments/${slug.value}/news`),
      api.get(`/tournaments/${slug.value}/galleries`).catch(() => ({ data: [] })),
      api.get(`/tournaments/${slug.value}/streams`).catch(() => ({ data: [] })),
    ])
    news.value      = n.data
    galleries.value = g.data
    streams.value   = s.data
  } catch (e) { console.error(e) } finally { loading.value = false }
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
