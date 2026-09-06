import React, { useState, useRef } from 'react';
import { getLocalDateStr } from '../../utils/calculations';
import { PARTNER_NAMES } from '../../config/partners';

const PARTNER_CHIPS = [
  { label: 'Balaji', value: 'Balaji', activeClass: 'active-balaji' },
  { label: 'Nagoor', value: 'Nagoor', activeClass: 'active-nagoor' },
  { label: 'JP',     value: 'JP',     activeClass: 'active-jp'     },
];

export default function CapitalModal({ isOpen, onClose, onAddCapital, currentPartner }) {
  const defaultPartner = currentPartner?.name || PARTNER_NAMES[0];
  const [partner, setPartner] = useState(defaultPartner);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('Additional capital contribution');
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);

  const handleClose = () => {
    setAmount('');
    setNote('Additional capital contribution');
    setLoading(false);
    isSubmitting.current = false;
    onClose();
  };

  if (!isOpen) return null;

  const numAmount = parseFloat(amount);
  const amountValid = !isNaN(numAmount) && numAmount > 0;
  const canSubmit = amountValid && !loading;

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!canSubmit || isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    onAddCapital({
      partner,
      amount: numAmount,
      date: getLocalDateStr(),
      note: note.trim() || 'Capital Contribution',
    });
    handleClose();
  };

  return (
    <>
      <div className="sheet-overlay" onClick={handleClose} />
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <div className="sheet-title">Add Founder Capital</div>

        {/* Amount Input */}
        <div className="sheet-amount-wrap" style={{ marginBottom: '16px' }}>
          <span className="sheet-amount-symbol">₹</span>
          <input
            className="sheet-amount-input"
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            autoFocus
          />
        </div>

        {/* Partner Selection */}
        <div className="sheet-field-label">Contributed by</div>
        <div className="sheet-option-chips" style={{ marginBottom: '16px' }}>
          {PARTNER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={`sheet-option-chip${partner === chip.value ? ` ${chip.activeClass}` : ''}`}
              onClick={() => setPartner(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Note */}
        <div className="sheet-field-label">Note / Description</div>
        <input
          className="sheet-input"
          type="text"
          placeholder="e.g. Working capital injection"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ marginBottom: '22px' }}
        />

        {/* Submit */}
        <button
          type="button"
          className="sheet-submit-btn teal"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ marginBottom: '8px' }}
        >
          {loading ? 'Saving...' : 'Add Capital'}
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
