<template>
  <section class="cta-root">
    <!-- Imagen de fondo -->
    <div class="cta-bg" />
    <!-- Overlay color primario -->
    <div class="cta-overlay" />

    <div class="cta-content">
      <div class="cta-text">
        <p class="cta-eyebrow">¿Tienes un torneo?</p>
        <h2 class="cta-title">Digitaliza tu torneo<br>con JugarLaPelota</h2>
        <p class="cta-sub">Sin compromiso · Te contactamos en menos de 24 horas</p>
      </div>
      <router-link to="/contacto" class="cta-btn">
        Contratarnos →
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.cta-root {
  position: relative;
  overflow: hidden;
  margin: 48px 0 0;
  /* Diagonal clip igual al de la referencia */
  clip-path: polygon(0 8%, 100% 0%, 100% 92%, 0% 100%);
}

.cta-bg {
  position: absolute;
  inset: 0;
  background: url('/screenshots/public-match.png') center/cover no-repeat;
  filter: brightness(0.4);
}

.cta-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(14,165,233,0.88) 0%, rgba(6,100,180,0.82) 100%);
}

.cta-content {
  position: relative;
  max-width: 1100px;
  margin: 0 auto;
  padding: 80px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  flex-wrap: wrap;
}

.cta-eyebrow {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.7);
  margin-bottom: 10px;
}

.cta-title {
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 900;
  color: white;
  line-height: 1.2;
  margin-bottom: 10px;
}

.cta-sub {
  font-size: 0.9rem;
  color: rgba(255,255,255,0.75);
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  background: white;
  color: #0ea5e9;
  font-weight: 800;
  font-size: 1rem;
  padding: 16px 36px;
  border-radius: 999px;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  flex-shrink: 0;
}
.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.25);
}

@media (max-width: 640px) {
  .cta-content { flex-direction: column; text-align: center; padding: 64px 24px; }
  .cta-root { clip-path: polygon(0 4%, 100% 0%, 100% 96%, 0% 100%); }
}
</style>
