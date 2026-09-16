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
    <div className="flex flex-col h-full fade-in relative">
      <div className="flex-1 overflow-y-auto overscroll-contain smooth-scroll space-y-3 pb-2 pr-1 tiny-scrollbar">
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
                  <div className="text-center text-[10px] opacity-40 my-3 font-bold uppercase tracking-wider inline-block mx-auto px-3 py-1 rounded-full bg-slate-200/50 dark:bg-slate-700/50">
                    {msgDate}
                  </div>
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`chat-bubble max-w-[80%] rounded-2xl p-2.5 shadow-sm transition-all ${
                    isMe 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm' 
                      : darkMode 
                        ? 'bg-slate-800 text-white rounded-tl-sm' 
                        : 'bg-white text-slate-800 rounded-tl-sm'
                  }`}>
                    {!isMe && <div className="text-[10px] font-bold opacity-80 mb-0.5 text-indigo-400">{getMemberName(msg.user_id)}</div>}
                    <p className="text-[13px] leading-relaxed break-words">{msg.text}</p>
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
      
      <div className={`flex-shrink-0 p-1.5 rounded-2xl border flex items-center gap-2 mt-2 shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <input 
          type="text" 
          placeholder="Message..." 
          className="flex-1 bg-transparent p-2 outline-none text-sm px-3" 
          ref={chatInputRef} 
          defaultValue={chatInput} 
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()} 
        />
        <button 
          onClick={sendMessage} 
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-500 text-white active:scale-95 transition-all shadow-sm shadow-indigo-500/30"
        >
          <i className="fa-solid fa-paper-plane text-xs"></i>
        </button>
      </div>
    </div>
  );
};

export default ChatTab;
