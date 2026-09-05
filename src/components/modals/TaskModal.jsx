import React, { useState } from 'react';
import { PARTNER_NAMES, PARTNER_CONFIG } from '../../config/partners';

export default function TaskModal({ isOpen, onClose, onAddTask, currentPartner }) {
  const from = currentPartner?.name || PARTNER_NAMES[0];

  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [to, setTo] = useState(from);
  const [dueDateTime, setDueDateTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setTitle('');
    setTitleTouched(false);
    setDueDateTime('');
    setLoading(false);
    setTo(from);
    onClose();
  };

  if (!isOpen) return null;

  const titleError = titleTouched && !title.trim() ? 'பணியின் விவரம் தேவை' : '';
  const canSubmit = title.trim() && !loading;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTitleTouched(true);
    if (!canSubmit) return;

    setLoading(true);
    onAddTask({
      title: title.trim(),
      from,
      to,
      dueDateTime: dueDateTime || new Date().toISOString(),
      proof: null,
      proofAddedAt: null,
    });
    handleClose();
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span aria-hidden="true">📋</span>
            <div>
              <h3>புதிய பணி ஒதுக்கு</h3>
              <small>Assign Task to Partners</small>
            </div>
          </div>
          <button className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="task-title">பணியின் விவரம் *</label>
            <input
              id="task-title"
              type="text"
              className={`form-input ${titleError ? 'error' : ''}`}
              placeholder="எ.கா: காலை 6 மணிக்கு மார்க்கெட்டில் மீன் கொள்முதல்..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTitleTouched(true)}
              autoFocus
            />
            {titleError && <div className="form-error">⚠ {titleError}</div>}
          </div>

          <div className="form-field">
            <label>ஒதுக்குபவர் (From)</label>
            <div className="locked-partner">
              {currentPartner?.avatar || '👤'} {from}
            </div>
            <div className="locked-partner-hint">உங்கள் கணக்கிலிருந்து auto-set</div>
          </div>

          <div className="form-field">
            <label>யாருக்கு பணி ஒதுக்குகிறீர்கள் (Assign To) *</label>
            <div className="pill-group">
              {PARTNER_NAMES.map((p) => {
                const meta = PARTNER_CONFIG[p];
                return (
                  <button
                    type="button"
                    key={p}
                    className={`pill ${to === p ? `active ${p.toLowerCase()}` : ''}`}
                    onClick={() => setTo(p)}
                  >
                    {meta?.avatar || '👤'} {p} {p === from ? '(சுய பணி)' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="task-due">முடிக்க வேண்டிய தேதி & நேரம் (Optional)</label>
            <input
              id="task-due"
              type="datetime-local"
              className="form-input"
              value={dueDateTime}
              onChange={(e) => setDueDateTime(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              ரத்து
            </button>
            <button type="submit" className="btn-submit" disabled={!canSubmit}>
              {loading ? '⏳ சேமிக்கிறது...' : '💾 பணி ஒதுக்கு'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

