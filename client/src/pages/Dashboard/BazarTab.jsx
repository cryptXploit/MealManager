import React, { useState } from 'react';
import apiClient from '../../services/apiClient';
import { formatMoney } from '../../utils/helpers';

const BazarTab = ({
  members,
  session,
  profile,
  filteredExpenses,
  setExpenses,
  getMemberName,
  logActivity,
  isOnline,
  showToast,
  deleteItem,
  darkMode
}) => {
  const [expenseInput, setExpenseInput] = useState({ 
    item: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0], 
    forUserId: session?.user?.id || '' 
  });

  const addExpense = async () => {
    if (!expenseInput.item) return;
    const val = Number(expenseInput.amount);
    const targetUserId = expenseInput.forUserId || session.user.id;
    const tempId = 't' + Date.now();
    
    const nx = { 
      id: tempId, 
      user_id: targetUserId, 
      mess_id: profile.mess_id, 
      item: expenseInput.item, 
      amount: val, 
      date: expenseInput.date, 
      created_at: new Date().toISOString() 
    };
    
    setExpenses(p => [nx, ...p]);
    setExpenseInput({ item: '', amount: '', date: expenseInput.date, forUserId: targetUserId });
    
    logActivity('ADDED', `Bazar: ${expenseInput.item} (${val}) for ${getMemberName(targetUserId)}`);
    
    if (isOnline) {
      try {
        const response = await apiClient.post('/expenses/add', { 
          user_id: targetUserId, 
          mess_id: profile.mess_id, 
          item: expenseInput.item, 
          amount: val, 
          date: expenseInput.date 
        });
        
        if (response.data) {
          setExpenses(p => p.map(e => e.id === tempId ? response.data : e));
        }
      } catch (error) {
        console.error("Insert expense error:", error);
        showToast(`Failed to add expense: ${error.response?.data?.error || error.message}`, 'error');
        setExpenses(p => p.filter(e => e.id !== tempId)); // revert
      }
    }
  };

  return (
    <div className="fade-in pb-8">
      <div className={`p-6 rounded-3xl border mb-6 backdrop-blur-xl shadow-lg ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
        <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
          <i className="fa-solid fa-cart-shopping text-orange-500"></i> Add Expense
        </h2>
        
        <div className="mb-4">
          <label className="text-xs font-bold uppercase opacity-60 mb-2 block tracking-wider">Who Paid?</label>
          <div className="relative">
            <select 
              className={`w-full p-4 rounded-xl border bg-transparent outline-none font-bold appearance-none focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'border-slate-600 bg-slate-800/50' : 'border-slate-300 bg-white/50'}`} 
              value={expenseInput.forUserId} 
              onChange={e => setExpenseInput({...expenseInput, forUserId: e.target.value})}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name} {m.id === session.user.id ? '(You)' : ''}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <i className="fa-solid fa-chevron-down"></i>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="text-xs font-bold uppercase opacity-60 mb-2 block tracking-wider">Item Details</label>
          <input 
            type="text" 
            placeholder="Item Name (e.g. Rice, Oil)" 
            className={`w-full p-4 rounded-xl border bg-transparent focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'border-slate-600' : 'border-slate-300'}`} 
            value={expenseInput.item} 
            onChange={e => setExpenseInput({...expenseInput, item: e.target.value})} 
          />
        </div>
        
        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase opacity-60 mb-2 block tracking-wider">Date</label>
            <input 
              type="date" 
              className={`w-full p-4 rounded-xl border bg-transparent focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'border-slate-600' : 'border-slate-300'}`} 
              value={expenseInput.date} 
              onChange={e => setExpenseInput({...expenseInput, date: e.target.value})} 
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold uppercase opacity-60 mb-2 block tracking-wider">Amount</label>
            <input 
              type="number" 
              placeholder="Cost" 
              className={`w-full p-4 rounded-xl border bg-transparent font-bold focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'border-slate-600' : 'border-slate-300'}`} 
              value={expenseInput.amount} 
              onChange={e => setExpenseInput({...expenseInput, amount: e.target.value})} 
            />
          </div>
        </div>
        
        <button 
          onClick={addExpense} 
          className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 active:scale-95 text-white py-4 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-plus"></i> Save Expense
        </button>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-sm font-bold opacity-70 px-2 uppercase tracking-wider">Recent Expenses</h3>
        {filteredExpenses.length === 0 && (
          <div className="text-center opacity-50 py-4 text-sm">No expenses logged for this month.</div>
        )}
        {filteredExpenses.slice(0, 10).map((e, i) => (
          <div 
            key={e.id} 
            className={`flex justify-between items-center p-4 rounded-2xl border backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-md ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center">
                <i className="fa-solid fa-bag-shopping"></i>
              </div>
              <div>
                <div className="text-sm font-bold">{e.item}</div>
                <div className="text-[10px] opacity-60 flex items-center gap-1 mt-0.5">
                  <i className="fa-solid fa-user text-[8px]"></i> {getMemberName(e.user_id)} • {e.date}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-orange-500 text-lg">{formatMoney(e.amount)}</span>
              {e.user_id === session.user.id && (
                <button 
                  onClick={() => deleteItem('expenses', e.id, e.user_id, `Bazar: ${e.item}`)} 
                  className="text-rose-400 p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors active:scale-90"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BazarTab;
