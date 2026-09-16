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
    <div className="fade-in pb-8">
      <div className={`p-6 rounded-3xl border text-center mb-6 backdrop-blur-xl shadow-lg ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
        <h2 className="text-xl font-bold mb-5 flex items-center justify-center gap-2">
          <i className="fa-solid fa-utensils text-emerald-500"></i> Log Manual Meals
        </h2>
        
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase opacity-60 mb-2 block tracking-wider text-left">Date</label>
            <input 
              type="date" 
              className={`w-full p-4 rounded-xl border bg-transparent focus:ring-2 focus:ring-emerald-500 transition-all ${darkMode ? 'border-slate-600' : 'border-slate-300'}`} 
              value={mealInput.date} 
              onChange={e => setMealInput({...mealInput, date: e.target.value})} 
            />
          </div>
          <div className="w-1/3">
            <label className="text-xs font-bold uppercase opacity-60 mb-2 block tracking-wider text-left">Type</label>
            <div className="relative">
              <select 
                className={`w-full p-4 rounded-xl border bg-transparent outline-none font-bold appearance-none focus:ring-2 focus:ring-emerald-500 transition-all ${darkMode ? 'border-slate-600 bg-slate-800/50' : 'border-slate-300 bg-white/50'}`} 
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
        
        <div className="mb-6">
          <label className="text-xs font-bold uppercase opacity-60 mb-2 block tracking-wider text-left">Meal Count</label>
          <input 
            type="number" 
            placeholder="e.g. 1 or 0.5" 
            step="0.5" 
            className={`w-full p-4 text-center rounded-xl border bg-transparent font-bold text-xl focus:ring-2 focus:ring-emerald-500 transition-all ${darkMode ? 'border-slate-600' : 'border-slate-300'}`} 
            value={mealInput.count} 
            onChange={e => setMealInput({...mealInput, count: e.target.value})} 
          />
        </div>
        
        <button 
          onClick={addMeal} 
          className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-check"></i> Confirm Meal
        </button>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-sm font-bold opacity-70 px-2 uppercase tracking-wider">Recent Meals</h3>
        {filteredMeals.filter(m => m.user_id === session.user.id).length === 0 && (
          <div className="text-center opacity-50 py-4 text-sm">No meals logged for you this month.</div>
        )}
        {filteredMeals.filter(m => m.user_id === session.user.id).slice(0, 10).map((m, i) => (
          <div 
            key={m.id} 
            className={`flex justify-between items-center p-4 rounded-2xl border backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-md ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.meal_type === 'D' ? 'bg-amber-100 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-indigo-100 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                <i className={`fa-solid ${m.meal_type === 'D' ? 'fa-sun' : 'fa-moon'}`}></i>
              </div>
              <div>
                <span className="font-bold block text-sm">{m.date}</span>
                <span className="text-[10px] opacity-60 uppercase tracking-wider">{m.meal_type === 'D' ? 'Day' : 'Night'} Meal</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg">{m.count}</span>
              <button 
                onClick={() => deleteItem('meals', m.id, m.user_id, `Meal: ${m.count}`)} 
                className="text-rose-400 p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors active:scale-90"
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealTab;
