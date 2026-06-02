<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">
        Inscripciones
        <span v-if="pending > 0" class="ml-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{{ pending }} pendientes</span>
      </h2>
    </div>

    <!-- ── Selector de torneo ─────────────────────────────────── -->
    <div class="flex gap-3 flex-wrap">
      <select v-model="selTournament" @change="load" class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option v-for="t in tournaments" :key="t.slug" :value="t">{{ t.name }}</option>
      </select>
      <select v-model="filterStatus" class="bg-white border border-muted rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option value="">Todas</option>
        <option value="pending">Pendientes</option>
        <option value="approved">Aprobadas</option>
        <option value="rejected">Rechazadas</option>
      </select>
    </div>

    <!-- ── Link de pre-inscripción ───────────────────────────── -->
    <div v-if="selTournament" class="bg-gradient-to-r from-primary/5 to-sky-50 border border-primary/20 rounded-2xl p-5">
      <div class="flex items-start gap-4">
        <!-- Icono -->
        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <IconLink class="w-5 h-5 text-primary" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-slate-900 text-sm mb-0.5">Link de Pre-inscripción</p>
          <p class="text-slate-500 text-xs mb-3">
            Comparte este link con los equipos interesados en participar en
            <strong>{{ selTournament.name }}</strong>. Ellos llenarán un formulario
            y tú decides si aprobar o rechazar cada solicitud.
          </p>

          <!-- URL box -->
          <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 mb-3">
            <IconExternalLink class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span class="text-slate-700 text-xs font-mono flex-1 truncate select-all">{{ inscriptionUrl }}</span>
            <button @click="copyLink"
              class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all shrink-0"
              :class="copied ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary hover:bg-primary/20'">
              <IconCheck v-if="copied" class="w-3.5 h-3.5" />
              <IconCopy v-else class="w-3.5 h-3.5" />
              {{ copied ? '¡Copiado!' : 'Copiar' }}
            </button>
          </div>

          <!-- Acciones de compartir -->
          <div class="flex flex-wrap gap-2">
            <a :href="whatsappUrl" target="_blank" rel="noopener"
              class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-[#25D366]/10 text-[#128C4A] border border-[#25D366]/30 rounded-lg hover:bg-[#25D366]/20 transition-colors">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <a :href="inscriptionUrl" target="_blank" rel="noopener"
              class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors">
              <IconExternalLink class="w-3.5 h-3.5" />
              Abrir formulario
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-4">
      <div v-for="insc in displayed" :key="insc.id" class="card space-y-4">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <h3 class="font-bold text-slate-900 text-lg">{{ insc.team_name }}</h3>
              <span class="text-xs px-2 py-0.5 rounded-full font-bold" :class="statusClass(insc.status)">
                {{ statusLabel(insc.status) }}
              </span>
            </div>
            <p class="text-slate-500 text-sm">{{ insc.categoryName || 'Sin categoría' }}</p>
            <div class="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
              <span class="flex items-center gap-1"><IconUser class="w-3 h-3" /> {{ insc.contact_name }}</span>
              <span class="flex items-center gap-1"><IconMail class="w-3 h-3" /> {{ insc.contact_email }}</span>
              <span v-if="insc.contact_phone" class="flex items-center gap-1"><IconSmartphone class="w-3 h-3" /> {{ insc.contact_phone }}</span>
              <span class="flex items-center gap-1"><IconCircle class="w-3 h-3" /> {{ insc.players_count }} jugadores</span>
            </div>
          </div>
          <div class="flex gap-2 flex-wrap">
            <button @click="showDetail(insc)" class="text-xs text-slate-500 hover:text-slate-900 px-3 py-1.5 border border-muted rounded-lg">Ver detalle</button>
            <button v-if="insc.status==='pending'" @click="setStatus(insc,'approved')" class="text-xs text-accent px-3 py-1.5 border border-accent/30 rounded-lg hover:bg-accent/10 font-bold flex items-center gap-1"><IconCheckCircle class="w-4 h-4" /> Aprobar</button>
            <button v-if="insc.status==='pending'" @click="setStatus(insc,'rejected')" class="text-xs text-red-500 px-3 py-1.5 border border-red-600/30 rounded-lg hover:bg-red-600/10 flex items-center gap-1"><IconXCircle class="w-4 h-4" /> Rechazar</button>
            <button @click="deleteInsc(insc.id)" class="text-xs text-red-500 px-2 py-1.5 border border-red-600/30 rounded-lg"><IconTrash2 class="w-4 h-4" /></button>
          </div>
        </div>
        <p v-if="insc.notes" class="text-slate-600 text-sm bg-slate-100 rounded-lg p-3">{{ insc.notes }}</p>
      </div>
      <p v-if="!displayed.length" class="text-center text-slate-500 py-16">Sin inscripciones.</p>
    </div>

    <!-- Detail modal -->
    <div v-if="selected" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-card rounded-2xl border border-muted w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-lg">{{ selected.team_name }}</h3>
          <button @click="selected=null" class="text-slate-400 hover:text-slate-900">×</button>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="bg-slate-100 rounded-xl p-3"><p class="text-slate-400 text-xs mb-1">Contacto</p><p class="text-slate-900">{{ selected.contact_name }}</p></div>
          <div class="bg-slate-100 rounded-xl p-3"><p class="text-slate-400 text-xs mb-1">Email</p><p class="text-slate-900 text-xs">{{ selected.contact_email }}</p></div>
          <div class="bg-slate-100 rounded-xl p-3"><p class="text-slate-400 text-xs mb-1">Teléfono</p><p class="text-slate-900">{{ selected.contact_phone || '—' }}</p></div>
          <div class="bg-slate-100 rounded-xl p-3"><p class="text-slate-400 text-xs mb-1">Jugadores</p><p class="text-slate-900">{{ selected.players_count }}</p></div>
        </div>
        <div v-if="selected.players?.length">
          <p class="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Lista de jugadores</p>
          <div class="space-y-1.5">
            <div v-for="p in selected.players" :key="p.id" class="flex items-center gap-3 bg-slate-100 rounded-lg px-3 py-2 text-sm">
              <span class="text-primary font-bold w-6">#{{ p.number }}</span>
              <span class="text-slate-900 flex-1">{{ p.name }}</span>
              <span class="text-slate-400 text-xs">{{ p.position }}</span>
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <button v-if="selected.status==='pending'" @click="setStatus(selected,'approved');selected=null" class="btn-accent text-sm flex-1 flex items-center justify-center gap-2"><IconCheckCircle class="w-4 h-4" /> Aprobar</button>
          <button v-if="selected.status==='pending'" @click="setStatus(selected,'rejected');selected=null" class="flex-1 text-sm border border-red-600/30 text-red-400 rounded-xl py-2 flex items-center justify-center gap-2"><IconXCircle class="w-4 h-4" /> Rechazar</button>
          <button @click="selected=null" class="btn-ghost text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api'

const inscriptions  = ref([])
const tournaments   = ref([])
const selTournament = ref(null)
const filterStatus  = ref('')
const selected      = ref(null)
const copied        = ref(false)

const displayed = computed(() => filterStatus.value ? inscriptions.value.filter(i=>i.status===filterStatus.value) : inscriptions.value)
const pending   = computed(() => inscriptions.value.filter(i=>i.status==='pending').length)

const inscriptionUrl = computed(() => {
  if (!selTournament.value) return ''
  const base = window.location.origin
  return `${base}/${selTournament.value.slug}/inscripcion`
})

const whatsappUrl = computed(() => {
  if (!inscriptionUrl.value) return ''
  const text = encodeURIComponent(
    `*Pre-inscripción — ${selTournament.value?.name}*\n\nCompleta el formulario para registrar tu equipo:\n${inscriptionUrl.value}`
  )
  return `https://wa.me/?text=${text}`
})

async function copyLink() {
  try {
    await navigator.clipboard.writeText(inscriptionUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  } catch {
    // fallback
    const el = document.createElement('input')
    el.value = inscriptionUrl.value
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  }
}

const statusLabels  = {pending:'Pendiente', approved:'Aprobada', rejected:'Rechazada'}
const statusClasses = {pending:'bg-yellow-500/20 text-yellow-400', approved:'bg-green-600/20 text-green-400', rejected:'bg-red-600/20 text-red-400'}
const statusLabel = s => statusLabels[s]  || s
const statusClass = s => statusClasses[s] || ''

function showDetail(insc) { selected.value = insc }

async function setStatus(insc, status) {
  await api.patch(`/inscriptions/${insc.id}/status`, {status})
  insc.status = status
  if (status === 'approved') await load()
}

async function deleteInsc(id) {
  if (!confirm('¿Eliminar esta inscripción?')) return
  await api.delete(`/inscriptions/${id}`); await load()
}

async function load() {
  if (!selTournament.value) return
  const {data} = await api.get(`/tournaments/${selTournament.value.slug}/inscriptions`)
  inscriptions.value = data
}

onMounted(async () => {
  const {data} = await api.get('/tournaments'); tournaments.value=data
  if (data.length) { selTournament.value=data[0]; await load() }
})
</script>
