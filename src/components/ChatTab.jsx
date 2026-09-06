import React, { useState, useRef, useEffect } from 'react';

const PARTNER_COLORS = {
  Balaji: '#1B2A5B',
  Nagoor: '#0F9E8E',
  JP:     '#B4531F',
};

const PARTNER_INITIALS = {
  Balaji: 'BA',
  Nagoor: 'NA',
  JP:     'JP',
};

function formatChatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTodayDate() {
  const d = new Date();
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function ChatTab({ store, sendMessage, currentPartner, onOpenLightbox }) {
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const messages = store?.messages || [];
  const myName = currentPartner?.name || 'Balaji';

  // Auto-scroll to bottom on mount
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendMessage({ partner: myName, text: trimmed });
    setDraft('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="tab-content">
      <div className="chat-date-header">Today &middot; {formatTodayDate()}</div>

      {/* Scrollable messages — padded so fixed input bar does not overlap */}
      <div className="chat-messages" style={{ paddingBottom: '80px' }}>
        {messages.length === 0 && (
          <div className="empty-state" style={{ paddingTop: '40px' }}>
            <div className="empty-icon">&#128172;</div>
            <h3>&#2909;&#2992;&#3016;&#2991;&#3006;&#2975;&#2994;&#3016;&#2980;&#3021; &#2980;&#3018;&#2975;&#2969;&#3021;&#2965;&#3009;&#2969;&#3021;&#2965;&#2995;&#3021;</h3>
            <p>&#2986;&#2919;&#3021;&#2965;&#3009;&#2980;&#3006;&#2992;&#2992;&#3021;&#2965;&#2995;&#3009;&#2975;&#2985;&#3021; &#2909;&#2975;&#2985;&#3016;&#2980;&#3021; &#2980;&#2965;&#2997;&#2994;&#3021;&#2965;&#2995;&#3016;&#2986;&#3021; &#2986;&#2965;&#2991;&#2992; &#2965;&#3008;&#2996;&#3014; &#2989;&#2995;&#3021;&#2995; &#2989;&#2995;&#3021;&#2995;&#3008;&#2975;&#3021;&#2975;&#3009;&#2986;&#3021; &#2986;&#2975;&#3021;&#2975;&#3007;&#2991;&#3016;&#2986;&#3021; &#2986;&#2991;&#2985;&#3021;&#2986;&#2975;&#3009;&#2980;&#3021;&#2980;&#2997;&#3009;&#2990;&#3021;.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.partner === myName;
          const color = PARTNER_COLORS[msg.partner] || '#5A6480';
          const initials = PARTNER_INITIALS[msg.partner] || (msg.partner || '?').slice(0, 2).toUpperCase();

          return (
            <div key={msg.id} className={`chat-msg-row${isMe ? ' me' : ''}`}>
              <div
                className="chat-msg-avatar"
                style={{ background: color }}
                aria-label={msg.partner}
              >
                {initials}
              </div>

              <div className={`chat-msg-content${isMe ? ' me' : ''}`}>
                <div className={`chat-bubble${isMe ? ' me' : ' them'}`}>
                  {msg.proof && (
                    <img
                      src={msg.proof}
                      alt="Attachment"
                      style={{
                        width: '100%',
                        borderRadius: '10px',
                        marginBottom: msg.text ? '8px' : 0,
                        cursor: 'pointer',
                        display: 'block',
                      }}
                      onClick={() =>
                        onOpenLightbox?.(msg.proof, msg.partner, 'அரட்டை படம்', msg.createdAt)
                      }
                    />
                  )}
                  {msg.text}
                </div>
                <div className="chat-msg-meta">
                  <span className="who">{isMe ? 'You' : msg.partner}</span>
                  <span className="at">{formatChatTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed input bar */}
      <div className="chat-input-bar">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder={`${myName} ஆக செய்தி அனுப்புங்கள்...`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!draft.trim()}
          aria-label="Send message"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <polygon points="22 2 15 22 11 13 2 9 22 2" fill="#fff" />
          </svg>
        </button>
      </div>
    </div>
  );
}
