import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('jlp_token') || null)
  const user  = ref(JSON.parse(localStorage.getItem('jlp_user') || 'null'))

  // Verificar token al cargar — si el usuario ya no existe en la BD, limpiar sesión
  async function verifySession() {
    if (!token.value) return
    try {
      const { data } = await api.get('/auth/me')
      if (data?.id) user.value = data
    } catch (err) {
      // Solo cerrar sesión si el servidor rechazó el token explícitamente (401).
      // Cualquier otro fallo — red caída, timeout, el backend "dormido" en
      // Render/Neon, un 5xx transitorio — no significa que la sesión sea
      // inválida, y antes se trataba igual: bastaba una falla de red al
      // arrancar la app para desloguear a alguien con un token perfectamente
      // válido. La sesión debe durar hasta que el usuario cierre sesión a
      // propósito (o el token expire de verdad, que sí devuelve 401).
      if (err.response?.status === 401) {
        token.value = null; user.value = null
        localStorage.removeItem('jlp_token'); localStorage.removeItem('jlp_user')
      }
    }
  }

  const isAdmin      = computed(() => user.value?.role === 'admin' || user.value?.role === 'superadmin')
  const isSuperAdmin = computed(() => user.value?.role === 'superadmin')
  const isFan        = computed(() => user.value?.role === 'fan')
  const isLoggedIn   = computed(() => !!token.value)

  function _persist(data) {
    token.value = data.token
    user.value  = data.user
    localStorage.setItem('jlp_token', data.token)
    localStorage.setItem('jlp_user', JSON.stringify(data.user))
  }

  // email o username — uno de los dos puede ser null
  async function login(email, password, username) {
    const payload = { password }
    if (username) payload.username = username
    else payload.email = email
    const { data } = await api.post('/auth/login', payload)
    _persist(data)
  }

  async function googleLogin(credential) {
    const { data } = await api.post('/auth/google', { credential })
    _persist(data)
  }

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('jlp_token')
    localStorage.removeItem('jlp_user')
  }

  return { token, user, isAdmin, isSuperAdmin, isFan, isLoggedIn, login, googleLogin, logout, verifySession }
})
