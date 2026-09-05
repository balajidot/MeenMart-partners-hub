import React, { useState, useEffect } from 'react';
import { PARTNER_NAMES } from '../../config/partners';

export default function CapitalModal({ isOpen, onClose, onAddCapital, currentPartner }) {
  const partner = currentPartner?.name || PARTNER_NAMES[0];
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('கூடுதல் மூலதன முதலீடு');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setAmountTouched(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount);
  const amountValid = !isNaN(numAmount) && numAmount > 0;
  const amountError = amountTouched && !amountValid ? 'சரியான தொகை கொடுக்கவும்' : '';
  const canSubmit = amountValid && !loading;

  const handleSubmit = (e) => {
    e.preventDefault();
    setAmountTouched(true);
    if (!canSubmit) return;

    setLoading(true);
    onAddCapital({
      partner,
      amount: numAmount,
      date,
      note: note.trim(),
    });
    onClose();
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span aria-hidden="true">🏦</span>
            <div>
              <h3>மூலதன முதலீடு</h3>
              <small>Capital Injection</small>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label>முதலீடு செய்தவர்</label>
            <div className="locked-partner">
              {currentPartner?.avatar || '👤'} {partner}
            </div>
            <div className="locked-partner-hint">உங்கள் கணக்கிலிருந்து auto-set</div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="cap-amount">முதலீட்டுத் தொகை (₹) *</label>
              <input
                id="cap-amount"
                type="number"
                min="1"
                step="100"
                placeholder="எ.கா: 30000"
                className={`form-input mono ${amountError ? 'error' : ''}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => setAmountTouched(true)}
                autoFocus
              />
              {amountError && <div className="form-error">⚠ {amountError}</div>}
            </div>

            <div className="form-field">
              <label htmlFor="cap-date">தேதி *</label>
              <input
                id="cap-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="cap-note">குறிப்பு</label>
            <input
              id="cap-note"
              type="text"
              className="form-input"
              placeholder="எ.கா: ஆரம்ப முதலீடு"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              ரத்து
            </button>
            <button type="submit" className="btn-submit" disabled={!canSubmit}>
              {loading ? '⏳ சேமிக்கிறது...' : '💾 மூலதனம் பதிவு'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
