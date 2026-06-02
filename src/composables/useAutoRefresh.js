import { onMounted, onUnmounted } from 'vue'
import { apiEvents } from '@/api'

/**
 * Recarga automáticamente cuando hay mutaciones (POST/PUT/DELETE).
 * Uso: useAutoRefresh(loadFn, { debounce: 300 })
 */
export function useAutoRefresh(loadFn, { debounce = 400, urlFilter = null } = {}) {
  let timer = null

  function onMutation(e) {
    if (urlFilter && !e.detail?.url?.includes(urlFilter)) return
    clearTimeout(timer)
    timer = setTimeout(() => loadFn(), debounce)
  }

  onMounted(() => apiEvents.addEventListener('mutation', onMutation))
  onUnmounted(() => { apiEvents.removeEventListener('mutation', onMutation); clearTimeout(timer) })
}
