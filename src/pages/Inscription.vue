<template>
  <div>
    <!-- Hero Header -->
    <section class="relative overflow-hidden bg-gradient-to-br from-slate-50 to-sky-50 py-14 md:py-20">
      <div class="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
      <div class="relative max-w-7xl mx-auto px-4 text-center">
        <p class="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-3">{{ tournament?.name }}</p>
        <h1 class="text-4xl md:text-6xl font-black text-slate-900 leading-tight mb-4">
          <span class="gradient-text">Pre-inscripción</span>
        </h1>
        <div class="flex items-center justify-center gap-3 mb-4">
          <div class="h-px w-12 bg-slate-200"></div>
          <div class="w-2 h-2 rounded-full bg-primary"></div>
          <div class="h-px w-12 bg-slate-200"></div>
        </div>
        <p class="text-slate-500 text-sm">Registra tu interés en participar en <strong>{{ tournament?.name }}</strong>. El organizador revisará tu solicitud y te confirmará.</p>
        <div v-if="tournament?.auto_approve_inscriptions" class="mt-4 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-2 rounded-full">
          <IconCheckCircle class="w-3.5 h-3.5" />
          Las inscripciones se aprueban automáticamente
        </div>
        <div v-else class="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-4 py-2 rounded-full">
          <IconClock class="w-3.5 h-3.5" />
          Tu solicitud quedará pendiente de aprobación
        </div>
      </div>
    </section>

    <div class="max-w-3xl mx-auto px-4 py-10">
      <!-- Success state -->
      <div v-if="sent" class="text-center py-20">
        <div class="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconCheckCircle class="w-10 h-10 text-accent" />
        </div>
        <h2 class="text-2xl font-black text-slate-900 mb-3">¡Pre-inscripción enviada!</h2>
        <p class="text-slate-500 mb-1">
          Se registró tu interés en
          <strong class="text-primary">{{ form.categoryIds.length }} categoría{{ form.categoryIds.length !== 1 ? 's' : '' }}</strong>.
        </p>
        <p class="text-slate-500 mb-2">Tu solicitud está <strong class="text-amber-600">pendiente de aprobación</strong>.</p>
        <p class="text-slate-400 text-sm mb-6">El organizador se comunicará contigo a la brevedad.</p>
        <router-link :to="`/${slug}`" class="btn-primary">Ver el torneo</router-link>
      </div>

      <div v-else>
        <router-link :to="`/${slug}`" class="text-slate-500 hover:text-primary text-sm flex items-center gap-1 mb-8 transition-colors">
          ← Volver al torneo
        </router-link>

        <form @submit.prevent="submit" class="space-y-6">
          <!-- Categorías -->
          <div class="card space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-slate-900 flex items-center gap-2">
                <div class="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <IconTrophy class="w-4 h-4 text-primary" />
                </div>
                Categorías de interés
              </h3>
              <div class="flex items-center gap-2">
                <button type="button" @click="selectAll"
                  class="text-[10px] font-bold text-primary hover:underline">Todas</button>
                <span class="text-slate-300">·</span>
                <button type="button" @click="form.categoryIds = []"
                  class="text-[10px] font-bold text-slate-400 hover:text-slate-600">Ninguna</button>
              </div>
            </div>

            <p class="text-xs text-slate-500">Marca todas las categorías en las que deseas inscribir tu equipo.</p>

            <!-- Grid de categorías agrupadas -->
            <div v-if="groupedCategories.length" class="space-y-4">
              <div v-for="group in groupedCategories" :key="group.key">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{{ group.label }}</p>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label v-for="cat in group.cats" :key="cat.id"
                    class="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-all select-none"
                    :class="form.categoryIds.includes(cat.id)
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-muted bg-white hover:border-primary/40 hover:bg-slate-50'">
                    <input type="checkbox" :value="cat.id" v-model="form.categoryIds" class="sr-only" />
                    <div class="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                      :class="form.categoryIds.includes(cat.id) ? 'bg-primary' : 'bg-slate-200'">
                      <IconCheck v-if="form.categoryIds.includes(cat.id)" class="w-2.5 h-2.5 text-white" />
                    </div>
                    <span class="text-xs font-semibold leading-tight"
                      :class="form.categoryIds.includes(cat.id) ? 'text-primary' : 'text-slate-700'">
                      {{ cat.name }}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Contador seleccionadas -->
            <div v-if="form.categoryIds.length" class="flex items-center gap-2 pt-1">
              <span class="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
                <IconCheckCircle class="w-3.5 h-3.5" />
                {{ form.categoryIds.length }} categoría{{ form.categoryIds.length !== 1 ? 's' : '' }} seleccionada{{ form.categoryIds.length !== 1 ? 's' : '' }}
              </span>
            </div>
            <p v-if="catError" class="text-red-500 text-xs font-semibold">{{ catError }}</p>
          </div>

          <!-- Datos del equipo -->
          <div class="card space-y-4">
            <h3 class="font-bold text-slate-900 flex items-center gap-2">
              <div class="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <IconShirt class="w-4 h-4 text-accent" />
              </div>
              Datos del Equipo
            </h3>
            <div class="grid sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="text-xs text-slate-500 font-semibold mb-1.5 block uppercase tracking-wide">Nombre del equipo *</label>
                <input v-model="form.team_name" required maxlength="60"
                  class="w-full bg-white border border-muted rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="Ej. Guerreros FC"/>
              </div>
              <!-- Logo del equipo -->
              <div class="sm:col-span-2">
                <label class="text-xs text-slate-500 font-semibold mb-1.5 block uppercase tracking-wide">Logo del equipo <span class="text-slate-400 font-normal normal-case">(opcional)</span></label>
                <div class="flex items-center gap-4">
                  <!-- Preview -->
                  <div class="w-16 h-16 rounded-xl border-2 border-dashed border-muted bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                    <img v-if="form.logo" :src="form.logo" class="w-full h-full object-cover rounded-xl"/>
                    <IconShirt v-else class="w-7 h-7 text-slate-300"/>
                  </div>
                  <div class="flex-1">
                    <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="onLogoChange"/>
                    <button type="button" @click="logoInput.click()"
                      class="text-sm font-semibold text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary/5 transition-colors">
                      {{ form.logo ? 'Cambiar logo' : 'Subir logo' }}
                    </button>
                    <p class="text-xs text-slate-400 mt-1">JPG, PNG o WebP · máx 2 MB</p>
                    <button v-if="form.logo" type="button" @click="form.logo=''" class="text-xs text-red-400 hover:text-red-600 mt-1">Quitar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Contacto -->
          <div class="card space-y-4">
            <h3 class="font-bold text-slate-900 flex items-center gap-2">
              <div class="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <IconUser class="w-4 h-4 text-primary" />
              </div>
              Contacto Responsable
            </h3>
            <div class="grid sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="text-xs text-slate-500 font-semibold mb-1.5 block uppercase tracking-wide">Nombre completo *</label>
                <input v-model="form.contact_name" required
                  class="w-full bg-white border border-muted rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
              </div>
              <div>
                <label class="text-xs text-slate-500 font-semibold mb-1.5 block uppercase tracking-wide">Correo electrónico *</label>
                <input v-model="form.contact_email" type="email" required
                  class="w-full bg-white border border-muted rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"/>
              </div>
              <div>
                <label class="text-xs text-slate-500 font-semibold mb-1.5 block uppercase tracking-wide">Teléfono / WhatsApp</label>
                <input v-model="form.contact_phone"
                  class="w-full bg-white border border-muted rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="998-123-4567"/>
              </div>
            </div>
          </div>

          <!-- Notas -->
          <div class="card">
            <label class="text-xs text-slate-500 font-semibold mb-1.5 block uppercase tracking-wide">Notas adicionales</label>
            <textarea v-model="form.notes" rows="3"
              class="w-full bg-white border border-muted rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
              placeholder="Información adicional, preguntas, etc."></textarea>
          </div>

          <p v-if="error" class="text-red-500 text-sm text-center bg-red-50 border border-red-100 rounded-xl py-3">{{ error }}</p>

          <button type="submit" :disabled="submitting" class="btn-primary w-full text-base py-4 disabled:opacity-50">
            <span class="flex items-center justify-center gap-2">
              <IconMail class="w-5 h-5" />
              {{ submitting ? 'Enviando...' : 'Enviar pre-inscripción' }}
            </span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import { uploadImagePublic } from '@/utils/upload'

const route  = useRoute()
const router = useRouter()
const slug   = route.params.slug
const tournament = ref(null)
const categories = ref([])
const sent       = ref(false)
const submitting = ref(false)
const error      = ref('')
const catError   = ref('')
const logoInput  = ref(null)

const form = reactive({
  categoryIds: [],
  team_name: '', players_count: 11,
  contact_name: '', contact_email: '', contact_phone: '',
  notes: '', players: [], logo: ''
})

async function onLogoChange(e) {
  const file = e.target.files[0]; if (!file) return
  try { form.logo = await uploadImagePublic(file) }
  catch { alert('Error al subir logo') }
}

// Agrupar categorías igual que CategorySelector
const GROUP_LABELS = {
  infantil:  'Infantil',
  juvenil:   'Juvenil',
  libre:     'Libre',
  veteranos: 'Veteranos',
  femenil:   'Femenil',
}

const groupedCategories = computed(() => {
  const map = {}
  for (const cat of categories.value) {
    const key = cat.group_name || 'libre'
    if (!map[key]) map[key] = { key, label: GROUP_LABELS[key] || key, cats: [] }
    map[key].cats.push(cat)
  }
  return Object.values(map)
})

function selectAll() {
  form.categoryIds = categories.value.map(c => c.id)
}

function addPlayer() {
  form.players.push({ name: '', number: form.players.length + 1, position: '' })
}

async function submit() {
  catError.value = ''
  error.value    = ''
  if (!form.categoryIds.length) {
    catError.value = 'Selecciona al menos una categoría.'
    return
  }
  submitting.value = true
  try {
    const tourData = await api.get(`/tournaments/${slug}`)
    const tid = tourData.data.id
    // Una sola inscripción con todas las categorías seleccionadas
    const result = await api.post('/inscriptions', {
      ...form,
      tournamentId: tid,
      categoryIds:  form.categoryIds,
    })
    if (result.data.auto_approved) {
      router.push(`/${slug}/inscripcion/${result.data.id}/jugadores`)
    } else {
      sent.value = true
    }
  } catch(e) {
    error.value = e.response?.data?.error || 'Error al enviar la solicitud. Intenta de nuevo.'
  } finally { submitting.value = false }
}

onMounted(async () => {
  const [t, cats] = await Promise.all([
    api.get(`/tournaments/${slug}`),
    api.get(`/tournaments/${slug}/categories`)
  ])
  tournament.value = t.data
  categories.value = cats.data
})
</script>
