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

### 2026-07-02 — Fix: `/players/phase-stats` roto en SQLite (bug del incidente anterior)
**Causa raíz:** [backend/routes/index.js:601](backend/routes/index.js:601) usaba `m.phase_id = ANY($1::bigint[])` — sintaxis de arrays exclusiva de Postgres (cast `::bigint[]` + `ANY()`). SQLite no la entiende en absoluto, de ahí el error `unrecognized token: ":"` al correr el backend local en modo SQLite (sin `DATABASE_URL`). En producción (Postgres) nunca se notaba.

**Solución:** se reemplazó por `IN (${placeholders dinámicos})` — mismo patrón portable ya usado en `sendPushToTeams`/`sendPushToTournaments` (ver entrada del 2026-07-02 sobre follows). Los placeholders del filtro de categoría (`catFilter`) se recalculan según la nueva cantidad de params.

**Validado con:** backend local (SQLite) — `GET /tournaments/COPACARIBE/players/phase-stats` (con y sin `?cat=`) responde 200 con datos correctos en vez de 500. Páginas admin Dashboard y Jugadores cargan sin errores de consola.

### 2026-07-02 — Revisión completa del proyecto sin errores
**Pedido:** revisar que todo el proyecto funcione sin errores.

**Metodología:**
1. `node -c` en todos los `.js` de `backend/` — sin errores de sintaxis.
2. `npm run build` (frontend) — build limpio, sin warnings.
3. Comparación sistemática de tablas `CREATE TABLE` entre `backend/config/db-schema.js` (Postgres) y `backend/config/db-sqlite-init.js` — reveló que **faltaba `inscription_responsables`** en SQLite (mismo patrón que el bug de `tournament_follows` de una sesión anterior). Se agregó la tabla siguiendo el mismo estilo que `inscription_players` (tabla vecina).
4. Smoke test con `curl` de ~20 endpoints backend (públicos y con auth admin: tournaments, categories, matches, news, galleries, streams, players/phase-stats, awards, teams, follows, inscriptions, responsables, phases) — todos 200 tras el fix.
5. Recorrido en navegador (preview local contra backend SQLite) de: Home, Torneo (Inicio/Partidos/Media), TeamDetail, Players, Standings, Login, y Admin completo (Dashboard, Torneos, Equipos, Jugadores, Inscripciones, Galería, Noticias, Transmisiones, Premios, Categorías, Partidos) — **sin errores de consola en ninguna**.

**Bug encontrado y corregido:** `GET /tournaments/:slug/responsables` (backend/routes/index.js:1904) daba 500 (`no such table: inscription_responsables`) en SQLite local — tabla presente en el schema de Postgres pero nunca agregada al init de SQLite. Corregido en [backend/config/db-sqlite-init.js](backend/config/db-sqlite-init.js).

**Conclusión:** con este fix, la paridad de tablas entre Postgres (producción) y SQLite (dev local) queda completa — las dos listas de `CREATE TABLE` coinciden exactamente. Build de frontend limpio, backend sin errores de sintaxis, y recorrido completo de páginas públicas + admin sin errores de consola.

### 2026-07-02 — Feature: animaciones y micro-interacciones en el Home público
**Pedido:** hacer más atractiva/profesional (con buena UX y diseño) la sección de "Instala la app" + "Un torneo conectado para todos", y en general todo el lado público/aficionado del sitio.

**Solución:** nueva directiva global reutilizable `v-reveal` ([src/directives/reveal.js](src/directives/reveal.js)) — fade + slide-up cuando el elemento entra al viewport, con un solo `IntersectionObserver` compartido para toda la app (más eficiente que instanciar uno por componente). Soporta `v-reveal="{ delay: N }"` para escalonar listas. CSS base en [src/styles/main.css](src/styles/main.css) con fallback a `prefers-reduced-motion`. Registrada globalmente en [src/main.js](src/main.js).

Nota: `FeatureSections.vue` ya tenía su propio sistema de reveal con `IntersectionObserver` manual por componente (patrón preexistente) — no se tocó esa lógica, solo se le agregó hover premium a los mockups de teléfono (`translateY` + shadow al hover). El resto de la home usa la nueva directiva.

**Aplicado en:**
- [HeroSection.vue](src/components/Hero/HeroSection.vue) — como es contenido visible desde el primer momento (above the fold), no usa scroll-reveal sino una entrada escalonada al montar (`hero-anim` + `animation-delay` por elemento: badge, headline, features, CTAs, stat cards). Badge "Marcadores en tiempo real" con flotado continuo sutil.
- [InstallTutorial.vue](src/components/InstallTutorial/InstallTutorial.vue) — reveal escalonado en badge/heading/párrafo/videos; hover premium en las tarjetas (scale + shadow + zoom del video); anillo de pulso alrededor del botón de play para dirigir la atención; modal con transición fade+scale (antes solo fade).
- [Home.vue](src/pages/Home.vue) — stagger en grid de torneos activos (hover con zoom de imagen + lift) y en las 4 role-cards de "Un torneo conectado para todos" (con micro-rotación del ícono al hover).
- [ContratarBanner.vue](src/components/ContratarBanner/ContratarBanner.vue) — reveal en texto/CTA, círculos decorativos de fondo con drift continuo.

**Validado con:** build de Vite exitoso, preview en desktop (1280px) y mobile (375px) — animaciones se disparan correctamente al hacer scroll, hover states funcionan, el modal de video sigue abriendo/cerrando bien con la nueva transición, sin errores de consola en ninguna resolución.

### 2026-07-02 — Feature: animaciones en la página pública de cada torneo
**Pedido:** extender las animaciones también al "apartado que ve el user de cada torneo" — es decir, [TournamentHome.vue](src/pages/TournamentHome.vue), la página pública que ve un aficionado al entrar a un torneo específico (no solo el Home general del sitio).

**Alcance:** TournamentHome.vue tiene 7 secciones grandes (Hero, partidos en vivo/resultados/próximos, dinámica de grupos-eliminatorias-campeones, noticias, galería, equipos participantes, reconocimientos). Se reutilizó la misma directiva `v-reveal` creada en la entrada anterior para todas, más una entrada escalonada tipo "hero-anim" (clase local `th-hero-anim`, mismo patrón que `hero-anim` de `HeroSection.vue`) para el Hero del torneo, ya que es contenido visible desde el primer momento (above the fold) y no debe depender de scroll.

**Detalle técnico importante:** al combinar `.th-hero-anim` (que define `animation: thHeroFadeUp ...`) con la clase `animate-bounce` de Tailwind (que define `animation: bounce ...`) en el mismo elemento, solo una de las dos reglas `animation` gana en cascada CSS — no se combinan automáticamente. Se solucionó separando en dos elementos anidados: el contenedor externo con `th-hero-anim` (fade+slide de entrada) y un `<div>` interno con `animate-bounce` (rebote continuo del ícono de scroll).

**Stagger acotado con módulo:** en grids largos (equipos participantes, reconocimientos con muchas tarjetas) se usó `(i % N) * delay` en vez de `i * delay` sin acotar, para que el último elemento de una lista de 50 no tarde varios segundos en aparecer.

**Validado con:** build de Vite exitoso, recorrido completo en preview desktop (1280px) y mobile (375px) haciendo scroll por las 7 secciones del torneo COPACARIBE (que está en modo "finalizado" con podio de campeones) — todas las animaciones se disparan correctamente, sin errores de consola.

### 2026-07-06 — Torneo demo "Copa Caribe Demo" en producción + 3 bugs de Postgres corregidos
**Pedido:** crear en producción (mismo perfil admin, torneo separado del "Copa Caribe" real) un torneo de demostración con 7 categorías (las 6 del torneo real + Sub-17 extra), cada una en un estado distinto para mostrar toda la funcionalidad del proyecto en una demo en vivo: 2 finalizadas con campeón/goleador/mejor portero, una a la mitad de fase de grupos, dos con la eliminatoria en distintos puntos de avance, y una reservada "en cero" (solo equipos/jugadores registrados) para que el usuario genere las fases y arbitre un partido en vivo durante la demostración.

**Cómo se hizo:** script Node (`/tmp/.../scratchpad/seed-demo.js`, no versionado — es una herramienta de un solo uso) que llama directo a los endpoints admin de la API (login, `/tournaments`, `/categories` + PUT límites de edad, `/teams`, `/players`, `/tournaments/:slug/auto-setup`, `/phases/:id/groups/generate`, `/matches/:id/start`+`/events`+`/status` para partidos con estadísticas reales, `/phases/:id/advance-to-knockout`). Probado primero exhaustivamente contra el backend local (SQLite) antes de tocar producción.

**3 bugs reales de producción encontrados y corregidos** (todos con el mismo patrón: SQLite es permisivo, Postgres exige SQL estricto — por eso nunca aparecían en desarrollo local):
1. `autoGenerateAwardsForPhase` — `SELECT t.id AS team_id ... GROUP BY p.id` (columna no agregada fuera del GROUP BY). Rompía con 500 real cualquier finalización de fase con goles registrados, en cualquier torneo de producción. Fix: agregar `t.id` al GROUP BY.
2. Mismo `autoGenerateAwardsForPhase`, cálculo de "mejor portero" — `HAVING played > 0` referenciaba un alias del SELECT, inválido en Postgres (SQLite sí lo permite). Fix: `HAVING COUNT(m.id) > 0`.
3. `autoGenerateKnockoutBracket` — calculaba standings de grupo con `team_id` como si fuera columna de `matches` (no existe); estaba silenciado por un try/catch envolvente así que nunca se veía como error, pero significaba que el bracket automático **nunca se generaba** por esa vía en ningún torneo real. Reemplazado por `getGroupStandings()`, la misma función que ya usa `/phases/:id/advance-to-knockout` correctamente. También se corrigió un GROUP BY incompleto análogo en `/admin/awards/scan-all`.

Como también se encontraron ~20 columnas faltantes en el init de SQLite local (ver entrada de "Revisión completa del proyecto"), ya quedaron agregadas antes de esta sesión — sin eso, ni siquiera se hubiera podido probar localmente el flujo de categorías con límites de edad.

**Otros 2 bugs (de mi script de seed, no del producto) encontrados y corregidos durante las pruebas:**
- Nombres de jugador generados únicos por equipo en vez de por categoría completa → colisión 409 (el backend correctamente rechaza nombres duplicados dentro de la misma categoría).
- Marcadores aleatorios de partidos de eliminación podían empatar → el sistema correctamente no avanza el bracket en un empate ("avance manual requerido"), así que se generó un `randScoreNoTie()` dedicado para semifinales/final/tercer lugar.

**Resultado final verificado contra la API real:** 70 equipos (10 × 7 categorías), 700 jugadores, awards de campeón/goleador/portero en Sub-5 y Sub-7, Sub-9 con grupos a la mitad, Sub-11 con la Final pendiente sin jugar, Sub-13 y Sub-15 con eliminatoria generada y semifinales sin jugar (Sub-15 es la reservada para la demo en vivo), Sub-17 con equipos y jugadores registrados pero **cero fases/partidos** (para que el admin genere todo en vivo).

### 2026-07-10 — Feature: visor de documento del jugador en modal (admin)
**Pedido:** en "Jugadores y Responsables" (admin), el botón "Ver" de la columna Doc. abría/descargaba el documento oficial del jugador dejando que el navegador decidiera qué hacer. Se pidió que en su lugar abra en una pestaña/modal responsivo dentro de la app, que muestre cualquier tipo de archivo, cerrable con una X.

**Solución:** nuevo componente reutilizable [DocumentViewerModal.vue](src/components/DocumentViewer/DocumentViewerModal.vue) — reutiliza el sistema de modales ya existente del admin (`.modal-overlay`/`.modal-sheet-lg`/`.modal-header`/`.modal-body`, bottom-sheet en mobile / centrado en desktop). Detecta el tipo de archivo por extensión: `.pdf` → `<iframe>`, cualquier otra cosa (imágenes) → `<img>` con `object-contain`. En [Players.vue](src/pages/admin/Players.vue) se reemplazaron los dos `<a target="_blank">` (tabla desktop y cards mobile) por botones que abren el modal con `viewingDoc = p`.

**Campo relevante:** `documento_oficial` acepta `image/*,application/pdf` según el input de carga en `InscriptionPlayers.vue` — de ahí la necesidad de soportar ambos tipos en el visor.

**Validado con:** preview en navegador contra backend local — probado con una imagen real (Cloudinary demo) y un PDF real (Cloudinary demo, `sample.pdf`). Un primer intento con un PDF de prueba de w3.org falló por `X-Frame-Options` (ese dominio bloquea el embebido en iframe en cualquier sitio) — no era un bug del componente, solo mala elección de URL de prueba; con un PDF real de Cloudinary (que no envía esos headers) el iframe cargó correctamente. Modal abre y cierra bien con la X en ambos casos, sin errores de consola.

### 2026-07-10 — Fix real: el documento seguía descargándose en producción (Cloudinary + proxy propio)
**Reporte del usuario:** tras el fix anterior (modal en vez de descarga), en producción real el documento **seguía descargándose**. Investigación en 3 capas:

1. **Causa raíz #1** — `uploadToCloudinary` subía los PDF con `resource_type: 'raw'`. Cloudinary sirve **todos** los recursos `raw` con `Content-Disposition: attachment` sin excepción — el problema estaba en la respuesta HTTP del archivo mismo, no en cómo el frontend lo embebía. Fix inicial: cambiar a `resource_type: 'image'` (Cloudinary sí permite PDFs inline por esa vía).
2. **Causa raíz #2 (bloqueante)** — al probar, la nueva URL `/image/upload/...pdf` daba **401 "deny or ACL failure"**. Diagnosticado con un endpoint temporal (`GET /_debug/cloudinary`, ya removido) que consultó el Admin API de Cloudinary: el recurso en sí era público y sin restricciones (metadata normal), así que el bloqueo era 100% de la cuenta/plan de Cloudinary. Se probó activar "Allow delivery of PDF and ZIP files" en Settings → Security (confirmado guardado por el usuario) y **también URLs firmadas criptográficamente** (`sign_url:true`, que normalmente evaden restricciones de tipo de medio) — ambas siguieron dando 401. Conclusión: es una restricción de plan que no se puede evadir por configuración ni firma.
3. **Solución final (no depende de Cloudinary):** los PDF vuelven a subirse como `raw` (simple, sin restricciones de *entrega* — el bloqueo de Cloudinary solo aplica cuando el navegador del usuario pide el archivo directo; nuestro propio backend SÍ puede descargar los bytes de un recurso `raw` sin problema). Nuevo endpoint `GET /documents/proxy?url=...` que descarga el archivo servidor-a-servidor y lo reenvía con `Content-Disposition: inline` propio — restringido a URLs de `res.cloudinary.com` para evitar SSRF. `DocumentViewerModal.vue` enruta el `<iframe>` por este proxy en vez de la URL directa.
4. **Bug adicional encontrado en el camino:** las URLs `raw` de Cloudinary **no conservan extensión** (a diferencia de `image`), así que detectar "es PDF" por `.pdf` en la URL fallaba siempre para documentos reales de esta app. Corregido en dos frentes: el proxy detecta PDF leyendo la firma real de bytes (`%PDF-`, primeros 5 bytes del archivo) en vez de la URL o el content-type de Cloudinary (que además siempre reporta `octet-stream` para `raw`); el frontend usa el segmento `/raw/upload/` vs `/image/upload/` de la URL (confiable porque viene del `resource_type` real usado al subir) para decidir `<img>` vs `<iframe>+proxy`.

**Validado con:** `curl -I` contra producción real sobre el documento **ya existente** de un jugador real (Daniel Ponce, el mismo que el usuario probó) — confirmado `Content-Type: application/pdf` y `Content-Disposition: inline` (antes: `application/octet-stream` + `attachment`). Confirmado que el proxy rechaza URLs que no sean de `res.cloudinary.com` (protección SSRF, `400 URL inválida`). No se pudo probar en el preview de navegador local por CORS (producción solo permite el origen del frontend real desplegado, no `localhost`) — verificación server-to-server con curl es equivalente y concluyente.

**Nota:** el documento ya existente de Daniel Ponce nunca necesitó volverse a subir — como sigue siendo un recurso `raw` válido en Cloudinary, el proxy lo sirve bien tal cual con la URL que ya tenía guardada.

### 2026-07-10 — Fix: PDF no se veía en móvil (Safari iOS) — renderizado propio con PDF.js
**Reporte del usuario:** con el proxy ya funcionando en PC, en modo móvil (Safari iOS) el documento se mostraba como un ícono de plugin roto en blanco en vez del PDF. Pidió también asegurar que funcione con cualquier tipo de archivo y que, si es PDF, se vean las páginas.

**Causa:** el `<iframe>` apuntando al PDF depende del visor nativo de PDF del navegador para renderizarlo dentro del iframe. Chrome/desktop tiene un plugin de PDF robusto que funciona bien embebido; Safari iOS **no** — es una limitación conocida de WebKit, no arreglable con headers ni con el proxy.

**Solución:** se reemplazó el `<iframe>` por un renderizado propio con `pdfjs-dist` (misma librería que usa Firefox internamente para su visor de PDF) — cada página del PDF se dibuja en su propio `<canvas>` vía `pdf.getPage(i)` → `page.render({ canvasContext, viewport })`. Al ser renderizado a canvas (no depender de ningún plugin nativo del navegador), funciona igual en cualquier motor/navegador, incluido Safari iOS. Se agregó estado de carga ("Cargando documento…") y de error (con link de respaldo "Abrir en una pestaña nueva" apuntando al proxy, por si el PDF viene corrupto).

**Carga perezosa (lazy-load):** `pdfjs-dist` pesa ~500KB — importarlo de forma estática hubiera inflado el bundle de la página de Jugadores (admin) para TODOS los visitantes aunque nunca abrieran un documento. Se cargó con `import()` dinámico dentro de una función `getPdfjs()`, invocada solo al momento de renderizar un PDF real. Confirmado en el build de Vite: el chunk de Players.vue se mantuvo en ~23KB y `pdfjs-dist` quedó en su propio chunk separado (`pdf-*.js`, ~477KB) que solo se descarga cuando se abre un documento PDF.

**Validado con:** build de producción limpio (code-splitting correcto verificado en el log de Vite). Como el proxy de producción no es accesible desde el navegador de preview local (sandbox sin salida de red hacia Railway), se validó la integración real de PDF.js con un script Node aparte que descargó el documento real de producción (Daniel Ponce) a través del proxy y lo parseó con `pdfjs-dist/legacy/build/pdf.mjs`: `status 200`, `content-type: application/pdf`, `numPages: 2`, viewport de página 1 con dimensiones válidas (611×841) — confirma que la librería procesa correctamente los bytes reales que sirve el proxy. La verificación visual en un dispositivo Safari iOS real queda pendiente de que el usuario la confirme tras el despliegue, ya que no hay forma de controlar un Safari iOS real desde este entorno.

### 2026-07-11 — Fix: no se podía editar el documento/CURP de un jugador ya registrado + limpieza al eliminar
**Reporte del usuario:** en "Jugadores y Responsables" (admin), un jugador guardado sin documento quedaba así para siempre — el formulario de edición del admin no tenía campos de CURP ni documento oficial (solo el de alta pública los tenía). Además, al eliminar un jugador sin documento para volver a registrarlo, el sistema lo seguía marcando como "ya registrado" pese a haberlo borrado.

**Investigación (agente en background) reveló 3 causas distintas:**
1. El formulario de "Editar jugador" en [Players.vue](src/pages/admin/Players.vue) mecánicamente sí llama a `PUT /players/:id`, pero nunca tuvo campos de `curp` ni `documento_oficial` — ni en el HTML del modal, ni en el objeto `form`, ni en el `Object.assign` que precarga los datos al abrir "Editar". Por eso no había forma de agregar el documento después del alta inicial.
2. El backend confirmaba el problema: `POST /players` y `PUT /players/:id` en [backend/routes/index.js](backend/routes/index.js) nunca aceptaban `curp` ni `documento_oficial` en el body, así que aunque el frontend los hubiera mandado, se habrían ignorado.
3. **Causa real del "ya registrado" tras borrar:** el registro público de jugadores (`POST /inscriptions/:id/players`) guarda cada jugador en dos tablas — `players` (el roster real/editable) e `inscription_players` (un registro histórico de la solicitud de inscripción, sin relación FK entre ambas). El botón "Eliminar" del admin (`DELETE /players/:id`) solo borraba de `players`, dejando la fila de `inscription_players` huérfana para siempre. Esa fila huérfana es justo lo que consultan los checks de duplicado por CURP del registro público (`inscription_players` líneas ~1791 y ~1805 de `backend/routes/index.js`), así que cualquier reintento de registrar la misma CURP (desde el link público, aunque no desde el propio formulario del admin) seguía siendo rechazado como "ya registrada" pese a que el jugador ya no existía en el roster.

**Solución:**
- Se agregaron los campos **CURP** (con la misma validación de formato/edad que usa el formulario público — regex + rango de mes/día) y **Documento oficial** (imagen o PDF, mismo endpoint `POST /upload` que ya usa la foto del jugador) al modal de alta/edición en `Players.vue` — visibles y editables tanto al crear como al editar un jugador.
- `POST /players` y `PUT /players/:id` ahora aceptan y guardan `curp` (normalizado a mayúsculas) y `documento_oficial`.
- `DELETE /players/:id` ahora, además de borrar la fila de `players`, borra también la fila de `inscription_players` que coincide por CURP + `inscription_id` del equipo (`teams.inscription_id`) — así un jugador eliminado por el admin queda completamente libre para re-registrarse, sea desde el admin o desde el link público de inscripción.

**Validado con:** backend levantado localmente contra SQLite (con `.claude/launch.json` ahora incluye una config `jlp-backend`) apuntando el frontend local a él vía `.env.local` temporal. En el navegador: edité a un jugador real ("Gustavo Gutierrez", sin documento) y le agregué una CURP — el campo mostró el check verde de validación, guardó sin error, y `GET /tournaments/:slug/players` confirmó `curp: "GUTG150101HDFXXX05"` persistido. Para el bug de "ya registrado" tras eliminar: como el POST público de inscripciones tiene un bug propio no relacionado (`ANY($1::bigint[])`, sintaxis de array de Postgres que no se traduce para SQLite — solo rompe en desarrollo local, no en producción) que impidió generar el escenario end-to-end vía la API pública, se insertaron directamente en la base local (vía `better-sqlite3`) una inscripción + equipo + fila de `inscription_players` + jugador que replican exactamente lo que deja el flujo público real. Se confirmó la consulta de duplicado encontraba la fila **antes** de borrar, se llamó al endpoint real `DELETE /players/:id`, y se confirmó que tanto `players` como `inscription_players` quedaron vacíos y la consulta de duplicado ya no encontraba nada **después** — el fix funciona contra el endpoint real, no solo en teoría. No se pudo subir un documento real de prueba en local porque las credenciales de Cloudinary en `backend/.env` son placeholders (`tu_cloud_name`), pero el upload reutiliza el mismo endpoint `/upload` que ya funciona en producción para la foto del jugador, sin tocar `uploadToCloudinary`.

**Nota:** el bug de `ANY($1::bigint[])` en `POST /inscriptions` (backend/routes/index.js:1584) quedó identificado pero sin corregir por estar fuera del alcance de este pedido — solo afecta pruebas locales en SQLite, no producción (que corre en Postgres). Queda pendiente si se quiere poder probar el flujo de inscripciones completo en local alguna vez.
