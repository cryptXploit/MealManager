import React from 'react';
import { formatDate } from '../../utils/helpers';

const LogsTab = ({
  filteredLogs,
  darkMode,
  monthName
}) => {
  return (
    <div className="fade-in space-y-3 pb-8">
      <h2 className="text-xl font-bold px-1 mb-4 flex items-center gap-2">
        <i className="fa-solid fa-clock-rotate-left text-cyan-500"></i> Activity Log ({monthName})
      </h2>
      
      {filteredLogs.length === 0 && (
        <div className="text-center opacity-50 py-10 flex flex-col items-center">
          <i className="fa-solid fa-inbox text-4xl mb-3 opacity-30"></i>
          <p>No activity this month.</p>
        </div>
      )}
      
      <div className="space-y-3">
        {filteredLogs.map((log, index) => (
          <div 
            key={log.id} 
            className={`p-4 rounded-2xl border flex gap-4 items-start transition-all duration-300 hover:-translate-y-1 hover:shadow-md backdrop-blur-sm ${
              darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'
            }`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className={`mt-1 w-10 h-10 flex items-center justify-center rounded-xl text-sm shrink-0 shadow-sm ${
              log.action_type === 'DELETED' || log.action_type === 'RESET' 
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' 
                : log.action_type === 'ADDED' 
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
            }`}>
              <i className={`fa-solid ${
                log.action_type === 'DELETED' || log.action_type === 'RESET' ? 'fa-trash' 
                : log.action_type === 'ADDED' ? 'fa-plus' 
                : 'fa-info'
              }`}></i>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <span className="font-bold text-sm truncate">{log.user_name}</span>
                <span className="text-[10px] opacity-50 whitespace-nowrap bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {formatDate(log.created_at)}
                </span>
              </div>
              <p className="text-xs opacity-70 mt-1.5 leading-relaxed">{log.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogsTab;
