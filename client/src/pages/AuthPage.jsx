import React, { useState, useEffect } from 'react'
import { signUp, signIn, resetPassword } from '../services/authService'

const AuthPage = ({ setSession, setProfile, setUiState }) => {
  const [authMode, setAuthMode] = useState('login') // 'login', 'signup', 'forgot'
  const [authInput, setAuthInput] = useState({ email: '', password: '', fullName: '' })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mess_dark_mode') === 'true')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleAuth = async (e) => {
    if (e) e.preventDefault();
    
    if (!navigator.onLine) return showToast('No internet connection.', 'error')
    
    const { email, password, fullName } = authInput
    if (authMode === 'forgot' && !email) return showToast('Please enter your email.', 'error')
    if (authMode !== 'forgot' && (!email || !password)) return showToast('Please fill all required fields.', 'error')
    if (authMode === 'signup' && !fullName) return showToast('Full name is required.', 'error')

    setLoading(true)
    try {
      if (authMode === 'signup') {
        await signUp(email, password, fullName)
        showToast('Success! Please check your email inbox to confirm your account.', 'success')
        setAuthMode('login') 
        setAuthInput({ email: '', password: '', fullName: '' })
      } else if (authMode === 'login') {
        const { session } = await signIn(email, password)
        setSession(session)
      } else if (authMode === 'forgot') {
        await resetPassword(email)
        showToast('Password reset link sent to your email.', 'success')
        setAuthMode('login')
      }
    } catch (err) {
      console.error('Auth Error:', err)
      showToast(err.message || 'Authentication failed. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleModeChange = (mode) => {
    setAuthMode(mode)
    setAuthInput({ email: '', password: '', fullName: '' })
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-500 overflow-hidden relative ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* Background decorations for futuristic feel */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-[80px]"></div>
         <div className="absolute top-1/2 -right-24 w-80 h-80 bg-purple-500/15 rounded-full blur-[80px]"></div>
      </div>

      <div 
        className={`w-full max-w-md p-8 sm:p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-2xl border z-10 transition-all duration-700 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'} ${darkMode ? 'bg-slate-800/80 border-slate-700/50 shadow-black/50' : 'bg-white/90 border-white shadow-indigo-500/5'}`}
      >
        <div className="text-center mb-10 transform transition-all duration-500">
          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[1.5rem] mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-5 relative group overflow-hidden">
            <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <i className="fa-solid fa-utensils text-white text-3xl transform group-hover:scale-110 transition-transform duration-300"></i>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Meal Manager</h1>
          <p className={`text-sm mt-2 font-medium tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {authMode === 'login' ? 'Welcome back to your mess' : authMode === 'signup' ? 'Join the smartest mess today' : 'Recover your account access'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4" noValidate>
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${authMode === 'signup' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
             <div className="relative group pt-1">
                <i className={`fa-solid fa-user absolute left-5 top-[55%] -translate-y-1/2 transition-colors duration-300 ${darkMode ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}></i>
                <input
                  type="text"
                  placeholder="Full Name"
                  className={`w-full pl-14 pr-5 py-4 rounded-2xl outline-none transition-all duration-300 font-semibold text-[15px] ${darkMode ? 'bg-slate-900/50 text-white focus:bg-slate-800 shadow-[inset_0_0_0_2px_rgba(51,65,85,0.5)] focus:shadow-[inset_0_0_0_2px_rgba(99,102,241,1)]' : 'bg-slate-50 text-slate-800 focus:bg-white shadow-[inset_0_0_0_2px_transparent] focus:shadow-[inset_0_0_0_2px_rgba(99,102,241,1),0_8px_20px_-6px_rgba(99,102,241,0.2)]'}`}
                  value={authInput.fullName}
                  onChange={e => setAuthInput({...authInput, fullName: e.target.value})}
                  required={authMode === 'signup'}
                />
             </div>
          </div>

          <div className="relative group pt-1">
            <i className={`fa-solid fa-envelope absolute left-5 top-[55%] -translate-y-1/2 transition-colors duration-300 ${darkMode ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}></i>
            <input
              type="email"
              placeholder="Email Address"
              autoComplete="email"
              className={`w-full pl-14 pr-5 py-4 rounded-2xl outline-none transition-all duration-300 font-semibold text-[15px] ${darkMode ? 'bg-slate-900/50 text-white focus:bg-slate-800 shadow-[inset_0_0_0_2px_rgba(51,65,85,0.5)] focus:shadow-[inset_0_0_0_2px_rgba(99,102,241,1)]' : 'bg-slate-50 text-slate-800 focus:bg-white shadow-[inset_0_0_0_2px_transparent] focus:shadow-[inset_0_0_0_2px_rgba(99,102,241,1),0_8px_20px_-6px_rgba(99,102,241,0.2)]'}`}
              value={authInput.email}
              onChange={e => setAuthInput({...authInput, email: e.target.value})}
              required
            />
          </div>

          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${authMode !== 'forgot' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="relative group pt-1">
              <i className={`fa-solid fa-lock absolute left-5 top-[55%] -translate-y-1/2 transition-colors duration-300 ${darkMode ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}></i>
              <input
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                className={`w-full pl-14 pr-5 py-4 rounded-2xl outline-none transition-all duration-300 font-semibold text-[15px] ${darkMode ? 'bg-slate-900/50 text-white focus:bg-slate-800 shadow-[inset_0_0_0_2px_rgba(51,65,85,0.5)] focus:shadow-[inset_0_0_0_2px_rgba(99,102,241,1)]' : 'bg-slate-50 text-slate-800 focus:bg-white shadow-[inset_0_0_0_2px_transparent] focus:shadow-[inset_0_0_0_2px_rgba(99,102,241,1),0_8px_20px_-6px_rgba(99,102,241,0.2)]'}`}
                value={authInput.password}
                onChange={e => setAuthInput({...authInput, password: e.target.value})}
                required={authMode !== 'forgot'}
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-[15px] tracking-wide shadow-lg shadow-indigo-500/30 active:scale-[0.98] hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span className="relative flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {authMode === 'login' ? 'Sign In Securely' : authMode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                    <i className={`fa-solid ${authMode === 'forgot' ? 'fa-paper-plane' : 'fa-arrow-right'} opacity-80 text-sm transform transition-transform group-hover:translate-x-1`}></i>
                  </>
                )}
              </span>
            </button>
          </div>
        </form>

        <div className="mt-8 text-center space-y-4">
          {authMode === 'forgot' ? (
            <button type="button" onClick={() => handleModeChange('login')} className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors duration-300 flex items-center justify-center mx-auto gap-2">
              <i className="fa-solid fa-arrow-left"></i> Back to Login
            </button>
          ) : (
            <>
              <button 
                type="button" 
                onClick={() => handleModeChange(authMode === 'login' ? 'signup' : 'login')} 
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-300 block w-full"
              >
                {authMode === 'login' ? 'New here? Create an Account' : 'Already have an account? Sign In'}
              </button>
              {authMode === 'login' && (
                <button type="button" onClick={() => handleModeChange('forgot')} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors duration-300">
                  Forgot Password?
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast Notification with smooth scale & slide animation */}
      <div 
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-full shadow-2xl text-white text-sm font-bold flex items-center gap-3 z-50 transition-all duration-500 ease-out transform ${toast ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-90'} ${toast?.type === 'error' ? 'bg-rose-500 shadow-rose-500/30' : 'bg-emerald-500 shadow-emerald-500/30'}`}
      >
        <i className={`fa-solid ${toast?.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'} text-lg`}></i>
        <span>{toast?.message}</span>
      </div>
    </div>
  )
}

export default AuthPage