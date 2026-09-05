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
    <div className="modal-overlay open" onClick={handleClose}>
      <div className="modal-sheet task-complete-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span aria-hidden="true">🎉</span>
            <div>
              <h3>பணியை முடிக்கவும்</h3>
              <small>Complete Task & Attach Proof</small>
            </div>
          </div>
          <button className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          <div className="task-complete-summary">
            <div className="task-complete-pill">{task.to} அவர்களின் பணி</div>
            <div className="task-complete-title">{task.title}</div>
            <div className="task-complete-sub">
              {task.from !== task.to && <span>ஒதுக்கியவர்: <strong>{task.from}</strong> • </span>}
              <span>நிலை: <strong>முடிக்கப்படுகிறது</strong></span>
            </div>
          </div>

          <div className="form-field" style={{ marginTop: '14px' }}>
            <label>📸 பணி முடிந்ததற்கான சான்று (Proof Photo)</label>
            <label className="file-upload">
              <div className="file-upload-icon">{proof ? '🖼️' : '📷'}</div>
              <div className="file-upload-text">{proofLabel}</div>
              <div className="file-upload-hint">48 மணி நேரத்திற்குப் பிறகு தானாக அழியும்</div>
              <input
                type="file"
                accept="image/*"
                className="file-hidden"
                onChange={handleFileChange}
              />
            </label>

            {proof && (
              <div className="task-complete-preview">
                <img src={proof} alt="Proof preview" className="task-complete-preview-img" />
                <button
                  type="button"
                  className="btn-text-danger"
                  onClick={() => {
                    setProof(null);
                    setProofLabel('பணி முடிந்ததற்கான புகைப்படம் இணைக்கலாம் (Optional)');
                  }}
                >
                  ✕ படத்தை நீக்கு
                </button>
              </div>
            )}
          </div>

          <div className="form-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn-cancel" onClick={handleClose}>
              ரத்து
            </button>
            <button
              type="button"
              className="btn-submit"
              onClick={handleComplete}
              disabled={proofBusy || loading}
            >
              {loading ? '⏳ சேமிக்கிறது...' : '✓ முடிந்தது என சேமி'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
