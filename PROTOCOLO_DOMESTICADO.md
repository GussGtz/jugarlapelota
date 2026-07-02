# Protocolo Domesticado

Bitácora de contexto del proyecto **JugarLaPelota**. Cada vez que se haga un cambio relevante, se registra aquí para tener siempre a mano el historial y las decisiones tomadas.

Repo: `git@github.com:GussGtz/jugarlapelota.git`
Stack: Vue 3 + Vite + Tailwind + Pinia + Socket.io (frontend) / Node.js + Express + MySQL + Cloudinary (backend)

---

## Cómo usar este documento

- Cuando el usuario diga "ejecuta el protocolo domesticado", significa: leer este archivo completo para recuperar el contexto acumulado del proyecto antes de continuar trabajando.
- Cada cambio nuevo (feature, fix, decisión de arquitectura, etc.) se agrega como una entrada nueva al final del log, con fecha, resumen y motivo.

---

## Log de cambios

### 2026-07-02 — Creación del protocolo domesticado
- Se confirma que el repo ya está clonado localmente en `/Users/samuelgutierrez/Desktop/JugarLaPelota`, apuntando a `origin = git@github.com:GussGtz/jugarlapelota.git`.
- Se crea este documento (`PROTOCOLO_DOMESTICADO.md`) como bitácora central de contexto del proyecto.
- Último commit en `main` al momento de crear este documento: `16aa9c5 fix: push notifications end-to-end audit`.

### 2026-07-02 — Fix: "seguir equipo/torneo" ahora persiste en BD ligado a la cuenta
**Problema reportado:** el usuario notó que seguir un equipo o torneo se perdía al iniciar sesión en otro dispositivo o al pasar el tiempo.

**Causa raíz encontrada:** `src/stores/following.js` guardaba el follow en `localStorage` siempre, pero solo lo sincronizaba con el backend (`team_follows` / `tournament_follows`) cuando existía un `endpoint` de suscripción Web Push — es decir, el follow quedaba atado al **dispositivo/navegador**, no a la cuenta (`user_id`). Las tablas `team_follows`/`tournament_follows` ni siquiera tenían columna `user_id`.

**Solución implementada:**
- Backend: nuevas tablas `user_team_follows` y `user_tournament_follows` (PK `user_id + team_id/tournament_id`), agregadas en [backend/config/db-schema.js](backend/config/db-schema.js) (PG_MIGRATIONS) y [backend/config/db-sqlite-init.js](backend/config/db-sqlite-init.js). De paso se corrigió que `tournament_follows` faltaba por completo en el init de SQLite (bug preexistente que rompía el dev local).
- Rutas `/follows`, `/follows/add`, `/follows/remove`, `/follows/tournaments`, `/follows/tournament/add`, `/follows/tournament/remove` en [backend/routes/index.js](backend/routes/index.js) ahora usan `optionalAuth` y leen/escriben en las tablas `user_*_follows` cuando hay `req.user.id`, además del flujo existente por `endpoint` (que se conserva para el targeting de push).
- `sendPushToTeams`/`sendPushToTournaments` ahora también hacen JOIN por `push_subscriptions.user_id`, para que un usuario logueado reciba notificaciones sin importar en qué dispositivo siguió al equipo/torneo.
- Frontend: `src/stores/following.js` ahora consulta `useAuthStore().isLoggedIn` — si hay sesión, llama al backend aunque no haya push activado. `syncFromServer` hace merge (no overwrite) para no perder follows anónimos hechos antes de loguearse.
- `src/main.js` sincroniza follows automáticamente al arrancar si hay sesión válida (`verifySession` → `syncFromServer`). `Login.vue` también sincroniza tras login con Google.

**Validado con:** build de Vite exitoso, y prueba manual vía curl contra SQLite local: follow sin `endpoint` pero con JWT válido se persiste y es legible solo con ese token (no visible sin token), confirmando que ya no depende del dispositivo.

**Nota histórica:** en este cambio no se tocó el requisito de login para seguir un torneo (se mantuvo el flujo anónimo con solo push). Ver siguiente entrada — se corrigió después para exigir login también en torneos.

### 2026-07-02 — Fix: seguir torneo ahora exige login (igual que equipos)
**Problema reportado:** seguir un equipo ya exigía login primero (`TeamDetail.vue`), pero seguir un torneo no — bastaba con aceptar notificaciones push, quedando inconsistente y permitiendo follows anónimos que no viven en la cuenta.

**Solución:** [src/pages/TournamentHome.vue](src/pages/TournamentHome.vue) `toggleFollow()` ahora replica la misma guarda que `TeamDetail.vue`: si `!auth.isLoggedIn`, redirige a `{ name: 'Login', query: { redirect: route.fullPath } }` antes de intentar seguir, en vez de solo pedir permiso de push.

**Validado con:** preview en navegador contra backend local (SQLite) — se creó `.env.local` temporal apuntando a `localhost:3000` (el proyecto usa producción/Railway por defecto en `.env`) y se corrió el backend con `FRONTEND_URL=http://localhost:5175` para pasar CORS. Clic en "SEGUIR TORNEO" sin sesión → redirige correctamente a `/login?redirect=/COPACARIBE`. Se limpió `.env.local` al terminar (no se commitea, ya está en `.gitignore`).

### 2026-07-02 — Feature: tutoriales de instalación de la PWA en el Home
**Contexto:** el usuario notó que al ser una PWA (no está en App Store/Play Store), los usuarios probablemente no saben cómo instalarla en su celular. Compartió dos videos grabados (`instalar android.MOV`, `instalar apple.MOV`) ubicados en `~/Downloads/`.

**Detalle técnico importante:** los .MOV originales venían codificados en **HEVC** (H.265), que Firefox no soporta y muchos navegadores/Android tampoco reproducen de forma confiable. Se transcodificaron a H.264/AAC en contenedor MP4 usando la herramienta nativa de macOS `avconvert` (preset `PresetAppleM4V1080pHD`) — no había `ffmpeg` ni `brew` instalados en el entorno. Quedaron en [public/videos/instalar-android.mp4](public/videos/instalar-android.mp4) y [public/videos/instalar-apple.mp4](public/videos/instalar-apple.mp4) (~9MB y ~8.9MB).

**Nota sobre `.gitignore`:** el repo excluye `*.mp4/*.mov/*.avi` globalmente porque supera el límite de 100MB de GitHub (el video del Hero, `hero-bg.mp4` de 143MB, de hecho ni está en git — se sirve embebido vía Streamable externo). Como estos tutoriales pesan ~9MB c/u, muy por debajo del límite, se le preguntó al usuario cómo prefería publicarlos: commitear directo vs. subir a Cloudinary. Eligió **commitear directo** — se agregaron excepciones puntuales en `.gitignore` (`!public/videos/instalar-android.mp4`, `!public/videos/instalar-apple.mp4`) para esos dos archivos específicos únicamente.

**Solución:** nuevo componente [src/components/InstallTutorial/InstallTutorial.vue](src/components/InstallTutorial/InstallTutorial.vue) — dos tarjetas con thumbnail de video (Android / iPhone), al hacer clic abren un modal con el video en reproducción con controles nativos. Integrado en [src/pages/Home.vue](src/pages/Home.vue) entre la sección de torneos activos y la sección "Un torneo conectado para todos".

**Validado con:** build de Vite exitoso (confirmado que Vite copia `public/videos/` a `dist/videos/` automáticamente), y prueba en navegador de preview — clic en la tarjeta "Android" abre el modal y el video reproduce correctamente, sin errores de consola.
