# ⚽ JugarLaPelota — Plataforma de Torneos Deportivos

Ecosistema digital completo para gestión y difusión de torneos deportivos. Demo en vivo: [jugarlapelota.onrender.com](https://jugarlapelota.onrender.com)

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

---

## Instalación

### Requisitos
- Node.js LTS ([nodejs.org](https://nodejs.org))
- MySQL 8+
- Cuenta en Cloudinary (para imágenes)

### 1. Clona el repositorio

```bash
git clone https://github.com/GussGtz/jugarlapelota.git
cd jugarlapelota
```

### 2. Frontend

```bash
cp .env.example .env
npm install
npm run dev
# → http://localhost:5173
```

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales de MySQL y Cloudinary
npm install
npm run dev
# → http://localhost:3000
```

### 4. Base de datos

```bash
mysql -u root -p < backend/database.sql
```

Credenciales del admin inicial:
- **Email:** admin@jugarlapelota.com
- **Password:** Admin1234!

---

## Variables de entorno

Copia `.env.example` a `.env` y configura:

```env
# Frontend (.env)
VITE_API_URL=http://localhost:3000

# Backend (backend/.env)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=jugarlapelota
DB_USER=root
DB_PASSWORD=tu_password

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

JWT_SECRET=tu_jwt_secret
```

---

## Estructura del proyecto

```
jugarlapelota/
├── src/                    # Vue Frontend
│   ├── api/
│   ├── components/
│   ├── composables/
│   ├── layouts/
│   ├── pages/
│   │   └── admin/
│   ├── router/
│   ├── services/
│   ├── stores/
│   └── styles/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── database.sql
│   └── server.js
├── public/
└── .env.example
```

---

## Funciones clave

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

## Licencia

MIT © [Gustavo Gutierrez](https://github.com/GussGtz)
