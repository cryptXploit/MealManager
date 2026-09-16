import React, { useState } from 'react';
import apiClient from '../../services/apiClient';
import { supabase } from '../../services/supabaseClient';

const SettingsTab = ({ 
  showSettings, 
  setShowSettings, 
  darkMode, 
  messDetails, 
  members, 
  session,
  profile,
  setMembers,
  setMeals,
  setMessDetails,
  fetchAllDataCallback,
  logActivity,
  showToast,
  isOnline,
  currentDate,
  monthName,
  isSameMonth
}) => {
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);

  if (!showSettings) return null;

  const handleUpdatePin = async () => {
    if (!isOnline || !newPin || newPin.length < 4) return showToast('Invalid PIN', 'error');
    try {
      const response = await apiClient.post('/settings/update-pin', { messId: profile.mess_id, newPin });
      if (response.data.mess || response.status === 200 || response.data.success) {
        setMessDetails(prev => ({ ...prev, pin: newPin }));
        setNewPin('');
        logActivity('SETTINGS', 'Changed PIN');
        showToast('PIN updated successfully');
      } else {
        showToast('Failed to update PIN', 'error');
      }
    } catch (err) {
      console.error('Update pin error:', err);
      showToast(err.response?.data?.error || 'Server error', 'error');
    }
  };

  const handleKickMember = (m) => {
    if (!isOnline) return showToast('Offline', 'error');
    setConfirmModal({
      message: `Kick ${m.full_name}?`,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/settings/kick/${m.id}`);
          setMembers(prev => prev.filter(x => x.id !== m.id));
          logActivity('REMOVED', `Kicked ${m.full_name}`);
          setConfirmModal(null);
          showToast('Member removed');
        } catch (err) {
          console.error('Kick error:', err);
          showToast(err.response?.data?.error || 'Error removing member', 'error');
        }
      }
    });
  };

  const handleAddMemberByEmail = async () => {
    if (!isOnline || !addMemberEmail) return;
    const { data } = await supabase.from('profiles').select('*').eq('email', addMemberEmail).single();
    if (data && !data.mess_id) {
      await supabase.from('profiles').update({ mess_id: profile.mess_id }).eq('id', data.id);
      logActivity('ADDED', `Added ${data.full_name}`);
      setAddMemberEmail('');
      showToast('Added');
      fetchAllDataCallback();
    } else showToast('User not found or already in a mess', 'error');
  };

  const handleResetChart = () => {
    if (!isOnline) return showToast('Offline', 'error');
    setConfirmModal({
      message: 'Reset Chart? This will delete all meals for the current month.',
      onConfirm: async () => {
        const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        try {
          await apiClient.post('/settings/reset-chart', { messId: profile.mess_id, yearMonth });
          setMeals(prev => prev.filter(m => !isSameMonth(m.date, currentDate)));
          await logActivity('RESET', `Reset chart for ${monthName}`);
          showToast('Chart reset successfully');
          setConfirmModal(null);
        } catch (err) {
          console.error('Reset chart error:', err);
          showToast(err.response?.data?.error || 'Error resetting chart', 'error');
        }
      }
    });
  };

  const requestNotifyPermission = () => {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') showToast('System Notifications Active');
      else showToast('Permission Denied', 'error');
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex md:items-center justify-center bg-slate-100/80 dark:bg-black/60 backdrop-blur-md fade-in transition-all duration-300" onClick={() => setShowSettings(false)}>
        <div className={`w-full md:w-full md:max-w-lg h-full md:h-auto md:max-h-[85vh] md:rounded-3xl shadow-2xl flex flex-col slide-up overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} md:border`} onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-4 md:px-6 md:py-5 border-b sticky top-0 z-10 backdrop-blur-xl ${darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80'}`}>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Settings</h2>
            <button onClick={() => setShowSettings(false)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain smooth-scroll p-4 md:p-6 pb-24 md:pb-6">
            
            {/* Group Info Card */}
            <div className={`p-5 rounded-3xl mb-6 shadow-sm border transition-all ${darkMode ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/30">
                  {messDetails?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{messDetails?.name}</h3>
                  <p className="text-sm opacity-60">Meal Manager Group</p>
                </div>
              </div>
              <div className={`flex justify-between items-center p-3 rounded-2xl ${darkMode ? 'bg-black/20' : 'bg-slate-50'}`}>
                <div>
                  <p className="text-xs uppercase font-bold opacity-50 mb-0.5">Invite PIN</p>
                  <p className="font-mono font-bold tracking-widest text-indigo-500">{messDetails?.pin}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(`Join Mess: ${messDetails?.name} | PIN: ${messDetails?.pin}`); showToast('Copied to clipboard'); }} className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-600 active:scale-95 transition-all">Copy</button>
              </div>
            </div>

            <p className="px-2 text-xs font-bold uppercase opacity-50 mb-2 mt-4">Group Management</p>
            <div className={`rounded-3xl overflow-hidden shadow-sm border mb-6 ${darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200/60'}`}>
              
              {/* Change PIN */}
              <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center gap-3 ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3 w-full sm:w-1/2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-sm"><i className="fa-solid fa-key"></i></div>
                  <span className="font-medium">Change PIN</span>
                </div>
                <div className="flex gap-2 w-full sm:w-1/2">
                  <input type="text" placeholder="New PIN" className={`flex-1 min-w-0 p-2 rounded-xl text-sm bg-transparent border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${darkMode ? 'border-slate-600' : 'border-slate-200'}`} value={newPin} onChange={e => setNewPin(e.target.value)} />
                  <button onClick={handleUpdatePin} className="px-4 bg-blue-500 text-white rounded-xl font-bold text-sm active:scale-95 transition-all">Save</button>
                </div>
              </div>

              {/* Add Member */}
              <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center gap-3 ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3 w-full sm:w-1/2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm"><i className="fa-solid fa-user-plus"></i></div>
                  <span className="font-medium">Add Member</span>
                </div>
                <div className="flex gap-2 w-full sm:w-1/2">
                  <input type="email" placeholder="Email" className={`flex-1 min-w-0 p-2 rounded-xl text-sm bg-transparent border focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${darkMode ? 'border-slate-600' : 'border-slate-200'}`} value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)} />
                  <button onClick={handleAddMemberByEmail} className="px-4 bg-emerald-500 text-white rounded-xl font-bold text-sm active:scale-95 transition-all">Add</button>
                </div>
              </div>

              {/* Notifications */}
              <button onClick={requestNotifyPermission} className="w-full p-4 flex items-center justify-between text-left active:bg-slate-500/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm"><i className="fa-solid fa-bell"></i></div>
                  <span className="font-medium">Enable Notifications</span>
                </div>
                <i className="fa-solid fa-chevron-right opacity-30 text-sm"></i>
              </button>
            </div>

            <p className="px-2 text-xs font-bold uppercase opacity-50 mb-2 flex justify-between">
              <span>Members</span>
              <span>{members.length}</span>
            </p>
            <div className={`rounded-3xl overflow-hidden shadow-sm border mb-6 ${darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200/60'}`}>
              {members.map((m, idx) => (
                <div key={m.id} className={`flex items-center justify-between p-3 sm:p-4 ${idx !== members.length - 1 ? (darkMode ? 'border-b border-slate-700/50' : 'border-b border-slate-100') : ''}`}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-sm font-bold shadow-inner">
                      {m.full_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{m.full_name} {m.id === session.user.id && <span className="text-indigo-500">(You)</span>}</p>
                      <p className="text-xs opacity-50 truncate">{m.email || 'No email'}</p>
                    </div>
                  </div>
                  {m.id !== session.user.id && (
                    <button onClick={() => handleKickMember(m)} className="shrink-0 ml-2 w-8 h-8 flex items-center justify-center text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-full transition-colors active:scale-90">
                      <i className="fa-solid fa-user-minus text-xs"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className="px-2 text-xs font-bold uppercase text-rose-500 opacity-80 mb-2 mt-8">Danger Zone</p>
            <div className={`rounded-3xl overflow-hidden shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200/60'}`}>
              <button onClick={handleResetChart} className="w-full p-4 flex items-center justify-between text-left active:bg-rose-500/10 transition-colors group">
                <div className="flex items-center gap-3 text-rose-500">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center transition-colors"><i className="fa-solid fa-trash-can"></i></div>
                  <div>
                    <span className="font-bold block">Reset Monthly Chart</span>
                    <span className="text-[10px] opacity-70">Delete all meal entries for this month</span>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-rose-500 opacity-50 text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
          <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} scale-up`}>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center text-xl mb-4 mx-auto">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 className="text-lg font-bold text-center mb-2">Confirm Action</h3>
            <p className="opacity-70 text-center text-sm mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className={`flex-1 py-3 rounded-xl font-bold transition-all active:scale-95 ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{confirmModal.noLabel || 'Cancel'}</button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition-all active:scale-95">{confirmModal.yesLabel || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsTab;

