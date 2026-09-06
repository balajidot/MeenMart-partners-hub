import React, { useState, useEffect, useRef } from 'react';
import { compressImage } from '../utils/calculations';
import Icon from './Icons';

const FOUNDER_ICONS = {
  Balaji: 'laptop',
  Nagoor: 'fish',
  JP: 'bike',
};

function formatChatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatTab({
  store,
  sendMessage,
  currentPartner,
  onOpenLightbox,
}) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const messages = store?.messages || [];
  const myName = currentPartner?.name || 'Balaji';

  // Auto scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  const handleFileAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setAttachment(compressed);
    } catch (err) {
      console.error('Chat image compression failed:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault?.();
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;

    sendMessage({
      partner: myName,
      text: trimmed,
      proof: attachment || null,
    });

    setText('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="tab-content chat-tab-container">
      <div className="chat-header-banner">
        <div className="chat-header-title">
          <span className="chat-header-icon">
            <Icon name="chat" size={18} color="var(--accent)" />
          </span>
          <div>
            <h4>உடனுக்குடன் உரையாடல் (Co-Founders Chat)</h4>
            <small>Balaji • Nagoor • JP நேரலை அரட்டை</small>
          </div>
        </div>
      </div>

      <div className="chat-feed-area">
        {messages.length === 0 ? (
          <div className="empty-state chat-empty">
            <div className="empty-icon">
              <Icon name="chat" size={32} />
            </div>
            <h3>உரையாடலைத் தொடங்குங்கள்</h3>
            <p>பங்குதாரர்களுடன் உடனடித் தகவல்களைப் பகிர கீழே உள்ள உள்ளீட்டுப் பட்டியைப் பயன்படுத்தவும்.</p>
          </div>
        ) : (
          <div className="chat-messages-list">
            {messages.map((msg) => {
              const isMe = msg.partner === myName;
              const iconName = FOUNDER_ICONS[msg.partner] || 'chat';
              const partnerCls = (msg.partner || '').toLowerCase();

              return (
                <div
                  key={msg.id}
                  className={`chat-bubble-row ${isMe ? 'outgoing' : 'incoming'}`}
                >
                  {!isMe && (
                    <div className={`chat-avatar-bubble ${partnerCls}`}>
                      <Icon name={iconName} size={14} />
                    </div>
                  )}

                  <div className={`chat-bubble ${isMe ? 'my-bubble' : `their-bubble ${partnerCls}`}`}>
                    {!isMe && (
                      <div className="chat-sender-name">
                        <Icon name={iconName} size={12} className="inline-msg-icon" /> {msg.partner}
                      </div>
                    )}

                    {msg.proof && (
                      <div className="chat-image-wrap">
                        <img
                          src={msg.proof}
                          alt="Attachment"
                          className="chat-bubble-img"
                          onClick={() =>
                            onOpenLightbox?.(
                              msg.proof,
                              msg.partner,
                              'அரட்டை படம்',
                              msg.createdAt
                            )
                          }
                        />
                      </div>
                    )}

                    {msg.text && <div className="chat-bubble-text">{msg.text}</div>}

                    <div className="chat-bubble-time">
                      {formatChatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="chat-bottom-bar-wrap">
        {attachment && (
          <div className="chat-attachment-preview">
            <img src={attachment} alt="Preview" className="chat-preview-thumb" />
            <span className="chat-preview-text">படம் இணைக்கப்பட்டுள்ளது</span>
            <button
              type="button"
              className="chat-remove-attach-btn"
              onClick={() => {
                setAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        )}

        <form className="chat-input-form" onSubmit={handleSend}>
          <label className="chat-attach-btn" title="புகைப்படம் இணைக்க" aria-label="Attach photo">
            {isCompressing ? <Icon name="hourglass" size={16} /> : <Icon name="camera" size={16} />}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="file-hidden"
              onChange={handleFileAttach}
              disabled={isCompressing}
            />
          </label>

          <input
            type="text"
            className="chat-input-field"
            placeholder={`${myName} ஆக செய்தி தட்டச்சு செய்க...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            type="submit"
            className="chat-send-btn"
            disabled={(!text.trim() && !attachment) || isCompressing}
            aria-label="Send message"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
