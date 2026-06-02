import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTournamentsStore } from '@/stores/tournaments'

export function useTournament() {
  const route = useRoute()
  const store = useTournamentsStore()

  const slug       = computed(() => route.params.slug)
  const tournament = computed(() => store.current)
  const loading    = computed(() => store.loading)
  const modality   = computed(() => store.current?.modality || 'copa')

  // liga y mixto muestran Tabla; copa y grupos_eliminacion no
  const hasStandings = computed(() => ['liga', 'mixto'].includes(modality.value))

  async function load() {
    if (slug.value) await store.fetchBySlug(slug.value)
  }

  return { slug, tournament, loading, load, modality, hasStandings }
}
