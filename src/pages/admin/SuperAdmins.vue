<template>
  <div class="space-y-5">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg md:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <IconShieldCheck class="w-6 h-6 text-violet-500" />
          Gestión de Administradores
        </h2>
        <p class="text-slate-400 text-xs mt-0.5">Solo el super administrador puede gestionar estas cuentas</p>
      </div>
      <button @click="openCreate" class="btn-primary text-sm flex items-center gap-2">
        <IconUserPlus class="w-4 h-4" /> Nuevo admin
      </button>
    </div>

    <!-- ── Tabs ────────────────────────────────────────────── -->
    <div class="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
      <button
        v-for="tab in tabs" :key="tab.id"
        @click="activeTab = tab.id"
        class="px-4 py-1.5 rounded-lg text-sm font-bold transition-colors relative"
        :class="activeTab === tab.id
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'">
        {{ tab.label }}
        <span v-if="tab.id === 'requests' && pendingCount > 0"
          class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
          {{ pendingCount }}
        </span>
      </button>
    </div>

    <!-- ══ TAB: Administradores ══════════════════════════════ -->
    <template v-if="activeTab === 'admins'">

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div class="card py-3 px-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <IconUsers class="w-5 h-5 text-primary" />
        </div>
        <div>
          <p class="text-xl font-black text-slate-900">{{ admins.length }}</p>
          <p class="text-xs text-slate-400">Total</p>
        </div>
      </div>
      <div class="card py-3 px-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <IconCheckCircle class="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <p class="text-xl font-black text-slate-900">{{ admins.filter(a=>a.is_active).length }}</p>
          <p class="text-xs text-slate-400">Activos</p>
        </div>
      </div>
      <div class="card py-3 px-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <IconShieldCheck class="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <p class="text-xl font-black text-slate-900">{{ admins.filter(a=>a.role==='superadmin').length }}</p>
          <p class="text-xs text-slate-400">Super admin</p>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="rounded-2xl border border-muted overflow-hidden">
      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
      <table v-else class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
          <tr>
            <th class="py-3 px-4 text-left">Admin</th>
            <th class="py-3 px-4 text-left hidden md:table-cell">Email</th>
            <th class="py-3 px-4 text-center">Rol</th>
            <th class="py-3 px-4 text-center">Estado</th>
            <th class="py-3 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in admins" :key="a.id"
            class="border-t border-slate-100 hover:bg-slate-50 transition-colors"
            :class="{ 'opacity-50': !a.is_active }">
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                  :class="a.role==='superadmin' ? 'bg-violet-100 text-violet-600' : 'bg-primary/10 text-primary'">
                  {{ initials(a.name) }}
                </div>
                <div>
                  <p class="font-semibold text-slate-900">{{ a.name }}</p>
                  <p class="text-xs text-slate-400 md:hidden">{{ a.email }}</p>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 text-slate-500 hidden md:table-cell">{{ a.email }}</td>
            <td class="py-3 px-4 text-center">
              <span class="text-[10px] font-black uppercase px-2.5 py-1 rounded-full"
                :class="a.role==='superadmin'
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-primary/10 text-primary'">
                {{ a.role === 'superadmin' ? 'Super Admin' : 'Admin' }}
              </span>
            </td>
            <td class="py-3 px-4 text-center">
              <button @click="toggleStatus(a)"
                :disabled="a.id === currentUserId"
                class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :class="a.is_active
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'">
                <component :is="a.is_active ? IconCheck : IconX" class="w-3 h-3" />
                {{ a.is_active ? 'Activo' : 'Inactivo' }}
              </button>
            </td>
            <td class="py-3 px-4 text-right">
              <div class="flex gap-1.5 justify-end">
                <button @click="openEdit(a)"
                  class="p-1.5 rounded-lg border border-muted text-slate-400 hover:text-primary hover:border-primary/40 transition-colors"
                  title="Editar">
                  <IconPencil class="w-3.5 h-3.5" />
                </button>
                <button @click="openPassword(a)"
                  class="p-1.5 rounded-lg border border-muted text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-colors"
                  title="Cambiar contraseña">
                  <IconKey class="w-3.5 h-3.5" />
                </button>
                <button @click="confirmDelete(a)"
                  :disabled="a.id === currentUserId"
                  class="p-1.5 rounded-lg border border-muted text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Eliminar">
                  <IconTrash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!admins.length">
            <td colspan="5" class="text-center py-12 text-slate-400">Sin administradores registrados.</td>
          </tr>
        </tbody>
      </table>
    </div>

    </template>
    <!-- ══ END TAB: Administradores ══════════════════════════ -->

    <!-- ══ TAB: Solicitudes de contratación ══════════════════ -->
    <template v-if="activeTab === 'requests'">
      <div class="rounded-2xl border border-muted overflow-hidden">
        <div v-if="reqLoading" class="flex justify-center py-12">
          <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <table v-else class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th class="py-3 px-4 text-left">Solicitante</th>
              <th class="py-3 px-4 text-left hidden md:table-cell">Teléfono</th>
              <th class="py-3 px-4 text-left hidden lg:table-cell">Liga / Torneo</th>
              <th class="py-3 px-4 text-center">Estado</th>
              <th class="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in requests" :key="r.id"
              class="border-t border-slate-100 hover:bg-slate-50 transition-colors">
              <td class="py-3 px-4">
                <p class="font-semibold text-slate-900">{{ r.name }}</p>
                <p class="text-xs text-slate-400">{{ r.email }}</p>
              </td>
              <td class="py-3 px-4 text-slate-500 hidden md:table-cell">{{ r.phone || '—' }}</td>
              <td class="py-3 px-4 text-slate-500 hidden lg:table-cell">{{ r.org || '—' }}</td>
              <td class="py-3 px-4 text-center">
                <span class="text-[10px] font-black uppercase px-2.5 py-1 rounded-full"
                  :class="{
                    'bg-amber-100 text-amber-700': r.status === 'pending',
                    'bg-emerald-100 text-emerald-700': r.status === 'approved',
                    'bg-red-100 text-red-600': r.status === 'rejected',
                  }">
                  {{ statusLabel(r.status) }}
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex gap-1.5 justify-end">
                  <button @click="openRequest(r)"
                    class="p-1.5 rounded-lg border border-muted text-slate-400 hover:text-primary hover:border-primary/40 transition-colors"
                    title="Ver detalle">
                    <IconEye class="w-3.5 h-3.5" />
                  </button>
                  <button v-if="r.status !== 'approved'" @click="changeReqStatus(r, 'approved')"
                    class="p-1.5 rounded-lg border border-muted text-slate-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                    title="Aprobar">
                    <IconCheck class="w-3.5 h-3.5" />
                  </button>
                  <button v-if="r.status !== 'rejected'" @click="changeReqStatus(r, 'rejected')"
                    class="p-1.5 rounded-lg border border-muted text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors"
                    title="Rechazar">
                    <IconX class="w-3.5 h-3.5" />
                  </button>
                  <button @click="deleteRequest(r)"
                    class="p-1.5 rounded-lg border border-muted text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors"
                    title="Eliminar">
                    <IconTrash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!requests.length">
              <td colspan="5" class="text-center py-12 text-slate-400">No hay solicitudes registradas.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <!-- ══ END TAB: Solicitudes ═══════════════════════════════ -->

    <!-- ── Modal detalle solicitud ────────────────────────── -->
    <div v-if="reqDetail" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl border border-muted w-full max-w-md shadow-xl">
        <div class="px-6 py-4 border-b border-muted flex items-center justify-between">
          <h3 class="font-black text-slate-900">Solicitud de contratación</h3>
          <button @click="reqDetail=null" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5" /></button>
        </div>
        <div class="p-6 space-y-3 text-sm">
          <div class="grid grid-cols-2 gap-3">
            <div><p class="text-xs text-slate-400 mb-0.5">Nombre</p><p class="font-semibold text-slate-900">{{ reqDetail.name }}</p></div>
            <div><p class="text-xs text-slate-400 mb-0.5">Email</p><p class="font-semibold text-slate-900 break-all">{{ reqDetail.email }}</p></div>
            <div><p class="text-xs text-slate-400 mb-0.5">Teléfono</p><p class="font-semibold text-slate-900">{{ reqDetail.phone || '—' }}</p></div>
            <div><p class="text-xs text-slate-400 mb-0.5">Liga / Torneo</p><p class="font-semibold text-slate-900">{{ reqDetail.org || '—' }}</p></div>
          </div>
          <div v-if="reqDetail.message">
            <p class="text-xs text-slate-400 mb-0.5">Mensaje</p>
            <p class="text-slate-700 bg-slate-50 rounded-xl p-3 text-sm leading-relaxed">{{ reqDetail.message }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-400 mb-0.5">Notas internas</p>
            <textarea v-model="reqNotes" rows="2" class="req-input w-full resize-none"
              placeholder="Notas de seguimiento..." />
          </div>
          <p class="text-xs text-slate-400">Recibida: {{ formatDate(reqDetail.created_at) }}</p>
        </div>
        <div class="px-6 py-4 border-t border-muted flex gap-3 flex-wrap">
          <button @click="changeReqStatus(reqDetail,'approved')"
            class="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm transition">
            Aprobar
          </button>
          <button @click="changeReqStatus(reqDetail,'rejected')"
            class="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-sm transition">
            Rechazar
          </button>
          <button @click="reqDetail=null" class="btn-ghost text-sm px-5">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- ── Modal crear / editar ──────────────────────────── -->
    <div v-if="showForm" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl border border-muted w-full max-w-md shadow-xl">
        <div class="px-6 py-4 border-b border-muted flex items-center justify-between">
          <h3 class="font-black text-slate-900">{{ editing ? 'Editar administrador' : 'Nuevo administrador' }}</h3>
          <button @click="showForm=false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5" /></button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="text-xs font-bold text-slate-600 mb-1 block">Nombre completo *</label>
            <input v-model="form.name" class="input-base w-full" placeholder="Ej. Juan García" />
          </div>
          <div>
            <label class="text-xs font-bold text-slate-600 mb-1 block">Email *</label>
            <input v-model="form.email" type="email" class="input-base w-full" placeholder="admin@ejemplo.com" />
          </div>
          <div v-if="!editing">
            <label class="text-xs font-bold text-slate-600 mb-1 block">Contraseña *</label>
            <div class="relative">
              <input v-model="form.password" :type="showPwd ? 'text' : 'password'"
                class="input-base w-full pr-10" placeholder="Mínimo 6 caracteres" />
              <button @click="showPwd=!showPwd" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <component :is="showPwd ? IconEyeOff : IconEye" class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-slate-600 mb-1 block">Rol</label>
            <select v-model="form.role" class="input-base w-full">
              <option value="admin">Administrador</option>
              <option value="superadmin">Super Administrador</option>
            </select>
          </div>
          <div v-if="formError" class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {{ formError }}
          </div>
        </div>
        <div class="px-6 py-4 border-t border-muted flex gap-3">
          <button @click="saveForm" :disabled="saving"
            class="btn-primary text-sm flex-1 disabled:opacity-50 flex items-center justify-center gap-2">
            <div v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear administrador' }}
          </button>
          <button @click="showForm=false" class="btn-ghost text-sm px-5">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- ── Modal cambiar contraseña ──────────────────────── -->
    <div v-if="showPwdModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl border border-muted w-full max-w-sm shadow-xl">
        <div class="px-6 py-4 border-b border-muted flex items-center justify-between">
          <div>
            <h3 class="font-black text-slate-900">Cambiar contraseña</h3>
            <p class="text-xs text-slate-400 mt-0.5">{{ pwdTarget?.name }}</p>
          </div>
          <button @click="showPwdModal=false" class="text-slate-400 hover:text-slate-700"><IconX class="w-5 h-5" /></button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="text-xs font-bold text-slate-600 mb-1 block">Nueva contraseña *</label>
            <div class="relative">
              <input v-model="newPassword" :type="showNewPwd ? 'text' : 'password'"
                class="input-base w-full pr-10" placeholder="Mínimo 6 caracteres" />
              <button @click="showNewPwd=!showNewPwd" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <component :is="showNewPwd ? IconEyeOff : IconEye" class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div v-if="pwdError" class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {{ pwdError }}
          </div>
        </div>
        <div class="px-6 py-4 border-t border-muted flex gap-3">
          <button @click="savePassword" :disabled="saving"
            class="btn-primary text-sm flex-1 disabled:opacity-50 flex items-center justify-center gap-2">
            <div v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ saving ? 'Guardando...' : 'Cambiar contraseña' }}
          </button>
          <button @click="showPwdModal=false" class="btn-ghost text-sm px-5">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- ── Confirmar eliminación ──────────────────────────── -->
    <div v-if="deleteTarget" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <IconAlertTriangle class="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 class="font-black text-slate-900">¿Eliminar administrador?</h3>
            <p class="text-slate-500 text-sm mt-1">
              Se eliminará permanentemente la cuenta de <strong>{{ deleteTarget.name }}</strong>.
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div class="flex gap-3 pt-1">
          <button @click="deleteTarget=null" class="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm">
            Cancelar
          </button>
          <button @click="deleteAdmin" :disabled="saving"
            class="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm disabled:opacity-50 transition">
            {{ saving ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth   = useAuthStore()
const admins = ref([])
const loading = ref(false)
const saving  = ref(false)

// ── Tabs ───────────────────────────────────────────────────
const tabs = [
  { id: 'admins',   label: 'Administradores' },
  { id: 'requests', label: 'Solicitudes' },
]
const activeTab = ref('admins')

// ── Solicitudes ────────────────────────────────────────────
const requests  = ref([])
const reqLoading = ref(false)
const reqDetail  = ref(null)
const reqNotes   = ref('')
const pendingCount = computed(() => requests.value.filter(r => r.status === 'pending').length)

async function loadRequests() {
  reqLoading.value = true
  try {
    const { data } = await api.get('/admin-requests')
    requests.value = data
  } finally { reqLoading.value = false }
}

function openRequest(r) {
  reqDetail.value = r
  reqNotes.value  = r.notes || ''
}

async function changeReqStatus(r, status) {
  try {
    const notes = reqDetail.value?.id === r.id ? reqNotes.value : r.notes
    const { data } = await api.patch(`/admin-requests/${r.id}/status`, { status, notes })
    const idx = requests.value.findIndex(x => x.id === r.id)
    if (idx !== -1) requests.value[idx] = data
    if (reqDetail.value?.id === r.id) reqDetail.value = data
  } catch (e) { alert(e.response?.data?.error || 'Error') }
}

async function deleteRequest(r) {
  if (!confirm(`¿Eliminar solicitud de ${r.name}?`)) return
  try {
    await api.delete(`/admin-requests/${r.id}`)
    requests.value = requests.value.filter(x => x.id !== r.id)
    if (reqDetail.value?.id === r.id) reqDetail.value = null
  } catch (e) { alert(e.response?.data?.error || 'Error') }
}

const statusLabel = s => ({ pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }[s] || s)

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

const showForm    = ref(false)
const showPwdModal = ref(false)
const showPwd     = ref(false)
const showNewPwd  = ref(false)
const editing     = ref(null)
const pwdTarget   = ref(null)
const deleteTarget = ref(null)
const formError   = ref('')
const pwdError    = ref('')
const newPassword = ref('')

const currentUserId = computed(() => auth.user?.id)

const form = reactive({ name: '', email: '', password: '', role: 'admin' })

const initials = name => (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/superadmin/admins')
    admins.value = data
  } finally { loading.value = false }
}

function openCreate() {
  editing.value = null
  formError.value = ''
  Object.assign(form, { name: '', email: '', password: '', role: 'admin' })
  showForm.value = true
}

function openEdit(a) {
  editing.value = a
  formError.value = ''
  Object.assign(form, { name: a.name, email: a.email, role: a.role, password: '' })
  showForm.value = true
}

function openPassword(a) {
  pwdTarget.value = a
  newPassword.value = ''
  pwdError.value = ''
  showPwdModal.value = true
}

function confirmDelete(a) { deleteTarget.value = a }

async function saveForm() {
  formError.value = ''
  if (!form.name.trim() || !form.email.trim()) { formError.value = 'Nombre y email son requeridos'; return }
  if (!editing.value && !form.password.trim()) { formError.value = 'La contraseña es requerida'; return }
  saving.value = true
  try {
    if (editing.value) {
      await api.put(`/superadmin/admins/${editing.value.id}`, { name: form.name, email: form.email, role: form.role })
    } else {
      await api.post('/superadmin/admins', form)
    }
    await load()
    showForm.value = false
  } catch (e) {
    formError.value = e.response?.data?.error || 'Error al guardar'
  } finally { saving.value = false }
}

async function savePassword() {
  pwdError.value = ''
  if (!newPassword.value || newPassword.value.length < 6) { pwdError.value = 'Mínimo 6 caracteres'; return }
  saving.value = true
  try {
    await api.patch(`/superadmin/admins/${pwdTarget.value.id}/password`, { password: newPassword.value })
    showPwdModal.value = false
  } catch (e) {
    pwdError.value = e.response?.data?.error || 'Error al cambiar contraseña'
  } finally { saving.value = false }
}

async function toggleStatus(a) {
  try {
    const { data } = await api.patch(`/superadmin/admins/${a.id}/status`, { is_active: !a.is_active })
    const idx = admins.value.findIndex(x => x.id === a.id)
    if (idx !== -1) admins.value[idx] = { ...admins.value[idx], ...data }
  } catch (e) { alert(e.response?.data?.error || 'Error') }
}

async function deleteAdmin() {
  saving.value = true
  try {
    await api.delete(`/superadmin/admins/${deleteTarget.value.id}`)
    await load()
    deleteTarget.value = null
  } catch (e) {
    alert(e.response?.data?.error || 'Error al eliminar')
  } finally { saving.value = false }
}

onMounted(() => {
  load()
  loadRequests()
})
</script>

<style scoped>
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

.req-input {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 0.8rem;
  color: #0f172a;
  outline: none;
  width: 100%;
  transition: border-color 0.15s;
}
.req-input:focus { border-color: #0ea5e9; }
</style>
