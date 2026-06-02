import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('jlp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jlp_token')
      localStorage.removeItem('jlp_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
