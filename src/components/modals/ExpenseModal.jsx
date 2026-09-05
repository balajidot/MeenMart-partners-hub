import React, { useState } from 'react';
import { compressImage, getLocalDateStr } from '../../utils/calculations';
import { PARTNER_NAMES } from '../../config/partners';

const CATEGORIES = [
  '🐟 மீன் கொள்முதல் (Procurement)',
  '🛵 டெலிவரி & பெட்ரோல் (Delivery & Fuel)',
  '📦 பேக்கிங் & ஐஸ் பாக்ஸ் (Packaging)',
  '💻 ஆப் & சர்வர் கட்டணம் (Tech/Server)',
  '📢 மார்க்கெட்டிங் & விளம்பரம் (Marketing)',
  '📋 இதர செயல்பாட்டுச் செலவு (Misc)',
];

export default function ExpenseModal({ isOpen, onClose, onAddExpense, currentPartner }) {
  const partner = currentPartner?.name || PARTNER_NAMES[0];
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  const [date, setDate] = useState(() => getLocalDateStr());
  const [proof, setProof] = useState(null);
  const [proofLabel, setProofLabel] = useState('ரசீது / பில் புகைப்படம் இணைக்க தட்டவும்');
  const [proofBusy, setProofBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setAmount('');
    setAmountTouched(false);
    setReason('');
    setReasonTouched(false);
    setProof(null);
    setProofLabel('ரசீது / பில் புகைப்படம் இணைக்க தட்டவும்');
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  const numAmount = parseFloat(amount);
  const amountValid = !isNaN(numAmount) && numAmount > 0;
  const amountError = amountTouched && !amountValid ? 'சரியான தொகை கொடுக்கவும்' : '';
  const reasonError = reasonTouched && !reason.trim() ? 'செலவின் காரணம் தேவை' : '';
  const canSubmit = amountValid && reason.trim() && !proofBusy && !loading;

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
    setAmountTouched(true);
    setReasonTouched(true);
    if (!canSubmit) return;

    setLoading(true);
    onAddExpense({
      partner,
      amount: numAmount,
      category,
      reason: reason.trim(),
      date: date || getLocalDateStr(),
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
            <span aria-hidden="true">💰</span>
            <div>
              <h3>புதிய செலவு பதிவு</h3>
              <small>Business Expense & Auto Capital Credit</small>
            </div>
          </div>
          <button className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          <div className="info-alert">
            💡 நீங்கள் செய்யும் இந்தச் செலவு நேரடியாக உங்களின் மூலதன பங்களிப்பாகவும் கணக்கிடப்படும் (Auto Capital Credit).
          </div>

          <div className="form-field">
            <label>செலவு செய்தவர்</label>
            <div className="locked-partner">
              {currentPartner?.avatar || '👤'} {partner}
            </div>
            <div className="locked-partner-hint">உங்கள் கணக்கிலிருந்து auto-set</div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="exp-amount">தொகை (₹) *</label>
              <input
                id="exp-amount"
                type="number"
                min="1"
                step="1"
                placeholder="எ.கா: 2500"
                className={`form-input mono ${amountError ? 'error' : ''}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => setAmountTouched(true)}
                autoFocus
              />
              {amountError && <div className="form-error">⚠ {amountError}</div>}
            </div>

            <div className="form-field">
              <label htmlFor="exp-date">தேதி *</label>
              <input
                id="exp-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="exp-cat">செலவு வகை *</label>
            <select
              id="exp-cat"
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="exp-reason">செலவு காரணம் / விவரம் *</label>
            <input
              id="exp-reason"
              type="text"
              className={`form-input ${reasonError ? 'error' : ''}`}
              placeholder="எ.கா: காசிமேட்டில் 10kg வஞ்சிரம் வாங்கியது"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setReasonTouched(true)}
            />
            {reasonError && <div className="form-error">⚠ {reasonError}</div>}
          </div>

          <div className="form-field">
            <label>📸 ரசீது / பில் புகைப்படம் (Optional)</label>
            <label className="file-upload">
              <div className="file-upload-icon">🧾</div>
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
