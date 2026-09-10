import React, { useState } from 'react'
import { supabase } from '../services/supabaseClient'

const CreateMessPage = ({ profile, session, setProfile, setMessDetails, setUiState }) => {
  const [messInput, setMessInput] = useState({ name: '', pin: '' })
  const [toast, setToast] = useState(null)
  const [darkMode] = useState(() => localStorage.getItem('mess_dark_mode') === 'true')
  const [loading, setLoading] = useState(false)

  const showToast = (msg, type = 'error') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreateMess = async () => {
    if (!navigator.onLine) return showToast('Online required')
    if (!messInput.name || !messInput.pin) return showToast('Name and PIN required')

    setLoading(true)
    
    try {
      // Bypass apiClient interceptors completely to avoid any hang issues
      console.log("Using existing session prop...");
      const token = session?.access_token;
      
      if (!token) throw new Error('No authentication token found');

      // Use raw fetch
      const apiUrl = 'http://localhost:5005/api';
      console.log("Fetching from:", apiUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${apiUrl}/mess/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: messInput.name,
          pin: messInput.pin
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP error ${response.status}`);
      }

      const data = responseData.mess;
      if (!data) throw new Error('No data returned');

      // Update local state
      const updatedProfile = { ...profile, mess_id: data.id }
      setProfile(updatedProfile)
      setMessDetails(data)
      localStorage.setItem('mm_profile', JSON.stringify(updatedProfile))
      localStorage.setItem('mm_mess', JSON.stringify(data))
      setUiState('dashboard')
    } catch (err) {
      console.error("Create mess error:", err);
      showToast(`Failed to create mess: ${err.message}`);
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    setUiState('auth')
    supabase.auth.signOut().catch(e => console.error(e))
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${darkMode ? 'app-dark' : 'app-light'}`}>
      <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h1 className="text-xl font-bold mb-8 text-center">Create a New Mess</h1>
        
        <div className="space-y-4">
          <input type="text" placeholder="Mess Name (Unique)" className={`w-full p-3 rounded-lg border bg-transparent ${darkMode ? 'border-slate-600' : 'border-slate-200'}`} value={messInput.name} onChange={e => setMessInput({...messInput, name: e.target.value})} />
          <input type="text" placeholder="PIN for members" className={`w-full p-3 rounded-lg border bg-transparent ${darkMode ? 'border-slate-600' : 'border-slate-200'}`} value={messInput.pin} onChange={e => setMessInput({...messInput, pin: e.target.value})} />
        </div>
        
        <button onClick={handleCreateMess} disabled={loading} className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-bold">
          {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Create Mess'}
        </button>

        <button onClick={() => setUiState('join_mess')} className="w-full mt-4 text-sm font-bold text-indigo-500 hover:text-indigo-600 transition">
          Want to join an existing mess instead?
        </button>

        <button onClick={handleLogout} className="w-full mt-4 text-xs opacity-50">Logout</button>
      </div>
      {toast && <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl text-white text-sm font-bold ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>{toast.message}</div>}
    </div>
  )
}

export default CreateMessPage
