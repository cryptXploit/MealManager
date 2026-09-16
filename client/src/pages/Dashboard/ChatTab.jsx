import React, { useRef, useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { getChatDateLabel, formatChatTime, CACHE_KEYS, updateCache } from '../../utils/helpers';

const ChatTab = ({
  messages,
  setMessages,
  session,
  profile,
  getMemberName,
  isOnline,
  showToast,
  darkMode,
  chatBottomRef
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatInputRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatBottomRef]);

  const sendMessage = async () => {
    const txt = chatInputRef.current?.value || chatInput;
    if (!txt.trim()) return;
    
    if (chatInputRef.current) chatInputRef.current.value = '';
    setChatInput('');
    
    const tempId = 'temp-' + Date.now();
    const msg = { id: tempId, user_id: session.user.id, mess_id: profile.mess_id, text: txt, created_at: new Date().toISOString() };
    
    setMessages(p => { 
      const n = [...p, msg]; 
      updateCache(CACHE_KEYS.MESSAGES, n); 
      return n;
    });
    
    if (isOnline) {
      try {
        const response = await apiClient.post('/chat/add', { 
          user_id: session.user.id, 
          mess_id: profile.mess_id, 
          text: txt 
        });
        
        if (response.data) {
          setMessages(prev => { 
            const updated = prev.map(m => m.id === tempId ? response.data : m); 
            updateCache(CACHE_KEYS.MESSAGES, updated); 
            return updated;
          });
        }
      } catch (error) {
        console.error("Insert message error:", error);
        showToast(`Failed to send: ${error.response?.data?.error || error.message}`, 'error');
        if (chatInputRef.current) chatInputRef.current.value = txt;
        setChatInput(txt); // restore input
        setMessages(prev => prev.filter(m => m.id !== tempId)); // remove local temp message
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] fade-in">
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1 no-scrollbar">
        {(() => {
          let lastDate = null;
          return messages.map(msg => {
            const msgDate = getChatDateLabel(msg.created_at);
            const showDate = msgDate !== lastDate;
            lastDate = msgDate;
            const isMe = msg.user_id === session.user.id;
            const isTemp = msg.id.toString().startsWith('temp-');
            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="text-center text-[10px] opacity-40 my-3 font-bold uppercase tracking-wider backdrop-blur-sm inline-block mx-auto px-3 py-1 rounded-full bg-slate-200/50 dark:bg-slate-700/50">
                    {msgDate}
                  </div>
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`chat-bubble max-w-[80%] rounded-2xl p-3 shadow-md backdrop-blur-md transition-all ${
                    isMe 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm' 
                      : darkMode 
                        ? 'bg-slate-800/80 text-white rounded-tl-sm' 
                        : 'bg-white/90 text-slate-800 rounded-tl-sm'
                  }`}>
                    {!isMe && <div className="text-[10px] font-bold opacity-80 mb-1 text-indigo-400">{getMemberName(msg.user_id)}</div>}
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <div className="flex items-end justify-between gap-2 mt-1">
                      <span className="text-[9px] opacity-60 ml-auto">{formatChatTime(msg.created_at)}</span>
                      {isMe && <i className={`fa-solid fa-check-double text-[9px] ${isTemp ? 'text-white/50' : 'text-blue-200'}`}></i>}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          });
        })()}
        <div ref={chatBottomRef}></div>
      </div>
      
      <div className={`p-2 rounded-2xl border flex items-center gap-2 mt-2 backdrop-blur-xl shadow-lg ${darkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
        <input 
          type="text" 
          placeholder="Type a message..." 
          className="flex-1 bg-transparent p-2 outline-none text-sm px-4" 
          ref={chatInputRef} 
          defaultValue={chatInput} 
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()} 
        />
        <button 
          onClick={sendMessage} 
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-500/30"
        >
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
};

export default ChatTab;
