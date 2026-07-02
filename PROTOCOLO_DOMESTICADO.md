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

### 2026-07-02 — Style: tutorial + características en dos columnas
**Pedido:** poner el tutorial de instalación y la sección "Un torneo conectado para todos" en la misma línea (tutorial a la izquierda, características a la derecha), y cambiar el copy introductorio del tutorial.

**Solución:** se fusionaron ambas secciones en un solo `<section>` con `grid lg:grid-cols-2` en [src/pages/Home.vue](src/pages/Home.vue) — en desktop quedan lado a lado, en mobile se apilan (tutorial arriba). [InstallTutorial.vue](src/components/InstallTutorial/InstallTutorial.vue) se refactorizó de `<section>` centrada a un `<div>` alineado a la izquierda para encajar como columna. Texto cambiado a: "Sin descargas pesadas ni tiendas de apps. Más rápido, más ligero y sin ocupar espacio en tu memoria."

**Validado con:** preview en navegador en desktop (1280px, columnas lado a lado) y mobile (375px, apilado), sin errores de consola.

### 2026-07-02 — Fix: centrado dentro de columnas + videos invisibles en móvil
**Problema reportado:** (1) el contenido de ambas columnas quedaba "esquinado" (pegado a los bordes exteriores) en vez de centrado dentro de su propio espacio; (2) en modo móvil los videos tutoriales no se veían en absoluto.

**Causa raíz de (2):** los `<video>` miniatura no tenían `poster`, solo `preload="metadata"`. Muchos navegadores móviles (Safari iOS, Chrome Android) no pintan ningún frame del video hasta que el usuario interactúa con él — el resultado es un recuadro negro/vacío hasta el primer play. En desktop (Chrome) sí se ve un frame porque ese navegador sí decodifica el primer fotograma solo con los metadatos.

**Solución:**
- Se generaron imágenes poster estáticas (`.jpg`, ~54KB c/u) con `qlmanage -t` (thumbnail nativo de macOS) a partir de los `.mp4`, convertidas con `sips`. Quedaron en [public/videos/instalar-android-poster.jpg](public/videos/instalar-android-poster.jpg) y [public/videos/instalar-apple-poster.jpg](public/videos/instalar-apple-poster.jpg), referenciadas vía el atributo `poster` en [InstallTutorial.vue](src/components/InstallTutorial/InstallTutorial.vue). Esto garantiza que el thumbnail se vea en cualquier navegador sin depender de que decodifique el video.
- Se cambió `preload="metadata"` a `preload="none"` en los videos miniatura (ya no hace falta cargar nada del video hasta que el usuario haga clic, porque el poster cubre esa función).
- Centrado: se agregó `text-center` + `mx-auto` en los elementos internos de cada columna (encabezado, párrafo con `max-w-sm mx-auto`, grid de videos/cards con `max-w-sm`/`max-w-md mx-auto`) tanto en `InstallTutorial.vue` como en la columna de "características" en [Home.vue](src/pages/Home.vue), en vez de dejarlos pegados al borde izquierdo/derecho de cada columna.

**Validado con:** preview en navegador en desktop (1280px), tablet (768px) y mobile (375px) — contenido centrado dentro de cada columna en las tres resoluciones, videos con poster visible incluso sin reproducir, sin errores de consola.

### 2026-07-02 — Fix: botón Hero "Instalar app" + modal de video no invasivo en móvil
**Pedido:** (1) cambiar el botón "Comenzar" del Hero (iba a `/login`) por "Instalar app" que haga scroll hasta el tutorial; (2) que el modal de video no ocupe toda la pantalla en móvil (dejar que el usuario lo amplíe con el botón nativo de fullscreen si quiere); (3) la X de cerrar no se podía usar en móvil.

**Causa de (3):** la X estaba posicionada `absolute -top-11` (44px por encima del contenedor del video, fuera de él). Con el video sin acotar en altura (ocupaba casi toda la pantalla en móvil por el aspect-ratio portrait), ese offset quedaba fuera del viewport visible.

**Solución:**
- [HeroSection.vue](src/components/Hero/HeroSection.vue): el botón ahora es `@click="scrollToInstall"` → `document.getElementById('instalar-app')?.scrollIntoView(...)`. Se agregó `id="instalar-app"` (+ `scroll-mt-20` para no quedar tapado por el navbar fijo) al contenedor raíz de [InstallTutorial.vue](src/components/InstallTutorial/InstallTutorial.vue).
- El video del modal ahora usa `max-h-[65vh] max-w-[80vw] sm:max-w-xs w-auto h-auto` en vez de `w-full` — queda acotado y se nota que es un overlay, no pantalla completa. El botón nativo de fullscreen de los controles del `<video>` sigue disponible para quien sí quiera ampliarlo.
- La X de cerrar se movió a `absolute top-2 right-2` **sobre la esquina del propio video** (contenedor `inline-block` que se ajusta al tamaño real del video), en vez de flotar por encima fuera de su caja — así siempre queda visible y alcanzable sin importar el alto del video.

**Validado con:** preview en navegador mobile (375px) — clic en "Instalar app" hace scroll correcto hasta el tutorial; clic en thumbnail abre modal compacto (no fullscreen) con la X visible en la esquina; clic en la X cierra correctamente. Sin errores de consola.

### 2026-07-02 — Fix: los cambios de cada deploy no llegaban a las PWAs ya instaladas
**Problema reportado:** al hacer push/deploy, quienes ya tenían la app instalada (PWA) no veían los cambios nuevos.

**Causa raíz:** `vite-plugin-pwa` con `injectRegister: 'auto'` genera un `registerSW.js` que solo hace `navigator.serviceWorker.register(...)` una vez al cargar la página, sin ningún chequeo periódico de actualización. El navegador revisa por su cuenta si hay un Service Worker nuevo solo en navegaciones completas o cada ~24h — pero una PWA instalada que se reabre desde el ícono del home no siempre dispara eso. Aunque `registerType: 'autoUpdate'` hace que el SW nuevo se auto-active (`skipWaiting` + `clientsClaim`) en cuanto se detecta, si nunca se detecta pronto, el usuario sigue en la versión vieja indefinidamente.

**Solución:**
- [vite.config.js](vite.config.js): `injectRegister: false` (se apaga el registro automático por defecto).
- Nuevo [src/pwa.js](src/pwa.js) — registro manual vía `virtual:pwa-register`, que:
  - Revisa actualizaciones (`registration.update()`) cada vez que la app vuelve a primer plano (`visibilitychange`) — cubre el caso real de "reabrir la PWA desde el home" — y cada 30 min mientras sigue abierta en sesiones largas.
  - Al detectar que un Service Worker nuevo tomó control (`controllerchange`), recarga la página automáticamente para que el build nuevo se use de inmediato, en vez de esperar a que el usuario cierre y reabra la app manualmente. Se ignora el primer `controllerchange` (activación inicial en visita nueva, no un update real) para no forzar un reload innecesario a usuarios nuevos.
- Se llama `setupPWAUpdates()` desde [main.js](src/main.js) al arrancar.

**Nota:** para probar esto localmente hace falta el build real (`npm run build` + `vite preview`), porque el plugin de PWA no genera Service Worker en modo dev. Se agregó una config `jlp-frontend-dist` en `.claude/launch.json` (no se commitea, está en `.gitignore`) para levantar `vite preview` en el puerto 5176 cuando se necesite probar esto de nuevo.

**Validado con:** build de producción + `vite preview` — el Service Worker se registra, `registration.update()` no lanza errores, `navigator.serviceWorker.controller` queda activo. Sin errores de consola.

### 2026-07-02 — Feature: portada de patrocinadores en la pestaña Media
**Pedido:** en la pestaña "Media" del torneo público, agregar una foto de portada fija arriba del contenido para mostrar patrocinadores, cargable desde el admin.

**Contexto encontrado:** ya existían en el schema una tabla `sponsors` (por patrocinador individual: nombre/logo/url) y una tabla `banners` (genérica), pero **ninguna de las dos tenía rutas backend ni UI de admin implementadas** — quedaron como schema muerto. Dado que el pedido es una sola imagen fija (no un CRUD de patrocinadores individuales), se optó por el camino más simple y consistente con el patrón ya usado para `logo`/`banner` del torneo: una columna nueva.

**Solución:**
- Columna `sponsors_banner TEXT` en `tournaments` — [backend/config/db-schema.js](backend/config/db-schema.js) (PG_MIGRATIONS) y [backend/config/db-sqlite-init.js](backend/config/db-sqlite-init.js).
- [backend/controllers/tournaments.controller.js](backend/controllers/tournaments.controller.js) `create`/`update` — acepta `sponsorsBanner` en el body (camelCase, mismo patrón que `primaryColor`/`startDate`), lo persiste en `sponsors_banner`. El `getBySlug`/`getAll` ya usan `SELECT *`, así que no necesitaron cambios.
- [src/pages/admin/Tournaments.vue](src/pages/admin/Tournaments.vue) — nuevo `<ImageUpload v-model="form.sponsorsBanner">` en la sección "Imágenes" del form de torneo (mismo componente que ya usan logo/banner, sube a Cloudinary).
- [src/pages/Media.vue](src/pages/Media.vue) — si `tournament.sponsors_banner` existe, se renderiza como imagen fija arriba del feed (antes de streams en vivo y noticias/fotos).

**Nota de bug encontrado (no relacionado, no corregido):** al probar esto localmente contra SQLite se detectó que `GET /tournaments/:slug/players/phase-stats` (backend/routes/index.js:565) lanza 500 (`unrecognized token: ":"`) — sintaxis SQL específica de Postgres que no es compatible con SQLite. Solo afecta al dev local (producción usa Postgres). Se dejó un task flag (`task_428a9abc`) para corregirlo en otra sesión.

**Validado con:** flujo completo end-to-end contra backend local (SQLite) — `PUT /tournaments/:id` con `sponsorsBanner` persiste y se lee correctamente vía API; en el navegador, la imagen se ve fija arriba del feed en `/COPACARIBE/media`; el campo aparece correctamente en el modal de edición del admin con su imagen y texto de ayuda. Sin errores de consola relacionados a este cambio.
