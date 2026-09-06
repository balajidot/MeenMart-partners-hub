import React, { useState, useRef, useEffect } from 'react';
import { compressImage } from '../utils/calculations';
import { triggerHaptic } from '../utils/haptics';

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

const ChatMessageItem = React.memo(function ChatMessageItem({ msg, myName, onOpenLightbox }) {
  const isMine = msg.partner === myName;
  const partnerColor = PARTNER_COLORS[msg.partner] || '#5A6480';
  const partnerInitials = PARTNER_INITIALS[msg.partner] || (msg.partner ? msg.partner.slice(0, 2).toUpperCase() : '??');
  const timeStr = formatChatTime(msg.createdAt);

  return (
    <div className={`chat-msg-row ${isMine ? 'me' : ''}`}>
      {!isMine && (
        <div
          className="chat-msg-avatar"
          style={{ backgroundColor: partnerColor }}
          title={msg.partner}
        >
          {partnerInitials}
        </div>
      )}
      <div className={`chat-msg-content ${isMine ? 'me' : ''}`}>
        <div className={`chat-bubble ${isMine ? 'me' : 'them'}`}>
          {msg.text}
          {msg.proof && (
            <div style={{ marginTop: '6px' }}>
              <img
                src={msg.proof}
                alt="Attachment"
                style={{
                  maxWidth: '200px',
                  maxHeight: '160px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'block',
                }}
                onClick={() => onOpenLightbox?.(msg.proof)}
              />
            </div>
          )}
        </div>
        <div className="chat-msg-meta">
          <span className="who">{isMine ? 'You' : msg.partner}</span>
          {timeStr && <span className="at">&middot; {timeStr}</span>}
        </div>
      </div>
    </div>
  );
});

export default function ChatTab({ store, sendMessage, currentPartner, onOpenLightbox }) {
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

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
    triggerHaptic('medium');
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      sendMessage({
        partner: myName,
        text: draft.trim() || '📸 Photo attachment',
        proof: compressed,
      });
      setDraft('');
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="tab-content">
      <div className="chat-date-header">Today &middot; {formatTodayDate()}</div>

      {/* Scrollable messages */}
      <div className="chat-messages" style={{ paddingBottom: '80px' }}>
        {messages.length === 0 && (
          <div className="empty-state" style={{ paddingTop: '40px' }}>
            <div className="empty-icon">💬</div>
            <h3>Start the conversation</h3>
            <p>Share quick operational updates, market rates, or delivery notes with partners below.</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            msg={msg}
            myName={myName}
            onOpenLightbox={onOpenLightbox}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed input bar */}
      <div className="chat-input-bar">
        <label
          style={{
            cursor: uploading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--input-bg)',
            color: 'var(--text-sec)',
            fontSize: '16px',
            flexShrink: 0,
          }}
          title="Attach photo"
        >
          📷
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={handlePhotoUpload}
          />
        </label>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder={`Message as ${myName}...`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!draft.trim() || uploading}
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
