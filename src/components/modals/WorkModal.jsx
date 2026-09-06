import React, { useState, useRef } from 'react';
import { getLocalDateStr } from '../../utils/calculations';

const PARTNER_CHIPS = [
  { label: 'Balaji', value: 'Balaji', activeClass: 'active-balaji' },
  { label: 'Nagoor', value: 'Nagoor', activeClass: 'active-nagoor' },
  { label: 'JP',     value: 'JP',     activeClass: 'active-jp'     },
];

export default function WorkModal({ isOpen, onClose, onAddWorklog, currentPartner }) {
  const partner = currentPartner?.name || 'Balaji';

  const [desc, setDesc] = useState('');
  const [hours, setHours] = useState('');
  const [assignTo, setAssignTo] = useState(partner);
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);

  const handleClose = () => {
    setDesc('');
    setHours('');
    setAssignTo(partner);
    setLoading(false);
    isSubmitting.current = false;
    onClose();
  };

  if (!isOpen) return null;

  const numHours = parseFloat(hours);
  const hoursValid = !isNaN(numHours) && numHours > 0;
  const canSubmit = desc.trim() && hoursValid && !loading;

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!canSubmit || isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    onAddWorklog({
      partner: assignTo,
      hours: numHours,
      desc: desc.trim(),
      activity: desc.trim(),
      date: getLocalDateStr(),
      proof: null,
      proofAddedAt: null,
    });
    handleClose();
  };

  return (
    <>
      <div className="sheet-overlay" onClick={handleClose} />
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <div className="sheet-title">Work Activity Log</div>

        {/* Activity description */}
        <input
          className="sheet-input"
          type="text"
          placeholder="Enna vela paartheenga?"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          autoFocus
          style={{ marginBottom: '16px' }}
        />

        {/* Hours */}
        <div className="sheet-field-label">Yevvalavu neram? (Hours)</div>
        <div className="sheet-amount-wrap" style={{ marginBottom: '18px' }}>
          <input
            className="sheet-amount-input"
            type="number"
            inputMode="decimal"
            placeholder="0"
            min="0.5"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <span
            className="sheet-amount-symbol"
            style={{ fontSize: '22px' }}
          >
            h
          </span>
        </div>

        {/* Assign to */}
        <div className="sheet-field-label">Yaaroda shift?</div>
        <div className="sheet-option-chips" style={{ marginBottom: '24px' }}>
          {PARTNER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={`sheet-option-chip${assignTo === chip.value ? ` ${chip.activeClass}` : ''}`}
              onClick={() => setAssignTo(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="sheet-submit-btn navy"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {loading ? 'Saving...' : 'Activity Save Pannu'}
        </button>
      </div>
    </>
  );
}
