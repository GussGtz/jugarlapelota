// Actualización automática de la PWA instalada.
//
// Por defecto, un Service Worker instalado solo se revisa cuando el navegador
// decide hacerlo (navegación completa o ~cada 24h). Una PWA instalada que el
// usuario reabre desde el ícono del home no siempre dispara esa revisión, así
// que los cambios de un nuevo deploy podían tardar mucho en reflejarse (o no
// reflejarse nunca hasta cerrar la app por completo).
//
// Esto fuerza una revisión de actualización cada vez que la app vuelve a
// primer plano y cada cierto tiempo mientras sigue abierta, y recarga la
// página en cuanto el nuevo Service Worker toma control.
export function setupPWAUpdates() {
  if (!('serviceWorker' in navigator)) return

  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return
        const checkForUpdate = () => registration.update().catch(() => {})

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate()
        })
        setInterval(checkForUpdate, 30 * 60 * 1000)
      },
      onNeedRefresh() {
        updateSW(true)
      },
    })
  })

  // Cuando un Service Worker nuevo toma control de la página, recargar para
  // que la app (ya cargada en memoria) use el build nuevo de inmediato.
  // Se ignora el primer "controllerchange" (activación inicial, no un update real).
  let hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return }
    window.location.reload()
  })
}
