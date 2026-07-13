import { ref, onMounted } from 'vue'
import api from '@/api'

const installPrompt  = ref(null)
const isInstalled    = ref(false)
const pushSupported  = ref(false)
const pushGranted    = ref(false)
const pushSub        = ref(null)
const pushEndpoint   = ref(localStorage.getItem('jlp_push_endpoint') || null)
const pushError      = ref('')

// El permiso de notificaciones del navegador, una vez concedido, no se puede
// revocar por JS — "Desactivar notificaciones" solo borra la suscripción de
// nuestro lado (push_subscriptions + endpoint local), pero Notification.permission
// sigue reportando 'granted' para siempre. Sin este flag, recargar la página
// después de desactivar hacía que el estado volviera a "activo" (leyendo el
// permiso crudo del navegador) aunque ya no hubiera ninguna suscripción real.
const PUSH_DISABLED_KEY = 'jlp_push_disabled'

// iOS (cualquier navegador — Chrome/Firefox en iOS usan WebKit por debajo y
// tienen la misma limitación) nunca dispara beforeinstallprompt, así que ahí
// hay que mostrar instrucciones manuales en vez de un botón de instalación.
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream

// Detect install state
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installPrompt.value = e
  })
  window.addEventListener('appinstalled', () => { isInstalled.value = true })
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) isInstalled.value = true
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePWA() {
  onMounted(() => {
    pushSupported.value = 'serviceWorker' in navigator && 'PushManager' in window
    pushGranted.value   = Notification.permission === 'granted' && localStorage.getItem(PUSH_DISABLED_KEY) !== 'true'
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
    pushError.value = ''
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        pushError.value = 'Bloqueaste las notificaciones. Actívalas en la configuración de tu navegador.'
        return false
      }
      if (permission !== 'granted') return false
      pushGranted.value = true
      localStorage.removeItem(PUSH_DISABLED_KEY)

      // Obtener SW registrado
      const reg = await navigator.serviceWorker.ready

      // Obtener VAPID key del servidor
      const { data } = await api.get('/push/vapid-public-key')
      if (!data?.publicKey) {
        pushError.value = 'Error de configuración del servidor. Intenta más tarde.'
        console.error('[Push] Servidor no devolvió VAPID public key')
        return false
      }

      // Verificar si ya hay una suscripción activa
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey)
        })
      }

      pushSub.value      = sub
      pushEndpoint.value = sub.endpoint
      localStorage.setItem('jlp_push_endpoint', sub.endpoint)

      // Registrar en el servidor
      const payload = sub.toJSON()
      await api.post('/push/subscribe', {
        endpoint: payload.endpoint,
        keys:     payload.keys,
      })

      return true
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        pushError.value = 'Permiso de notificaciones denegado.'
      } else {
        pushError.value = 'No se pudo activar las notificaciones. Intenta de nuevo.'
        console.warn('[Push] subscribePush error:', e)
      }
      return false
    }
  }

  async function unsubscribePush() {
    const endpoint = pushSub.value?.endpoint || pushEndpoint.value
    // El reseteo de estado local debe pasar SIEMPRE, incluso sin endpoint
    // (p.ej. tras un reload donde pushSub/pushEndpoint ya estaban en null pero
    // pushGranted seguía en true por el permiso crudo del navegador) — si no,
    // el botón "Desactivar" se queda sin efecto visible y parece no funcionar.
    if (endpoint) {
      try { await api.post('/push/unsubscribe', { endpoint }) } catch {}
    }
    if (pushSub.value) { try { await pushSub.value.unsubscribe() } catch {} }
    pushSub.value      = null
    pushGranted.value  = false
    pushEndpoint.value = null
    localStorage.removeItem('jlp_push_endpoint')
    localStorage.setItem(PUSH_DISABLED_KEY, 'true')
  }

  return {
    installPrompt, isInstalled, isIOS, pushSupported, pushGranted, pushSub, pushEndpoint, pushError,
    promptInstall, subscribePush, unsubscribePush
  }
}
