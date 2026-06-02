<template>
  <section class="cb-root">
    <div class="cb-overlay" />
    <div class="cb-content">
      <div class="cb-text">
        <p class="cb-eyebrow">¿Organizas un torneo?</p>
        <h2 class="cb-title">Contratar JugarLaPelota<br>para tu liga o torneo</h2>
        <p class="cb-sub">Sin compromiso · Sin métodos de pago · Respuesta en menos de 24 h</p>
      </div>
      <router-link to="/contratar" class="cb-btn">
        Contratar →
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.cb-root {
  position: relative;
  overflow: hidden;
  margin: 0;
  background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
  clip-path: polygon(0 6%, 100% 0%, 100% 94%, 0% 100%);
  padding: 10px 0;
}

.cb-overlay {
  position: absolute;
  inset: 0;
  background: url('/hero-bg.mp4') center/cover no-repeat;
  opacity: 0.08;
  pointer-events: none;
}

/* decorative floating circles */
.cb-root::before,
.cb-root::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  pointer-events: none;
}
.cb-root::before { width: 380px; height: 380px; top: -120px; right: -80px; }
.cb-root::after  { width: 260px; height: 260px; bottom: -100px; left: -60px; }

.cb-content {
  position: relative;
  max-width: 1100px;
  margin: 0 auto;
  padding: 88px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  flex-wrap: wrap;
}

.cb-eyebrow {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255,255,255,0.65);
  margin-bottom: 10px;
}

.cb-title {
  font-size: clamp(1.6rem, 3.5vw, 2.5rem);
  font-weight: 900;
  color: #fff;
  line-height: 1.2;
  margin-bottom: 10px;
}

.cb-sub {
  font-size: 0.9rem;
  color: rgba(255,255,255,0.72);
}

.cb-btn {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  background: #fff;
  color: #0ea5e9;
  font-weight: 900;
  font-size: 1rem;
  padding: 18px 42px;
  border-radius: 999px;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 8px 28px rgba(0,0,0,0.18);
  flex-shrink: 0;
  letter-spacing: 0.01em;
}
.cb-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 36px rgba(0,0,0,0.22);
}

@media (max-width: 640px) {
  .cb-content {
    flex-direction: column;
    text-align: center;
    padding: 80px 24px;
  }
  .cb-root {
    clip-path: polygon(0 3%, 100% 0%, 100% 97%, 0% 100%);
  }
}
</style>
