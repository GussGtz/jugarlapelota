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
      if (!data?.id) { token.value = null; user.value = null; localStorage.removeItem('jlp_token'); localStorage.removeItem('jlp_user') }
      else user.value = data
    } catch {
      token.value = null; user.value = null
      localStorage.removeItem('jlp_token'); localStorage.removeItem('jlp_user')
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
