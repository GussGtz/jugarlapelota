// Directiva v-reveal — anima un elemento (fade + slide-up) cuando entra al viewport.
// Un solo IntersectionObserver compartido para toda la app en vez de uno por componente.
//
// Uso:
//   <div v-reveal>...</div>
//   <div v-reveal="{ delay: 120 }">...</div>              — retraso fijo (ms)
//   <div v-for="(x,i) in list" v-reveal="{ delay: i*80 }">...</div>  — stagger en listas

let observer = null

function getObserver() {
  if (observer) return observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-in')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  )
  return observer
}

export const vReveal = {
  mounted(el, binding) {
    el.classList.add('reveal-init')
    const delay = binding.value?.delay
    if (delay) el.style.transitionDelay = `${delay}ms`
    getObserver().observe(el)
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}
