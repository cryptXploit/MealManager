import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import apiClient from '../../services/apiClient';
import { CACHE_KEYS, updateCache } from '../../utils/helpers';
import useLocalStorage from '../../hooks/useLocalStorage';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import usePullToRefresh from '../../hooks/usePullToRefresh';

import HomeTab from './HomeTab';
import MealTab from './MealTab';
import BazarTab from './BazarTab';
import ChatTab from './ChatTab';
import LogsTab from './LogsTab';
import SettingsTab from './SettingsTab';

const Dashboard = ({ profile, setProfile, messDetails, setMessDetails, session }) => {
  const [members, setMembers] = useLocalStorage(CACHE_KEYS.MEMBERS, []);
  const [expenses, setExpenses] = useLocalStorage(CACHE_KEYS.EXPENSES, []);
  const [meals, setMeals] = useLocalStorage(CACHE_KEYS.MEALS, []);
  const [messages, setMessages] = useLocalStorage(CACHE_KEYS.MESSAGES, []);
  const [logs, setLogs] = useLocalStorage(CACHE_KEYS.LOGS, []);

  const [darkMode, setDarkMode] = useLocalStorage('mess_dark_mode', false);
  const [connStatus, setConnStatus] = useState('connecting');
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'meals', 'bazar', 'chat', 'logs'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPin, setShowPin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isNotifExiting, setIsNotifExiting] = useState(false);

  const isOnline = useOnlineStatus();
  const chatBottomRef = useRef(null);
  const activeTabRef = useRef(activeTab);
  const profileRef = useRef(profile);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const fetchAllDataCallback = useCallback(async () => {
    const messId = profileRef.current?.mess_id;
    if (!messId || !isOnline) return;
    try {
      // Replaced old fetch with new modularized apiClient call
      const response = await apiClient.get(`/home/data/${messId}`);
      const data = response.data;
      
      if (data.members) { setMembers(data.members); updateCache(CACHE_KEYS.MEMBERS, data.members); }
      if (data.expenses) { setExpenses(data.expenses); updateCache(CACHE_KEYS.EXPENSES, data.expenses); }
      if (data.meals) { setMeals(data.meals); updateCache(CACHE_KEYS.MEALS, data.meals); }
      if (data.logs) { setLogs(data.logs); updateCache(CACHE_KEYS.LOGS, data.logs); }
      if (data.messages) { setMessages(data.messages); updateCache(CACHE_KEYS.MESSAGES, data.messages); }
      
      setConnStatus('connected');
    } catch (e) {
      console.error('Fetch error:', e);
      setConnStatus('disconnected');
    }
  }, [isOnline, setMembers, setExpenses, setMeals, setLogs, setMessages]);

  const refreshCallback = useRef(fetchAllDataCallback);
  useEffect(() => { refreshCallback.current = fetchAllDataCallback; }, [fetchAllDataCallback]);

  const mainRef = useRef(null);
  const { isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh(
    mainRef,
    () => refreshCallback.current(),
    60
  );

  useEffect(() => {
    const element = mainRef.current;
    if (!element) return;
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => { 
    if (profile?.mess_id) fetchAllDataCallback();
  }, [profile?.mess_id, fetchAllDataCallback]);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { document.body.className = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'; }, [darkMode]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => {
    if (notification) {
      setIsNotifExiting(false);
      const t = setTimeout(() => { setIsNotifExiting(true); setTimeout(() => setNotification(null), 300); }, 6000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  useEffect(() => {
    if (!profile?.mess_id) return;
    const mid = profile.mess_id;
    const channel = supabase.channel(`public:mess:${mid}`)
      .on('postgres_changes', { event: '*', schema: 'public', filter: `mess_id=eq.${mid}` }, payload => {
        if (payload.table === 'messages' && payload.eventType === 'INSERT') {
          const newMsg = payload.new;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            const n = [...prev, newMsg];
            updateCache(CACHE_KEYS.MESSAGES, n);
            return n;
          });
          if (newMsg.user_id !== profileRef.current?.id && activeTabRef.current !== 'chat') {
            if (Notification.permission === 'granted') {
              new Notification('Mess Manager', { body: newMsg.text, icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png' });
            }
          }
        }
        if (payload.table === 'meals') {
          if (payload.eventType === 'INSERT') setMeals(prev => { const n = [...prev, payload.new]; updateCache(CACHE_KEYS.MEALS, n); return n; });
          else if (payload.eventType === 'DELETE') setMeals(prev => { const n = prev.filter(m => m.id !== payload.old.id); updateCache(CACHE_KEYS.MEALS, n); return n; });
        }
        if (payload.table === 'activity_logs' && payload.eventType === 'INSERT') {
          setLogs(prev => { const n = [payload.new, ...prev]; updateCache(CACHE_KEYS.LOGS, n); return n; });
        }
        if (payload.table === 'expenses') fetchAllDataCallback();
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setConnStatus('connected');
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setConnStatus('disconnected');
      });
    return () => supabase.removeChannel(channel);
  }, [profile?.mess_id, fetchAllDataCallback, setMessages, setMeals, setLogs]);

  const getMemberName = (uid) => members.find(m => m.id === uid)?.full_name || 'Unknown';

  const logActivity = async (actionType, description) => {
    const newLog = { id: Date.now(), mess_id: profile.mess_id, user_name: profile.full_name, action_type: actionType, description, created_at: new Date().toISOString() };
    setLogs(prev => { const n = [newLog, ...prev]; updateCache(CACHE_KEYS.LOGS, n); return n; });
    if (isOnline) {
      try {
        await apiClient.post('/logs/add', { 
          mess_id: profile.mess_id, 
          user_name: profile.full_name, 
          action_type: actionType, 
          description 
        });
      } catch (err) {
        console.error("Log activity error:", err);
      }
    }
  };

  const deleteItem = (table, id, uid, details) => {
    if (uid !== session.user.id) return showToast('Only owner deletes', 'error');
    setConfirmModal({
      message: 'Delete this item?',
      onConfirm: async () => {
        if (table === 'meals') setMeals(p => p.filter(m => m.id !== id));
        if (table === 'expenses') setExpenses(p => p.filter(e => e.id !== id));
        
        if (isOnline) {
          try {
            if (table === 'meals') await apiClient.delete(`/meals/delete/${id}`);
            if (table === 'expenses') await apiClient.delete(`/expenses/delete/${id}`);
          } catch (error) {
            console.error("Delete error:", error);
            showToast('Failed to delete on server', 'error');
            // Optimistic deletion could be reverted here, but we keep it simple for now
          }
        }
        logActivity('DELETED', details);
        showToast('Deleted');
        setConfirmModal(null);
      }
    });
  };

  // Chart Logic
  const isSameMonth = (d1, d2) => {
    const date1 = new Date(d1), date2 = new Date(d2);
    return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
  };
  
  const filteredMeals = useMemo(() => meals.filter(m => isSameMonth(m.date, currentDate)), [meals, currentDate]);
  const filteredExpenses = useMemo(() => expenses.filter(e => isSameMonth(e.date, currentDate)), [expenses, currentDate]);
  const filteredLogs = useMemo(() => logs.filter(l => isSameMonth(l.created_at, currentDate)), [logs, currentDate]);

  const stats = useMemo(() => {
    const totalCost = filteredExpenses.reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const mStats = members.map(m => {
      const userMeals = filteredMeals.filter(x => x.user_id === m.id).reduce((a, c) => a + (Number(c.count) || 0), 0);
      const deposit = filteredExpenses.filter(x => x.user_id === m.id).reduce((a, c) => a + (Number(c.amount) || 0), 0);
      return { ...m, totalMeals: userMeals, deposit };
    });
    const totalMeals = mStats.reduce((a, c) => a + c.totalMeals, 0);
    const mealRate = totalMeals > 0 ? totalCost / totalMeals : 0;
    const report = mStats.map(m => ({ ...m, cost: m.totalMeals * mealRate, balance: m.deposit - (m.totalMeals * mealRate) }));
    return { totalCost, totalMeals, mealRate, report };
  }, [members, filteredExpenses, filteredMeals]);

  const sortedMembers = useMemo(() => {
    if (!profile || !members.length) return members;
    const me = members.find(m => m.id === profile.id);
    const others = members.filter(m => m.id !== profile.id);
    return me ? [me, ...others] : members;
  }, [members, profile]);

  const mealLookup = useMemo(() => {
    const m = {};
    meals.forEach(x => { m[`${x.user_id}_${x.date}_${x.meal_type}`] = x; });
    return m;
  }, [meals]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleChartToggle = async (day, member, type) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const lookupKey = `${member.id}_${dateStr}_${type}`;
    const existing = mealLookup[lookupKey];
    const isSelf = member.id === profile.id;
    const actorName = profile.full_name;
    const targetName = isSelf ? 'Self' : member.full_name;

    setSelectedCell(lookupKey);

    if (existing) {
      setConfirmModal({
        message: `Delete ${targetName}'s ${type} meal?`,
        yesLabel: 'Delete',
        onConfirm: async () => {
          setMeals(prev => { const n = prev.filter(m => m.id !== existing.id); updateCache(CACHE_KEYS.MEALS, n); return n; });
          await logActivity('DELETED', `${actorName} deleted ${targetName}'s ${type} meal on ${dateStr}`);
          if (isOnline) {
            try {
              await apiClient.delete(`/meals/delete/${existing.id}`);
            } catch(e) {
              console.error("Delete meal error:", e);
            }
          }
          showToast('Deleted');
          setSelectedCell(null);
          setConfirmModal(null);
        }
      });
    } else {
      setConfirmModal({
        message: `Add 1 ${type} meal for ${targetName}?`,
        yesLabel: 'Add',
        onConfirm: async () => {
          const tempId = 'temp-' + Date.now();
          const newMeal = { id: tempId, user_id: member.id, mess_id: profile.mess_id, date: dateStr, count: 1, meal_type: type };
          setMeals(prev => { const n = [...prev, newMeal]; updateCache(CACHE_KEYS.MEALS, n); return n; });
          await logActivity('ADDED', `${actorName} added 1 ${type} meal for ${targetName} on ${dateStr}`);
          if (isOnline) {
            try {
              const response = await apiClient.post('/meals/add', { user_id: member.id, mess_id: profile.mess_id, date: dateStr, count: 1, meal_type: type });
              if (response.data) setMeals(prev => { const n = prev.map(m => m.id === tempId ? response.data : m); updateCache(CACHE_KEYS.MEALS, n); return n; });
            } catch (e) {
              console.error("Add meal error:", e);
            }
          }
          showToast('Added');
          setSelectedCell(null);
          setConfirmModal(null);
        }
      });
    }
  };

  return (
    <div className={`flex flex-col h-[100dvh] w-full transition-colors duration-300 overflow-hidden ${darkMode ? 'app-dark bg-slate-900' : 'app-light bg-slate-50'}`}>
      
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-2 left-2 right-2 z-50 flex justify-center ${isNotifExiting ? 'exiting' : ''} notch-notification`}>
          <div onClick={() => { setActiveTab('chat'); setNotification(null); }} className={`flex items-center gap-3 p-3 pr-4 rounded-[2rem] shadow-2xl border cursor-pointer backdrop-blur-xl transition-all active:scale-95 ${darkMode ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white/95 border-slate-200 text-slate-800'} max-w-[95%] w-auto min-w-[300px]`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg text-white"><i className="fa-solid fa-bowl-food text-lg"></i></div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h4 className="font-bold text-sm truncate pr-2">{getMemberName(notification.senderId)}</h4>
                <span className="text-[10px] opacity-60 uppercase font-bold tracking-wider">Now</span>
              </div>
              <p className="text-xs opacity-90 truncate">{notification.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`flex-none z-20 px-5 py-4 flex justify-between items-center backdrop-blur-xl pt-safe shadow-sm ${darkMode ? 'bg-slate-900/80 border-b border-slate-700' : 'bg-white/80 border-b border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <i className="fa-solid fa-house"></i>
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight">{messDetails?.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">PIN: {showPin ? messDetails?.pin : '****'}</p>
              <button onClick={() => setShowPin(!showPin)} className="text-xs opacity-50 hover:opacity-100 transition-opacity p-1">
                <i className={`fa-solid ${showPin ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className={`w-2.5 h-2.5 rounded-full mr-2 shadow-sm ${connStatus === 'connected' ? 'bg-emerald-500 shadow-emerald-500/50' : connStatus === 'connecting' ? 'bg-amber-500 animate-pulse shadow-amber-500/50' : 'bg-rose-500 shadow-rose-500/50'}`} title={`Status: ${connStatus}`}></div>
          <button onClick={() => setDarkMode(!darkMode)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${darkMode ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'bg-white text-slate-600 border border-slate-200 shadow-sm'}`}>
            <i className={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
          <button onClick={() => setShowSettings(true)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${darkMode ? 'bg-slate-800 text-indigo-400 border border-slate-700' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'}`}>
            <i className="fa-solid fa-gear"></i>
          </button>
          <button onClick={() => { setConfirmModal({ message: 'Log out?', onConfirm: () => { setConfirmModal(null); localStorage.clear(); supabase.auth.signOut().catch(()=>{}); window.location.reload(); } }); }} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${darkMode ? 'bg-slate-800 text-rose-400 border border-slate-700' : 'bg-rose-50 text-rose-500 border border-rose-100 shadow-sm'}`}>
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </header>

      <SettingsTab 
        showSettings={showSettings} 
        setShowSettings={setShowSettings}
        darkMode={darkMode}
        messDetails={messDetails}
        setMessDetails={setMessDetails}
        members={members}
        setMembers={setMembers}
        session={session}
        profile={profile}
        setMeals={setMeals}
        fetchAllDataCallback={fetchAllDataCallback}
        logActivity={logActivity}
        showToast={showToast}
        isOnline={isOnline}
        currentDate={currentDate}
        monthName={monthName}
        isSameMonth={isSameMonth}
      />

      <main 
        ref={mainRef} 
        className={`flex-1 overscroll-contain no-scrollbar scroll-smooth ${activeTab === 'chat' ? 'overflow-hidden flex flex-col p-2 pb-[60px]' : 'overflow-y-auto p-4 space-y-6 pb-32'}`}
      >
        {isRefreshing && (
          <div className="flex justify-center items-center py-2 transition-all duration-200">
            <div className="flex items-center gap-2 bg-emerald-500/90 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs font-bold shadow-lg animate-pulse">
              <i className="fa-solid fa-check-circle"></i> Refreshed!
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <HomeTab 
            profile={profile}
            monthName={monthName}
            stats={stats}
            darkMode={darkMode}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            sortedMembers={sortedMembers}
            daysInMonth={daysInMonth}
            mealLookup={mealLookup}
            selectedCell={selectedCell}
            setSelectedCell={setSelectedCell}
            handleChartToggle={handleChartToggle}
          />
        )}

        {activeTab === 'logs' && (
          <LogsTab 
            filteredLogs={filteredLogs}
            darkMode={darkMode}
            monthName={monthName}
          />
        )}

        {activeTab === 'meals' && (
          <MealTab 
            session={session}
            profile={profile}
            filteredMeals={filteredMeals}
            setMeals={setMeals}
            logActivity={logActivity}
            isOnline={isOnline}
            showToast={showToast}
            deleteItem={deleteItem}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'bazar' && (
          <BazarTab 
            members={members}
            session={session}
            profile={profile}
            filteredExpenses={filteredExpenses}
            setExpenses={setExpenses}
            getMemberName={getMemberName}
            logActivity={logActivity}
            isOnline={isOnline}
            showToast={showToast}
            deleteItem={deleteItem}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'chat' && (
          <ChatTab 
            messages={messages}
            setMessages={setMessages}
            session={session}
            profile={profile}
            getMemberName={getMemberName}
            isOnline={isOnline}
            showToast={showToast}
            darkMode={darkMode}
            chatBottomRef={chatBottomRef}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 z-30 pb-safe ${darkMode ? 'bg-slate-900/95 border-t border-slate-800' : 'bg-slate-50/95 border-t border-slate-200'}`} style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
        <div className="flex justify-around items-end h-[55px] max-w-xl mx-auto px-1 pb-1">
          {[
            { id: 'home', icon: 'fa-chart-pie', label: 'Home', activeClass: 'text-indigo-600 dark:text-indigo-400' },
            { id: 'meals', icon: 'fa-utensils', label: 'Meal', activeClass: 'text-emerald-600 dark:text-emerald-400' },
            { id: 'bazar', icon: 'fa-cart-shopping', label: 'Bazar', activeClass: 'text-orange-600 dark:text-orange-400' },
            { id: 'chat', icon: 'fa-message', label: 'Chat', activeClass: 'text-sky-600 dark:text-sky-400' },
            { id: 'logs', icon: 'fa-clock-rotate-left', label: 'Logs', activeClass: 'text-cyan-600 dark:text-cyan-400' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`flex flex-col items-center justify-center w-full h-full transition-colors active:scale-95 ${isActive ? tab.activeClass : 'text-slate-400 dark:text-slate-500 hover:text-slate-500'}`}
              >
                <i className={`fa-solid ${tab.icon} ${isActive ? 'text-[20px] mb-1' : 'text-[18px] mb-1'}`}></i>
                <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'opacity-100' : 'opacity-80'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast & Confirm Modal */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl text-white text-sm font-bold flex items-center gap-3 fade-in z-50 backdrop-blur-md transition-all ${toast.type === 'error' ? 'bg-rose-500/90 shadow-rose-500/30' : 'bg-emerald-500/90 shadow-emerald-500/30'}`}>
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {toast.message}
        </div>
      )}
      
      {confirmModal && !showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md fade-in">
          <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl ${darkMode ? 'bg-slate-800/90 border border-slate-700' : 'bg-white/90 border border-slate-200'} backdrop-blur-xl scale-up`}>
            <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
            <p className="opacity-70 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className={`flex-1 py-3 rounded-xl font-bold transition-all active:scale-95 ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>{confirmModal.noLabel || 'Cancel'}</button>
              <button onClick={confirmModal.onConfirm} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${confirmModal.yesLabel === 'Delete' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}>{confirmModal.yesLabel || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
