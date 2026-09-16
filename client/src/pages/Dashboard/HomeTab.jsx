import React, { useState, useEffect, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import { formatMoney } from '../../utils/helpers';
import apiClient from '../../services/apiClient';

const AnimatedGreeting = ({ text }) => (
  <div className="font-bold text-sm tracking-wide">
    {text.split('').map((char, index) => (
      <span key={index} className="wave-char inline-block" style={{ animationDelay: `${index * 0.05}s` }}>
        {char === ' ' ? '\u00A0' : char}
      </span>
    ))}
  </div>
);

const TimeAwareHero = ({ name, monthName, amount, darkMode }) => {
  const [timeData, setTimeData] = useState({ text: 'Welcome', type: 'morning' });
  useEffect(() => {
    const h = new Date().getHours();
    let type = 'morning', text = 'Good Morning';
    if (h >= 12 && h < 14) { type = 'noon'; text = 'Good Noon'; }
    else if (h >= 14 && h < 17) { type = 'afternoon'; text = 'Good Afternoon'; }
    else if (h >= 17 && h < 20) { type = 'evening'; text = 'Good Evening'; }
    else if (h >= 20 || h < 5) { type = 'night'; text = 'Good Night'; }
    setTimeData({ text, type });
  }, []);

  const getBgClass = () => {
    switch(timeData.type) {
      case 'noon': return 'bg-gradient-to-br from-sky-400 via-blue-500 to-yellow-400';
      case 'afternoon': return 'bg-gradient-to-br from-teal-400 via-emerald-500 to-cyan-600';
      case 'evening': return 'bg-gradient-to-br from-purple-700 via-pink-600 to-orange-500';
      case 'night': return 'bg-gradient-to-b from-slate-900 via-indigo-950 to-black';
      default: return 'bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600';
    }
  };

  const renderEffects = () => {
    if (timeData.type === 'night') return [...Array(15)].map((_, i) => <div key={i} className="star absolute bg-white rounded-full" style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, width: `${Math.random()*3+1}px`, height: `${Math.random()*3+1}px`, animation: `twinkle ${Math.random()*2+1}s infinite alternate` }}></div>);
    if (timeData.type === 'noon') return <div className="sun-flare absolute w-32 h-32 top-[-20px] right-[-20px] pointer-events-none rounded-full bg-yellow-200/40 blur-2xl"></div>;
    return [...Array(6)].map((_, i) => <div key={i} className="bubble absolute rounded-full bg-white/20" style={{ left: `${Math.random()*90}%`, width: `${Math.random()*20+10}px`, height: `${Math.random()*20+10}px`, bottom: '-20px', animation: `float ${Math.random()*4+3}s infinite ease-in-out`, animationDelay: `${Math.random()*2}s` }}></div>);
  };

  return (
    <div className={`mb-3 relative overflow-hidden rounded-2xl shadow-lg p-4 text-white transition-all duration-1000 ${getBgClass()}`} style={{ backgroundSize: '200% 200%', animation: 'gradientShift 8s ease infinite' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">{renderEffects()}</div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-0.5 shadow-black drop-shadow-md">{monthName}</p>
            <AnimatedGreeting text={`${timeData.text}, ${name}!`} />
          </div>
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/30 shadow-lg animate-pulse">
            <i className={`fa-solid ${timeData.type === 'night' ? 'fa-moon' : timeData.type === 'noon' ? 'fa-sun' : 'fa-bowl-food'} text-lg`}></i>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-[10px] font-bold opacity-80 uppercase mb-0.5 drop-shadow-md">Current Meal Rate</p>
          <h2 className="text-3xl font-black tracking-tighter drop-shadow-lg">{amount}</h2>
        </div>
      </div>
    </div>
  );
};

const HomeTab = ({
  profile,
  monthName,
  stats,
  darkMode,
  currentDate,
  setCurrentDate,
  sortedMembers,
  daysInMonth,
  mealLookup,
  selectedCell,
  setSelectedCell,
  handleChartToggle
}) => {
  const [view, setView] = useState('overview'); // 'overview' | 'chart'

  const downloadChartPDF = () => {
    const el = document.getElementById('chart-container');
    if (el) html2pdf().from(el).set({ margin: [10,10], filename: 'Meal_Chart.pdf', html2canvas: { scale: 2 }, jsPDF: { orientation: 'landscape' } }).save();
  };

  const handleMonthChange = (e) => {
    if (!e.target.value) return;
    const [y, m] = e.target.value.split('-');
    setCurrentDate(new Date(y, m - 1, 1));
  };

  return (
    <div className="fade-in pb-4">
      {/* Tab Switcher for Home */}
      <div className={`flex p-1 mb-3 rounded-xl border backdrop-blur-md shadow-sm ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100/80 border-slate-200'}`}>
        <button 
          onClick={() => setView('overview')} 
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${view === 'overview' ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setView('chart')} 
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${view === 'chart' ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Monthly Chart
        </button>
      </div>

      {view === 'overview' && (
        <div className="fade-in">
          <TimeAwareHero 
            name={profile?.full_name?.split(' ')[0] || 'User'} 
            monthName={monthName} 
            amount={formatMoney(stats.mealRate)} 
            darkMode={darkMode} 
          />
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className={`p-3 rounded-2xl border backdrop-blur-xl transition-all ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-1">
                <p className="text-[9px] font-bold uppercase opacity-60 text-indigo-500">Total Cost</p>
                <i className="fa-solid fa-wallet text-indigo-400/50 text-xs"></i>
              </div>
              <h2 className="text-xl font-black">{formatMoney(stats.totalCost)}</h2>
            </div>
            <div className={`p-3 rounded-2xl border backdrop-blur-xl transition-all ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-1">
                <p className="text-[9px] font-bold uppercase opacity-60 text-emerald-500">Total Meals</p>
                <i className="fa-solid fa-plate-wheat text-emerald-400/50 text-xs"></i>
              </div>
              <h2 className="text-xl font-black">{stats.totalMeals}</h2>
            </div>
          </div>
          
          <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-lg ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
            <div className={`p-3 border-b flex justify-between items-center ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <h3 className="font-bold text-xs flex items-center gap-2"><i className="fa-solid fa-users text-indigo-500"></i> Member Status</h3>
              <span className={`text-[9px] opacity-70 px-2 py-0.5 rounded-full font-bold ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{monthName}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className={`uppercase text-left tracking-wider ${darkMode ? 'bg-slate-900/50 opacity-80' : 'bg-slate-50 text-slate-500'}`}>
                  <tr>
                    <th className="px-3 py-2 text-[10px]">User</th>
                    <th className="px-1 py-2 text-center text-[10px]">Meal</th>
                    <th className="px-1 py-2 text-right text-[10px]">Dep.</th>
                    <th className="px-3 py-2 text-right text-[10px]">Bal.</th>
                  </tr>
                </thead>
                <tbody className={darkMode ? 'divide-y divide-slate-700' : 'divide-y divide-slate-100'}>
                  {stats.report.map(m => (
                    <tr key={m.id} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-3 py-2 font-bold flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[9px] shrink-0">
                          {m.full_name[0]}
                        </div>
                        <span className="truncate max-w-[60px] text-[11px]">{m.full_name.split(' ')[0]}</span>
                      </td>
                      <td className="px-1 py-2 text-center font-medium text-[11px]">{m.totalMeals}</td>
                      <td className="px-1 py-2 text-right font-medium text-slate-500 dark:text-slate-400 text-[11px]">{Math.round(m.deposit)}</td>
                      <td className={`px-3 py-2 text-right font-bold text-xs ${m.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {m.balance > 0 ? '+' : ''}{Math.round(m.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {view === 'chart' && (
        <div className={`fade-in rounded-2xl shadow-xl border overflow-hidden flex flex-col backdrop-blur-xl ${darkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
          <div className="p-2 px-3 border-b dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-purple-700 to-indigo-800 text-white shadow-inner">
            <input 
              type="month" 
              value={`${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`} 
              onChange={handleMonthChange} 
              className="bg-white/20 backdrop-blur-md text-white font-bold text-xs outline-none border border-white/30 rounded-lg px-2 py-1 max-w-[130px] focus:ring-2 focus:ring-white/50 transition-all cursor-pointer" 
            />
            <button 
              onClick={downloadChartPDF} 
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all active:scale-95 hover:shadow-lg shadow-emerald-500/20" 
              title="Download PDF"
            >
              <i className="fa-solid fa-file-pdf text-sm"></i>
            </button>
          </div>
          <div id="chart-container" className={`chart-container overflow-auto tiny-scrollbar max-h-[70vh] ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
            <table className="chart-table w-full">
              <thead>
                <tr>
                  <th className={`sticky-corner ${darkMode ? 'sticky-corner-dark bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>#</th>
                  {sortedMembers.map(m => (
                    <th key={m.id} colSpan="2" className={`sticky-header ${darkMode ? 'sticky-header-dark bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                      <div className={`truncate max-w-[60px] mx-auto text-[8px] font-bold uppercase px-0.5 py-0.5 ${m.id === profile?.id ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-md' : ''}`}>
                        {m.id === profile?.id ? 'YOU' : m.full_name.split(' ')[0].slice(0, 6)}
                      </div>
                      <div className="flex justify-around border-t border-slate-400/30 mt-0.5 pt-0.5 opacity-80 text-[8px] font-bold">
                        <span className="text-amber-500">D</span>
                        <span className="text-indigo-500">N</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  return (
                    <tr key={day} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                        <td className={`sticky-col font-bold text-[10px] ${darkMode ? 'sticky-col-dark bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>{day}</td>
                        {sortedMembers.map(m => {
                          const dMeal = mealLookup[`${m.id}_${dateStr}_D`];
                          const nMeal = mealLookup[`${m.id}_${dateStr}_N`];
                          const isDSelected = selectedCell === `${m.id}_${dateStr}_D`;
                          const isNSelected = selectedCell === `${m.id}_${dateStr}_N`;
                          return (
                            <React.Fragment key={m.id}>
                              <td 
                                className={`chart-cell border cursor-pointer transition-all ${darkMode ? 'border-slate-700/50' : 'border-slate-200'} ${isDSelected ? 'bg-indigo-100 dark:bg-indigo-900/40 ring-1 ring-inset ring-indigo-500' : ''}`} 
                                onClick={() => handleChartToggle(day, m, 'D')}
                              >
                                {dMeal ? (dMeal.count == 1 ? <i className="fa-solid fa-check text-emerald-500 text-[9px]"></i> : <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[9px]">{dMeal.count}</span>) : ''}
                              </td>
                              <td 
                                className={`chart-cell border cursor-pointer transition-all ${darkMode ? 'border-slate-700/50' : 'border-slate-200'} ${isNSelected ? 'bg-indigo-100 dark:bg-indigo-900/40 ring-1 ring-inset ring-indigo-500' : ''}`} 
                                onClick={() => handleChartToggle(day, m, 'N')}
                              >
                                {nMeal ? (nMeal.count == 1 ? <i className="fa-solid fa-check text-emerald-500 text-[9px]"></i> : <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[9px]">{nMeal.count}</span>) : ''}
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
    </div>
  );
};

export default HomeTab;
