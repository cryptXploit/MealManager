import axios from 'axios'
import { supabase } from './supabaseClient'

const apiClient = axios.create({
  baseURL: 'http://localhost:5005/api',
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(async (config) => {
  console.log("Interceptor: starting getSession...");
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log("Interceptor: getSession finished", { session, error });
  const token = session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  console.log("Interceptor: Request proceeding to", config.url);
  return config
}, (error) => {
  console.error("Interceptor request error:", error);
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