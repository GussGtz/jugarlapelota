import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/main.css'
import { registerIcons } from '@/plugins/icons'
import { useAuthStore } from '@/stores/auth'
import { useFollowingStore } from '@/stores/following'
import { setupPWAUpdates } from '@/pwa'
import { vReveal } from '@/directives/reveal'

setupPWAUpdates()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
registerIcons(app)
app.directive('reveal', vReveal)
app.mount('#app')

// Verificar sesión al arrancar — limpia tokens inválidos automáticamente
const auth = useAuthStore()
auth.verifySession().then(() => {
  // Si hay sesión válida, hidratar equipos/torneos seguidos desde la cuenta
  // (persisten en BD por user_id, no solo en localStorage del dispositivo)
  if (auth.isLoggedIn) {
    useFollowingStore().syncFromServer(localStorage.getItem('jlp_push_endpoint'))
  }
})
