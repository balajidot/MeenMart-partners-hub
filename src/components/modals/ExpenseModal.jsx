import React, { useState, useRef } from 'react';
import { getLocalDateStr } from '../../utils/calculations';

const EXPENSE_CATEGORIES = ['Fish', 'Ice', 'Packing', 'Transport'];
const REVENUE_CATEGORIES = ['Retail', 'Bulk', 'Online', 'Other'];

export default function ExpenseModal({
  isOpen,
  onClose,
  onAddExpense,
  onUpdateExpense,
  currentPartner,
  kind = 'expense',
  initialData = null,
}) {
  const partner = currentPartner?.name || 'Balaji';
  const isRevenue = kind === 'revenue';
  const isEditing = !!initialData;

  const categories = isRevenue ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;

  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
  const [label, setLabel] = useState(initialData?.reason || initialData?.label || '');
  const [category, setCategory] = useState(initialData?.category || categories[0]);
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);

  const handleClose = () => {
    setAmount('');
    setLabel('');
    setCategory(categories[0]);
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

    const payload = {
      partner,
      amount: numAmount,
      category,
      reason: label.trim() || category,
      label: label.trim() || category,
      date: initialData?.date || getLocalDateStr(),
      proof: initialData?.proof || null,
      proofAddedAt: initialData?.proofAddedAt || null,
      kind,
    };

    if (isEditing && onUpdateExpense) {
      onUpdateExpense(initialData.id, payload, partner);
    } else if (onAddExpense) {
      onAddExpense(payload);
    }
    handleClose();
  };

  return (
    <>
      <div className="sheet-overlay" onClick={handleClose} />
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <div className="sheet-header-row">
          <div className="sheet-title" style={{ margin: 0 }}>
            {isEditing
              ? isRevenue ? 'Varavu Edit Pannu' : 'Selavu Edit Pannu'
              : isRevenue ? 'Varavu Entry Podu' : 'Selavu Entry Podu'}
          </div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Logged-in Partner Lock Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 13px',
            background: 'var(--chip-bg)',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-sec)' }}>Partner:</span>
            <strong style={{ color: 'var(--navy)', fontSize: '13px' }}>{partner}</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(Logged-in User)</span>
          </div>
          <span
            style={{
              fontSize: '10.5px',
              padding: '2px 7px',
              borderRadius: '6px',
              background: 'rgba(22, 34, 74, 0.08)',
              color: 'var(--navy)',
              fontWeight: 600,
            }}
          >
            🔒 Strict Owner
          </span>
        </div>

        {/* Amount */}
        <div className="sheet-amount-wrap" style={{ marginBottom: '16px' }}>
          <span className="sheet-amount-symbol">&#8377;</span>
          <input
            className="sheet-amount-input"
            type="number"
            inputMode="decimal"
            placeholder="0"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>

        {/* Label / description */}
        <input
          className="sheet-input"
          type="text"
          placeholder={isRevenue ? 'Enna sales varavu?' : 'Edhuku selavu pannaachu?'}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ marginBottom: '18px' }}
        />

        {/* Category chips */}
        <div className="sheet-field-label">Category</div>
        <div className="sheet-option-chips" style={{ marginBottom: '24px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`sheet-option-chip${
                category === cat ? (isRevenue ? ' active-teal' : ' active-navy') : ''
              }`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`sheet-submit-btn${isRevenue ? ' teal' : ' navy'}`}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {loading
            ? 'Saving...'
            : isEditing
            ? isRevenue ? 'Varavu Update Pannu' : 'Selavu Update Pannu'
            : isRevenue ? 'Varavu Save Pannu' : 'Selavu Save Pannu'}
        </button>
      </div>
    </>
  );
}
