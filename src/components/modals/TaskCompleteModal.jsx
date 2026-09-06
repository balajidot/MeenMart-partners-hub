import React, { useState } from 'react';
import { compressImage } from '../../utils/calculations';

export default function TaskCompleteModal({ isOpen, task, onClose, onComplete }) {
  const [proof, setProof] = useState(null);
  const [proofLabel, setProofLabel] = useState('பணி முடிந்ததற்கான புகைப்படம் இணைக்கலாம் (Optional)');
  const [proofBusy, setProofBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !task) return null;

  const handleClose = () => {
    setProof(null);
    setProofLabel('பணி முடிந்ததற்கான புகைப்படம் இணைக்கலாம் (Optional)');
    setProofBusy(false);
    setLoading(false);
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofBusy(true);
    setProofLabel('படம் சுருக்கப்படுகிறது...');
    try {
      const compressed = await compressImage(file);
      setProof(compressed);
      setProofLabel(`✓ படம் இணைக்கப்பட்டது (${file.name.slice(0, 20)})`);
    } catch (err) {
      console.error(err);
      setProofLabel('❌ பிழை — மீண்டும் முயற்சிக்கவும்');
    } finally {
      setProofBusy(false);
    }
  };

  const handleComplete = (e) => {
    e?.preventDefault?.();
    if (proofBusy || loading) return;
    setLoading(true);
    onComplete(task.id, proof);
    handleClose();
  };

  return (
    <>
      <div className="sheet-overlay" onClick={handleClose} />
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <div className="sheet-title">பணியை முடிக்கவும்</div>

        {/* Task summary info */}
        <div className="sheet-assignee-box" style={{ marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--teal-dark)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '3px' }}>
              {task.to ? `${task.to} அவர்களின் பணி` : 'அனைவருக்கும் பொதுப் பணி'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.3 }}>
              {task.title}
            </div>
            {task.from && task.from !== task.to && (
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                ஒதுக்கியவர்: <strong>{task.from}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Proof Photo Upload */}
        <div style={{ marginBottom: '22px' }}>
          <div className="sheet-field-label">📸 சான்றுப் படம் (Proof Photo - Optional)</div>

          {proof ? (
            <div className="sheet-photo-preview" style={{ marginBottom: '8px' }}>
              <img
                src={proof}
                alt="Proof Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                className="sheet-photo-remove"
                onClick={() => {
                  setProof(null);
                  setProofLabel('பணி முடிந்ததற்கான புகைப்படம் இணைக்கலாம் (Optional)');
                }}
                aria-label="Remove photo"
              >
                <span style={{ color: '#fff', fontSize: '12px', lineHeight: 1 }}>✕</span>
              </button>
            </div>
          ) : (
            <label className="sheet-photo-zone" style={{ display: 'flex', cursor: 'pointer' }}>
              <span style={{ fontSize: '20px' }}>📷</span>
              <span className="sheet-photo-label">{proofLabel}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>48 மணி நேரத்திற்குப் பிறகு தானாக அழியும்</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>

        {/* Buttons */}
        <button
          type="button"
          className="sheet-submit-btn teal"
          onClick={handleComplete}
          disabled={proofBusy || loading}
          style={{ marginBottom: '8px' }}
        >
          {loading ? 'சேமிக்கப்படுகிறது...' : '✓ முடிந்தது என உறுதிப்படுத்து'}
        </button>

        <button
          type="button"
          className="sheet-submit-btn"
          onClick={handleClose}
          style={{ background: 'transparent', color: 'var(--text-sec)', padding: '10px' }}
        >
          ரத்து (Cancel)
        </button>
      </div>
    </>
  );
}
