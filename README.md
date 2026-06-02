# ⚽ JugarLaPelota — Plataforma de Torneos Deportivos

**jugarlapelota.com** — Ecosistema digital completo para gestión y difusión de torneos deportivos.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vue 3 + Vite + TailwindCSS |
| Estado | Pinia |
| PWA | vite-plugin-pwa |
| Tiempo real | Socket.io |
| Backend | Node.js + Express |
| Base de datos | MySQL |
| Multimedia | Cloudinary |
| Hosting | Hostinger VPS |

---

## Instalación rápida

### 1. Instala Node.js
Descárgalo desde: https://nodejs.org (versión LTS recomendada)

### 2. Frontend (Vue PWA)

```bash
cd /Users/samuelgutierrez/Desktop/JugarLaPelota
cp .env.example .env
npm install
npm run dev
# → http://localhost:5173
```

### 3. Backend (API + Socket.io)

```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales de MySQL y Cloudinary
npm install
npm run dev
# → http://localhost:3000
```

### 4. Base de datos MySQL

```bash
# En MySQL:
mysql -u root -p < backend/database.sql
```

Credenciales del admin inicial:
- **Email:** admin@jugarlapelota.com
- **Password:** Admin1234!

---

## Estructura del proyecto

```
JugarLaPelota/
├── src/                    # Vue Frontend
│   ├── api/                # Cliente Axios
│   ├── components/         # Componentes reutilizables
│   │   ├── Navbar/
│   │   ├── Hero/
│   │   ├── MatchCard/
│   │   ├── StandingsTable/
│   │   ├── LiveBadge/
│   │   ├── StreamCard/
│   │   ├── SponsorSlider/
│   │   ├── Footer/
│   │   └── Admin/
│   ├── composables/        # Lógica reutilizable
│   ├── layouts/            # PublicLayout / AdminLayout
│   ├── pages/              # Páginas públicas
│   │   └── admin/          # Panel administrador
│   ├── router/             # Vue Router
│   ├── services/           # Socket.io client
│   ├── stores/             # Pinia stores
│   └── styles/             # TailwindCSS global
├── backend/
│   ├── config/             # DB + Cloudinary
│   ├── controllers/        # Lógica de negocio
│   ├── middleware/         # Auth JWT
│   ├── routes/             # API endpoints
│   ├── database.sql        # Esquema MySQL completo
│   └── server.js           # Entry point + Socket.io
├── public/                 # Assets estáticos
└── .env.example
```

---

## URLs públicas

```
jugarlapelota.com/                    → Home
jugarlapelota.com/torneos             → Lista de torneos
jugarlapelota.com/:slug               → Torneo individual
jugarlapelota.com/:slug/partidos      → Partidos
jugarlapelota.com/:slug/tabla         → Tabla de posiciones
jugarlapelota.com/:slug/equipos       → Equipos
jugarlapelota.com/:slug/transmisiones → Streams en vivo
jugarlapelota.com/:slug/galeria       → Galería
jugarlapelota.com/:slug/noticias      → Noticias
```

## Panel Admin

```
jugarlapelota.com/admin               → Dashboard
jugarlapelota.com/admin/torneos       → Gestión de torneos
jugarlapelota.com/admin/partidos      → Partidos + marcadores en vivo
jugarlapelota.com/admin/tabla         → Tabla automática
jugarlapelota.com/admin/transmisiones → Streams
```

---

## Funciones clave implementadas

- **Multitorneos** — cada torneo tiene su propia URL, colores y branding
- **Tabla automática** — se recalcula al guardar marcadores
- **Tiempo real** — Socket.io emite `match:update`, `match:live`, `match:goal`
- **PWA instalable** — manifest + service worker con Workbox
- **Push notifications** — avisos de goles e inicio de partidos
- **Streaming** — admin pega URL de YouTube/Facebook/Twitch
- **Cloudinary** — gestión de imágenes y videos

---

## Roadmap

- [x] Fase 1 — Core (auth, torneos, equipos, partidos, tabla)
- [x] Fase 2 — Landing (hero, sponsors, galería, noticias)
- [x] Fase 3 — Streaming (en vivos, live badge)
- [x] Fase 4 — PWA (instalación, offline, notificaciones)
- [x] Fase 5 — Tiempo real (socket.io, livescore)
- [ ] Fase 6 — Premium (analytics, multiadmin, branding avanzado)

---

## Colores

| Variable | Hex | Uso |
|---------|-----|-----|
| `dark` | `#0B1220` | Fondo principal |
| `primary` | `#00C2FF` | Acento azul |
| `accent` | `#00FF95` | Acento verde |
| `card` | `#111827` | Tarjetas |
| `muted` | `#1F2937` | Bordes / secundario |
