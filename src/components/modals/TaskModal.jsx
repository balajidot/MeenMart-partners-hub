import React, { useState, useEffect } from 'react';
import { compressImage } from '../../utils/calculations';

const PARTNERS = ['Balaji', 'Nagoor', 'JP'];
const PRIORITIES = [
  { id: 'normal', label: 'பொதுவானது' },
  { id: 'high',   label: 'முக்கியம்' },
  { id: 'urgent', label: 'அவசரம்' },
];

export default function TaskModal({ isOpen, onClose, onAddTask }) {
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [from, setFrom] = useState('Balaji');
  const [to, setTo] = useState('Nagoor');
  const [priority, setPriority] = useState('normal');
  const [dueDateTime, setDueDateTime] = useState('');
  const [proof, setProof] = useState(null);
  const [proofLabel, setProofLabel] = useState('புகைப்படம் இணைக்க தட்டவும்');
  const [proofBusy, setProofBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setTitleTouched(false);
      setPriority('normal');
      setDueDateTime('');
      setProof(null);
      setProofLabel('புகைப்படம் இணைக்க தட்டவும்');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const titleError = titleTouched && !title.trim() ? 'பணியின் விவரம் தேவை' : '';
  const sameFromTo = from === to;
  const canSubmit = title.trim() && !sameFromTo && !proofBusy && !loading;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofBusy(true);
    setProofLabel('படம் சுருக்கப்படுகிறது...');
    try {
      const compressed = await compressImage(file);
      setProof(compressed);
      setProofLabel(`✓ இணைக்கப்பட்டது (${file.name.slice(0, 20)})`);
    } catch (err) {
      console.error(err);
      setProofLabel('❌ பிழை — மீண்டும் முயற்சிக்கவும்');
    } finally {
      setProofBusy(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTitleTouched(true);
    if (!canSubmit) return;

    setLoading(true);
    onAddTask({
      title: title.trim(),
      from,
      to,
      priority,
      dueDateTime: dueDateTime || new Date().toISOString(),
      proof,
      proofAddedAt: proof ? Date.now() : null,
    });
    onClose();
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span aria-hidden="true">📋</span>
            <div>
              <h3>புதிய பணி ஒதுக்கு</h3>
              <small>Task Delegation & Proof Attachment</small>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
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

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="task-from">ஒதுக்குபவர் *</label>
              <select
                id="task-from"
                className="form-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              >
                {PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="task-to">யாருக்கு *</label>
              <select
                id="task-to"
                className={`form-input ${sameFromTo ? 'error' : ''}`}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              >
                {PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {sameFromTo && (
                <div className="form-error">⚠ சொந்தமாக ஒதுக்க முடியாது</div>
              )}
            </div>
          </div>

          <div className="form-field">
            <label>முன்னுரிமை</label>
            <div className="pill-group">
              {PRIORITIES.map(({ id, label }) => (
                <button
                  type="button"
                  key={id}
                  className={`pill ${priority === id ? 'active' : ''}`}
                  onClick={() => setPriority(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="task-due">முடிக்க வேண்டிய தேதி & நேரம்</label>
            <input
              id="task-due"
              type="datetime-local"
              className="form-input"
              value={dueDateTime}
              onChange={(e) => setDueDateTime(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>📸 பணி சான்று புகைப்படம் (Optional)</label>
            <label className="file-upload">
              <div className="file-upload-icon">📷</div>
              <div className="file-upload-text">{proofLabel}</div>
              <div className="file-upload-hint">48 மணி நேரத்திற்குப் பிறகு தானாக அழியும்</div>
              <input
                type="file"
                accept="image/*"
                className="file-hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
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
