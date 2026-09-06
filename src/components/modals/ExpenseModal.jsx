import React, { useState } from 'react';
import { getLocalDateStr } from '../../utils/calculations';

const EXPENSE_CATEGORIES = ['Fish', 'Ice', 'Packing', 'Transport'];
const REVENUE_CATEGORIES = ['Retail', 'Bulk', 'Online', 'Other'];

const PARTNER_CHIPS = [
  { label: 'Balaji', value: 'Balaji', activeClass: 'active-balaji' },
  { label: 'Nagoor', value: 'Nagoor', activeClass: 'active-nagoor' },
  { label: 'JP',     value: 'JP',     activeClass: 'active-jp'     },
  { label: 'Shared', value: 'Shared', activeClass: 'active-shared' },
];

export default function ExpenseModal({ isOpen, onClose, onAddExpense, currentPartner, kind = 'expense' }) {
  const partner = currentPartner?.name || 'Balaji';
  const isRevenue = kind === 'revenue';

  const categories = isRevenue ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;

  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [assignTo, setAssignTo] = useState(partner);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setAmount('');
    setLabel('');
    setCategory(categories[0]);
    setAssignTo(partner);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  const numAmount = parseFloat(amount);
  const amountValid = !isNaN(numAmount) && numAmount > 0;
  const canSubmit = amountValid && !loading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setLoading(true);
    onAddExpense({
      partner: assignTo === 'Shared' ? partner : assignTo,
      amount: numAmount,
      category,
      reason: label.trim() || category,
      date: getLocalDateStr(),
      proof: null,
      proofAddedAt: null,
      kind,
    });
    handleClose();
  };

  return (
    <>
      <div className="sheet-overlay" onClick={handleClose} />
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <div className="sheet-title">
          {isRevenue ? 'Log revenue' : 'Log an expense'}
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
          placeholder={isRevenue ? 'Revenue description...' : 'Expense description...'}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ marginBottom: '18px' }}
        />

        {/* Category chips */}
        <div className="sheet-field-label">Category</div>
        <div className="sheet-option-chips" style={{ marginBottom: '18px' }}>
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

        {/* Assign to */}
        <div className="sheet-field-label">Assign to</div>
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
          className={`sheet-submit-btn${isRevenue ? ' teal' : ' navy'}`}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {loading ? 'Saving...' : (isRevenue ? 'Log revenue' : 'Log expense')}
        </button>
      </div>
    </>
  );
}
