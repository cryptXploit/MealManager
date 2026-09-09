import React, { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import apiClient from '../services/apiClient'

const OnboardingPage = ({ profile, session, setProfile, setMessDetails, setUiState }) => {
  const [messMode, setMessMode] = useState('join') // 'join', 'create'
  const [messInput, setMessInput] = useState({ name: '', pin: '' })
  const [toast, setToast] = useState(null)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mess_dark_mode') === 'true')
  const [loading, setLoading] = useState(false)

  const showToast = (msg, type = 'error') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleMessOnboarding = async () => {
    if (!navigator.onLine) return showToast('Online required')
    if (!messInput.name || !messInput.pin) return showToast('Name and PIN required')

    setLoading(true)
    
    try {
      const endpoint = messMode === 'create' ? '/mess/create' : '/mess/join';
      const response = await apiClient.post(endpoint, {
        name: messInput.name,
        pin: messInput.pin
      });

      const data = response.data.mess;
      if (!data) throw new Error('No data returned');

      // Update local state
      const updatedProfile = { ...profile, mess_id: data.id }
      setProfile(updatedProfile)
      setMessDetails(data)
      localStorage.setItem('mm_profile', JSON.stringify(updatedProfile))
      localStorage.setItem('mm_mess', JSON.stringify(data))
      setUiState('dashboard')
    } catch (err) {
      console.error(err);
      showToast(messMode === 'create' ? 'Failed to create mess' : 'Mess not found or wrong PIN');
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    setUiState('auth')
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${darkMode ? 'app-dark' : 'app-light'}`}>
      <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h1 className="text-xl font-bold mb-8 text-center">Setup Mess</h1>
        <div className={`flex gap-2 mb-6 p-1 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <button onClick={() => setMessMode('join')} className={`flex-1 py-2 rounded-md text-sm font-bold ${messMode === 'join' ? (darkMode ? 'bg-slate-600 text-white' : 'bg-white shadow text-indigo-600') : 'opacity-50'}`}>Join</button>
          <button onClick={() => setMessMode('create')} className={`flex-1 py-2 rounded-md text-sm font-bold ${messMode === 'create' ? (darkMode ? 'bg-slate-600 text-white' : 'bg-white shadow text-indigo-600') : 'opacity-50'}`}>Create</button>
        </div>
        <div className="space-y-4">
          <input type="text" placeholder="Mess Name" className={`w-full p-3 rounded-lg border bg-transparent ${darkMode ? 'border-slate-600' : 'border-slate-200'}`} value={messInput.name} onChange={e => setMessInput({...messInput, name: e.target.value})} />
          <input type="text" placeholder="PIN" className={`w-full p-3 rounded-lg border bg-transparent ${darkMode ? 'border-slate-600' : 'border-slate-200'}`} value={messInput.pin} onChange={e => setMessInput({...messInput, pin: e.target.value})} />
        </div>
        <button onClick={handleMessOnboarding} disabled={loading} className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-bold">
          {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (messMode === 'join' ? 'Join' : 'Create')}
        </button>
        <button onClick={handleLogout} className="w-full mt-4 text-xs opacity-50">Logout</button>
      </div>
      {toast && <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl text-white text-sm font-bold ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>{toast.message}</div>}
    </div>
  )
}

export default OnboardingPage