<template>
  <div class="insc-wrap">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 mb-4">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">
        Inscripciones
        <span v-if="pending > 0" class="ml-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{{ pending }}</span>
      </h2>
    </div>

    <!-- Filtros: cada select ocupa su mitad -->
    <div class="grid grid-cols-2 gap-2 mb-4">
      <select v-model="selTournament" @change="load"
        class="w-full bg-white border border-muted rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary truncate">
        <option v-for="t in tournaments" :key="t.slug" :value="t">{{ t.name }}</option>
      </select>
      <select v-model="filterStatus"
        class="w-full bg-white border border-muted rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary">
        <option value="">Todas</option>
        <option value="pending">Pendientes</option>
        <option value="approved">Aprobadas</option>
        <option value="rejected">Rechazadas</option>
      </select>
    </div>

    <!-- ── Link de pre-inscripción ───────────────────────────── -->
    <div v-if="selTournament" class="link-card mb-4">
      <p class="link-title"><IconLink class="w-3.5 h-3.5 text-primary" /> Link de inscripción</p>
      <p class="link-desc">Comparte con equipos de <strong>{{ selTournament.name }}</strong></p>
      <p class="link-url">{{ inscriptionUrl }}</p>
      <button @click="copyLink" class="link-copy" :class="{ copied }">
        <IconCheck v-if="copied" class="w-4 h-4" /> <IconCopy v-else class="w-4 h-4" />
        {{ copied ? '¡Enlace copiado!' : 'Copiar enlace' }}
      </button>
      <div class="link-actions">
        <a :href="whatsappUrl" target="_blank" rel="noopener" class="link-wa">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </a>
        <a :href="inscriptionUrl" target="_blank" rel="noopener" class="link-open">
          <IconExternalLink class="w-4 h-4" /> Abrir
        </a>
      </div>

      <!-- Auto-approve toggle -->
      <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-bold text-slate-700">Aprobación automática</p>
          <p class="text-[10px] text-slate-400 mt-0.5">
            {{ autoApprove ? 'Los equipos se inscriben directamente y pasan a registrar jugadores' : 'Cada solicitud queda pendiente hasta que la apruebes manualmente' }}
          </p>
        </div>
        <button @click="toggleAutoApprove"
          :class="autoApprove ? 'bg-primary' : 'bg-slate-200'"
          class="relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none">
          <span :class="autoApprove ? 'translate-x-5' : 'translate-x-0.5'"
            class="block w-5 h-5 bg-white rounded-full shadow transition-transform"></span>
        </button>
      </div>
    </div>

    <div class="space-y-4">
      <div v-for="insc in displayed" :key="insc.id" class="card space-y-3">
        <!-- Cabecera: logo + nombre + badge -->
        <div class="flex items-center gap-3">
          <img v-if="insc.logo" :src="insc.logo" class="w-9 h-9 rounded-lg object-cover border border-muted shrink-0"/>
          <div v-else class="w-9 h-9 rounded-lg bg-slate-100 border border-muted shrink-0 flex items-center justify-center text-slate-300 text-xs font-bold">?</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-bold text-slate-900 text-base truncate">{{ insc.team_name }}</h3>
              <span class="text-xs px-2 py-0.5 rounded-full font-bold shrink-0" :class="statusClass(insc.status)">
                {{ statusLabel(insc.status) }}
              </span>
            </div>
          </div>
        </div>
        <!-- Categorías -->
        <div class="flex flex-wrap gap-1">
          <span v-if="!insc.categories?.length" class="text-slate-500 text-sm">Sin categoría</span>
          <span v-for="cat in insc.categories" :key="cat.id"
            class="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
            {{ cat.name }}
          </span>
        </div>
        <!-- Contacto -->
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
          <span class="flex items-center gap-1"><IconUser class="w-3 h-3 shrink-0" /> {{ insc.contact_name }}</span>
          <span class="flex items-center gap-1 min-w-0"><IconMail class="w-3 h-3 shrink-0" /><span class="truncate">{{ insc.contact_email }}</span></span>
          <span v-if="insc.contact_phone" class="flex items-center gap-1"><IconSmartphone class="w-3 h-3 shrink-0" /> {{ insc.contact_phone }}</span>
          <span class="flex items-center gap-1"><IconCircle class="w-3 h-3 shrink-0" /> {{ insc.actual_players_count || insc.players_count || 0 }} jugadores</span>
        </div>
        <!-- Link de registro de jugadores — solo inscripciones aprobadas -->
        <div v-if="insc.status==='approved'" class="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <IconUsers class="w-4 h-4 text-emerald-600 shrink-0" />
          <span class="text-xs text-emerald-700 font-semibold flex-1 truncate">Link registro de jugadores</span>
          <a :href="playerRegUrl(insc)" target="_blank"
            class="text-xs font-bold text-emerald-700 border border-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1 shrink-0">
            <IconExternalLink class="w-3 h-3" /> Abrir
          </a>
          <button @click="copyPlayerLink(insc)"
            class="text-xs font-bold px-2 py-1 rounded-lg border transition-colors shrink-0 flex items-center gap-1"
            :class="copiedId===insc.id ? 'border-emerald-500 text-emerald-600 bg-emerald-100' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-100'">
            <IconCheck v-if="copiedId===insc.id" class="w-3 h-3" />
            <IconCopy v-else class="w-3 h-3" />
            {{ copiedId===insc.id ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
        <!-- Botones siempre en su propia fila -->
        <div class="flex gap-2 flex-wrap pt-1 border-t border-muted">
          <button @click="showDetail(insc)" class="text-xs text-slate-500 hover:text-slate-900 px-3 py-1.5 border border-muted rounded-lg">Ver detalle</button>
          <button v-if="insc.status==='pending'" @click="setStatus(insc,'approved')" class="text-xs text-accent px-3 py-1.5 border border-accent/30 rounded-lg hover:bg-accent/10 font-bold flex items-center gap-1"><IconCheckCircle class="w-4 h-4" /> Aprobar</button>
          <button v-if="insc.status==='pending'" @click="setStatus(insc,'rejected')" class="text-xs text-red-500 px-3 py-1.5 border border-red-600/30 rounded-lg hover:bg-red-600/10 flex items-center gap-1"><IconXCircle class="w-4 h-4" /> Rechazar</button>
          <button @click="deleteInsc(insc.id)" class="text-xs text-red-500 px-2 py-1.5 border border-red-600/30 rounded-lg hover:bg-red-50"><IconTrash2 class="w-4 h-4" /></button>
        </div>
        <p v-if="insc.notes" class="text-slate-600 text-sm bg-slate-100 rounded-lg p-3">{{ insc.notes }}</p>
      </div>
      <p v-if="!displayed.length" class="text-center text-slate-500 py-16">Sin inscripciones.</p>
    </div>

    <!-- Detail modal -->
    <div v-if="selected" class="modal-overlay">
      <div class="modal-sheet overflow-y-auto p-5">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-lg">{{ selected.team_name }}</h3>
          <button @click="selected=null" class="text-slate-400 hover:text-slate-900">×</button>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="bg-slate-100 rounded-xl p-3"><p class="text-slate-400 text-xs mb-1">Contacto</p><p class="text-slate-900">{{ selected.contact_name }}</p></div>
          <div class="bg-slate-100 rounded-xl p-3"><p class="text-slate-400 text-xs mb-1">Email</p><p class="text-slate-900 text-xs">{{ selected.contact_email }}</p></div>
          <div class="bg-slate-100 rounded-xl p-3"><p class="text-slate-400 text-xs mb-1">Teléfono</p><p class="text-slate-900">{{ selected.contact_phone || '—' }}</p></div>
          <div class="bg-slate-100 rounded-xl p-3"><p class="text-slate-400 text-xs mb-1">Jugadores</p><p class="text-slate-900">{{ selected.actual_players_count || selected.players_count || 0 }}</p></div>
        </div>
        <!-- Responsables por categoría -->
        <div v-if="selectedCategories.length">
          <p class="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Responsables / Cuerpo Técnico</p>
          <div v-for="cat in selectedCategories" :key="cat.id" class="mb-3">
            <p class="text-[10px] font-black uppercase tracking-widest text-primary mb-1.5">{{ cat.name }}</p>
            <div class="space-y-1.5">
              <div v-for="r in selected.responsables.filter(r => String(r.category_id) === String(cat.id))" :key="r.id"
                class="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-sm">
                <img v-if="r.foto" :src="r.foto" class="w-9 h-9 rounded-lg object-cover shrink-0 border border-primary/20"/>
                <div v-else class="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 shrink-0 flex items-center justify-center">
                  <IconUser class="w-4 h-4 text-primary/40"/>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-slate-900 truncate">{{ r.nombre }} {{ r.apellidos }}</p>
                  <p class="text-[10px] text-slate-400 font-mono">{{ r.curp }}</p>
                </div>
                <span class="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full shrink-0">R{{ r.orden }}</span>
              </div>
              <p v-if="!selected.responsables.filter(r => String(r.category_id) === String(cat.id)).length"
                class="text-xs text-slate-400 italic px-2">Sin responsables registrados aún</p>
            </div>
          </div>
        </div>
        <!-- Jugadores -->
        <div v-if="selected.players?.length">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs text-slate-500 font-semibold uppercase tracking-wider">Lista de jugadores</p>
            <span class="text-xs font-bold text-primary">{{ selected.players.length }} total</span>
          </div>
          <div class="space-y-1.5 max-h-60 overflow-y-auto">
            <div v-for="p in selected.players" :key="p.id" class="flex items-center gap-3 bg-slate-100 rounded-lg px-3 py-2 text-sm">
              <span class="text-primary font-bold w-6 shrink-0">{{ p.number ? `#${p.number}` : '—' }}</span>
              <span class="text-slate-900 flex-1 truncate">{{ p.name }}</span>
              <span class="text-slate-400 text-xs shrink-0">{{ p.position || '' }}</span>
              <span v-if="p.curp" class="text-[10px] font-mono text-slate-400 shrink-0 hidden sm:block">{{ p.curp }}</span>
              <a v-if="p.documento_oficial" :href="p.documento_oficial" target="_blank"
                class="text-[10px] text-primary font-semibold border border-primary/30 px-1.5 py-0.5 rounded shrink-0">Doc</a>
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
const copiedId      = ref(null)
const autoApprove   = ref(false)

// Por defecto oculta rechazadas; el filtro "Rechazadas" las muestra explícitamente
const displayed = computed(() =>
  filterStatus.value
    ? inscriptions.value.filter(i => i.status === filterStatus.value)
    : inscriptions.value.filter(i => i.status !== 'rejected')
)

const selectedCategories = computed(() => selected.value?.categories || [])
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

function playerRegUrl(insc) {
  const slug = selTournament.value?.slug || insc.tournament_slug || ''
  return `${window.location.origin}/${slug}/inscripcion/${insc.id}/jugadores`
}

async function copyPlayerLink(insc) {
  const url = playerRegUrl(insc)
  try { await navigator.clipboard.writeText(url) } catch {
    const el = document.createElement('input')
    el.value = url; document.body.appendChild(el); el.select()
    document.execCommand('copy'); document.body.removeChild(el)
  }
  copiedId.value = insc.id
  setTimeout(() => { copiedId.value = null }, 2500)
}

async function showDetail(insc) {
  // Usar las categorías ya cargadas en la lista como fallback inmediato
  selected.value = { ...insc, categories: insc.categories || [], responsables: [], players: [] }
  try {
    const respRes = await api.get(`/inscriptions/${insc.id}/responsables`)
    selected.value = {
      ...selected.value,
      responsables: respRes.data.responsables || [],
      categories: respRes.data.categories?.length ? respRes.data.categories : selected.value.categories,
    }
  } catch {
    // si falla, las categorías de la lista siguen disponibles para mostrar el modal
  }
  if (insc.status === 'approved') {
    try {
      const { data } = await api.get(`/inscriptions/${insc.id}/register`)
      selected.value = {
        ...selected.value,
        players: data.players || [],
        categories: data.categories?.length ? data.categories : selected.value.categories,
      }
    } catch {}
  }
}

async function setStatus(insc, status) {
  await api.patch(`/inscriptions/${insc.id}/status`, {status})
  await load() // recarga siempre para reflejar el cambio de estado inmediatamente
}

async function deleteInsc(id) {
  if (!confirm('¿Eliminar esta inscripción?')) return
  await api.delete(`/inscriptions/${id}`); await load()
}

async function toggleAutoApprove() {
  if (!selTournament.value) return
  const newVal = !autoApprove.value
  await api.patch(`/tournaments/${selTournament.value.slug}/settings`, { auto_approve_inscriptions: newVal })
  autoApprove.value = newVal
  selTournament.value.auto_approve_inscriptions = newVal ? 1 : 0
}

async function load() {
  if (!selTournament.value) return
  const {data} = await api.get(`/tournaments/${selTournament.value.slug}/inscriptions`)
  inscriptions.value = data
  autoApprove.value = !!selTournament.value.auto_approve_inscriptions
}

onMounted(async () => {
  const {data} = await api.get('/tournaments'); tournaments.value=data
  if (data.length) { selTournament.value=data[0]; await load() }
})
</script>

<style scoped>
/* Contenedor raíz — nunca desborda */
.insc-wrap {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

/* Card del link — todo en columna, nada desborda */
.link-card {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 14px;
  padding: 12px;
  display: block;
  box-sizing: border-box;
}
.link-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}
.link-desc {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 10px;
  line-height: 1.4;
}
.link-url {
  font-size: 10px;
  font-family: monospace;
  color: #475569;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  /* fuerza que no desborde bajo ninguna circunstancia */
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  box-sizing: border-box;
}
.link-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 9px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  margin-bottom: 8px;
  background: #0ea5e9;
  color: white;
  transition: background 0.15s;
  box-sizing: border-box;
}
.link-copy.copied { background: #10b981; }
.link-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.link-wa, .link-open {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  box-sizing: border-box;
}
.link-wa   { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
.link-open { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
</style>
