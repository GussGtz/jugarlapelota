import { ref, onMounted } from 'vue'
import api from '@/api'

const installPrompt  = ref(null)
const isInstalled    = ref(false)
const pushSupported  = ref(false)
const pushGranted    = ref(false)
const pushSub        = ref(null)
const pushEndpoint   = ref(localStorage.getItem('jlp_push_endpoint') || null)

// Detect install state
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installPrompt.value = e
  })
  window.addEventListener('appinstalled', () => { isInstalled.value = true })
  if (window.matchMedia('(display-mode: standalone)').matches) isInstalled.value = true
}

export function usePWA() {
  onMounted(() => {
    pushSupported.value = 'serviceWorker' in navigator && 'PushManager' in window
    pushGranted.value   = Notification.permission === 'granted'
  })

  async function promptInstall() {
    if (!installPrompt.value) return false
    installPrompt.value.prompt()
    const { outcome } = await installPrompt.value.userChoice
    if (outcome === 'accepted') { isInstalled.value = true; installPrompt.value = null }
    return outcome === 'accepted'
  }

  async function subscribePush() {
    if (!pushSupported.value) return false
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false
      pushGranted.value = true

      const reg = await navigator.serviceWorker.ready
      const { data } = await api.get('/push/vapid-public-key')

      // Convert base64 key to Uint8Array
      const key = data.publicKey
      const padding = '='.repeat((4 - key.length % 4) % 4)
      const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/')
      const rawKey = Uint8Array.from(atob(base64), c => c.charCodeAt(0))

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: rawKey
      })
      pushSub.value      = sub
      pushEndpoint.value = sub.endpoint
      localStorage.setItem('jlp_push_endpoint', sub.endpoint)
      await api.post('/push/subscribe', sub.toJSON())
      return true
    } catch (e) {
      console.warn('Push subscribe failed:', e)
      return false
    }
  }

  async function unsubscribePush() {
    const endpoint = pushSub.value?.endpoint || pushEndpoint.value
    if (!endpoint) return
    await api.post('/push/unsubscribe', { endpoint })
    if (pushSub.value) { await pushSub.value.unsubscribe(); pushSub.value = null }
    pushGranted.value  = false
    pushEndpoint.value = null
    localStorage.removeItem('jlp_push_endpoint')
  }

  return {
    installPrompt, isInstalled, pushSupported, pushGranted, pushSub, pushEndpoint,
    promptInstall, subscribePush, unsubscribePush
  }
}
