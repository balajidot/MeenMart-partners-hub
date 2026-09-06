import React, { useState, useRef, useEffect } from 'react';
import { triggerHaptic } from '../../utils/haptics';

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

function formatCommentTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TaskDiscussionModal({
  isOpen,
  onClose,
  task,
  currentPartner,
  profiles,
  onAddComment,
  onToggleProblem,
}) {
  const [commentText, setCommentText] = useState('');
  const [isProblemFlag, setIsProblemFlag] = useState(false);
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);

  const comments = task?.comments || [];
  const myName = currentPartner?.name || 'Balaji';
  const hasProblem = !!task?.hasProblem;

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 120);
    }
  }, [isOpen, comments.length]);

  if (!isOpen || !task) return null;

  const handleSend = (e) => {
    e?.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    triggerHaptic('medium');
    onAddComment(task.id, {
      partner: myName,
      text,
      isProblem: isProblemFlag,
    });

    setCommentText('');
    setIsProblemFlag(false);
    setTimeout(scrollToBottom, 100);
  };

  const handleToggleBlocker = () => {
    triggerHaptic('warning');
    onToggleProblem(task.id, !hasProblem);
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet task-discussion-sheet">
        <div className="sheet-handle" />

        {/* Header */}
        <div className="sheet-header-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sheet-title" style={{ margin: 0, fontSize: '17px' }}>
              💬 Task Discussion
            </div>
            <div className="task-disc-subtitle">
              To: <strong>{task.to || 'Shared'}</strong> {task.from ? `(By: ${task.from})` : ''}
            </div>
          </div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Task Summary Banner */}
        <div className={`task-disc-hero-card ${hasProblem ? 'is-blocked' : ''}`}>
          <div className="task-disc-hero-top">
            <span className="task-disc-title">{task.title}</span>
            <span className={`priority-badge ${task.priority || 'normal'}`}>
              {task.priority || 'Normal'}
            </span>
          </div>

          {/* Issue / Blocker Bar */}
          <div className="task-disc-blocker-bar">
            {hasProblem ? (
              <div className="task-disc-alert-box">
                <div className="task-disc-alert-content">
                  <span className="task-disc-alert-icon">⚠️</span>
                  <div>
                    <strong className="task-disc-alert-head">Problem / Blocker Raised!</strong>
                    <p className="task-disc-alert-desc">Partners attention needed on this task.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="task-disc-resolve-btn"
                  onClick={handleToggleBlocker}
                >
                  ✓ Mark Solved
                </button>
              </div>
            ) : (
              <div className="task-disc-clear-box">
                <span className="task-disc-clear-text">Task-la edhachi problem irukka?</span>
                <button
                  type="button"
                  className="task-disc-raise-btn"
                  onClick={handleToggleBlocker}
                >
                  ⚠️ Report Problem
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Discussion Thread */}
        <div className="task-disc-thread">
          {comments.length === 0 ? (
            <div className="task-disc-empty">
              <span style={{ fontSize: '24px' }}>💬</span>
              <p>Innum messages yedhum illa.</p>
              <span>Edhavadhu clarification, delay, or update irundha keezha chat pannunga!</span>
            </div>
          ) : (
            comments.map((c) => {
              const isMe = c.partner === myName;
              const pColor = PARTNER_COLORS[c.partner] || '#5A6480';
              const pInitials = PARTNER_INITIALS[c.partner] || c.partner.slice(0, 2).toUpperCase();
              const avatarUrl = profiles?.[c.partner]?.avatarUrl;

              return (
                <div key={c.id} className={`task-comment-item ${isMe ? 'is-me' : 'is-them'}`}>
                  {!isMe && (
                    <div
                      className="task-comment-avatar"
                      style={{ backgroundColor: pColor }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={c.partner} className="task-comment-avatar-img" />
                      ) : (
                        pInitials
                      )}
                    </div>
                  )}

                  <div className={`task-comment-bubble ${isMe ? 'is-me' : 'is-them'} ${c.isProblem ? 'is-problem' : ''}`}>
                    <div className="task-comment-meta">
                      <span className="task-comment-author" style={{ color: isMe ? '#E2E8F0' : pColor }}>
                        {isMe ? 'You' : c.partner}
                      </span>
                      {c.isProblem && (
                        <span className="task-comment-problem-tag">⚠️ PROBLEM</span>
                      )}
                      <span className="task-comment-time">{formatCommentTime(c.createdAt)}</span>
                    </div>
                    <div className="task-comment-text">{c.text}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Input Bar */}
        <form className="task-disc-input-form" onSubmit={handleSend}>
          <div className="task-disc-options-row">
            <button
              type="button"
              className={`task-disc-problem-toggle ${isProblemFlag ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setIsProblemFlag(!isProblemFlag);
              }}
            >
              <span style={{ fontSize: '13px' }}>⚠️</span>
              <span>{isProblemFlag ? 'Problem Flag Added' : 'Mark as Problem'}</span>
            </button>
          </div>

          <div className="task-disc-input-wrap">
            <input
              ref={inputRef}
              type="text"
              className={`task-disc-input ${isProblemFlag ? 'is-flagged' : ''}`}
              placeholder={isProblemFlag ? 'Describe the problem / blocker...' : 'Type message / update here...'}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              type="submit"
              className={`task-disc-send-btn ${commentText.trim() ? 'can-send' : ''}`}
              disabled={!commentText.trim()}
            >
              Send
            </button>
          </div>
        </form>

      </div>
    </>
  );
}
