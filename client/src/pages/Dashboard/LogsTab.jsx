import React from 'react';
import { formatDate } from '../../utils/helpers';

const LogsTab = ({
  filteredLogs,
  darkMode,
  monthName
}) => {
  return (
    <div className="fade-in pb-4">
      <h2 className="text-lg font-bold px-1 mb-3 flex items-center gap-2">
        <i className="fa-solid fa-clock-rotate-left text-cyan-500"></i> Activity Log ({monthName})
      </h2>
      
      <div className={`rounded-3xl border overflow-hidden shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        {filteredLogs.length === 0 && (
          <div className="text-center opacity-50 py-8 flex flex-col items-center">
            <i className="fa-solid fa-inbox text-3xl mb-2 opacity-30"></i>
            <p className="text-xs">No activity this month.</p>
          </div>
        )}
        
        <div className="divide-y dark:divide-slate-700 divide-slate-100">
          {filteredLogs.map((log, index) => (
            <div 
              key={log.id} 
              className={`p-3 flex gap-3 items-start transition-colors hover:bg-black/5 dark:hover:bg-white/5`}
            >
              <div className={`mt-0.5 w-8 h-8 flex items-center justify-center rounded-full text-xs shrink-0 ${
                log.action_type === 'DELETED' || log.action_type === 'RESET' 
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' 
                  : log.action_type === 'ADDED' 
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                    : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
              }`}>
                <i className={`fa-solid ${
                  log.action_type === 'DELETED' || log.action_type === 'RESET' ? 'fa-trash-can' 
                  : log.action_type === 'ADDED' ? 'fa-plus' 
                  : 'fa-info'
                }`}></i>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-xs truncate">{log.user_name}</span>
                  <span className="text-[9px] opacity-50 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </span>
                </div>
                <p className="text-[11px] opacity-70 mt-0.5 leading-relaxed">{log.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogsTab;
