import React, { useState, useRef } from 'react';
import { getLocalDateStr } from '../../utils/calculations';
import { PARTNER_NAMES } from '../../config/partners';

const PARTNER_CHIPS = [
  { label: 'Balaji', value: 'Balaji', activeClass: 'active-balaji' },
  { label: 'Nagoor', value: 'Nagoor', activeClass: 'active-nagoor' },
  { label: 'JP',     value: 'JP',     activeClass: 'active-jp'     },
  { label: 'Shared', value: 'Shared', activeClass: 'active-shared' },
];

const PRIORITY_CHIPS = [
  { label: 'Urgent', value: 'urgent', activeClass: 'active-danger' },
  { label: 'High',   value: 'high',   activeClass: 'active-warn'   },
  { label: 'Normal', value: 'normal', activeClass: 'active-navy'   },
];

export default function TaskModal({ isOpen, onClose, onAddTask, currentPartner, defaultDate }) {
  const from = currentPartner?.name || PARTNER_NAMES[0];

  const [title, setTitle] = useState('');
  const [assignTo, setAssignTo] = useState(from);
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);

  const handleClose = () => {
    setTitle('');
    setAssignTo(from);
    setPriority('normal');
    setLoading(false);
    isSubmitting.current = false;
    onClose();
  };

  if (!isOpen) return null;

  const canSubmit = title.trim() && !loading;

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!canSubmit || isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    onAddTask({
      title: title.trim(),
      from,
      to: assignTo === 'Shared' ? null : assignTo,
      assignedTo: assignTo,
      priority,
      dueDateTime: defaultDate || getLocalDateStr(),
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
        <div className="sheet-title">Pudhu Task</div>

        {/* Task title */}
        <input
          className="sheet-input"
          type="text"
          placeholder="Enna vela pannanum?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          autoFocus
          style={{ marginBottom: '18px' }}
        />

        {/* Assign to */}
        <div className="sheet-field-label">Yaaruku assign?</div>
        <div className="sheet-option-chips" style={{ marginBottom: '18px' }}>
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

        {/* Priority */}
        <div className="sheet-field-label">Priority</div>
        <div className="sheet-option-chips" style={{ marginBottom: '24px' }}>
          {PRIORITY_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={`sheet-option-chip${priority === chip.value ? ` ${chip.activeClass}` : ''}`}
              onClick={() => setPriority(chip.value)}
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
          {loading ? 'Saving...' : 'Task Add Pannu'}
        </button>
      </div>
    </>
  );
}
