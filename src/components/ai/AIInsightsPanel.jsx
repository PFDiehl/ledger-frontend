import { useState } from 'react';

export default function AIInsightsPanel({ onClose }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hi! Ask me anything about your finances.' }]);

  function send(text) {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: 'user', text }, { role: 'assistant', text: 'Connect the backend to get AI answers.' }]);
    setInput('');
  }

  return (
    <div style={{ position:'fixed', bottom:20, right:20, width:340, background:'#fff', border:'1px solid #D4DDCC', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:1000 }}>
      <div style={{ display:'flex', justifyContent:'space-between', padding:'14px 16px' }}>
        <span style={{ fontWeight:500 }}>AI Assistant</span>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18 }}>x</button>
      </div>
      <div style={{ padding:'12px 16px' }}>
        {messages.map((m, i) => (<div key={i} style={{ fontSize:13, padding:'8px', marginBottom:6, borderRadius:8, background: m.role==='user' ? '#2D4A35' : '#F5F7F2', color: m.role==='user' ? '#A8D4A8' : '#1C2E1C' }}>{m.text}</div>))}
      </div>
      <div style={{ padding:'8px 12px', display:'flex', gap:6 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && send(input)} placeholder='Ask...' style={{ flex:1, padding:'8px', borderRadius:8, border:'1px solid #D4DDCC', fontSize:13 }} />
        <button onClick={() => send(input)} style={{ background:'#2D4A35', color:'#A8D4A8', border:'none', borderRadius:8, padding:'8px 12px', cursor:'pointer' }}>Go</button>
      </div>
    </div>
  );
}