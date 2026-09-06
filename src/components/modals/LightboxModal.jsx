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
    <>
      <div className="sheet-overlay" onClick={onClose} style={{ zIndex: 100 }} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '460px',
          background: '#fff',
          borderRadius: '20px',
          padding: '16px',
          zIndex: 105,
          boxShadow: '0 12px 48px rgba(22, 34, 74, 0.25)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--navy)' }}>
              {title || 'Proof Photo'}
            </span>
            <span style={{ fontSize: '12px', marginLeft: '8px', color: 'var(--text-muted)' }}>
              &middot; {partner}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lightbox"
            style={{
              background: 'var(--input-bg)',
              border: 'none',
              borderRadius: '8px',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              color: 'var(--text-sec)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
          }}
        >
          <img
            src={imgUrl}
            alt="Proof"
            style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ⏳ {expiryText ? `Expires in ${expiryText}` : 'Expires in 48 hours'}
          </span>
          <button
            type="button"
            className="sheet-submit-btn navy"
            onClick={handleDownload}
            style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}
          >
            📥 Download
          </button>
        </div>
      </div>
    </>
  );
}
