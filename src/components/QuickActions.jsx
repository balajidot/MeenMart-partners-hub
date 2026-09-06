import React, { useState, useEffect, useCallback } from 'react';
import Icon from './Icons';

export default function QuickActions({ onOpenTask, onOpenExpense, onOpenWork }) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const fire = (fn) => {
    close();
    fn?.();
  };

  return (
    <>
      <div
        className={`fab-backdrop ${open ? 'show' : ''}`}
        onClick={close}
        aria-hidden={!open}
      />

      <div className="fab-wrap" aria-label="Quick actions">
        <div className={`fab-action ${open ? 'show' : ''}`} style={{ transitionDelay: open ? '80ms' : '0ms' }}>
          <span className="fab-action-label">உழைப்பு பதிவு</span>
          <button
            className="fab-action-btn"
            onClick={() => fire(onOpenWork)}
            aria-label="Log work hours"
          >
            <Icon name="clock" size={18} />
          </button>
        </div>

        <div className={`fab-action ${open ? 'show' : ''}`} style={{ transitionDelay: open ? '40ms' : '0ms' }}>
          <span className="fab-action-label">புதிய செலவு</span>
          <button
            className="fab-action-btn secondary"
            onClick={() => fire(onOpenExpense)}
            aria-label="Add expense"
          >
            <Icon name="dollar" size={18} />
          </button>
        </div>

        <div className={`fab-action ${open ? 'show' : ''}`}>
          <span className="fab-action-label">புதிய பணி</span>
          <button
            className="fab-action-btn primary"
            onClick={() => fire(onOpenTask)}
            aria-label="Add task"
          >
            <Icon name="tasks" size={18} />
          </button>
        </div>

        <button
          className={`fab-main ${open ? 'open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close quick actions' : 'Open quick actions'}
          aria-expanded={open}
        >
          {open ? <Icon name="close" size={20} /> : <Icon name="plus" size={20} />}
        </button>
      </div>
    </>
  );
}
