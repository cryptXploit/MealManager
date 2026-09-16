import React, { useState } from 'react';
import apiClient from '../../services/apiClient';

const MealTab = ({
  session,
  profile,
  filteredMeals,
  setMeals,
  logActivity,
  isOnline,
  showToast,
  deleteItem,
  darkMode
}) => {
  const [mealInput, setMealInput] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    count: '', 
    type: 'D' 
  });

  const addMeal = async () => {
    if (!mealInput.count) return;
    const countVal = Number(mealInput.count);
    const tempId = 'temp-' + Date.now();
    
    const newMeal = { 
      id: tempId, 
      user_id: session.user.id, 
      mess_id: profile.mess_id, 
      date: mealInput.date, 
      count: countVal, 
      meal_type: mealInput.type 
    };
    
    setMeals(prev => { 
      const n = [newMeal, ...prev].sort((a,b) => new Date(b.date) - new Date(a.date)); 
      return n; 
    });
    
    setMealInput(p => ({ ...p, count: '' }));
    logActivity('ADDED', `Self Add: ${countVal} (${mealInput.type}) for ${mealInput.date}`);
    
    if (isOnline) {
      try {
        const response = await apiClient.post('/meals/add', { 
          user_id: session.user.id, 
          mess_id: profile.mess_id, 
          date: mealInput.date, 
          count: countVal, 
          meal_type: mealInput.type 
        });
        
        if (response.data) {
          setMeals(prev => prev.map(m => m.id === tempId ? response.data : m));
        }
      } catch (error) {
        console.error("Insert meal error:", error);
        showToast(`Failed to add meal: ${error.response?.data?.error || error.message}`, 'error');
        setMeals(prev => prev.filter(m => m.id !== tempId)); // revert
      }
    }
  };

  return (
    <div className="fade-in pb-4">
      <div className={`p-4 rounded-3xl border mb-4 shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h2 className="text-lg font-bold mb-4 flex items-center justify-center gap-2">
          <i className="fa-solid fa-utensils text-emerald-500"></i> Log Manual Meals
        </h2>
        
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase opacity-60 mb-1 block tracking-wider text-left">Date</label>
            <input 
              type="date" 
              className={`w-full p-2.5 rounded-xl text-sm border bg-transparent focus:ring-2 focus:ring-emerald-500 transition-all ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} 
              value={mealInput.date} 
              onChange={e => setMealInput({...mealInput, date: e.target.value})} 
            />
          </div>
          <div className="w-1/3">
            <label className="text-[10px] font-bold uppercase opacity-60 mb-1 block tracking-wider text-left">Type</label>
            <div className="relative">
              <select 
                className={`w-full p-2.5 rounded-xl text-sm border bg-transparent outline-none font-bold appearance-none focus:ring-2 focus:ring-emerald-500 transition-all ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`} 
                value={mealInput.type} 
                onChange={e => setMealInput({...mealInput, type: e.target.value})}
              >
                <option value="D">Day</option>
                <option value="N">Night</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <i className="fa-solid fa-chevron-down text-xs"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="text-[10px] font-bold uppercase opacity-60 mb-1 block tracking-wider text-left">Meal Count</label>
          <input 
            type="number" 
            placeholder="e.g. 1 or 0.5" 
            step="0.5" 
            className={`w-full p-2.5 text-center rounded-xl text-sm border bg-transparent font-bold focus:ring-2 focus:ring-emerald-500 transition-all ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} 
            value={mealInput.count} 
            onChange={e => setMealInput({...mealInput, count: e.target.value})} 
          />
        </div>
        
        <button 
          onClick={addMeal} 
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-check"></i> Confirm Meal
        </button>
      </div>
      
      <div className={`rounded-3xl border overflow-hidden shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-[10px] font-bold opacity-60 uppercase tracking-wider p-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>Recent Meals</h3>
        {filteredMeals.filter(m => m.user_id === session.user.id).length === 0 && (
          <div className="text-center opacity-50 py-4 text-xs">No meals logged for you this month.</div>
        )}
        <div className="divide-y dark:divide-slate-700 divide-slate-100">
          {filteredMeals.filter(m => m.user_id === session.user.id).slice(0, 10).map((m, i) => (
            <div 
              key={m.id} 
              className={`flex justify-between items-center p-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.meal_type === 'D' ? 'bg-amber-100 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-indigo-100 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                  <i className={`fa-solid ${m.meal_type === 'D' ? 'fa-sun text-xs' : 'fa-moon text-xs'}`}></i>
                </div>
                <div>
                  <span className="font-bold block text-xs">{m.date}</span>
                  <span className="text-[9px] opacity-60 uppercase tracking-wider">{m.meal_type === 'D' ? 'Day' : 'Night'} Meal</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">{m.count}</span>
                <button 
                  onClick={() => deleteItem('meals', m.id, m.user_id, `Meal: ${m.count}`)} 
                  className="text-rose-500 bg-rose-500/10 w-7 h-7 flex items-center justify-center rounded-full hover:bg-rose-500 hover:text-white transition-colors active:scale-90"
                >
                  <i className="fa-solid fa-trash-can text-[10px]"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MealTab;
