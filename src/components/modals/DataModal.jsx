import React from 'react';

export default function DataModal({
  isOpen,
  onClose,
  onExportJSON,
  onImportJSON,
  onWipeAll,
}) {
  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSON(file);
      onClose();
    }
  };

  const handleWipe = () => {
    if (window.confirm('அனைத்து தரவுகளையும் அழிக்க நிச்சயமாக விரும்புகிறீர்களா? (Are you sure you want to clear all data?)')) {
      onWipeAll();
      onClose();
    }
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <div className="sheet-title">தரவு மேலாண்மை (Data & Backup)</div>

        {/* Clear All Data */}
        <div style={{ marginBottom: '18px', padding: '14px', background: 'var(--danger-bg)', borderRadius: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)', marginBottom: '4px' }}>
            🗑️ முழு தரவு அழிப்பு (Clear All Data)
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-sec)', marginBottom: '10px' }}>
            பணிகள், செலவுகள், வருவாய்கள் அனைத்தையும் முழுமையாக நீக்கி புதிய நிலைக்கு கொண்டுவரலாம்.
          </div>
          <button
            type="button"
            className="sheet-submit-btn"
            onClick={handleWipe}
            style={{ background: 'var(--danger)', color: '#fff', fontSize: '13.5px', padding: '10px' }}
          >
            முழு தரவையும் அழி (Clear Everything)
          </button>
        </div>

        {/* Export / Import Backup */}
        <div style={{ marginBottom: '18px', padding: '14px', background: 'var(--input-bg)', borderRadius: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)', marginBottom: '4px' }}>
            💾 காப்புப்பிரதி (JSON Backup)
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            தரவை கணினியில் பதிவிறக்கம் செய்ய அல்லது ஏற்கனவே உள்ள கோப்பை ஏற்றவும்.
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="sheet-submit-btn navy"
              onClick={onExportJSON}
              style={{ flex: 1, fontSize: '12.5px', padding: '10px' }}
            >
              📥 பேக்கப் பதிவிறக்கு
            </button>
            <label
              className="sheet-submit-btn"
              style={{
                flex: 1,
                fontSize: '12.5px',
                padding: '10px',
                background: 'var(--card)',
                color: 'var(--navy)',
                border: '1px solid var(--card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              📤 கோப்பை ஏற்று
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          className="sheet-submit-btn"
          onClick={onClose}
          style={{ background: 'transparent', color: 'var(--text-sec)', padding: '10px' }}
        >
          மூடு (Close)
        </button>
      </div>
    </>
  );
}
