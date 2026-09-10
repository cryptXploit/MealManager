import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import apiClient from '../services/apiClient'
import {
  CACHE_KEYS,
  updateCache,
  formatMoney,
  formatDate,
  formatChatTime,
  getChatDateLabel,
} from '../utils/helpers'
import useLocalStorage from '../hooks/useLocalStorage'
import useOnlineStatus from '../hooks/useOnlineStatus'
import usePullToRefresh from '../hooks/usePullToRefresh'
import html2pdf from 'html2pdf.js'

const Dashboard = ({ profile, setProfile, messDetails, session }) => {
  // ----- All state (exactly as before) -----
  const [members, setMembers] = useLocalStorage(CACHE_KEYS.MEMBERS, [])
  const [expenses, setExpenses] = useLocalStorage(CACHE_KEYS.EXPENSES, [])
  const [meals, setMeals] = useLocalStorage(CACHE_KEYS.MEALS, [])
  const [messages, setMessages] = useLocalStorage(CACHE_KEYS.MESSAGES, [])
  const [logs, setLogs] = useLocalStorage(CACHE_KEYS.LOGS, [])

  const [darkMode, setDarkMode] = useLocalStorage('mess_dark_mode', false)
  const [connStatus, setConnStatus] = useState('connecting')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showPin, setShowPin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [notification, setNotification] = useState(null)
  const [isNotifExiting, setIsNotifExiting] = useState(false)

  const [mealInput, setMealInput] = useState({ date: new Date().toISOString().split('T')[0], count: '', type: 'D' })
  const [expenseInput, setExpenseInput] = useState({ item: '', amount: '', date: new Date().toISOString().split('T')[0], forUserId: session?.user?.id || '' })
  const [chatInput, setChatInput] = useState('')
  const [newPin, setNewPin] = useState('')
  const [addMemberEmail, setAddMemberEmail] = useState('')

  const isOnline = useOnlineStatus()
  const chatBottomRef = useRef(null)
  const activeTabRef = useRef(activeTab)
  const profileRef = useRef(profile)

  const showToast = (msg, type = 'success') => setToast({ message: msg, type })

  // ----- Stable data fetching callback (no dependencies) -----
  const fetchAllDataCallback = useCallback(async () => {
    const messId = profileRef.current?.mess_id
    if (!messId || !isOnline) return
    try {
      const [resM, resE, resMl, resMsg, resLogs] = await Promise.all([
        supabase.from('profiles').select('*').eq('mess_id', messId),
        supabase.from('expenses').select('*').eq('mess_id', messId).order('created_at', { ascending: false }),
        supabase.from('meals').select('*').eq('mess_id', messId).order('date', { ascending: false }),
        supabase.from('messages').select('*').eq('mess_id', messId).order('created_at', { ascending: true }),
        supabase.from('activity_logs').select('*').eq('mess_id', messId).order('created_at', { ascending: false }).limit(1000)
      ])
      if (resM.data) { setMembers(resM.data); updateCache(CACHE_KEYS.MEMBERS, resM.data) }
      if (resE.data) { setExpenses(resE.data); updateCache(CACHE_KEYS.EXPENSES, resE.data) }
      if (resMl.data) { setMeals(resMl.data); updateCache(CACHE_KEYS.MEALS, resMl.data) }
      if (resLogs.data) { setLogs(resLogs.data); updateCache(CACHE_KEYS.LOGS, resLogs.data) }
      if (resMsg.data) { setMessages(resMsg.data); updateCache(CACHE_KEYS.MESSAGES, resMsg.data) }
      setConnStatus('connected')
    } catch (e) {
      setConnStatus('disconnected')
    }
  }, [isOnline])

  // ----- Pull‑to‑refresh with stable callback -----
  const refreshCallback = useRef(fetchAllDataCallback)
  useEffect(() => { refreshCallback.current = fetchAllDataCallback }, [fetchAllDataCallback])

  const { pullY, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh(
    () => refreshCallback.current(),
    60
  )

  // ----- Native touch listeners -----
  const mainRef = useRef(null)
  useEffect(() => {
    const element = mainRef.current
    if (!element) return
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('touchcancel', handleTouchEnd)
    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  // ----- Other effects (unchanged) -----
  useEffect(() => { 
    if (profile?.mess_id) fetchAllDataCallback();
  }, [profile?.mess_id, fetchAllDataCallback])

  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])
  useEffect(() => { profileRef.current = profile }, [profile])
  useEffect(() => { document.body.className = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800' }, [darkMode])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t) } }, [toast])
  useEffect(() => {
    if (notification) {
      setIsNotifExiting(false)
      const t = setTimeout(() => { setIsNotifExiting(true); setTimeout(() => setNotification(null), 300) }, 6000)
      return () => clearTimeout(t)
    }
  }, [notification])
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])
  useEffect(() => {
    if (session?.user?.id && !expenseInput.forUserId) {
      setExpenseInput(prev => ({ ...prev, forUserId: session.user.id }))
    }
  }, [session])

  // ----- Real‑time subscription (unchanged) -----
  useEffect(() => {
    if (!profile?.mess_id) return
    const mid = profile.mess_id
    const channel = supabase.channel(`public:mess:${mid}`)
      .on('postgres_changes', { event: '*', schema: 'public', filter: `mess_id=eq.${mid}` }, payload => {
        if (payload.table === 'messages' && payload.eventType === 'INSERT') {
          const newMsg = payload.new
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            const n = [...prev, newMsg]
            updateCache(CACHE_KEYS.MESSAGES, n)
            return n
          })
          if (newMsg.user_id !== profileRef.current?.id && activeTabRef.current !== 'chat') {
            if (Notification.permission === 'granted') {
              new Notification('Mess Manager', { body: newMsg.text, icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png' })
            }
          }
        }
        if (payload.table === 'meals') {
          if (payload.eventType === 'INSERT') setMeals(prev => { const n = [...prev, payload.new]; updateCache(CACHE_KEYS.MEALS, n); return n })
          else if (payload.eventType === 'DELETE') setMeals(prev => { const n = prev.filter(m => m.id !== payload.old.id); updateCache(CACHE_KEYS.MEALS, n); return n })
        }
        if (payload.table === 'activity_logs' && payload.eventType === 'INSERT') {
          setLogs(prev => { const n = [payload.new, ...prev]; updateCache(CACHE_KEYS.LOGS, n); return n })
        }
        if (payload.table === 'expenses') fetchAllDataCallback()
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setConnStatus('connected')
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setConnStatus('disconnected')
      })
    return () => supabase.removeChannel(channel)
  }, [profile?.mess_id, fetchAllDataCallback])

  // ----- Helper functions (unchanged) -----
  const getMemberName = (uid) => members.find(m => m.id === uid)?.full_name || 'Unknown'

  const logActivity = async (actionType, description) => {
    const newLog = { id: Date.now(), mess_id: profile.mess_id, user_name: profile.full_name, action_type: actionType, description, created_at: new Date().toISOString() }
    setLogs(prev => { const n = [newLog, ...prev]; updateCache(CACHE_KEYS.LOGS, n); return n })
    if (isOnline) {
      await supabase.from('activity_logs').insert([{ mess_id: profile.mess_id, user_name: profile.full_name, action_type: actionType, description }])
    }
  }

  // ----- Chart logic (unchanged) -----
  const isSameMonth = (d1, d2) => {
    const date1 = new Date(d1), date2 = new Date(d2)
    return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear()
  }
  const filteredMeals = useMemo(() => meals.filter(m => isSameMonth(m.date, currentDate)), [meals, currentDate])
  const filteredExpenses = useMemo(() => expenses.filter(e => isSameMonth(e.date, currentDate)), [expenses, currentDate])
  const filteredLogs = useMemo(() => logs.filter(l => isSameMonth(l.created_at, currentDate)), [logs, currentDate])

  const stats = useMemo(() => {
    const totalCost = filteredExpenses.reduce((a, c) => a + (Number(c.amount) || 0), 0)
    const mStats = members.map(m => {
      const totalMeals = filteredMeals.filter(x => x.user_id === m.id).reduce((a, c) => a + (Number(c.count) || 0), 0)
      const deposit = filteredExpenses.filter(x => x.user_id === m.id).reduce((a, c) => a + (Number(c.amount) || 0), 0)
      return { ...m, totalMeals, deposit }
    })
    const totalMeals = mStats.reduce((a, c) => a + c.totalMeals, 0)
    const mealRate = totalMeals > 0 ? totalCost / totalMeals : 0
    const report = mStats.map(m => ({ ...m, cost: m.totalMeals * mealRate, balance: m.deposit - (m.totalMeals * mealRate) }))
    return { totalCost, totalMeals, mealRate, report }
  }, [members, filteredExpenses, filteredMeals])

  const sortedMembers = useMemo(() => {
    if (!profile || !members.length) return members
    const me = members.find(m => m.id === profile.id)
    const others = members.filter(m => m.id !== profile.id)
    return me ? [me, ...others] : members
  }, [members, profile])

  const mealLookup = useMemo(() => {
    const m = {}
    meals.forEach(x => { m[`${x.user_id}_${x.date}_${x.meal_type}`] = x })
    return m
  }, [meals])

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  // ----- Actions (unchanged) -----
  const handleChartToggle = async (day, member, type) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const lookupKey = `${member.id}_${dateStr}_${type}`
    const existing = mealLookup[lookupKey]
    const isSelf = member.id === profile.id
    const actorName = profile.full_name
    const targetName = isSelf ? 'Self' : member.full_name

    setSelectedCell(lookupKey)

    if (existing) {
      setConfirmModal({
        message: `Delete ${targetName}'s ${type} meal?`,
        yesLabel: 'Delete',
        onConfirm: async () => {
          setMeals(prev => { const n = prev.filter(m => m.id !== existing.id); updateCache(CACHE_KEYS.MEALS, n); return n })
          await logActivity('DELETED', `${actorName} deleted ${targetName}'s ${type} meal on ${dateStr}`)
          if (isOnline) await supabase.from('meals').delete().eq('id', existing.id)
          showToast('Deleted')
          setSelectedCell(null)
          setConfirmModal(null)
        }
      })
    } else {
      setConfirmModal({
        message: `Add 1 ${type} meal for ${targetName}?`,
        yesLabel: 'Add',
        onConfirm: async () => {
          const tempId = 'temp-' + Date.now()
          const newMeal = { id: tempId, user_id: member.id, mess_id: profile.mess_id, date: dateStr, count: 1, meal_type: type }
          setMeals(prev => { const n = [...prev, newMeal]; updateCache(CACHE_KEYS.MEALS, n); return n })
          await logActivity('ADDED', `${actorName} added 1 ${type} meal for ${targetName} on ${dateStr}`)
          if (isOnline) {
            const { data } = await supabase.from('meals').insert([{ user_id: member.id, mess_id: profile.mess_id, date: dateStr, count: 1, meal_type: type }]).select().single()
            if (data) setMeals(prev => { const n = prev.map(m => m.id === tempId ? data : m); updateCache(CACHE_KEYS.MEALS, n); return n })
          }
          showToast('Added')
          setSelectedCell(null)
          setConfirmModal(null)
        }
      })
    }
  }

  const addMeal = async () => {
    if (!mealInput.count) return
    const countVal = Number(mealInput.count)
    const tempId = 'temp-' + Date.now()
    const newMeal = { id: tempId, user_id: session.user.id, mess_id: profile.mess_id, date: mealInput.date, count: countVal, meal_type: mealInput.type }
    setMeals(prev => { const n = [newMeal, ...prev].sort((a,b) => new Date(b.date) - new Date(a.date)); updateCache(CACHE_KEYS.MEALS, n); return n })
    setMealInput(p => ({ ...p, count: '' }))
    logActivity('ADDED', `Self Add: ${countVal} (${mealInput.type}) for ${mealInput.date}`)
    if (isOnline) {
      const { data, error } = await supabase.from('meals').insert([{ user_id: session.user.id, mess_id: profile.mess_id, date: mealInput.date, count: countVal, meal_type: mealInput.type }]).select().single()
      if (error) {
        console.error("Insert meal error:", error);
        showToast(`Failed to add meal: ${error.message}`, 'error');
      }
      if (data) setMeals(prev => { const n = prev.map(m => m.id === tempId ? data : m); updateCache(CACHE_KEYS.MEALS, n); return n })
    }
  }

  const addExpense = async () => {
    if (!expenseInput.item) return
    const val = Number(expenseInput.amount)
    const targetUserId = expenseInput.forUserId || session.user.id
    const tempId = 't' + Date.now()
    const nx = { id: tempId, user_id: targetUserId, mess_id: profile.mess_id, item: expenseInput.item, amount: val, date: expenseInput.date, created_at: new Date().toISOString() }
    setExpenses(p => [nx, ...p])
    setExpenseInput({ item: '', amount: '', date: expenseInput.date, forUserId: targetUserId })
    logActivity('ADDED', `Bazar: ${expenseInput.item} (${val}) for ${getMemberName(targetUserId)}`)
    if (isOnline) {
      const { data } = await supabase.from('expenses').insert([{ user_id: targetUserId, mess_id: profile.mess_id, item: expenseInput.item, amount: val, date: expenseInput.date }]).select().single()
      if (data) setExpenses(p => p.map(e => e.id === tempId ? data : e))
    }
  }

  const sendMessage = async () => {
    if (!chatInput.trim()) return
    const txt = chatInput
    setChatInput('')
    const tempId = 'temp-' + Date.now()
    const msg = { id: tempId, user_id: session.user.id, mess_id: profile.mess_id, text: txt, created_at: new Date().toISOString() }
    setMessages(p => { const n = [...p, msg]; updateCache(CACHE_KEYS.MESSAGES, n); return n })
    if (isOnline) {
      const { data, error } = await supabase.from('messages').insert([{ user_id: session.user.id, mess_id: profile.mess_id, text: txt }]).select().single()
      if (error) {
        console.error("Insert message error:", error);
        showToast(`Failed to send: ${error.message}`, 'error');
        setChatInput(txt); // restore input
        setMessages(prev => prev.filter(m => m.id !== tempId)); // remove local temp message
      } else if (data) { 
        setMessages(prev => { const updated = prev.map(m => m.id === tempId ? data : m); updateCache(CACHE_KEYS.MESSAGES, updated); return updated }) 
      }
    }
  }

  const deleteItem = (table, id, uid, details) => {
    if (uid !== session.user.id) return showToast('Only owner deletes', 'error')
    setConfirmModal({
      message: 'Delete?',
      onConfirm: async () => {
        if (table === 'meals') setMeals(p => p.filter(m => m.id !== id))
        if (table === 'expenses') setExpenses(p => p.filter(e => e.id !== id))
        if (isOnline) await supabase.from(table).delete().eq('id', id)
        logActivity('DELETED', details)
        showToast('Deleted')
        setConfirmModal(null)
      }
    })
  }

  const handleUpdatePin = async () => {
  if (!isOnline || !newPin || newPin.length < 4) return showToast('Invalid PIN', 'error')
  try {
    const response = await apiClient.post('/mess/update-pin', { messId: profile.mess_id, newPin })
    if (response.data.mess) {
      setMessDetails(prev => ({ ...prev, pin: newPin }))
      setNewPin('')
      logActivity('SETTINGS', 'Changed PIN')
      showToast('PIN updated successfully')
    } else {
      showToast('Failed to update PIN', 'error')
    }
  } catch (err) {
    console.error('Update pin error:', err)
    showToast(err.response?.data?.error || 'Server error', 'error')
  }
}

  const handleKickMember = (m) => {
  if (!isOnline) return showToast('Offline', 'error')
  setConfirmModal({
    message: `Kick ${m.full_name}?`,
    onConfirm: async () => {
      try {
        await apiClient.delete(`/mess/kick/${m.id}`)
        setMembers(prev => prev.filter(x => x.id !== m.id))
        logActivity('REMOVED', `Kicked ${m.full_name}`)
        setConfirmModal(null)
        showToast('Member removed')
      } catch (err) {
        console.error('Kick error:', err)
        showToast(err.response?.data?.error || 'Error removing member', 'error')
      }
    }
  })
}

  const handleAddMemberByEmail = async () => {
    if (!isOnline || !addMemberEmail) return
    const { data } = await supabase.from('profiles').select('*').eq('email', addMemberEmail).single()
    if (data && !data.mess_id) {
      await supabase.from('profiles').update({ mess_id: profile.mess_id }).eq('id', data.id)
      logActivity('ADDED', `Added ${data.full_name}`)
      setAddMemberEmail('')
      showToast('Added')
      fetchAllDataCallback()
    } else showToast('User not found or already in a mess', 'error')
  }

  const handleResetChart = () => {
  if (!isOnline) return showToast('Offline', 'error')
  setConfirmModal({
    message: 'Reset Chart? This will delete all meals for the current month.',
    onConfirm: async () => {
      const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      try {
        await apiClient.post('/mess/reset-chart', { messId: profile.mess_id, yearMonth })
        setMeals(prev => prev.filter(m => !isSameMonth(m.date, currentDate)))
        await logActivity('RESET', `Reset chart for ${monthName}`)
        showToast('Chart reset successfully')
        setConfirmModal(null)
      } catch (err) {
        console.error('Reset chart error:', err)
        showToast(err.response?.data?.error || 'Error resetting chart', 'error')
      }
    }
  })
}

  const downloadChartPDF = () => {
    const el = document.getElementById('chart-container')
    if (el) html2pdf().from(el).set({ margin: [10,10], filename: 'Meal_Chart.pdf', html2canvas: { scale: 2 }, jsPDF: { orientation: 'landscape' } }).save()
  }

  const handleMonthChange = (e) => {
    if (!e.target.value) return
    const [y, m] = e.target.value.split('-')
    setCurrentDate(new Date(y, m - 1, 1))
  }

  const requestNotifyPermission = () => {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') showToast('System Notifications Active')
      else showToast('Permission Denied', 'error')
    })
  }

  // ----- RENDER (JSX) – updated pull indicator -----
  return (
    <div className={`flex flex-col h-[100dvh] w-full transition-colors duration-300 overflow-hidden ${darkMode ? 'app-dark' : 'app-light bg-white'}`}>
      {/* Notification Banner (unchanged) */}
      {notification && (
        <div className={`fixed top-2 left-2 right-2 z-50 flex justify-center ${isNotifExiting ? 'exiting' : ''} notch-notification`}>
          <div onClick={() => { setActiveTab('chat'); setNotification(null) }} className={`flex items-center gap-3 p-3 pr-4 rounded-[2rem] shadow-2xl border cursor-pointer backdrop-blur-md transition-all active:scale-95 ${darkMode ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white/95 border-slate-200 text-slate-800'} max-w-[95%] w-auto min-w-[300px]`}>
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg"><i className="fa-solid fa-bowl-food text-white text-lg"></i></div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5"><h4 className="font-bold text-sm truncate pr-2">{getMemberName(notification.senderId)}</h4><span className="text-[10px] opacity-60 uppercase font-bold tracking-wider">Now</span></div>
              <p className="text-xs opacity-90 truncate">{notification.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header (unchanged) */}
      <header className={`flex-none z-20 px-4 py-3 border-b flex justify-between items-center backdrop-blur-md pt-safe ${darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white/90 border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center shadow-lg"><i className="fa-solid fa-house"></i></div>
          <div>
            <h1 className="font-bold text-sm leading-tight">{messDetails?.name}</h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">PIN: {showPin ? messDetails?.pin : '****'}</p>
              <button onClick={() => setShowPin(!showPin)} className="text-xs opacity-50"><i className={`fa-solid ${showPin ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className={`w-3 h-3 rounded-full mt-2.5 ${connStatus === 'connected' ? 'bg-green-500' : connStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} title={`Status: ${connStatus}`}></div>
          <button onClick={() => setDarkMode(!darkMode)} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${darkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}><i className={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i></button>
          <button onClick={() => setShowSettings(true)} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${darkMode ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}><i className="fa-solid fa-gear"></i></button>
          <button onClick={() => { setConfirmModal({ message: 'Log out?', onConfirm: () => { setConfirmModal(null); localStorage.clear(); supabase.auth.signOut().catch(()=>{}); window.location.reload(); } }) }} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${darkMode ? 'bg-slate-800 text-rose-400' : 'bg-rose-50 text-rose-500'}`}><i className="fa-solid fa-right-from-bracket"></i></button>
        </div>
      </header>

      {/* Settings Drawer (unchanged) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm fade-in" onClick={() => setShowSettings(false)}>
          <div className={`w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl slide-up overflow-hidden flex flex-col max-h-[90vh] ${darkMode ? 'bg-slate-900 border-t border-slate-700' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-center pt-3 pb-1"><div className="w-12 h-1.5 rounded-full bg-slate-300/50"></div></div>
            <div className="p-6 overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold flex items-center gap-2"><i className="fa-solid fa-users-gear text-indigo-500"></i> Group Settings</h2><button onClick={() => setShowSettings(false)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">&times;</button></div>
              <div className={`p-4 rounded-xl mb-6 ${darkMode ? 'bg-slate-800' : 'bg-indigo-50'}`}>
                <p className="text-xs font-bold uppercase opacity-50 mb-1">Invite Info</p>
                <div className="flex justify-between items-center"><div><p className="text-sm font-bold">Group: {messDetails?.name}</p><p className="text-sm font-mono opacity-80">PIN: {messDetails?.pin}</p></div><button onClick={() => { navigator.clipboard.writeText(`Join Mess: ${messDetails?.name} | PIN: ${messDetails?.pin}`); showToast('Copied Info') }} className="text-2xl text-indigo-500"><i className="fa-solid fa-copy"></i></button></div>
              </div>
              <div className="mb-6"><label className="text-xs font-bold uppercase opacity-50 mb-2 block">Add Member by Email</label><div className="flex gap-2"><input type="email" placeholder="friend@gmail.com" className={`flex-1 p-2 rounded-lg border bg-transparent ${darkMode ? 'border-slate-700' : 'border-slate-300'}`} value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)} /><button onClick={handleAddMemberByEmail} className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm"><i className="fa-solid fa-user-plus"></i></button></div><p className="text-[10px] opacity-50 mt-1">User must have signed up in this app first.</p></div>
              <div className="mb-6"><label className="text-xs font-bold uppercase opacity-50 mb-2 block">Update PIN</label><div className="flex gap-2"><input type="text" placeholder="New PIN" className={`flex-1 p-2 rounded-lg border bg-transparent ${darkMode ? 'border-slate-700' : 'border-slate-300'}`} value={newPin} onChange={e => setNewPin(e.target.value)} /><button onClick={handleUpdatePin} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm">Update</button></div></div>
              <div className="mb-6"><label className="text-xs font-bold uppercase opacity-50 mb-2 block">Notifications</label><button onClick={requestNotifyPermission} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><i className="fa-solid fa-bell"></i> Enable System Notifications</button></div>
              <div className="mb-6"><label className="text-xs font-bold uppercase opacity-50 mb-2 block">Members ({members.length})</label><div className={`max-h-48 overflow-y-auto rounded-xl border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>{members.map(m => (<div key={m.id} className={`flex justify-between items-center p-3 border-b last:border-0 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold">{m.full_name[0]}</div><div><span className="text-sm font-bold block">{m.full_name} {m.id === session.user.id && '(You)'}</span><span className="text-[10px] opacity-50">{m.email || 'No Email'}</span></div></div>{m.id !== session.user.id && (<button onClick={() => handleKickMember(m)} className="text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 p-2 rounded-lg transition"><i className="fa-solid fa-user-minus"></i></button>)}</div>))}</div></div>
              <div className={`mt-4 pt-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}><label className="text-xs font-bold uppercase opacity-50 mb-3 block text-rose-500 flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> Danger Zone</label><button onClick={handleResetChart} className="w-full py-4 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"><i className="fa-solid fa-trash-can"></i> Reset Monthly Chart</button><p className="text-[10px] text-center mt-2 opacity-40">This will delete all meal entries for the current month.</p></div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN SCROLLABLE AREA WITH PULL-TO-REFRESH */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 overscroll-contain no-scrollbar scroll-smooth"
        style={{ transform: `translateY(${pullY > 0 ? pullY * 0.5 : 0}px)` }}
      >
        {/* Pull indicator + Refreshed message (UPDATED) */}
        {(pullY > 0 || isRefreshing) && (
          <div className="flex justify-center items-center py-2 transition-all duration-200">
            {isRefreshing ? (
              <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
                <i className="fa-solid fa-check-circle"></i> Refreshed!
              </div>
            ) : (
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        )}

        {/* Dashboard Tab (unchanged) */}
        {activeTab === 'dashboard' && (
          <>
            <TimeAwareHero name={profile?.full_name.split(' ')[0]} monthName={monthName} amount={formatMoney(stats.mealRate)} darkMode={darkMode} />
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700 shadow-sm' : 'bg-transparent border-slate-200'}`}>
                <p className="text-[10px] font-bold uppercase opacity-60 mb-1 text-indigo-500">Total Cost</p>
                <h2 className="text-2xl font-bold">{formatMoney(stats.totalCost)}</h2>
              </div>
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700 shadow-sm' : 'bg-transparent border-slate-200'}`}>
                <p className="text-[10px] font-bold uppercase opacity-60 mb-1 text-emerald-500">Total Meals</p>
                <h2 className="text-2xl font-bold">{stats.totalMeals}</h2>
              </div>
            </div>
            <div className={`rounded-xl border overflow-hidden mt-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-200'}`}>
              <div className={`p-3 border-b flex justify-between items-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-200'}`}>
                <h3 className="font-bold text-sm">Member Status</h3>
                <span className={`text-[10px] opacity-50 px-2 py-1 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>{monthName}</span>
              </div>
              <table className="w-full text-xs">
                <thead className={`uppercase text-left ${darkMode ? 'bg-slate-900/30 opacity-60' : 'bg-slate-50 text-slate-500'}`}>
                  <tr><th className="px-4 py-3">User</th><th className="px-2 py-3 text-center">Meal</th><th className="px-2 py-3 text-right">Dep.</th><th className="px-4 py-3 text-right">Bal.</th></tr>
                </thead>
                <tbody className={darkMode ? 'divide-y divide-slate-700' : 'divide-y divide-slate-100'}>
                  {stats.report.map(m => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 font-bold">{m.full_name.split(' ')[0]}</td>
                      <td className="px-2 py-3 text-center">{m.totalMeals}</td>
                      <td className="px-2 py-3 text-right">{Math.round(m.deposit)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${m.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{Math.round(m.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Chart Tab (unchanged) */}
        {activeTab === 'chart' && (
          <div className={`fade-in rounded-xl shadow border overflow-hidden flex flex-col h-[calc(100vh-160px)] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="p-3 border-b dark:border-slate-700 flex justify-between items-center bg-purple-900 text-white gap-2">
              <input type="month" value={`${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`} onChange={handleMonthChange} className="bg-transparent text-white font-bold text-sm outline-none border border-purple-400/50 rounded px-2 py-1 max-w-[150px] dark:bg-slate-800/50" />
              <div className="flex gap-2"><button onClick={downloadChartPDF} className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white transition" title="Download PDF"><i className="fa-solid fa-file-pdf"></i></button></div>
            </div>
            <div id="chart-container" className={`chart-container ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
              <table className="chart-table">
                <thead>
                  <tr>
                    <th className={`sticky-corner ${darkMode ? 'sticky-corner-dark' : ''}`}>#</th>
                    {sortedMembers.map(m => (
                      <th key={m.id} colSpan="2" className={`sticky-header ${darkMode ? 'sticky-header-dark' : ''}`}>
                        <div className={`truncate max-w-[70px] mx-auto text-[10px] font-bold uppercase px-1 ${m.id === profile?.id ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>{m.id === profile?.id ? 'YOU' : m.full_name.split(' ')[0].slice(0, 8)}</div>
                        <div className="flex justify-around border-t border-slate-400/50 mt-1 pt-0.5 opacity-80 text-[8px]"><span>D</span><span>N</span></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    return (
                      <tr key={day}>
                        <td className={`sticky-col ${darkMode ? 'sticky-col-dark' : ''}`}>{day}</td>
                        {sortedMembers.map(m => {
                          const dMeal = mealLookup[`${m.id}_${dateStr}_D`]
                          const nMeal = mealLookup[`${m.id}_${dateStr}_N`]
                          const isDSelected = selectedCell === `${m.id}_${dateStr}_D`
                          const isNSelected = selectedCell === `${m.id}_${dateStr}_N`
                          return (
                            <React.Fragment key={m.id}>
                              <td className={`chart-cell ${darkMode ? 'chart-cell-dark' : ''} ${isDSelected ? 'selected' : ''}`} onClick={() => handleChartToggle(day, m, 'D')}>
                                {dMeal ? (dMeal.count == 1 ? <i className="fa-solid fa-check text-emerald-500"></i> : <span className="font-bold text-indigo-600">{dMeal.count}</span>) : ''}
                              </td>
                              <td className={`chart-cell ${darkMode ? 'chart-cell-dark' : ''} ${isNSelected ? 'selected' : ''}`} onClick={() => handleChartToggle(day, m, 'N')}>
                                {nMeal ? (nMeal.count == 1 ? <i className="fa-solid fa-check text-emerald-500"></i> : <span className="font-bold text-indigo-600">{nMeal.count}</span>) : ''}
                              </td>
                            </React.Fragment>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* History Tab (unchanged) */}
        {activeTab === 'history' && (
          <div className="fade-in space-y-3">
            <h2 className="text-lg font-bold px-1">Activity Log ({monthName})</h2>
            {filteredLogs.length === 0 && <div className="text-center opacity-50 py-10">No activity this month.</div>}
            {filteredLogs.map(log => (
              <div key={log.id} className={`p-3 rounded-xl border flex gap-3 items-start transition-transform active:scale-[0.99] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-200'}`}>
                <div className={`mt-1 p-2 rounded-full text-xs ${log.action_type === 'DELETED' || log.action_type === 'RESET' ? 'bg-rose-100 text-rose-600' : log.action_type === 'ADDED' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  <i className={`fa-solid ${log.action_type === 'DELETED' || log.action_type === 'RESET' ? 'fa-trash' : log.action_type === 'ADDED' ? 'fa-plus' : 'fa-info'}`}></i>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start"><span className="font-bold text-sm">{log.user_name}</span><span className="text-[10px] opacity-50">{formatDate(log.created_at)}</span></div>
                  <p className="text-xs opacity-70 mt-1">{log.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Meals Tab (unchanged) */}
        {activeTab === 'meals' && (
          <div className="fade-in">
            <div className={`p-6 rounded-2xl border text-center mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-200'}`}>
              <h2 className="text-lg font-bold mb-4">Log Manual Meals</h2>
              <div className="flex gap-2 mb-3">
                <input type="date" className="w-full p-3 rounded-lg border bg-transparent" value={mealInput.date} onChange={e => setMealInput({...mealInput, date: e.target.value})} />
                <select className={`p-3 rounded-lg border bg-transparent outline-none font-bold ${darkMode ? 'bg-slate-800' : 'bg-white'}`} value={mealInput.type} onChange={e => setMealInput({...mealInput, type: e.target.value})}>
                  <option value="D">Day</option><option value="N">Night</option>
                </select>
              </div>
              <input type="number" placeholder="Count" step="0.5" className="w-full p-3 mb-3 rounded-lg border bg-transparent font-bold text-lg" value={mealInput.count} onChange={e => setMealInput({...mealInput, count: e.target.value})} />
              <button onClick={addMeal} className="w-full bg-emerald-500 text-white py-3 rounded-lg font-bold">Confirm</button>
            </div>
            {filteredMeals.filter(m => m.user_id === session.user.id).slice(0,5).map(m => (
              <div key={m.id} className={`flex justify-between items-center p-3 rounded-lg mb-2 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-200'}`}>
                <span className="text-sm opacity-70">{m.date} ({m.meal_type})</span>
                <div className="flex items-center gap-4"><span className="font-bold">{m.count}</span><button onClick={() => deleteItem('meals', m.id, m.user_id, `Meal: ${m.count}`)} className="text-rose-400"><i className="fa-solid fa-trash"></i></button></div>
              </div>
            ))}
          </div>
        )}

        {/* Bazar Tab (unchanged) */}
        {activeTab === 'bazar' && (
          <div className="fade-in">
            <div className={`p-6 rounded-2xl border mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-200'}`}>
              <h2 className="text-lg font-bold mb-4">Add Expense</h2>
              <div className="mb-3">
                <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Who Paid?</label>
                <select className={`w-full p-3 rounded-lg border bg-transparent outline-none font-bold ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} value={expenseInput.forUserId} onChange={e => setExpenseInput({...expenseInput, forUserId: e.target.value})}>
                  {members.map(m => (<option key={m.id} value={m.id}>{m.full_name} {m.id === session.user.id ? '(You)' : ''}</option>))}
                </select>
              </div>
              <input type="text" placeholder="Item Name (e.g. Rice, Oil)" className="w-full p-3 mb-3 rounded-lg border bg-transparent" value={expenseInput.item} onChange={e => setExpenseInput({...expenseInput, item: e.target.value})} />
              <div className="flex gap-3 mb-3">
                <input type="date" className="w-full p-3 rounded-lg border bg-transparent" value={expenseInput.date} onChange={e => setExpenseInput({...expenseInput, date: e.target.value})} />
                <input type="number" placeholder="Cost" className="w-full p-3 rounded-lg border bg-transparent font-bold" value={expenseInput.amount} onChange={e => setExpenseInput({...expenseInput, amount: e.target.value})} />
              </div>
              <button onClick={addExpense} className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold">Save Expense</button>
            </div>
            <div className="space-y-2">
              {filteredExpenses.slice(0,5).map(e => (
                <div key={e.id} className={`flex justify-between items-center p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-200'}`}>
                  <div><div className="text-sm font-bold">{e.item}</div><div className="text-[10px] opacity-60 flex items-center gap-1"><i className="fa-solid fa-user"></i> {getMemberName(e.user_id)}</div></div>
                  <div className="flex items-center gap-3 ml-auto"><span className="font-mono font-bold text-orange-500">{formatMoney(e.amount)}</span>{e.user_id === session.user.id && <button onClick={() => deleteItem('expenses', e.id, e.user_id, `Bazar: ${e.item}`)} className="text-rose-400 p-2"><i className="fa-solid fa-trash"></i></button>}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Tab (unchanged) */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[calc(100vh-140px)] fade-in">
            <div className="flex-1 overflow-y-auto space-y-2 pb-4 pr-1 scrollbar-hide">
              {(() => {
                let lastDate = null
                return messages.map(msg => {
                  const msgDate = getChatDateLabel(msg.created_at)
                  const showDate = msgDate !== lastDate
                  lastDate = msgDate
                  const isMe = msg.user_id === session.user.id
                  const isTemp = msg.id.toString().startsWith('temp-')
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && <div className="text-center text-[10px] opacity-40 my-2 font-bold uppercase tracking-wider">{msgDate}</div>}
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`chat-bubble ${isMe ? 'me' : darkMode ? 'others-dark' : 'others-light'}`}>
                          {!isMe && <div className="text-[10px] font-bold opacity-60 mb-1 text-indigo-400">{getMemberName(msg.user_id)}</div>}
                          {msg.text}
                          <div className="flex items-end justify-between gap-1 mt-1"><span className="text-[9px] opacity-60 ml-auto">{formatChatTime(msg.created_at)}</span>{isMe && <i className={`fa-solid fa-check-double text-[9px] ${isTemp ? 'text-gray-300' : 'text-blue-300'}`}></i>}</div>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })
              })()}
              <div ref={chatBottomRef}></div>
            </div>
            <div className={`p-2 rounded-xl border flex items-center gap-2 mt-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-200'}`}>
              <input type="text" placeholder="Type a message..." className="flex-1 bg-transparent p-2 outline-none text-sm" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
              <button onClick={sendMessage} disabled={!chatInput.trim()} className="p-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"><i className="fa-solid fa-paper-plane"></i></button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation (unchanged) */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t pb-safe pt-1 z-30 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-around items-center h-16 max-w-xl mx-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'dashboard' ? 'text-indigo-500' : 'opacity-40'}`}><i className="fa-solid fa-chart-line text-lg"></i><span className="text-[10px] font-bold">Home</span></button>
          <button onClick={() => setActiveTab('chart')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'chart' ? 'text-purple-500' : 'opacity-40'}`}><i className="fa-solid fa-table text-lg"></i><span className="text-[10px] font-bold">Chart</span></button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'history' ? 'text-cyan-500' : 'opacity-40'}`}><i className="fa-solid fa-clock-rotate-left text-lg"></i><span className="text-[10px] font-bold">Logs</span></button>
          <button onClick={() => setActiveTab('meals')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'meals' ? 'text-emerald-500' : 'opacity-40'}`}><i className="fa-solid fa-utensils text-lg"></i><span className="text-[10px] font-bold">Meal</span></button>
          <button onClick={() => setActiveTab('bazar')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'bazar' ? 'text-orange-500' : 'opacity-40'}`}><i className="fa-solid fa-cart-shopping text-lg"></i><span className="text-[10px] font-bold">Bazar</span></button>
          <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'chat' ? 'text-sky-500' : 'opacity-40'}`}><i className="fa-solid fa-message text-lg"></i><span className="text-[10px] font-bold">Chat</span></button>
        </div>
      </nav>

      {/* Toast & Confirm Modal (unchanged) */}
      {toast && <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl text-white text-sm font-bold flex items-center gap-2 fade-in z-50 ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>{toast.message}</div>}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
          <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
            <p className="opacity-60 mb-4">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className={`flex-1 py-3 rounded-xl font-bold ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>{confirmModal.noLabel || 'Cancel'}</button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-rose-500 text-white">{confirmModal.yesLabel || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// TimeAwareHero sub-component (unchanged)
const TimeAwareHero = ({ name, monthName, amount, darkMode }) => {
  const [timeData, setTimeData] = useState({ text: 'Welcome', type: 'morning' })
  useEffect(() => {
    const h = new Date().getHours()
    let type = 'morning', text = 'Good Morning'
    if (h >= 12 && h < 14) { type = 'noon'; text = 'Good Noon' }
    else if (h >= 14 && h < 17) { type = 'afternoon'; text = 'Good Afternoon' }
    else if (h >= 17 && h < 20) { type = 'evening'; text = 'Good Evening' }
    else if (h >= 20 || h < 5) { type = 'night'; text = 'Good Night' }
    setTimeData({ text, type })
  }, [])

  const getBgClass = () => {
    switch(timeData.type) {
      case 'noon': return 'bg-gradient-to-br from-sky-400 via-blue-500 to-yellow-400'
      case 'afternoon': return 'bg-gradient-to-br from-teal-400 via-emerald-500 to-cyan-600'
      case 'evening': return 'bg-gradient-to-br from-purple-700 via-pink-600 to-orange-500'
      case 'night': return 'bg-gradient-to-b from-slate-900 via-indigo-950 to-black'
      default: return 'bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600'
    }
  }

  const renderEffects = () => {
    if (timeData.type === 'night') return [...Array(15)].map((_, i) => <div key={i} className="star" style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, width: `${Math.random()*3+1}px`, height: `${Math.random()*3+1}px`, animationDuration: `${Math.random()*2+1}s` }}></div>)
    if (timeData.type === 'noon') return <div className="sun-flare w-32 h-32 top-[-20px] right-[-20px] pointer-events-none"></div>
    return [...Array(6)].map((_, i) => <div key={i} className="bubble" style={{ left: `${Math.random()*90}%`, width: `${Math.random()*20+10}px`, height: `${Math.random()*20+10}px`, bottom: '-20px', animationDuration: `${Math.random()*4+3}s`, animationDelay: `${Math.random()*2}s` }}></div>)
  }

  return (
    <div className={`mb-6 relative overflow-hidden rounded-3xl shadow-2xl p-6 text-white transition-all duration-1000 ${getBgClass()}`} style={{ backgroundSize: '200% 200%', animation: 'gradientShift 8s ease infinite' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">{renderEffects()}</div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div><p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1 shadow-black drop-shadow-md">{monthName}</p><AnimatedGreeting text={`${timeData.text}, @${name}!`} /></div>
          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md border border-white/30 shadow-lg"><i className={`fa-solid ${timeData.type === 'night' ? 'fa-moon' : timeData.type === 'noon' ? 'fa-sun' : 'fa-bowl-food'} text-xl`}></i></div>
        </div>
        <div className="mt-6"><p className="text-xs font-bold opacity-80 uppercase mb-1 drop-shadow-md">Current Meal Rate</p><h2 className="text-5xl font-black tracking-tighter drop-shadow-lg">{amount}</h2></div>
      </div>
    </div>
  )
}

const AnimatedGreeting = ({ text }) => (
  <div className="font-bold text-sm tracking-wide">
    {text.split('').map((char, index) => (
      <span key={index} className="wave-char" style={{ animationDelay: `${index * 0.05}s` }}>{char === ' ' ? '\u00A0' : char}</span>
    ))}
  </div>
)

export default Dashboard