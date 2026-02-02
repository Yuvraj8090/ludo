import React, { useState, useEffect, useRef } from 'react';

const ChatBox = ({ socket, gameId, messages, currentUser }) => {
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (text.trim()) {
      socket.emit('send-message', { gameId, message: text });
      setText('');
    }
  };

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-full min-h-[300px]">
      <div className="bg-slate-800 p-3 text-white font-bold text-sm flex justify-between items-center">
        <span>💬 Live Chat</span>
        <span className="bg-green-500 w-2 h-2 rounded-full"></span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 scrollbar-hide">
        {messages.length === 0 && <p className="text-center text-slate-400 text-xs mt-10">No messages yet. Say hi!</p>}
        
        {messages.map((msg, idx) => {
          const isMe = msg.username === currentUser.username;
          return (
            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                isMe ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-white border text-slate-700 rounded-tl-none'
              }`}>
                {!isMe && <span className="text-xs font-bold text-blue-600 block mb-1">{msg.username}</span>}
                {msg.message}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} className="p-2 bg-white border-t flex gap-2">
        <input 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition">
          ➤
        </button>
      </form>
    </div>
  );
};

export default ChatBox;