import api from '@/api'

// Sube una imagen al servidor (Cloudinary) con compresión previa
export async function uploadImage(file, { maxWidth = 1200, quality = 0.85 } = {}) {
  const compressed = await compressFile(file, maxWidth, quality)
  const form = new FormData()
  form.append('file', compressed, file.name)
  const { data } = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data.url
}

// Upload sin autenticación (inscripciones públicas)
export async function uploadImagePublic(file) {
  const compressed = await compressFile(file, 800, 0.85)
  const form = new FormData()
  form.append('file', compressed, file.name)
  const { data } = await api.post('/upload/public', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data.url
}

function compressFile(file, maxW, quality) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(file); return }
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
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
