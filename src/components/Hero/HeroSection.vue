<template>
  <section class="hero-root">

    <!-- ── Video de fondo ────────────────────────────────── -->
    <div v-if="VIDEO_URL" class="hero-video" aria-hidden="true">
      <iframe
        :src="VIDEO_URL"
        allow="autoplay; encrypted-media"
        frameborder="0"
        style="pointer-events:none;"
      />
    </div>
    <!-- Fallback CSS: cuando no hay video configurado -->
    <div v-if="!VIDEO_URL" class="hero-field-bg" aria-hidden="true">
      <div class="field-lines">
        <div class="field-center-circle"></div>
        <div class="field-center-line"></div>
        <div class="field-penalty left"></div>
        <div class="field-penalty right"></div>
      </div>
    </div>

    <!-- ── Overlay degradado ──────────────────────────── -->
    <div class="hero-overlay"></div>
    <!-- Gradiente lateral: izquierda más opaca para legibilidad del texto -->
    <div class="hero-overlay-side"></div>

    <!-- ── Partículas decorativas ─────────────────────── -->
    <div class="hero-glow glow-1" aria-hidden="true"></div>
    <div class="hero-glow glow-2" aria-hidden="true"></div>

    <!-- ── Contenido ──────────────────────────────────── -->
    <div class="relative max-w-7xl mx-auto px-5 md:px-8 py-24 md:py-32 grid md:grid-cols-2 gap-16 items-center w-full">

      <!-- Columna izquierda -->
      <div class="z-10">

        <!-- Logo + badge live -->
        <div class="flex items-center gap-4 mb-8 hero-anim" style="animation-delay: 0.05s">
          <img src="@/assets/images/LOGO.png" alt="JugarLaPelota"
            class="h-14 w-14 object-contain drop-shadow-xl" />
          <span class="hero-badge">
            <span class="live-dot-hero"></span>
            Torneos en vivo
          </span>
        </div>

        <!-- Headline -->
        <h1 class="hero-h1 hero-anim" style="animation-delay: 0.15s">
          Digitaliza tu Torneo<br>
          <span class="hero-h1-accent">y ahorra horas</span><br>
          de Gestión
        </h1>

        <!-- Sub-headline -->
        <p class="hero-sub hero-anim" style="animation-delay: 0.28s">
          Todo lo que necesitas para correr tu torneo, en un solo lugar:
        </p>

        <!-- Feature list -->
        <ul class="hero-features">
          <li v-for="(f, i) in features" :key="f.text" class="hero-anim" :style="{ animationDelay: `${0.38 + i * 0.08}s` }">
            <span class="feature-check">✓</span>
            <span>
              <strong>{{ f.title }}</strong>
              <span class="feature-desc"> — {{ f.desc }}</span>
            </span>
          </li>
        </ul>

        <!-- CTAs -->
        <div class="flex flex-wrap gap-4 mt-10 hero-anim" style="animation-delay: 0.75s">
          <button type="button" @click="scrollToTournaments" class="hero-btn-primary">
            Ver torneos
          </button>
          <button type="button" @click="scrollToInstall" class="hero-btn-ghost">
            Instalar app
          </button>
        </div>

      </div>

      <!-- Columna derecha: stats + cards flotantes -->
      <div class="hidden md:flex flex-col gap-5 z-10 items-end">

        <!-- Stat cards -->
        <div class="grid grid-cols-2 gap-4 w-full max-w-sm">
          <div v-for="(stat, i) in stats" :key="stat.label"
            class="stat-card hero-anim" :style="{ animationDelay: `${0.4 + i * 0.1}s` }">
            <component :is="stat.icon" class="w-6 h-6 mb-2" :class="stat.color" />
            <p class="text-3xl font-black text-white leading-none">{{ stat.value }}</p>
            <p class="text-slate-400 text-xs mt-1">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Chevron scroll ─────────────────────────────── -->
    <div class="hero-scroll-hint">
      <IconChevronDown class="w-5 h-5 text-white/40 animate-bounce" />
    </div>

  </section>
</template>

<script setup>
import { Smile, Radio, BarChart2, Clock } from 'lucide-vue-next'

function scrollToTournaments() {
  document.getElementById('torneos')?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToInstall() {
  document.getElementById('instalar-app')?.scrollIntoView({ behavior: 'smooth' })
}

// Video de fondo — Streamable embed (autoplay, sin controles, sin sonido)
const VIDEO_URL = 'https://streamable.com/e/c9hu23?autoplay=1&muted=1&loop=1&nocontrols=1'

const features = [
  { title: 'Inscripciones en línea',    desc: 'Los equipos se registran solos, tú solo apruebas' },
  { title: 'Marcadores en tiempo real', desc: 'Tus seguidores ven los goles al instante' },
  { title: 'Estadísticas automáticas',  desc: 'Posiciones y tarjetas se actualizan solas' },
]

const stats = [
  { icon: Smile,     value: 'Fácil',  label: 'Interfaz intuitiva',        color: 'text-primary' },
  { icon: Radio,     value: 'Live',   label: 'Marcadores en tiempo real', color: 'text-red-400' },
  { icon: BarChart2, value: 'Auto',   label: 'Estadísticas',              color: 'text-accent' },
  { icon: Clock,     value: 'Ahorra', label: 'Horas de gestión',          color: 'text-amber-400' },
]
</script>

<style scoped>
/* ── Root — sube para cubrir el navbar (h-12 móvil / h-16 desktop) ── */
.hero-root {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  margin-top: -48px;
  padding-top: 48px;
  display: flex;
  align-items: center;
  background: #0c1e35;
}
@media (min-width: 768px) {
  .hero-root { margin-top: -64px; padding-top: 64px; }
}

/* ── Video / YouTube iframe container ── */
.hero-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.55;
  overflow: hidden;
}
/* El iframe de YouTube necesita ser más grande para cubrir sin barras negras */
.hero-video iframe {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(1.5);
  width: 100vw;
  height: 56.25vw; /* 16:9 */
  min-height: 100%;
  min-width: 177.78vh; /* 16:9 */
  pointer-events: none;
}

/* ── Fondo CSS campo de fútbol (fallback sin video) ── */
.hero-field-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 60% 50%, #0c2a4a 0%, #061120 60%, #020810 100%);
}
.field-lines {
  position: absolute;
  inset: 0;
  opacity: 0.08;
  border: 3px solid white;
  margin: 40px;
  border-radius: 8px;
}
.field-center-circle {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 180px; height: 180px;
  border: 3px solid white;
  border-radius: 50%;
}
.field-center-line {
  position: absolute;
  top: 0; bottom: 0;
  left: 50%; width: 3px;
  background: white;
}
.field-penalty {
  position: absolute;
  top: 50%; transform: translateY(-50%);
  width: 100px; height: 160px;
  border: 3px solid white;
}
.field-penalty.left  { left: 0; border-left: none; }
.field-penalty.right { right: 0; border-right: none; }

/* ── Overlay principal: tinte azul marca, no negro puro ── */
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    rgba(2, 18, 40, 0.60) 0%,
    rgba(7, 30, 60, 0.40) 50%,
    rgba(14, 165, 233, 0.08) 100%
  );
}

/* ── Fade inferior hacia el color de la página ── */
.hero-overlay-side {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    transparent 55%,
    rgba(248, 250, 252, 0.15) 75%,
    rgba(248, 250, 252, 0.70) 90%,
    #f8fafc 100%
  );
}

/* ── Glows ── */
.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
}
.glow-1 {
  width: 600px; height: 600px;
  top: -150px; right: -100px;
  background: rgba(14, 165, 233, 0.18);
}
.glow-2 {
  width: 450px; height: 450px;
  bottom: -100px; left: -80px;
  background: rgba(16, 185, 129, 0.10);
}

/* ── Badge ── */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #7dd3fc;
  background: rgba(14, 165, 233, 0.15);
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 999px;
  padding: 6px 16px;
  backdrop-filter: blur(8px);
}
.live-dot-hero {
  display: inline-block;
  width: 8px; height: 8px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse-dot 1.5s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.6; transform: scale(0.85); }
}

/* ── Headline ── */
.hero-h1 {
  font-size: clamp(2.4rem, 5vw, 3.8rem);
  font-weight: 900;
  color: white;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 1.25rem;
}
.hero-h1-accent {
  background: linear-gradient(90deg, #0ea5e9, #10b981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Sub ── */
.hero-sub {
  color: rgba(226, 232, 240, 0.8);
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

/* ── Feature list ── */
.hero-features {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hero-features li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 0.875rem;
  color: rgba(226, 232, 240, 0.85);
}
.feature-check {
  color: #10b981;
  font-weight: 900;
  font-size: 1rem;
  flex-shrink: 0;
}
.hero-features li strong {
  color: white;
  font-weight: 700;
}
.feature-desc {
  color: rgba(203, 213, 225, 0.75);
  font-size: 0.85rem;
}

/* ── Buttons ── */
.hero-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #0ea5e9;
  color: white;
  font-weight: 800;
  font-size: 0.95rem;
  padding: 14px 28px;
  border-radius: 14px;
  text-decoration: none;
  transition: background 0.2s, transform 0.15s;
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.35);
}
.hero-btn-primary:hover { background: #0284c7; transform: translateY(-1px); }

.hero-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: white;
  font-weight: 700;
  font-size: 0.95rem;
  padding: 13px 26px;
  border-radius: 14px;
  text-decoration: none;
  border: 2px solid rgba(255,255,255,0.25);
  transition: border-color 0.2s, background 0.2s, transform 0.15s;
  backdrop-filter: blur(8px);
}
.hero-btn-ghost:hover {
  border-color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.07);
  transform: translateY(-1px);
}

/* ── Stat cards ── */
.stat-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 20px;
  backdrop-filter: blur(16px);
  transition: background 0.2s;
}
.stat-card:hover { background: rgba(255,255,255,0.1); }

/* ── Scroll hint ── */
.hero-scroll-hint {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
}

/* ── Entrada del Hero — contenido visible desde el primer momento, así que
     anima al montar en vez de esperar scroll (ver directiva v-reveal para el resto) ── */
@keyframes heroFadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
.hero-anim {
  opacity: 0;
  animation: heroFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@media (prefers-reduced-motion: reduce) {
  .hero-anim { animation: none; opacity: 1; }
}
</style>
