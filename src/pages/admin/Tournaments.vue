<template>
  <div class="space-y-4 md:space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg md:text-2xl font-extrabold text-slate-900">Torneos</h2>
      <button @click="openForm()" class="btn-primary text-sm">+ Nuevo torneo</button>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="t in list" :key="t.id" class="card space-y-3">
        <div class="h-24 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
          <img v-if="t.banner" :src="t.banner" class="w-full h-full object-cover"/>
          <IconTrophy v-else class="w-8 h-8 text-slate-400" />
        </div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
            <img v-if="t.logo" :src="t.logo" class="w-full h-full object-contain rounded-xl"/>
            <IconTrophy v-else class="w-6 h-6 text-slate-400" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-slate-900 truncate">{{ t.name }}</h3>
            <p class="text-slate-500 text-xs flex items-center gap-1"><IconMapPin class="w-3 h-3" /> {{ t.location }}</p>
          </div>
          <div class="w-4 h-4 rounded-full flex-shrink-0" :style="{ backgroundColor: t.primary_color || '#00C2FF' }"></div>
        </div>
        <!-- Modality badge -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
            :class="modalityStyle(t.modality).badge">
            {{ modalityStyle(t.modality).label }}
          </span>
          <span class="text-xs text-slate-400">{{ fmt(t.start_date) }}</span>
          <span v-if="t.followerCount > 0"
            class="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full bg-red-50 text-red-500 ml-auto"
            title="Seguidores">
            <IconHeart class="w-3 h-3 fill-red-400" /> {{ t.followerCount }}
          </span>
        </div>
        <div class="flex gap-2">
          <router-link :to="`/${t.slug}`" class="flex-1 text-center text-xs py-2 border border-muted rounded-lg text-slate-500 hover:text-slate-900">Ver público</router-link>
          <button @click="openForm(t)" class="flex-1 text-xs py-2 border border-primary/30 rounded-lg text-primary hover:bg-primary/10">Editar</button>
          <button @click="deleteTournament(t.id)" class="text-xs py-2 px-3 border border-red-600/30 rounded-lg text-red-400 hover:bg-red-600/10"><IconTrash2 class="w-4 h-4" /></button>
        </div>
      </div>
      <p v-if="!list.length" class="col-span-full text-center text-slate-500 py-16">Sin torneos. Crea el primero.</p>
    </div>

    <!-- Modal -->
    <div v-if="showForm" class="modal-overlay">
      <div class="modal-sheet-lg">
        <div class="modal-handle"/>
        <div class="modal-header">
          <h3 class="font-bold text-slate-900 text-base">{{ editing ? 'Editar torneo' : 'Nuevo torneo' }}</h3>
          <button @click="showForm=false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5"/></button>
        </div>
        <div class="modal-body space-y-5">

          <!-- ── MODALIDAD ─────────────────────────────────── -->
          <div>
            <label class="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 block">Modalidad del torneo *</label>
            <div class="grid grid-cols-2 gap-3">
              <button v-for="m in modalities" :key="m.key"
                type="button"
                @click="form.modality = m.key"
                class="relative text-left rounded-xl border-2 p-3.5 transition-all"
                :class="form.modality === m.key
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'">
                <div class="flex items-start gap-3">
                  <!-- Icono según modalidad -->
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    :class="form.modality === m.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'">
                    <IconTrophy   v-if="m.icon==='IconTrophy'"   class="w-4 h-4" />
                    <IconCircleDot v-else-if="m.icon==='IconCircleDot'" class="w-4 h-4" />
                    <IconShuffle  v-else-if="m.icon==='IconShuffle'"  class="w-4 h-4" />
                    <IconUsers    v-else-if="m.icon==='IconUsers'"    class="w-4 h-4" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-black text-slate-900 text-sm">{{ m.label }}</p>
                    <p class="text-slate-500 text-[11px] mt-0.5 leading-snug">{{ m.desc }}</p>
                    <div class="flex flex-wrap gap-1 mt-2">
                      <span v-for="tag in m.tags" :key="tag"
                        class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                        :class="form.modality === m.key ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-slate-500'">
                        {{ tag }}
                      </span>
                    </div>
                  </div>
                  <div v-if="form.modality === m.key"
                    class="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <IconCheck class="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              </button>
            </div>

            <!-- Reglas de la modalidad seleccionada -->
            <div v-if="selectedModality" class="mt-3 rounded-xl p-3.5 text-xs space-y-1.5"
              :class="selectedModality.key === 'copa' ? 'bg-amber-50 border border-amber-100' :
                      selectedModality.key === 'liga' ? 'bg-emerald-50 border border-emerald-100' :
                      selectedModality.key === 'mixto' ? 'bg-blue-50 border border-blue-100' :
                      'bg-purple-50 border border-purple-100'">
              <p class="font-black text-slate-700 flex items-center gap-2">
                <IconClipboardList class="w-3.5 h-3.5" />
                Reglas y políticas — {{ selectedModality.label }}
              </p>
              <ul class="space-y-1 text-slate-600 pl-1">
                <li v-for="rule in selectedModality.rules" :key="rule" class="flex items-start gap-1.5">
                  <span class="mt-0.5 shrink-0">·</span> {{ rule }}
                </li>
              </ul>
            </div>
          </div>

          <!-- ── DATOS BÁSICOS ──────────────────────────────── -->
          <div>
            <label class="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 block">Datos del torneo</label>
            <div class="grid md:grid-cols-2 gap-3">
              <div v-for="f in fields" :key="f.key" :class="f.full ? 'md:col-span-2' : ''">
                <label class="text-xs text-slate-600 mb-1 block">{{ f.label }}</label>
                <input v-model="form[f.key]" :type="f.type||'text'"
                  class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary transition-colors"
                  :placeholder="f.placeholder||''"/>
              </div>
              <!-- Colores -->
              <div>
                <label class="text-xs text-slate-600 mb-1 block">Color primario</label>
                <div class="flex gap-2 items-center">
                  <input v-model="form.primaryColor" type="color" class="w-10 h-10 rounded-lg border border-muted cursor-pointer"/>
                  <input v-model="form.primaryColor" class="flex-1 bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
                </div>
              </div>
              <div>
                <label class="text-xs text-slate-600 mb-1 block">Color secundario</label>
                <div class="flex gap-2 items-center">
                  <input v-model="form.secondaryColor" type="color" class="w-10 h-10 rounded-lg border border-muted cursor-pointer"/>
                  <input v-model="form.secondaryColor" class="flex-1 bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary"/>
                </div>
              </div>
            </div>
          </div>

          <!-- ── IMÁGENES ───────────────────────────────────── -->
          <div>
            <label class="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 block">Imágenes</label>
            <div class="grid md:grid-cols-2 gap-4">
              <ImageUpload v-model="form.logo"   label="Logo del torneo" :height="130" />
              <ImageUpload v-model="form.banner" label="Banner / portada" :height="130" />
            </div>
            <div class="mt-4">
              <ImageUpload v-model="form.sponsorsBanner" label="Portada de patrocinadores (pestaña Media)" :height="130" />
              <p class="text-xs text-slate-400 mt-1.5">Se muestra fija arriba del contenido en la pestaña "Media" del torneo. Ideal para una imagen con los logos de tus patrocinadores.</p>
            </div>
          </div>

          <!-- ── REDES SOCIALES ─────────────────────────────── -->
          <div>
            <label class="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 block">Redes sociales</label>
            <div class="grid md:grid-cols-2 gap-3">
              <div v-for="f in socialFields" :key="f.key">
                <label class="text-xs text-slate-600 mb-1 block">{{ f.label }}</label>
                <input v-model="form[f.key]" type="url"
                  class="w-full bg-white border border-muted rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-primary transition-colors"
                  :placeholder="f.placeholder"/>
              </div>
            </div>
            <p class="text-xs text-slate-400 mt-1.5">Aparecen del lado del aficionado (ej. debajo del banner de patrocinadores en la pestaña "Media"). Deja en blanco la que no uses.</p>
          </div>
        </div><!-- /modal-body -->
        <div class="modal-footer">
          <button @click="save" :disabled="saving" class="btn-primary text-sm flex-1 disabled:opacity-50">
            {{ saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear torneo' }}
          </button>
          <button @click="showForm=false" class="btn-ghost text-sm px-4">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTournamentsStore } from '@/stores/tournaments'
import ImageUpload from '@/components/ImageUpload/ImageUpload.vue'
import api from '@/api'

const store    = useTournamentsStore()
const { list } = storeToRefs(store)
const showForm = ref(false)
const editing  = ref(null)
const saving   = ref(false)

const form = reactive({
  name:'', slug:'', description:'', location:'', logo:'', banner:'', sponsorsBanner:'',
  primaryColor:'#00C2FF', secondaryColor:'#00FF95', startDate:'', endDate:'',
  modality: 'copa',
  socialFacebook:'', socialInstagram:'', socialTiktok:'', socialYoutube:'', socialWhatsapp:''
})

const fields = [
  { key:'name',        label:'Nombre del torneo *' },
  { key:'slug',        label:'URL (slug) *',        placeholder:'copa-caribe-2026' },
  { key:'location',    label:'Sede / Ciudad' },
  { key:'description', label:'Descripción breve',   full:true },
  { key:'startDate',   label:'Fecha inicio',         type:'date' },
  { key:'endDate',     label:'Fecha fin',            type:'date' },
]

const socialFields = [
  { key:'socialFacebook',  label:'Facebook',  placeholder:'https://facebook.com/tuTorneo' },
  { key:'socialInstagram', label:'Instagram', placeholder:'https://instagram.com/tuTorneo' },
  { key:'socialTiktok',    label:'TikTok',    placeholder:'https://tiktok.com/@tuTorneo' },
  { key:'socialYoutube',   label:'YouTube',   placeholder:'https://youtube.com/@tuTorneo' },
  { key:'socialWhatsapp',  label:'WhatsApp',  placeholder:'https://wa.me/5219981234567' },
]

const modalities = [
  {
    key: 'copa',
    icon: 'IconTrophy',
    label: 'Copa',
    desc: 'Eliminación directa. Pierdes, quedas fuera.',
    tags: ['Bracket', 'Eliminación', 'Rápido'],
    rules: [
      'Eliminación directa: el perdedor queda eliminado.',
      'Puede incluir fase de grupos previa (3 partidos garantizados).',
      'Bracket automático desde octavos, cuartos, semis y final.',
      'Tercer lugar opcional.',
      'Ideal para torneos de 1 a 3 días o pocas semanas.',
      'La Tabla de posiciones no aplica — el Fixture muestra todo.',
    ]
  },
  {
    key: 'liga',
    icon: 'IconCircleDot',
    label: 'Liga',
    desc: 'Todos contra todos. Gana quien acumule más puntos.',
    tags: ['Todos vs todos', 'Puntos', 'Tabla'],
    rules: [
      'Cada equipo juega contra todos los demás.',
      'Victoria = 3 pts · Empate = 1 pt · Derrota = 0 pts.',
      'Gana quien termine con más puntos al final.',
      'La Tabla de posiciones es la referencia principal.',
      'Se muestran estadísticas completas: GF, GC, DG, Fair Play.',
      'Puede ser a una o dos vueltas (ida y vuelta).',
    ]
  },
  {
    key: 'mixto',
    icon: 'IconShuffle',
    label: 'Liga + Liguilla',
    desc: 'Fase de liga seguida de eliminación directa.',
    tags: ['Grupos', 'Liguilla', 'Más partidos'],
    rules: [
      'Primera fase: todos contra todos por grupo o tabla general.',
      'Los mejores clasificados avanzan a la liguilla (eliminatoria).',
      'Garantiza más partidos — ideal para torneos amateur.',
      'Cuartos, Semis y Final en formato de eliminación directa.',
      'El admin decide cuántos equipos pasan por grupo.',
      'La Tabla es visible durante la fase de liga; el Bracket en liguilla.',
    ]
  },
  {
    key: 'grupos_eliminacion',
    icon: 'IconUsers',
    label: 'Grupos + Eliminación',
    desc: 'Fase de grupos y luego bracket de eliminación.',
    tags: ['Grupos', 'Bracket', 'Copa MX'],
    rules: [
      'Se forman grupos de 3-6 equipos.',
      '3 partidos garantizados mínimo (grupos de 4).',
      'Los primeros N de cada grupo avanzan al bracket.',
      'Eliminación directa desde 16avos, octavos, cuartos, semis, final.',
      'El admin configura cuántos pasan por grupo.',
      'Formato más popular en torneos amateur de México.',
    ]
  },
]

const selectedModality = computed(() => modalities.find(m => m.key === form.modality))

function modalityStyle(key) {
  const map = {
    copa:               { label: 'Copa',              badge: 'bg-amber-100 text-amber-700' },
    liga:               { label: 'Liga',              badge: 'bg-emerald-100 text-emerald-700' },
    mixto:              { label: 'Liga + Liguilla',   badge: 'bg-blue-100 text-blue-700' },
    grupos_eliminacion: { label: 'Grupos + Bracket',  badge: 'bg-purple-100 text-purple-700' },
  }
  return map[key] || { label: key || '—', badge: 'bg-slate-100 text-slate-600' }
}

const fmt = d => d ? new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) : ''

function openForm(t = null) {
  editing.value = t
  if (t) {
    Object.assign(form, {
      name: t.name, slug: t.slug, description: t.description || '',
      location: t.location || '', logo: t.logo || '', banner: t.banner || '',
      sponsorsBanner: t.sponsors_banner || '',
      primaryColor: t.primary_color || '#00C2FF', secondaryColor: t.secondary_color || '#00FF95',
      startDate: t.start_date || '', endDate: t.end_date || '',
      modality: t.modality || 'copa',
      socialFacebook: t.social_facebook || '', socialInstagram: t.social_instagram || '',
      socialTiktok: t.social_tiktok || '', socialYoutube: t.social_youtube || '', socialWhatsapp: t.social_whatsapp || ''
    })
  } else {
    Object.assign(form, {
      name:'', slug:'', description:'', location:'', logo:'', banner:'', sponsorsBanner:'',
      primaryColor:'#00C2FF', secondaryColor:'#00FF95', startDate:'', endDate:'',
      modality: 'copa',
      socialFacebook:'', socialInstagram:'', socialTiktok:'', socialYoutube:'', socialWhatsapp:''
    })
  }
  showForm.value = true
}

async function save() {
  if (!form.name || !form.slug) return alert('Nombre y slug son requeridos')
  saving.value = true
  try {
    if (editing.value) await store.update(editing.value.id, form)
    else await store.create(form)
    showForm.value = false
  } catch(e) { alert(e.response?.data?.error || 'Error al guardar') }
  finally { saving.value = false }
}

async function deleteTournament(id) {
  if (!confirm('¿Eliminar este torneo y todos sus datos?')) return
  await api.delete(`/tournaments/${id}`)
  await store.fetchAll()
}

onMounted(() => store.fetchAll())
</script>
