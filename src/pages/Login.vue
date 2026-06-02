<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-sky-50">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <img src="@/assets/images/LOGO.png" alt="JugarLaPelota" class="h-20 w-20 object-contain mx-auto mb-4 drop-shadow-md" />
        <h1 class="text-3xl font-black gradient-text mb-2">JugarLaPelota</h1>
        <p class="text-slate-500 text-sm">Accede para seguir tus equipos favoritos</p>
      </div>

      <!-- Google Sign-In (fans) -->
      <div class="card mb-4 space-y-3">
        <p class="text-xs text-slate-500 font-semibold uppercase tracking-wider text-center mb-1">Seguidores y fanáticos</p>
        <div id="google-signin-btn" class="flex justify-center"></div>
        <p class="text-center text-xs text-slate-400">
          Inicia con Google para seguir equipos y recibir notificaciones personalizadas
        </p>
      </div>

      <!-- Divider -->
      <div class="flex items-center gap-3 my-4">
        <div class="flex-1 h-px bg-slate-200"></div>
        <span class="text-xs text-slate-400 font-medium">¿Eres parte del equipo?</span>
        <div class="flex-1 h-px bg-slate-200"></div>
      </div>

      <!-- Equipo (admin / árbitro / staff) -->
      <form @submit.prevent="handleLogin" class="card space-y-4">
        <div class="flex items-center gap-3 pb-1 border-b border-slate-100">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <IconShield class="w-4 h-4 text-primary"/>
          </div>
          <div>
            <p class="text-sm font-black text-slate-900">Acceso para el equipo</p>
            <p class="text-[11px] text-slate-400">Administradores, árbitros y staff</p>
          </div>
        </div>
        <div>
          <label class="text-sm text-slate-700 mb-1 block">Correo o usuario</label>
          <input v-model="form.identifier" autocomplete="username" required
            class="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-primary transition-colors placeholder:text-slate-400"
            placeholder="correo@ejemplo.com  ó  ref_nombre_xx" />
          <p class="text-[11px] text-slate-400 mt-1">Los árbitros usan su usuario (ej: <code class="bg-slate-100 px-1 rounded">ref_carlos_a3f2</code>)</p>
        </div>
        <div>
          <label class="text-sm text-slate-700 mb-1 block">Contraseña</label>
          <div class="relative">
            <input v-model="form.password" :type="showPwd ? 'text' : 'password'" required
              class="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-primary transition-colors placeholder:text-slate-400 pr-12"
              placeholder="••••••••" />
            <button type="button" @click="showPwd=!showPwd"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <IconEyeOff v-if="showPwd" class="w-4 h-4"/><IconEye v-else class="w-4 h-4"/>
            </button>
          </div>
        </div>
        <p v-if="error" class="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2 flex items-center justify-center gap-1.5">
          <IconAlertCircle class="w-4 h-4 shrink-0"/>{{ error }}
        </p>
        <button type="submit" :disabled="loading" class="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2">
          <IconLoader2 v-if="loading" class="w-4 h-4 animate-spin"/>
          {{ loading ? 'Verificando...' : 'Ingresar' }}
        </button>
      </form>

      <p class="text-center text-slate-500 text-sm mt-6">
        <router-link to="/" class="hover:text-primary transition-colors flex items-center justify-center gap-1">
          <IconArrowLeft class="w-3.5 h-3.5"/> Volver al inicio
        </router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFollowingStore } from '@/stores/following'
import { usePWA } from '@/composables/usePWA'

const router   = useRouter()
const route    = useRoute()
const auth     = useAuthStore()
const following = useFollowingStore()
const { pushEndpoint } = usePWA()

const form    = reactive({ identifier: '', password: '' })
const error   = ref('')
const loading = ref(false)
const showPwd = ref(false)

// Ruta a la que volver después del login (pasada como ?redirect=...)
const redirectTo = computed(() => route.query.redirect || null)

async function handleLogin() {
  error.value   = ''
  loading.value = true
  try {
    const id = form.identifier.trim()
    // Detectar si es email (contiene @) o username
    const isEmail = id.includes('@')
    await auth.login(isEmail ? id : null, form.password, isEmail ? null : id)
    // Redirigir según rol
    const role = auth.user?.role
    if (role === 'referee') {
      router.push('/arbitro')
    } else {
      router.push(redirectTo.value || '/admin')
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Credenciales incorrectas. Verifica tu correo y contraseña.'
  } finally {
    loading.value = false
  }
}

async function handleGoogleCredential(response) {
  try {
    await auth.googleLogin(response.credential)
    if (pushEndpoint.value) {
      await following.syncFromServer(pushEndpoint.value)
    }
    router.push(redirectTo.value || '/')
  } catch {
    error.value = 'Error al iniciar sesión con Google'
  }
}

onMounted(() => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) return

  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  script.onload = () => {
    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
    })
    window.google?.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      { theme: 'outline', size: 'large', width: 320, text: 'signin_with', shape: 'rectangular', locale: 'es' }
    )
  }
  document.head.appendChild(script)
})
</script>
