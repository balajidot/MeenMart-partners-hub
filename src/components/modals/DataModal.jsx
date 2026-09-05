import React from 'react';

export default function DataModal({
  isOpen,
  onClose,
  onExportJSON,
  onImportJSON,
  onLoadDemo,
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
    if (window.confirm('அனைத்து தரவுகளையும் அழிக்க நிச்சயமாக விரும்புகிறீர்களா?')) {
      onWipeAll();
      onClose();
    }
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span>⚙️</span>
            <div>
              <h3>தரவு மேலாண்மை & காப்புப்பிரதி</h3>
              <small>Data Sync, Backup & Reset</small>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="data-section">
            <h4>📥 காப்புப்பிரதி பதிவிறக்கம் (Export JSON)</h4>
            <p>
              உங்கள் பணிகள், செலவுகள், உழைப்புப் பதிவுகள் அனைத்தையும் JSON கோப்பாக
              சேமிக்கவும்.
            </p>
            <button className="btn-data" onClick={onExportJSON}>
              💾 பேக்கப் பதிவிறக்கு (Download Backup)
            </button>
          </div>

          <div className="data-section">
            <h4>📤 காப்புப்பிரதி ஏற்றுமதி (Import JSON)</h4>
            <p>ஏற்கனவே சேமித்த பேக்கப் கோப்பை ஏற்றி தரவுகளை மீட்டெடுக்கவும்.</p>
            <label className="btn-data">
              📁 பேக்கப் கோப்பைத் தேர்ந்தெடு
              <input
                type="file"
                accept=".json"
                className="file-hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="data-section">
            <h4 style={{ color: 'var(--accent-red)' }}>
              ⚠️ மாதிரி தரவு / தரவு அழிப்பு
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn-data" onClick={onLoadDemo}>
                🔄 மாதிரி தரவு ஏற்று (Load Demo Data)
              </button>
              <button className="btn-data danger" onClick={handleWipe}>
                🗑️ முழு தரவை அழி (Wipe All Data)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
