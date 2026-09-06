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

const TIME_PRESETS = [
  { label: '07:00 AM', value: '07:00 AM', hint: 'Kaalai Sandhai' },
  { label: '09:30 AM', value: '09:30 AM', hint: 'Packing & Cleaning' },
  { label: '01:00 PM', value: '01:00 PM', hint: 'Madhiya Slot' },
  { label: '05:00 PM', value: '05:00 PM', hint: 'Maalai Delivery' },
  { label: '08:30 PM', value: '08:30 PM', hint: 'Night Tally' },
];

function formatTime12h(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function TaskModal({ isOpen, onClose, onAddTask, currentPartner, defaultDate }) {
  const from = currentPartner?.name || PARTNER_NAMES[0];

  const [title, setTitle] = useState('');
  const [assignTo, setAssignTo] = useState(from);
  const [priority, setPriority] = useState('normal');
  const [dueTime, setDueTime] = useState('01:00 PM');
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);

  const handleClose = () => {
    setTitle('');
    setAssignTo(from);
    setPriority('normal');
    setDueTime('01:00 PM');
    setIsCustomTime(false);
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
      assignedBy: from,
      to: assignTo,
      assignedTo: assignTo,
      priority,
      dueDateTime: defaultDate || getLocalDateStr(),
      dueTime: dueTime || null,
      proof: null,
      proofAddedAt: null,
    });
    handleClose();
  };

  return (
    <>
      <div className="sheet-overlay" onClick={handleClose} />
      <div className="bottom-sheet">
        {/* Modal Header with Title & ✕ Close button */}
        <div className="sheet-header-row">
          <div className="sheet-title" style={{ margin: 0 }}>Pudhu Task</div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Assigner banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--chip-bg)',
            borderRadius: '10px',
            fontSize: '12px',
            color: 'var(--text-sec)',
            marginBottom: '14px',
          }}>
            <span>👤 <strong>Assign pannavaru:</strong></span>
            <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{from}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(Logged-in partner)</span>
          </div>

          {/* Task title */}
          <input
            id="task_create_title"
            name="task_create_title"
            className="sheet-input"
            type="text"
            placeholder="Enna vela pannanum?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            enterKeyHint="done"
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

          {/* Deadline Time Picker */}
          <div className="sheet-field-label">
            ⏰ Ethana manikulla mudikanum? (Deadline Time)
          </div>
          <div className="sheet-option-chips" style={{ marginBottom: '10px' }}>
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`sheet-option-chip${dueTime === preset.value && !isCustomTime ? ' active-navy' : ''}`}
                onClick={() => {
                  setDueTime(preset.value);
                  setIsCustomTime(false);
                }}
                title={preset.hint}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              className={`sheet-option-chip${isCustomTime ? ' active-navy' : ''}`}
              onClick={() => setIsCustomTime(true)}
            >
              ✏️ Custom Time
            </button>
          </div>

          {isCustomTime && (
            <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="time"
                name="task_custom_time"
                className="sheet-input"
                style={{ width: '160px', padding: '8px 12px', fontSize: '14px' }}
                onChange={(e) => {
                  if (e.target.value) {
                    setDueTime(formatTime12h(e.target.value));
                  }
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-sec)' }}>
                Selected: <strong>{dueTime}</strong>
              </span>
            </div>
          )}

          {/* Priority */}
          <div className="sheet-field-label" style={{ marginTop: '10px' }}>Priority</div>
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
            type="submit"
            className="sheet-submit-btn navy"
            disabled={!canSubmit}
          >
            {loading ? 'Saving...' : `Task Add Pannu (${dueTime}-kulla)`}
          </button>
        </form>
      </div>
    </>
  );
}
