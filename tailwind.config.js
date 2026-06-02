/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  safelist: [
    // Grid adaptable según cantidad de grupos — necesario porque Tailwind JIT
    // no detecta clases construidas dinámicamente en expresiones JavaScript
    'grid-cols-1','grid-cols-2','grid-cols-3','grid-cols-4',
    'md:grid-cols-1','md:grid-cols-2','md:grid-cols-3','md:grid-cols-4',
    'lg:grid-cols-1','lg:grid-cols-2','lg:grid-cols-3','lg:grid-cols-4','lg:grid-cols-6','lg:grid-cols-8',
  ],
  theme: {
    extend: {
      colors: {
        dark:      '#F7F9FC',  // Fondo principal — blanco suave
        primary:   '#0ea5e9',  // sky-500
        accent:    '#10b981',  // emerald-500
        card:      '#FFFFFF',  // Cards / superficies — blanco puro
        muted:     '#E5E7EB',  // Bordes suaves — gris claro
        'text-base': '#0F172A', // Texto principal — azul oscuro profundo
        'text-soft': '#64748B', // Texto secundario — gris slate
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'pulse-live': 'pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite'
      }
    }
  },
  plugins: []
}
