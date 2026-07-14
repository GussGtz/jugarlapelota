import api from '@/api'

// El navegador no siempre reporta un file.type útil para HEIC/HEIF (fotos
// nativas de iPhone) — en Chrome suele venir vacío. Sin este fallback por
// extensión, la detección de "es imagen" fallaba para esos archivos.
export function isImageFile(file) {
  return file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name)
}
// HEIC/HEIF sí cuenta como imagen para validación, pero <img> no lo puede
// decodificar en ningún navegador — se distingue aparte para no intentar
// comprimirlo (ver compressFile).
function isHeic(file) {
  return /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif'
}

// Sube una imagen al servidor (Cloudinary) con compresión previa
export async function uploadImage(file, { maxWidth = 1200, quality = 0.85 } = {}) {
  const compressed = await compressFile(file, maxWidth, quality)
  const form = new FormData()
  form.append('file', compressed, file.name)
  const { data } = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data.url
}

// Upload sin autenticación (inscripciones públicas) — admite imágenes y PDFs hasta 25 MB
export async function uploadImagePublic(file) {
  const isPdf = file.type === 'application/pdf'
  const processed = isPdf ? file : await compressFile(file, 800, 0.85)
  const form = new FormData()
  form.append('file', processed, file.name)
  try {
    const { data } = await api.post('/upload/public', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data.url
  } catch (e) {
    const msg = e.response?.data?.error || ''
    if (e.response?.status === 413 || msg.includes('grande') || msg.includes('large')) {
      throw new Error('El archivo es demasiado grande (máx 25 MB). Comprime el documento e intenta de nuevo.')
    }
    throw new Error(msg || 'Error al subir el archivo')
  }
}

function compressFile(file, maxW, quality) {
  return new Promise((resolve) => {
    // HEIC/HEIF no lo puede decodificar <img> en ningún navegador (ni Safari
    // vía data URL) — intentarlo dejaba la promesa colgada para siempre
    // (img.onload nunca dispara y no había manejo de error). Se sube tal cual
    // sin comprimir; Cloudinary ya lo convierte a un formato web en la entrega.
    if (!isImageFile(file) || isHeic(file)) { resolve(file); return }
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          blob => resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })),
          'image/jpeg', quality
        )
      }
      // Si el navegador no puede decodificar la imagen por cualquier otro
      // motivo, subir el original en vez de dejar la promesa colgada.
      img.onerror = () => resolve(file)
      img.src = e.target.result
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}
