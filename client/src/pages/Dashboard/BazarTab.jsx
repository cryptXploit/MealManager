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
    <div className="fade-in pb-4">
      <div className={`p-4 rounded-3xl border mb-4 shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <i className="fa-solid fa-cart-shopping text-orange-500"></i> Add Expense
        </h2>
        
        <div className="mb-3">
          <label className="text-[10px] font-bold uppercase opacity-60 mb-1 block tracking-wider">Who Paid?</label>
          <div className="relative">
            <select 
              className={`w-full p-2.5 rounded-xl text-sm border bg-transparent outline-none font-bold appearance-none focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`} 
              value={expenseInput.forUserId} 
              onChange={e => setExpenseInput({...expenseInput, forUserId: e.target.value})}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name} {m.id === session.user.id ? '(You)' : ''}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <i className="fa-solid fa-chevron-down text-xs"></i>
            </div>
          </div>
        </div>
        
        <div className="mb-3">
          <label className="text-[10px] font-bold uppercase opacity-60 mb-1 block tracking-wider">Item Details</label>
          <input 
            type="text" 
            placeholder="Item Name (e.g. Rice, Oil)" 
            className={`w-full p-2.5 rounded-xl text-sm border bg-transparent focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} 
            value={expenseInput.item} 
            onChange={e => setExpenseInput({...expenseInput, item: e.target.value})} 
          />
        </div>
        
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase opacity-60 mb-1 block tracking-wider">Date</label>
            <input 
              type="date" 
              className={`w-full p-2.5 rounded-xl text-sm border bg-transparent focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} 
              value={expenseInput.date} 
              onChange={e => setExpenseInput({...expenseInput, date: e.target.value})} 
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase opacity-60 mb-1 block tracking-wider">Amount</label>
            <input 
              type="number" 
              placeholder="Cost" 
              className={`w-full p-2.5 rounded-xl text-sm border bg-transparent font-bold focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} 
              value={expenseInput.amount} 
              onChange={e => setExpenseInput({...expenseInput, amount: e.target.value})} 
            />
          </div>
        </div>
        
        <button 
          onClick={addExpense} 
          className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-plus"></i> Save Expense
        </button>
      </div>
      
      <div className={`rounded-3xl border overflow-hidden shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-[10px] font-bold opacity-60 uppercase tracking-wider p-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>Recent Expenses</h3>
        {filteredExpenses.length === 0 && (
          <div className="text-center opacity-50 py-4 text-xs">No expenses logged for this month.</div>
        )}
        <div className="divide-y dark:divide-slate-700 divide-slate-100">
          {filteredExpenses.slice(0, 10).map((e, i) => (
            <div 
              key={e.id} 
              className={`flex justify-between items-center p-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center">
                  <i className="fa-solid fa-bag-shopping text-xs"></i>
                </div>
                <div>
                  <div className="text-xs font-bold">{e.item}</div>
                  <div className="text-[9px] opacity-60 flex items-center gap-1 mt-0.5">
                    <i className="fa-solid fa-user text-[8px]"></i> {getMemberName(e.user_id)} • {e.date}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-orange-500 text-sm">{formatMoney(e.amount)}</span>
                {e.user_id === session.user.id && (
                  <button 
                    onClick={() => deleteItem('expenses', e.id, e.user_id, `Bazar: ${e.item}`)} 
                    className="text-rose-500 bg-rose-500/10 w-7 h-7 flex items-center justify-center rounded-full hover:bg-rose-500 hover:text-white transition-colors active:scale-90"
                  >
                    <i className="fa-solid fa-trash-can text-[10px]"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BazarTab;
