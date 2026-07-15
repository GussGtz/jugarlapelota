<template>
  <Teleport to="body">
    <Transition name="offline-fade">
      <div v-if="!isOnline" class="fixed inset-0 z-[10000] overflow-hidden bg-white">
        <!-- La imagen ocupa el 100% del alto de la pantalla siempre (h-full,
             ancho automático según su proporción) — así nunca se recorta el
             logo de arriba ni el texto/botón de abajo, sin importar qué tan
             angosta o ancha sea la pantalla. Cuando el monitor es más ancho
             que la imagen (la mayoría de escritorios), sobra espacio a los
             lados que queda en blanco liso (bg-white del contenedor) — un
             fondo desenfocado de la misma imagen se probó primero, pero salía
             grisáceo/turbio (mezclaba el navy oscuro del borde de la imagen
             con su fondo claro al difuminarlo), y el blanco liso combina mejor
             con el fondo real de la imagen. En pantallas angostas (móvil) la
             imagen cubre el ancho completo sin dejar ningún margen. El botón
             se ancla dentro de la imagen (% relativo a su propia caja, que
             ahora siempre mide 100vh) en el espacio en blanco que estas dos
             imágenes ya traen reservado. -->
        <div class="relative z-10 h-full flex items-center justify-center">
          <div class="relative h-full">
            <img :src="image" alt="Sin conexión" class="block h-full w-auto max-w-none object-contain shadow-2xl" />
            <button ref="btnEl" @click="retry" :disabled="retrying"
              class="absolute left-1/2 -translate-x-1/2 px-8 py-3 rounded-xl font-black uppercase tracking-wide text-sm text-white shadow-2xl transition-all hover:opacity-90 hover:scale-105 active:scale-95 disabled:opacity-60 flex items-center gap-2"
              :style="{ bottom: buttonBottomPct, background:'linear-gradient(135deg,#0B1B36,#16305C)' }">
              <IconRefreshCw class="w-4 h-4" :class="retrying ? 'animate-spin' : ''" />
              {{ retrying ? 'Revisando...' : 'Reintentar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

// Algunas partes de la PWA (llamadas a la API, sockets) de plano no funcionan
// sin internet — en vez de dejar que cada pantalla falle por su cuenta, se
// bloquea todo con un aviso claro apenas se detecta que no hay conexión.
const isOnline    = ref(navigator.onLine)
const isMobile    = ref(window.innerWidth < 768)
const retrying    = ref(false)
const btnEl       = ref(null)
const btnHeightPx = ref(44) // valor inicial razonable; se mide de verdad en onMounted
const viewportH   = ref(window.innerHeight)

const image = computed(() => isMobile.value ? '/offline/movil.png' : '/offline/pc.png')

// Dónde termina el párrafo de cada imagen, medido a pixel (Python/Pillow sobre
// los archivos reales), con margen de sobra agregado a propósito:
// pc.png termina a ~11% desde abajo → objetivo 13%. movil.png termina a ~27%
// desde abajo → objetivo 30%. Esto es el % donde debe quedar el BORDE SUPERIOR
// del botón, no su ancla `bottom`.
const SAFE_TOP_PCT = { pc: 13, movil: 30 }

// El botón mide lo mismo en píxeles sin importar el alto de la ventana (su
// tamaño sale de padding/tipografía fijos, no de vh) — pero la imagen sí se
// achica con la ventana (h-full). Eso significa que el mismo % de "bottom"
// deja el borde superior del botón cada vez más arriba mientras más bajita
// sea la pantalla (el botón "pesa" más como % de una imagen más chica), hasta
// meterse en el texto en viewports cortos (ej. 1024×600 se salvaba por poco,
// 1024×500 ya se encimaba). Se calcula el `bottom` necesario en cada resize
// para que el borde superior quede siempre fijo en SAFE_TOP_PCT, compensando
// el alto real (medido) del botón.
const buttonBottomPct = computed(() => {
  const safeTopPct = isMobile.value ? SAFE_TOP_PCT.movil : SAFE_TOP_PCT.pc
  const imgHeightPx = viewportH.value
  const bottomPx = imgHeightPx * (safeTopPct / 100) - btnHeightPx.value
  const bottomPct = Math.max(0, bottomPx / imgHeightPx * 100)
  return `${bottomPct}%`
})

function updateOnlineStatus() { isOnline.value = navigator.onLine }
function updateViewport() {
  isMobile.value = window.innerWidth < 768
  viewportH.value = window.innerHeight
}
function measureButton() {
  if (btnEl.value) btnHeightPx.value = btnEl.value.getBoundingClientRect().height || btnHeightPx.value
}

async function retry() {
  retrying.value = true
  // navigator.onLine puede tardar un instante en reflejar una reconexión real
  // (sobre todo en móvil, cambiando de wifi a datos) — se le da un respiro
  // antes de recargar, para no mostrar el mismo error de inmediato.
  await new Promise(r => setTimeout(r, 400))
  updateOnlineStatus()
  if (navigator.onLine) window.location.reload()
  else retrying.value = false
}

// El botón solo existe en el DOM mientras isOnline es false (v-if) — hay que
// medirlo cada vez que aparece, no solo una vez al montar el componente
// (que puede pasar con la app todavía "online").
watch(isOnline, async (online) => {
  if (!online) { await nextTick(); measureButton() }
})

function handleResize() {
  updateViewport()
  measureButton()
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  window.addEventListener('resize', handleResize)
  if (!isOnline.value) nextTick(measureButton)
})
onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.offline-fade-enter-active, .offline-fade-leave-active { transition: opacity 0.25s ease; }
.offline-fade-enter-from, .offline-fade-leave-to { opacity: 0; }
</style>
