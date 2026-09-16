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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm fade-in" onClick={() => setShowSettings(false)}>
        <div className={`w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl slide-up overflow-hidden flex flex-col max-h-[90vh] ${darkMode ? 'bg-slate-900/90 backdrop-blur-xl border-t border-slate-700' : 'bg-white/90 backdrop-blur-xl'}`} onClick={e => e.stopPropagation()}>
          <div className="w-full flex justify-center pt-3 pb-1"><div className="w-12 h-1.5 rounded-full bg-slate-300/50"></div></div>
          <div className="p-6 overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><i className="fa-solid fa-users-gear text-indigo-500"></i> Group Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity active:scale-90">&times;</button>
            </div>
            
            <div className={`p-4 rounded-xl mb-6 backdrop-blur-md shadow-sm ${darkMode ? 'bg-slate-800/50' : 'bg-indigo-50/80'}`}>
              <p className="text-xs font-bold uppercase opacity-50 mb-1">Invite Info</p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold">Group: {messDetails?.name}</p>
                  <p className="text-sm font-mono opacity-80">PIN: {messDetails?.pin}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(`Join Mess: ${messDetails?.name} | PIN: ${messDetails?.pin}`); showToast('Copied Info'); }} className="text-2xl text-indigo-500 hover:scale-110 active:scale-95 transition-transform"><i className="fa-solid fa-copy"></i></button>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="text-xs font-bold uppercase opacity-50 mb-2 block">Add Member by Email</label>
              <div className="flex gap-2">
                <input type="email" placeholder="friend@gmail.com" className={`flex-1 p-3 rounded-xl border bg-transparent focus:ring-2 focus:ring-indigo-500 transition-all ${darkMode ? 'border-slate-700' : 'border-slate-300'}`} value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)} />
                <button onClick={handleAddMemberByEmail} className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all"><i className="fa-solid fa-user-plus"></i></button>
              </div>
              <p className="text-[10px] opacity-50 mt-1">User must have signed up in this app first.</p>
            </div>
            
            <div className="mb-6">
              <label className="text-xs font-bold uppercase opacity-50 mb-2 block">Update PIN</label>
              <div className="flex gap-2">
                <input type="text" placeholder="New PIN" className={`flex-1 p-3 rounded-xl border bg-transparent focus:ring-2 focus:ring-indigo-500 transition-all ${darkMode ? 'border-slate-700' : 'border-slate-300'}`} value={newPin} onChange={e => setNewPin(e.target.value)} />
                <button onClick={handleUpdatePin} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all">Update</button>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="text-xs font-bold uppercase opacity-50 mb-2 block">Notifications</label>
              <button onClick={requestNotifyPermission} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"><i className="fa-solid fa-bell"></i> Enable System Notifications</button>
            </div>
            
            <div className="mb-6">
              <label className="text-xs font-bold uppercase opacity-50 mb-2 block">Members ({members.length})</label>
              <div className={`max-h-48 overflow-y-auto rounded-xl border no-scrollbar backdrop-blur-md ${darkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white/40'}`}>
                {members.map(m => (
                  <div key={m.id} className={`flex justify-between items-center p-3 border-b last:border-0 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{m.full_name[0]}</div>
                      <div>
                        <span className="text-sm font-bold block">{m.full_name} {m.id === session.user.id && '(You)'}</span>
                        <span className="text-[10px] opacity-50">{m.email || 'No Email'}</span>
                      </div>
                    </div>
                    {m.id !== session.user.id && (
                      <button onClick={() => handleKickMember(m)} className="text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 p-2 rounded-lg transition-all active:scale-90"><i className="fa-solid fa-user-minus"></i></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className={`mt-4 pt-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <label className="text-xs font-bold uppercase opacity-50 mb-3 flex items-center gap-2 text-rose-500"><i className="fa-solid fa-triangle-exclamation"></i> Danger Zone</label>
              <button onClick={handleResetChart} className="w-full py-4 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"><i className="fa-solid fa-trash-can"></i> Reset Monthly Chart</button>
              <p className="text-[10px] text-center mt-2 opacity-40">This will delete all meal entries for the current month.</p>
            </div>
          </div>
        </div>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md fade-in">
          <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl ${darkMode ? 'bg-slate-800/90 border border-slate-700' : 'bg-white/90 border border-slate-200'} backdrop-blur-xl scale-up`}>
            <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
            <p className="opacity-70 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className={`flex-1 py-3 rounded-xl font-bold transition-all active:scale-95 ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>{confirmModal.noLabel || 'Cancel'}</button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 transition-all active:scale-95">{confirmModal.yesLabel || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsTab;
