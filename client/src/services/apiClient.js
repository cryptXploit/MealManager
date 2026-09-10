import axios from 'axios'
import { supabase } from './supabaseClient'

const apiClient = axios.create({
  baseURL: 'http://localhost:5005/api',
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => Promise.reject(error))

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default apiClient