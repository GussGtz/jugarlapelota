<template>
  <footer class="border-t border-muted bg-white mt-auto">
    <div class="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-8">
      <!-- Brand -->
      <div>
        <div class="flex items-center gap-3 mb-3">
          <img src="@/assets/images/LOGO.png" alt="JugarLaPelota" class="h-10 w-10 object-contain" />
          <p class="text-xl font-black gradient-text">JugarLaPelota</p>
        </div>
        <p class="text-slate-500 text-sm">El ecosistema digital completo para torneos deportivos.</p>
        <p class="text-slate-400 text-xs mt-4">gutierrezgustavocanul@gmail.com</p>
      </div>

      <div v-for="col in columns" :key="col.title">
        <h4 class="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">{{ col.title }}</h4>
        <ul class="space-y-2">
          <li v-for="link in col.links" :key="link.label">
            <!-- Enlace externo (mailto / wa.me) -->
            <a v-if="link.href" :href="link.href" target="_blank" rel="noopener"
              class="text-slate-500 hover:text-primary text-sm transition-colors flex items-center gap-1.5">
              <component v-if="link.icon" :is="link.icon" class="w-3.5 h-3.5 shrink-0" />
              {{ link.label }}
            </a>
            <!-- Enlace interno -->
            <router-link v-else :to="link.to" class="text-slate-500 hover:text-primary text-sm transition-colors">
              {{ link.label }}
            </router-link>
          </li>
        </ul>
      </div>
    </div>

    <div class="border-t border-muted px-4 py-4 text-center text-slate-400 text-xs">
      © {{ new Date().getFullYear() }} JugarLaPelota — Todos los derechos reservados
    </div>
  </footer>
</template>

<script setup>
const columns = [
  {
    title: 'Plataforma',
    links: [
      { label: 'Panel Admin', to: '/admin' },
      { label: 'Acceder', to: '/login' }
    ]
  },
  {
    title: 'Contacto',
    links: [
      { label: 'gutierrezgustavocanul@gmail.com', href: 'mailto:gutierrezgustavocanul@gmail.com', icon: 'IconMail' },
      { label: '+52 562 969 0153', href: 'https://wa.me/5215629690153', icon: 'IconPhone' }
    ]
  }
]
</script>
