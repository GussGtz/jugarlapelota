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

**Pendiente/nota:** no se tocó el requisito de login para seguir un torneo (sigue permitiendo seguir anónimamente con solo push activado, como ya funcionaba); solo se garantizó que SI hay sesión, el follow vive en BD ligado a la cuenta.
