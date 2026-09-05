import React, { useState } from 'react';
import { compressImage, getLocalDateStr } from '../../utils/calculations';
import { PARTNER_NAMES } from '../../config/partners';

const WORK_CATEGORIES = [
  '🐟 மீன் கொள்முதல் (Procurement)',
  '📦 பேக்கிங் & கிளீனிங் (Packaging)',
  '🛵 டெலிவரி மேலாண்மை (Delivery)',
  '💻 ஆப் & டெவலப்மென்ட் (Tech/App)',
  '📢 மார்க்கெட்டிங் & வாடிக்கையாளர் (Sales)',
  '📋 வணிகத் திட்டம் & கணக்கு (Operations)',
];

const PRESETS = [2, 4, 6, 8];

export default function WorkModal({ isOpen, onClose, onAddWorklog, currentPartner }) {
  const partner = currentPartner?.name || PARTNER_NAMES[0];
  const [hours, setHours] = useState(4);
  const [category, setCategory] = useState(WORK_CATEGORIES[0]);
  const [date, setDate] = useState(() => getLocalDateStr());
  const [desc, setDesc] = useState('');
  const [descTouched, setDescTouched] = useState(false);
  const [proof, setProof] = useState(null);
  const [proofLabel, setProofLabel] = useState('புகைப்படம் இணைக்க தட்டவும்');
  const [proofBusy, setProofBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setDesc('');
    setDescTouched(false);
    setProof(null);
    setProofLabel('புகைப்படம் இணைக்க தட்டவும்');
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  const numHours = parseFloat(hours);
  const hoursValid = !isNaN(numHours) && numHours > 0;
  const descError = descTouched && !desc.trim() ? 'செய்த வேலைகள் விவரம் தேவை' : '';
  const canSubmit = hoursValid && desc.trim() && !proofBusy && !loading;

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
    setDescTouched(true);
    if (!canSubmit) return;

    setLoading(true);
    onAddWorklog({
      partner,
      hours: numHours,
      category,
      date: date || getLocalDateStr(),
      desc: desc.trim(),
      proof,
      proofAddedAt: proof ? Date.now() : null,
    });
    handleClose();
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span aria-hidden="true">⏱️</span>
            <div>
              <h3>உழைப்புப் பதிவு</h3>
              <small>Log Daily Hours & Proof</small>
            </div>
          </div>
          <button className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label>பங்குதாரர்</label>
            <div className="locked-partner">
              {currentPartner?.avatar || '👤'} {partner}
            </div>
            <div className="locked-partner-hint">உங்கள் கணக்கிலிருந்து auto-set</div>
          </div>

          <div className="form-field">
            <label htmlFor="work-hours">உழைத்த மணிநேரம் *</label>
            <input
              id="work-hours"
              type="number"
              min="0.5"
              step="0.5"
              className="form-input mono"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
            <div className="hour-presets">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`hour-preset ${Number(hours) === p ? 'active' : ''}`}
                  onClick={() => setHours(p)}
                >
                  {p}h
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="work-cat">வேலை வகை *</label>
              <select
                id="work-cat"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {WORK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="work-date">தேதி *</label>
              <input
                id="work-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="work-desc">செய்த முக்கிய வேலைகள் *</label>
            <textarea
              id="work-desc"
              rows="3"
              className={`form-input ${descError ? 'error' : ''}`}
              placeholder="எ.கா: காலை 5 மணிக்கு மார்க்கெட் சென்று பிரெஷ் வஞ்சிரம், சங்கரா கொள்முதல் செய்து 12 ஆர்டர்கள் பேக்கிங்..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => setDescTouched(true)}
            />
            {descError && <div className="form-error">⚠ {descError}</div>}
          </div>

          <div className="form-field">
            <label>📸 உழைப்பு சான்று புகைப்படம் (Optional)</label>
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
            <button type="button" className="btn-cancel" onClick={handleClose}>
              ரத்து
            </button>
            <button type="submit" className="btn-submit" disabled={!canSubmit}>
              {loading ? '⏳ சேமிக்கிறது...' : '💾 சேமிக்க'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
