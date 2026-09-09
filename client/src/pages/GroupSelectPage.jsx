import React from 'react'
import { supabase } from '../services/supabaseClient'

const GroupSelectPage = ({ messDetails, setUiState }) => {
  const [darkMode] = React.useState(() => localStorage.getItem('mess_dark_mode') === 'true')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    setUiState('auth')
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${darkMode ? 'app-dark' : 'app-light bg-white'}`}>
      <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl text-indigo-600 ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
          <i className="fa-solid fa-house-user"></i>
        </div>
        <h1 className="text-2xl font-black mb-2">Welcome Back!</h1>
        <p className="text-sm opacity-60 mb-6">You are a member of</p>
        <div className={`p-4 rounded-2xl mb-6 border ${darkMode ? 'bg-slate-700/50 border-indigo-900/50' : 'bg-slate-50 border-indigo-50'}`}>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{messDetails?.name}</h2>
        </div>
        <button onClick={() => setUiState('dashboard')} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all mb-3">
          Enter Group
        </button>
        <button onClick={() => setUiState('onboarding')} className={`w-full py-3 rounded-xl font-bold transition-all ${darkMode ? 'text-slate-500 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}>
          Switch / Join Another
        </button>
        <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <button onClick={handleLogout} className="text-xs font-bold text-rose-400 hover:text-rose-600 transition flex items-center justify-center gap-1 mx-auto">
            <i className="fa-solid fa-right-from-bracket"></i> Logout account
          </button>
        </div>
      </div>
    </div>
  )
}

export default GroupSelectPage