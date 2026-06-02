import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/main.css'
import { registerIcons } from '@/plugins/icons'

const app = createApp(App)
app.use(createPinia())
app.use(router)
registerIcons(app)
app.mount('#app')
