<template>
  <div class="space-y-6 max-w-2xl">
    <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Configuración</h2>
    <!-- Account -->
    <div class="card space-y-4">
      <h3 class="font-bold text-slate-900">Cuenta Admin</h3>
      <div class="grid gap-3">
        <div>
          <label class="text-xs text-slate-700 mb-1 block">Nombre</label>
          <input v-model="form.name" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
        </div>
        <div>
          <label class="text-xs text-slate-700 mb-1 block">Email</label>
          <input v-model="form.email" type="email" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
        </div>
        <div>
          <label class="text-xs text-slate-700 mb-1 block">Nueva contraseña (dejar vacío para no cambiar)</label>
          <input v-model="form.password" type="password" class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
        </div>
      </div>
      <button @click="saveAccount" class="btn-primary text-sm">Guardar cambios</button>
      <p v-if="saved" class="text-accent text-sm flex items-center gap-1"><IconCheckCircle class="w-4 h-4" /> Guardado correctamente</p>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'
const auth = useAuthStore()
const saved = ref(false)
const form = reactive({ name: auth.user?.name || '', email: auth.user?.email || '', password: '' })
async function saveAccount() {
  saved.value = false
  try {
    const { data } = await api.patch('/admin/me', {
      name: form.name,
      email: form.email,
      password: form.password || undefined,
    })
    // Actualizar store local con los datos confirmados por el servidor
    auth.user = { ...auth.user, name: data.name, email: data.email }
    localStorage.setItem('jlp_user', JSON.stringify(auth.user))
    form.password = ''
    saved.value = true
    setTimeout(() => saved.value = false, 3000)
  } catch(e) { alert(e.response?.data?.error || 'Error al guardar los cambios') }
}
</script>
