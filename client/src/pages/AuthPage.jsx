import React, { useState } from 'react'
import { signUp, signIn, resetPassword } from '../services/authService'

const AuthPage = ({ setSession, setProfile, setUiState }) => {
  const [authMode, setAuthMode] = useState('login') // 'login', 'signup', 'forgot'
  const [authInput, setAuthInput] = useState({ email: '', password: '', fullName: '' })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mess_dark_mode') === 'true')

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAuth = async () => {
    if (!navigator.onLine) return showToast('Internet needed', 'error')
    const { email, password, fullName } = authInput
    if (authMode === 'forgot' && !email) return showToast('Email required', 'error')
    if (authMode !== 'forgot' && (!email || !password)) return showToast('Fill all fields', 'error')
    if (authMode === 'signup' && !fullName) return showToast('Name required', 'error')

    setLoading(true)
    try {
      if (authMode === 'signup') {
        await signUp(email, password, fullName)
        showToast('Confirmation email sent! Check Inbox.')
        setAuthInput({ email: '', password: '', fullName: '' })
      } else if (authMode === 'login') {
        const { session } = await signIn(email, password)
        setSession(session)
        // profile will be fetched by App.jsx's onAuthStateChange
      } else if (authMode === 'forgot') {
        await resetPassword(email)
        showToast('Reset link sent to email')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${darkMode ? 'app-dark' : 'app-light bg-white'}`}>
      <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl backdrop-blur-xl border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <i className="fa-solid fa-utensils text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Meal Manager</h1>
          <p className="text-sm opacity-60 mt-1">Smart Mess Management</p>
        </div>
        <div className="space-y-4">
          {authMode === 'signup' && (
            <div className="relative">
              <i className="fa-solid fa-user absolute left-4 top-4 text-indigo-500 opacity-50"></i>
              <input
                type="text"
                placeholder="Full Name"
                className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}
                value={authInput.fullName}
                onChange={e => setAuthInput({...authInput, fullName: e.target.value})}
              />
            </div>
          )}
          <div className="relative">
            <i className="fa-solid fa-envelope absolute left-4 top-4 text-indigo-500 opacity-50"></i>
            <input
              type="email"
              placeholder="Email Address"
              className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}
              value={authInput.email}
              onChange={e => setAuthInput({...authInput, email: e.target.value})}
            />
          </div>
          {authMode !== 'forgot' && (
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-4 top-4 text-indigo-500 opacity-50"></i>
              <input
                type="password"
                placeholder="Password"
                className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}
                value={authInput.password}
                onChange={e => setAuthInput({...authInput, password: e.target.value})}
              />
            </div>
          )}
        </div>
        {authMode === 'forgot' ? (
          <button onClick={handleAuth} disabled={loading} className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all">
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Send Reset Link'}
          </button>
        ) : (
          <button onClick={handleAuth} disabled={loading} className="w-full mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-70">
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (authMode === 'login' ? 'Login' : 'Create Account')}
          </button>
        )}
        <div className="mt-6 text-center space-y-2">
          {authMode === 'forgot' ? (
            <button onClick={() => setAuthMode('login')} className="text-sm font-bold text-slate-500 hover:text-slate-600">Back to Login</button>
          ) : (
            <>
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-sm font-bold text-indigo-500 hover:text-indigo-600 transition block w-full">
                {authMode === 'login' ? 'New here? Create Account' : 'Already have an account? Login'}
              </button>
              {authMode === 'login' && <button onClick={() => setAuthMode('forgot')} className="text-xs font-bold text-slate-400 hover:text-slate-500">Forgot Password?</button>}
            </>
          )}
        </div>
      </div>
      {toast && <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl text-white text-sm font-bold ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>{toast.message}</div>}
    </div>
  )
}

export default AuthPage