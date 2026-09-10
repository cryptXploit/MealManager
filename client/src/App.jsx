import React, { useState, useEffect } from 'react'
import { supabase } from './services/supabaseClient'
import { CACHE_KEYS, updateCache } from './utils/helpers'
import AuthPage from './pages/AuthPage'
import CreateMessPage from './pages/CreateMessPage'
import JoinMessPage from './pages/JoinMessPage'
import GroupSelectPage from './pages/GroupSelectPage'
import Dashboard from './pages/Dashboard'

function App() {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem(CACHE_KEYS.PROFILE)
    return saved ? JSON.parse(saved) : null
  })
  const [messDetails, setMessDetails] = useState(() => {
    const saved = localStorage.getItem(CACHE_KEYS.MESS)
    return saved ? JSON.parse(saved) : null
  })
  const [uiState, setUiState] = useState(() => 
    (profile && messDetails) ? 'dashboard' : (profile ? 'create_mess' : 'auth')
  )
  const [loading, setLoading] = useState(!profile)
  const [session, setSession] = useState(null)


  const [updatePasswordMode, setUpdatePasswordMode] = useState(false)

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      setUpdatePasswordMode(true)
      setUiState('auth') // or a dedicated update-password page
    }
  })
  return () => subscription.unsubscribe()
}, [])

  useEffect(() => {
    const init = async () => {
      if (window.location.hash.includes('type=recovery')) {
        setUpdatePasswordMode(true)
      }
      const { data: { session: s } } = await supabase.auth.getSession()
      if (s) {
        setSession(s)
        await fetchProfileAndMess(s.user, s.access_token)
      } else if (!profile) {
        setUiState('auth')
      }
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      if (event === 'SIGNED_OUT') {
        localStorage.clear()
        setProfile(null)
        setMessDetails(null)
        setUiState('auth')
      } else if (event === 'SIGNED_IN' && s) {
        await fetchProfileAndMess(s.user, s.access_token)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfileAndMess = async (user, overrideToken) => {
    const token = overrideToken || session?.access_token || localStorage.getItem('mm_token');
    let prof = null;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/mess/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        prof = json.profile;
      }
    } catch(e) { console.error("Error fetching profile via API", e); }

    if (!prof) {
      const name = user.user_metadata?.full_name || user.email.split('@')[0]
      // Fallback insert, might fail due to RLS, but that's okay, backend upserts on mess join/create
      await supabase.from('profiles').insert([{ id: user.id, full_name: name, email: user.email }])
      prof = { id: user.id, full_name: name, mess_id: null, email: user.email }
    }
    
    setProfile(prof)
    updateCache(CACHE_KEYS.PROFILE, prof)
    if (prof.mess_id) {
      const { data: mess } = await supabase.from('messes').select('*').eq('id', prof.mess_id).single()
      setMessDetails(mess)
      updateCache(CACHE_KEYS.MESS, mess)
      setUiState('dashboard')
    } else {
      setUiState('create_mess')
    }
  }

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-indigo-500 font-bold animate-pulse bg-white dark:bg-slate-900">Loading App...</div>
  }

  if (updatePasswordMode) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border dark:border-slate-700">
          <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Set New Password</h2>
          <input type="password" id="new_pwd" placeholder="Enter new password" className="w-full p-4 rounded-xl border bg-transparent dark:border-slate-600 dark:text-white mb-4" />
          <button onClick={async () => {
             const p = document.getElementById('new_pwd').value;
             if(p.length < 6) return alert('Password must be at least 6 characters');
             const { error } = await supabase.auth.updateUser({ password: p });
             if(error) alert(error.message);
             else { 
               alert('Password updated successfully!'); 
               setUpdatePasswordMode(false);
               setUiState('dashboard');
             }
          }} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all">Update Password</button>
        </div>
      </div>
    )
  }

  if (uiState === 'auth') {
    return <AuthPage setSession={setSession} setProfile={setProfile} setUiState={setUiState} />
  }
  if (uiState === 'create_mess') {
    return <CreateMessPage profile={profile} session={session} setProfile={setProfile} setMessDetails={setMessDetails} setUiState={setUiState} />
  }
  if (uiState === 'join_mess') {
    return <JoinMessPage profile={profile} session={session} setProfile={setProfile} setMessDetails={setMessDetails} setUiState={setUiState} />
  }
  if (uiState === 'group_select') {
    return <GroupSelectPage messDetails={messDetails} setUiState={setUiState} />
  }
  return (
    <Dashboard
      profile={profile}
      setProfile={setProfile}
      messDetails={messDetails}
      session={session}
    />
  )
}

export default App