import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  // ── Public ──────────────────────────────────────────────
  { path: '/',           name: 'Home',       component: () => import('@/pages/Home.vue') },
  { path: '/contratar',  name: 'Contratar',  component: () => import('@/pages/Contratar.vue') },

  // ── Tournament layout — nav bar siempre visible ─────────
  {
    path: '/:slug',
    component: () => import('@/pages/Tournament.vue'),
    children: [
      { path: '',              name: 'Tournament',   component: () => import('@/pages/TournamentHome.vue') },
      { path: 'equipo/:id',    name: 'TeamDetail',   component: () => import('@/pages/TeamDetail.vue') },
      { path: 'jugadores',     name: 'Players',      component: () => import('@/pages/Players.vue') },
      { path: 'jugador/:id',   name: 'PlayerDetail', component: () => import('@/pages/PlayerDetail.vue') },
      { path: 'partidos',      name: 'Matches',      component: () => import('@/pages/Matches.vue') },
      { path: 'partido/:id',   name: 'MatchDetail',  component: () => import('@/pages/MatchDetail.vue') },
      { path: 'tabla',         name: 'Standings',    component: () => import('@/pages/Standings.vue') },
      // Página unificada de contenido (noticias + fotos + transmisiones)
      { path: 'media',         name: 'Media',        component: () => import('@/pages/Media.vue') },
      // Redirecciones de las páginas antiguas
      { path: 'galeria',       redirect: to => ({ path: `/${to.params.slug}/media` }) },
      { path: 'transmisiones', redirect: to => ({ path: `/${to.params.slug}/media` }) },
      { path: 'noticias',      redirect: to => ({ path: `/${to.params.slug}/media` }) },
      { path: 'inscripcion',   name: 'Inscription',  component: () => import('@/pages/Inscription.vue') },
      { path: 'inscripcion/:inscriptionId/jugadores', name: 'InscriptionPlayers', component: () => import('@/pages/InscriptionPlayers.vue') },
      // Fixture redirige a partidos (páginas fusionadas)
      { path: 'fixture', redirect: to => ({ path: `/${to.params.slug}/partidos` }) },
    ]
  },

  // ── Auth ────────────────────────────────────────────────
  { path: '/login',   name: 'Login',         component: () => import('@/pages/Login.vue') },
  { path: '/arbitro', name: 'RefereePortal', component: () => import('@/pages/RefereePortal.vue'), meta: { layout: 'referee' } },

  // ── Admin ───────────────────────────────────────────────
  {
    path: '/admin',
    meta: { layout: 'admin', requiresAuth: true },
    children: [
      { path: '',           name: 'AdminDashboard',  component: () => import('@/pages/admin/Dashboard.vue') },
      { path: 'torneos',     name: 'AdminTournaments', component: () => import('@/pages/admin/Tournaments.vue') },
      { path: 'categorias',  name: 'AdminCategories',  component: () => import('@/pages/admin/Categories.vue') },
      { path: 'equipos',    name: 'AdminTeams',       component: () => import('@/pages/admin/Teams.vue') },
      { path: 'jugadores',  name: 'AdminPlayers',     component: () => import('@/pages/admin/Players.vue') },
      { path: 'partidos',   name: 'AdminMatches',     component: () => import('@/pages/admin/Matches.vue') },
      { path: 'tabla',      name: 'AdminStandings',   component: () => import('@/pages/admin/Standings.vue') },
      { path: 'transmisiones', name: 'AdminStreams',  component: () => import('@/pages/admin/Streams.vue') },
      { path: 'galeria',    name: 'AdminGallery',     component: () => import('@/pages/admin/Gallery.vue') },
      { path: 'noticias',   name: 'AdminNews',        component: () => import('@/pages/admin/News.vue') },
      { path: 'analytics',  name: 'AdminAnalytics',   component: () => import('@/pages/admin/Analytics.vue') },
      { path: 'fases',         name: 'AdminPhases',       component: () => import('@/pages/admin/Phases.vue') },
      { path: 'inscripciones', name: 'AdminInscriptions', component: () => import('@/pages/admin/Inscriptions.vue') },
      { path: 'arbitraje',    name: 'AdminReferee',      component: () => import('@/pages/admin/Referee.vue') },
      { path: 'premios',       name: 'AdminAwards',       component: () => import('@/pages/admin/Awards.vue') },
      { path: 'config',        name: 'AdminSettings',     component: () => import('@/pages/admin/Settings.vue') },
      { path: 'superadmin',    name: 'SuperAdmins',       component: () => import('@/pages/admin/SuperAdmins.vue'), meta: { requiresSuperAdmin: true } }
    ]
  },

  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/pages/NotFound.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// Rutas públicas que un admin NO debe ver mientras tenga sesión activa
const PUBLIC_PATHS = ['/', '/contratar', '/login']

router.beforeEach((to) => {
  const auth = useAuthStore()

  // Rutas de navegación pública del torneo bloqueadas para admin/referee logueado
  const publicTournamentRoutes = ['Tournament', 'Matches', 'MatchDetail', 'Standings', 'Players', 'PlayerDetail', 'TeamDetail', 'Media']
  const blockedForAdmin = PUBLIC_PATHS.includes(to.path) || to.name === 'Login' || publicTournamentRoutes.includes(to.name)
  if (auth.isAdmin && blockedForAdmin) return { name: 'AdminDashboard' }
  if (auth.user?.role === 'referee' && blockedForAdmin) return { name: 'RefereePortal' }

  // Ruta protegida sin sesión → login
  if (to.meta.requiresAuth && !auth.token) return { name: 'Login' }

  // Superadmin solo puede acceder a su propia sección
  if (auth.user?.role === 'superadmin' && to.path.startsWith('/admin') && to.path !== '/admin/superadmin') {
    return { name: 'SuperAdmins' }
  }
  // Solo superadmin puede acceder a /admin/superadmin
  if (to.meta.requiresSuperAdmin && auth.user?.role !== 'superadmin') return { name: 'AdminDashboard' }
})

export default router
