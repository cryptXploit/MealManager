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
      const { data: { session: s } } = await supabase.auth.getSession()
      if (s) {
        setSession(s)
        await fetchProfileAndMess(s.user)
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
        await fetchProfileAndMess(s.user)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfileAndMess = async (user) => {
    let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof) {
      const name = user.email.split('@')[0]
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