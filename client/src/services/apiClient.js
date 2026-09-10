import axios from 'axios'
import { supabase } from './supabaseClient'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5005/api',
  headers: { 'Content-Type': 'application/json' }
})

const getToken = () => {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!key) return null;
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed?.access_token || null;
  } catch (e) {
    return null;
  }
};

// Request interceptor to add auth token synchronously
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error);
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log("Interceptor: Response received", response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default apiClient