import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: BASE,
  timeout: 30000   // 30s para dar tiempo al backend a despertar
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('jlp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Reintento automático cuando el backend está durmiendo (red/CORS/timeout)
api.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config
    // 401 fuera de la ruta de login → limpiar sesión y redirigir
    if (err.response?.status === 401) {
      const isLoginRequest = config.url?.includes('/auth/login') || config.url?.includes('/auth/google')
      if (!isLoginRequest) {
        localStorage.removeItem('jlp_token')
        localStorage.removeItem('jlp_user')
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
      return Promise.reject(err)
    }
    // Reintentar una vez si es error de red o timeout (backend durmiendo)
    if (!config._retry && (!err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK')) {
      config._retry = true
      await new Promise(r => setTimeout(r, 3000)) // espera 3s
      return api(config)
    }
    return Promise.reject(err)
  }
)

// ── Keep-alive: ping cada 5 min para evitar que el backend duerma ───────────
const HEALTH = BASE.replace('/api', '') + '/health'
function keepAlive() {
  fetch(HEALTH, { method: 'GET', mode: 'no-cors' }).catch(() => {})
}
keepAlive() // ping inmediato al cargar
setInterval(keepAlive, 5 * 60 * 1000) // cada 5 minutos

// ── Indicador global de "servidor despertando" ───────────────────────────────
export const serverWaking = { value: false }
let wakingTimer = null
api.interceptors.request.use(config => {
  // Si tarda más de 4s, mostrar indicador
  wakingTimer = setTimeout(() => { serverWaking.value = true }, 4000)
  config._wakingTimer = wakingTimer
  return config
})
const origResponse = api.interceptors.response.handlers?.[0]
api.interceptors.response.use(
  res => { clearTimeout(res.config?._wakingTimer); serverWaking.value = false; return res },
  err => { clearTimeout(err.config?._wakingTimer); return Promise.reject(err) }
)

export default api
