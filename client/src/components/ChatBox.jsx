import React, { useState, useEffect, useRef } from 'react';

const ChatBox = ({ messages, onSendMessage }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3>💬 Chat</h3>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className="chat-bubble">
            <strong style={{ color: '#aaa' }}>{msg.username}: </strong>
            {msg.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '5px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type..."
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none' }}
        />
        <button 
          type="submit" 
          style={{ padding: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ➤
        </button>
      </form>
    </div>
  );
};

export default ChatBox;