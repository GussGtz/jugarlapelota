<template>
  <div class="min-h-screen bg-slate-50 py-16 px-4">
    <div class="max-w-2xl mx-auto">

      <!-- Header -->
      <div class="text-center mb-10">
        <span class="inline-block text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">
          Contratar plataforma
        </span>
        <h1 class="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
          Digitaliza tu torneo con<br>
          <span class="text-primary">JugarLaPelota</span>
        </h1>
        <p class="text-slate-500 mt-3 text-base max-w-md mx-auto">
          Completa el formulario y nos pondremos en contacto contigo en menos de 24 horas.
        </p>
      </div>

      <!-- Success -->
      <div v-if="sent" class="bg-white rounded-2xl border border-muted shadow-sm p-10 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <IconCheckCircle class="w-8 h-8 text-emerald-500" />
        </div>
        <h2 class="text-xl font-black text-slate-900">¡Solicitud enviada!</h2>
        <p class="text-slate-500 text-sm max-w-xs mx-auto">
          Recibimos tu solicitud. El equipo de JugarLaPelota revisará tu información y se pondrá en contacto contigo por teléfono o correo para coordinar los detalles.
        </p>
        <router-link to="/" class="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline mt-2">
          ← Volver al inicio
        </router-link>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="submit" class="bg-white rounded-2xl border border-muted shadow-sm p-8 space-y-5">

        <div class="grid sm:grid-cols-2 gap-5">
          <div>
            <label class="field-label">Nombre completo *</label>
            <input v-model="form.name" class="input-base w-full" placeholder="Juan García" required />
          </div>
          <div>
            <label class="field-label">Correo electrónico *</label>
            <input v-model="form.email" type="email" class="input-base w-full" placeholder="juan@ejemplo.com" required />
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-5">
          <div>
            <label class="field-label">Teléfono / WhatsApp</label>
            <input v-model="form.phone" type="tel" class="input-base w-full" placeholder="+52 998 123 4567" />
          </div>
          <div>
            <label class="field-label">Nombre de tu liga o torneo</label>
            <input v-model="form.org" class="input-base w-full" placeholder="Copa Verano 2026" />
          </div>
        </div>

        <div>
          <label class="field-label">Cuéntanos más (opcional)</label>
          <textarea v-model="form.message" rows="4" class="input-base w-full resize-none"
            placeholder="¿Cuántos equipos tienes? ¿En qué ciudad? ¿Cuándo empieza el torneo?" />
        </div>

        <div v-if="error" class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {{ error }}
        </div>

        <button type="submit" :disabled="sending"
          class="btn-primary w-full py-3 text-base font-black flex items-center justify-center gap-2 disabled:opacity-50">
          <div v-if="sending" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {{ sending ? 'Enviando...' : 'Enviar solicitud →' }}
        </button>

        <p class="text-center text-xs text-slate-400">
          Sin compromiso · Sin tarjeta de crédito · Respuesta en menos de 24 h
        </p>
      </form>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import api from '@/api'

const form = reactive({ name: '', email: '', phone: '', org: '', message: '' })
const sending = ref(false)
const sent    = ref(false)
const error   = ref('')

async function submit() {
  error.value = ''
  sending.value = true
  try {
    await api.post('/admin-requests', form)
    sent.value = true
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al enviar. Intenta de nuevo.'
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 6px;
}
.input-base {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 0.875rem;
  color: #0f172a;
  outline: none;
  transition: border-color 0.15s;
}
.input-base:focus { border-color: #0ea5e9; }
</style>
