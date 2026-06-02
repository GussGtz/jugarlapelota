import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/main.css'
import { registerIcons } from '@/plugins/icons'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
registerIcons(app)
app.mount('#app')

// Verificar sesión al arrancar — limpia tokens inválidos automáticamente
useAuthStore().verifySession()
