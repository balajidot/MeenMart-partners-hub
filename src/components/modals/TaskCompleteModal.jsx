import React, { useState } from 'react';
import { compressImage } from '../../utils/calculations';

export default function TaskCompleteModal({ isOpen, task, onClose, onComplete }) {
  const [proof, setProof] = useState(null);
  const [proofLabel, setProofLabel] = useState('Attach completion proof photo (Optional)');
  const [proofBusy, setProofBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !task) return null;

  const handleClose = () => {
    setProof(null);
    setProofLabel('Attach completion proof photo (Optional)');
    setProofBusy(false);
    setLoading(false);
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofBusy(true);
    setProofLabel('Compressing photo...');
    try {
      const compressed = await compressImage(file);
      setProof(compressed);
      setProofLabel(`✓ Photo attached (${file.name.slice(0, 20)})`);
    } catch (err) {
      console.error(err);
      setProofLabel('❌ Error — please try again');
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
        <div className="sheet-title">Complete Task</div>

        {/* Task summary info */}
        <div className="sheet-assignee-box" style={{ marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--teal-dark)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '3px' }}>
              {task.to ? `Assigned to ${task.to}` : 'Shared task for all'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.3 }}>
              {task.title}
            </div>
            {task.from && task.from !== task.to && (
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Assigned by: <strong>{task.from}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Proof Photo Upload */}
        <div style={{ marginBottom: '22px' }}>
          <div className="sheet-field-label">📸 Proof Photo (Optional)</div>

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
                  setProofLabel('Attach completion proof photo (Optional)');
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
              <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>Auto-expires after 48 hours</span>
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
          {loading ? 'Saving...' : '✓ Confirm Completed'}
        </button>

        <button
          type="button"
          className="sheet-submit-btn"
          onClick={handleClose}
          style={{ background: 'transparent', color: 'var(--text-sec)', padding: '10px' }}
        >
          Cancel
        </button>
      </div>
    </>
  );
}
