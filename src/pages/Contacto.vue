<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
    <div class="w-full max-w-lg">

      <!-- Header -->
      <div class="text-center mb-8">
        <router-link to="/" class="inline-flex items-center justify-center mb-6">
          <img src="@/assets/images/LOGO.png" alt="JugarLaPelota" class="h-14 w-14 object-contain" />
        </router-link>
        <h1 class="text-2xl md:text-3xl font-black text-slate-900">Contáctanos</h1>
        <p class="text-slate-500 mt-2 text-sm">
          Cuéntanos sobre tu torneo y nos pondremos en contacto contigo pronto.
        </p>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-5">

        <!-- Success -->
        <div v-if="sent" class="flex flex-col items-center gap-4 py-6 text-center">
          <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <IconCheckCircle class="w-8 h-8 text-emerald-500" />
          </div>
          <h3 class="font-black text-slate-900 text-xl">¡Solicitud enviada!</h3>
          <p class="text-slate-500 text-sm max-w-xs">
            Recibimos tu información. Nos pondremos en contacto contigo en menos de 24 horas.
          </p>
          <router-link to="/" class="btn-primary text-sm mt-2">Volver al inicio</router-link>
        </div>

        <template v-else>
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2 md:col-span-1">
              <label class="label">Nombre completo *</label>
              <input v-model="form.name" class="input-f" placeholder="Tu nombre" />
            </div>
            <div class="col-span-2 md:col-span-1">
              <label class="label">Email *</label>
              <input v-model="form.email" type="email" class="input-f" placeholder="tu@email.com" />
            </div>
            <div class="col-span-2 md:col-span-1">
              <label class="label">Teléfono</label>
              <input v-model="form.phone" type="tel" class="input-f" placeholder="+52 999 000 0000" />
            </div>
            <div class="col-span-2 md:col-span-1">
              <label class="label">Nombre del torneo / Liga</label>
              <input v-model="form.org" class="input-f" placeholder="Copa Verano 2026" />
            </div>
            <div class="col-span-2">
              <label class="label">Cuéntanos más (opcional)</label>
              <textarea v-model="form.message" rows="3" class="input-f resize-none"
                placeholder="¿Cuántos equipos? ¿En qué ciudad? ¿Cuándo empieza?"></textarea>
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {{ error }}
          </div>

          <button @click="submit" :disabled="saving"
            class="w-full btn-primary py-3 text-base font-black flex items-center justify-center gap-2 disabled:opacity-50">
            <div v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ saving ? 'Enviando...' : 'Enviar solicitud' }}
          </button>

          <p class="text-center text-xs text-slate-400">
            Al enviar aceptas que nos pongamos en contacto contigo para hablar sobre el servicio.
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import api from '@/api'

const sent   = ref(false)
const saving = ref(false)
const error  = ref('')

const form = reactive({ name: '', email: '', phone: '', org: '', message: '' })

async function submit() {
  error.value = ''
  if (!form.name.trim() || !form.email.trim()) {
    error.value = 'Nombre y email son requeridos'; return
  }
  saving.value = true
  try {
    await api.post('/admin-requests', form)
    sent.value = true
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al enviar. Intenta de nuevo.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px; }
.input-f {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 0.875rem;
  color: #0f172a;
  outline: none;
  transition: border-color 0.15s;
}
.input-f:focus { border-color: #0ea5e9; background: white; }
</style>
