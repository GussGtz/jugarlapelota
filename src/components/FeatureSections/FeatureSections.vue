<template>
  <div class="features-root">

    <!-- ── 1. Panel Admin ──────────────────────────────── -->
    <section class="feat-row" ref="el0">
      <div class="feat-text" :class="{ 'is-visible': visible[0] }">
        <span class="feat-tag">Panel de administración</span>
        <h2 class="feat-h2">Gestiona todo tu torneo<br><span class="accent">desde tu celular</span></h2>
        <ul class="feat-list">
          <li><span class="ck">✓</span><span><strong>Estadísticas en tiempo real</strong> — torneos, equipos y jugadores de un vistazo</span></li>
          <li><span class="ck">✓</span><span><strong>Alertas inteligentes</strong> — inscripciones pendientes y partidos sin cancha</span></li>
          <li><span class="ck">✓</span><span><strong>Control total</strong> — aprueba solicitudes y ajusta todo sin estar en una PC</span></li>
        </ul>
        <router-link to="/login" class="feat-btn">Comenzar ahora</router-link>
      </div>
      <div class="feat-visual" :class="{ 'is-visible': visible[0] }">
        <div class="phone-frame">
          <div class="phone-screenshot-wrap"><img src="/screenshots/admin-dashboard.png" alt="Panel admin" class="phone-screenshot" /></div>
        </div>
      </div>
    </section>

    <!-- ── 2. Fases y Grupos ───────────────────────────── -->
    <section class="feat-row feat-row--rev bg-alt" ref="el1">
      <div class="feat-visual" :class="{ 'is-visible': visible[1] }">
        <div class="phone-frame">
          <div class="phone-screenshot-wrap"><img src="/screenshots/admin-fases.png" alt="Fases y grupos" class="phone-screenshot" /></div>
        </div>
      </div>
      <div class="feat-text" :class="{ 'is-visible': visible[1] }">
        <span class="feat-tag">Organización automática</span>
        <h2 class="feat-h2">Fases, grupos y llaves<br><span class="accent">en segundos</span></h2>
        <ul class="feat-list">
          <li><span class="ck">✓</span><span><strong>Generación automática</strong> — crea fases de grupos y eliminatorias con un clic</span></li>
          <li><span class="ck">✓</span><span><strong>Tabla en tiempo real</strong> — posiciones, diferencia de goles y desempates automáticos</span></li>
          <li><span class="ck">✓</span><span><strong>Multi-categoría</strong> — Sub-5, Sub-7, Varonil, Femenil… cada una con su propia fase</span></li>
        </ul>
        <router-link to="/login" class="feat-btn">Comenzar ahora</router-link>
      </div>
    </section>

    <!-- ── 3. Árbitro en vivo ──────────────────────────── -->
    <section class="feat-row" ref="el2">
      <div class="feat-text" :class="{ 'is-visible': visible[2] }">
        <span class="feat-tag">Portal del árbitro</span>
        <h2 class="feat-h2">El árbitro registra<br><span class="accent">en tiempo real</span></h2>
        <ul class="feat-list">
          <li><span class="ck">✓</span><span><strong>Goles y tarjetas</strong> — registra cada evento al instante desde el celular</span></li>
          <li><span class="ck">✓</span><span><strong>Marcador en vivo</strong> — los seguidores ven el resultado al momento</span></li>
          <li><span class="ck">✓</span><span><strong>Sin papel</strong> — todo queda guardado automáticamente en el sistema</span></li>
        </ul>
        <router-link to="/login" class="feat-btn">Comenzar ahora</router-link>
      </div>
      <div class="feat-visual" :class="{ 'is-visible': visible[2] }">
        <div class="phone-frame phone-frame--dark">
          <div class="phone-screenshot-wrap phone-screenshot-wrap--dark"><img src="/screenshots/referee-portal.png" alt="Portal árbitro" class="phone-screenshot" /></div>
        </div>
      </div>
    </section>

    <!-- ── 4. Vista pública ────────────────────────────── -->
    <section class="feat-row feat-row--rev bg-alt" ref="el3">
      <div class="feat-visual" :class="{ 'is-visible': visible[3] }">
        <div class="phone-frame">
          <div class="phone-screenshot-wrap"><img src="/screenshots/public-match.png" alt="Vista del aficionado" class="phone-screenshot" /></div>
        </div>
      </div>
      <div class="feat-text" :class="{ 'is-visible': visible[3] }">
        <span class="feat-tag">Experiencia del aficionado</span>
        <h2 class="feat-h2">Tus seguidores<br><span class="accent">siempre conectados</span></h2>
        <ul class="feat-list">
          <li><span class="ck">✓</span><span><strong>Marcador en vivo</strong> — ven el resultado en tiempo real desde cualquier celular</span></li>
          <li><span class="ck">✓</span><span><strong>Sigue tu equipo</strong> — notificaciones de goles y resultados al instante</span></li>
          <li><span class="ck">✓</span><span><strong>Sin instalar nada</strong> — funciona directo desde el navegador del celular</span></li>
        </ul>
        <router-link to="/torneos" class="feat-btn">Ver torneos</router-link>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'

const el0 = ref(null)
const el1 = ref(null)
const el2 = ref(null)
const el3 = ref(null)
const visible = reactive([false, false, false, false])

let observer

onMounted(() => {
  const els = [el0.value, el1.value, el2.value, el3.value]

  observer = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = els.indexOf(e.target)
          if (idx !== -1) {
            visible[idx] = true
            observer.unobserve(e.target) // una sola vez
          }
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  )

  els.forEach(el => el && observer.observe(el))
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.features-root { overflow: hidden; }
.bg-alt { background: #f8fafc; }

/* ── Row ── */
.feat-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  max-width: 1100px;
  margin: 0 auto;
  padding: 80px 32px;
}
.feat-row--rev { direction: rtl; }
.feat-row--rev > * { direction: ltr; }
@media (max-width: 768px) {
  .feat-row { grid-template-columns: 1fr; gap: 36px; padding: 48px 20px; }
  .feat-row--rev { direction: ltr; }
}

/* ── Text ── */
.feat-text {
  opacity: 0;
  transform: translateX(-36px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.feat-row--rev .feat-text { transform: translateX(36px); }
.feat-text.is-visible { opacity: 1; transform: translateX(0); }

.feat-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #0ea5e9;
  background: #e0f2fe;
  padding: 4px 12px;
  border-radius: 999px;
  margin-bottom: 14px;
}
.feat-h2 {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 900;
  color: #0f172a;
  line-height: 1.2;
  margin-bottom: 20px;
}
.accent { color: #0ea5e9; }

.feat-list {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.feat-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.5;
}
.ck { color: #10b981; font-weight: 900; font-size: 1rem; flex-shrink: 0; }
.feat-list strong { color: #0f172a; }

.feat-btn {
  display: inline-flex;
  align-items: center;
  background: #0ea5e9;
  color: white;
  font-weight: 800;
  font-size: 0.9rem;
  padding: 12px 24px;
  border-radius: 12px;
  text-decoration: none;
  transition: background 0.2s, transform 0.15s;
  box-shadow: 0 4px 16px rgba(14,165,233,0.3);
}
.feat-btn:hover { background: #0284c7; transform: translateY(-1px); }

/* ── Visual / phone frame ── */
.feat-visual {
  display: flex;
  justify-content: center;
  opacity: 0;
  transform: translateX(36px);
  transition: opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s;
}
.feat-row--rev .feat-visual { transform: translateX(-36px); }
.feat-visual.is-visible { opacity: 1; transform: translateX(0); }

.phone-frame {
  width: 300px;
  border-radius: 50px;
  border: 9px solid #1e293b;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.06) inset,
    0 36px 72px rgba(0,0,0,0.25),
    0 8px 20px rgba(0,0,0,0.14);
  position: relative;
  background: #1e293b;
  /* Bisel interior blanco — evita que el screenshot toque los bordes redondeados */
  padding: 3px;
  overflow: visible;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
}
.phone-frame:hover {
  transform: translateY(-8px);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.06) inset,
    0 48px 88px rgba(0,0,0,0.3),
    0 10px 24px rgba(0,0,0,0.16);
}

/* Notch superior */
.phone-frame::before {
  content: '';
  position: absolute;
  top: -1px; left: 50%;
  transform: translateX(-50%);
  width: 80px; height: 12px;
  background: #1e293b;
  border-radius: 0 0 12px 12px;
  z-index: 10;
}

.phone-frame--dark { border-color: #0f172a; }
.phone-frame--dark::before { background: #0f172a; }

/* Contenedor interno — recorta el screenshot limpiamente */
.phone-screenshot-wrap {
  width: 100%;
  border-radius: 43px;
  overflow: hidden;
  background: #fff;
  position: relative;
}
.phone-screenshot-wrap--dark {
  background: #0d1520;
}

.phone-screenshot {
  width: 100%;
  height: auto;
  display: block;
}
</style>
