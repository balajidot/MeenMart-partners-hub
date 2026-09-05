import React from 'react';
import { getProofExpiryText } from '../../utils/calculations';

export default function LightboxModal({ proofData, onClose }) {
  if (!proofData) return null;

  const { imgUrl, partner, title, addedAt } = proofData;
  const expiryText = getProofExpiryText(addedAt);

  const handleDownload = () => {
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `meenmart-proof-${partner || 'work'}-${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className={`lightbox-overlay ${proofData ? 'open' : ''}`} onClick={onClose}>
      <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="chip normal">{title || 'சான்று'}</span>
            <span style={{ fontSize: 12, marginLeft: 8, color: 'var(--text-secondary)' }}>
              பதிவு: {partner}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <img src={imgUrl} alt="Proof Full" className="lightbox-img" />

        <div className="lightbox-footer">
          <span className="expiry-badge">
            ⏳ {expiryText ? `${expiryText} அழியும்` : '48 மணி நேரத்தில் அழியும்'}
          </span>
          <button className="btn-sm" onClick={handleDownload}>
            📥 சேமி
          </button>
        </div>
      </div>
    </div>
  );
}
