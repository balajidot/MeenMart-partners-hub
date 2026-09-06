import React, { useState, useRef, useEffect, useCallback } from 'react';
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

const PARTNER_ROLES = {
  Balaji: 'Tech & Product',
  Nagoor: 'Procure & Pack',
  JP:     'Delivery & Sales',
};

const QUICK_OPS_CHIPS = [
  { label: '🐟 Pazhaverkaadu Stock', text: '🐟 Pazhaverkaadu: Fresh meen stock eduthaachu.' },
  { label: '📦 Packing Finished', text: '📦 Pack & Clean: Orders clean panni, weigh panni, ice box-la pack aachu.' },
  { label: '🛵 Delivery Kelambiyaachu', text: '🛵 Delivery: Customer slots-ku delivery kelambiyaachu.' },
  { label: '💵 Kaasu Vandhuduchu', text: '💵 Finance: Customer payment vandhuduchu, cash tally aachu.' },
  { label: '⚠️ Stock Alert', text: '⚠️ Stock Alert: Mukkiyamaana items stock romba kamiya irukku.' },
];

function formatChatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTodayDate() {
  const d = new Date();
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

const ChatMessageItem = React.memo(function ChatMessageItem({ msg, myName, onOpenLightbox, profiles }) {
  const isMine = msg.partner === myName;
  const partnerColor = PARTNER_COLORS[msg.partner] || '#5A6480';
  const partnerInitials = PARTNER_INITIALS[msg.partner] || (msg.partner ? msg.partner.slice(0, 2).toUpperCase() : '??');
  const avatarUrl = profiles?.[msg.partner]?.avatarUrl;
  const timeStr = formatChatTime(msg.createdAt);
  const hasProof = !!msg.proof;
  const hasText = msg.text && msg.text.trim() && msg.text !== '📸 Photo attachment';

  return (
    <div className={`chat-msg-row ${isMine ? 'me' : 'them'}`}>
      {!isMine && (
        <div
          className="chat-msg-avatar"
          style={{ backgroundColor: partnerColor }}
          title={`${msg.partner} (${PARTNER_ROLES[msg.partner] || 'Partner'})`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={msg.partner} className="chat-avatar-thumb" />
          ) : (
            partnerInitials
          )}
        </div>
      )}

      <div className={`chat-msg-content ${isMine ? 'me' : 'them'}`}>
        {!isMine && (
          <span className="chat-msg-sender-name" style={{ color: partnerColor }}>
            {msg.partner}
          </span>
        )}

        <div className={`chat-bubble ${isMine ? 'me' : 'them'} ${hasProof ? 'has-media' : ''}`}>
          {hasProof && (
            <div
              className="chat-media-card"
              onClick={() => onOpenLightbox?.(msg.proof, msg.partner, msg.text || 'Photo Attachment', msg.createdAt)}
              title="Tap to view full screen"
            >
              <img
                src={msg.proof}
                alt="Attachment"
                className="chat-media-img"
                loading="lazy"
              />
              <div className="chat-media-overlay">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
                <span>Full view</span>
              </div>
            </div>
          )}

          {hasText && <div className="chat-bubble-text">{msg.text}</div>}

          <div className="chat-bubble-meta">
            <span className="chat-time">{timeStr}</span>
            {isMine && (
              <span className="chat-ticks" aria-label="Delivered" title="Delivered">
                ✓✓
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function ChatTab({
  store,
  sendMessage,
  currentPartner,
  onOpenLightbox,
  isChatTyping,
  setIsChatTyping,
  onlinePartners,
  profiles,
  onBack,
}) {
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const messages = store?.messages || [];
  const myName = currentPartner?.name || 'Balaji';

  // Only show partners who are actively online (current user is always considered online)
  const onlineList = ['Balaji', 'Nagoor', 'JP'].filter(
    (pName) => onlinePartners?.[pName] || pName === myName
  );

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Initial scroll to bottom on mount
  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  const handleInputFocus = () => {
    setIsChatTyping?.(true);
    setTimeout(() => scrollToBottom(true), 250);
  };

  const handleInputBlur = () => {
    // Delay slightly so tapping Send doesn't cancel click event
    setTimeout(() => {
      setIsChatTyping?.(false);
    }, 180);
  };

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    triggerHaptic('medium');
    sendMessage({ partner: myName, text: trimmed });
    setDraft('');
    inputRef.current?.focus();
    setTimeout(() => scrollToBottom(true), 100);
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
    triggerHaptic('light');
    try {
      const compressed = await compressImage(file);
      sendMessage({
        partner: myName,
        text: draft.trim() || '📸 Photo attachment',
        proof: compressed,
      });
      setDraft('');
      triggerHaptic('success');
      setTimeout(() => scrollToBottom(true), 150);
    } catch (err) {
      console.error('Failed to compress/send image:', err);
      triggerHaptic('warning');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleQuickChip = (text) => {
    triggerHaptic('light');
    setDraft(text);
    inputRef.current?.focus();
    setIsChatTyping?.(true);
  };

  return (
    <div className={`chat-workspace ${isChatTyping ? 'keyboard-active' : ''}`}>
      {/* Pinned Channel Bar — Only shows online partners */}
      <div className="chat-channel-bar">
        {onBack && (
          <button
            type="button"
            className="chat-back-btn"
            onClick={() => {
              triggerHaptic('light');
              onBack();
            }}
            aria-label="Go Back"
            title="Back to Hub"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span>Back</span>
          </button>
        )}

        <div className="chat-channel-left">
          <div className="chat-channel-title">
            <span className="chat-channel-dot" />
            <span className="chat-channel-name">MeenMart Co-Founders</span>
          </div>
          <div className="chat-channel-sub">
            {onlineList.join(' • ')} · Online Irukanga
          </div>
        </div>
        <div className="chat-channel-avatars">
          {onlineList.map((pName) => {
            const avatarUrl = profiles?.[pName]?.avatarUrl;
            return (
              <span
                key={pName}
                className={`chat-channel-avatar-pill ${pName === myName ? 'is-me' : ''}`}
                style={{ backgroundColor: PARTNER_COLORS[pName] }}
                title={`${pName}: Online (${PARTNER_ROLES[pName]})`}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={pName} className="chat-avatar-thumb" />
                ) : (
                  PARTNER_INITIALS[pName]
                )}
                <span className="channel-avatar-online-dot" />
              </span>
            );
          })}
        </div>
      </div>

      {/* Quick Operational Status Chips */}
      <div className="chat-quick-chips">
        {QUICK_OPS_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            className="chat-chip-btn"
            onClick={() => handleQuickChip(chip.text)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Scrollable Messages Stream */}
      <div className="chat-messages-container">
        <div className="chat-date-header">Today &middot; {formatTodayDate()}</div>

        {messages.length === 0 && (
          <div className="empty-state" style={{ paddingTop: '32px' }}>
            <div className="empty-icon">💬</div>
            <h3>Operations Chat Ready</h3>
            <p>Market rates, packing status, delivery updates inga share pannunga.</p>
          </div>
        )}

        <div className="chat-messages-list">
          {messages.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              msg={msg}
              myName={myName}
              onOpenLightbox={onOpenLightbox}
              profiles={profiles}
            />
          ))}
          <div ref={messagesEndRef} style={{ height: '8px' }} />
        </div>
      </div>

      {/* Sticky Bottom Input Bar */}
      <div className={`chat-input-bar ${isChatTyping ? 'focused' : ''}`}>
        {/* Photo Attachment Button */}
        <label
          className={`chat-attach-btn ${uploading ? 'uploading' : ''}`}
          title="Attach photo from gallery or camera"
        >
          {uploading ? (
            <span className="chat-attach-spinner" />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={handlePhotoUpload}
          />
        </label>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          name="team_chat_message"
          id="team_chat_message"
          className="chat-input"
          placeholder={`${myName}, update sollunga...`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck="false"
          enterKeyHint="send"
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore="true"
        />

        {/* Send Button */}
        <button
          type="button"
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!draft.trim() || uploading}
          aria-label="Send message"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
