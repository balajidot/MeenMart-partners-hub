import React from 'react';

export default function DataModal({
  isOpen,
  onClose,
  onWipeAll,
  isOnline = true,
  lastSyncedAt,
  store = {},
  currentPartner,
}) {
  if (!isOpen) return null;

  const handleWipe = () => {
    if (window.confirm('⚠️ Are you sure you want to reset all operational data? This will clear all tasks, expenses, revenues, and shift logs from the cloud database.')) {
      if (window.confirm('⚠️ Final confirmation: Reset everything to zero?')) {
        onWipeAll?.();
        onClose();
      }
    }
  };

  const tasksCount = (store.tasks || []).length;
  const expensesCount = (store.expenses || []).length;
  const revenuesCount = (store.revenues || []).length;
  const worklogsCount = (store.worklogs || []).length;
  const messagesCount = (store.messages || []).length;

  const syncTimeStr = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <div className="sheet-header-row">
          <div className="sheet-title" style={{ margin: 0 }}>System &amp; Cloud Sync</div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Realtime Status Banner */}
        <div
          style={{
            marginBottom: '16px',
            padding: '14px',
            background: isOnline ? 'rgba(15, 158, 142, 0.08)' : 'rgba(224, 138, 11, 0.08)',
            border: `1px solid ${isOnline ? 'rgba(15, 158, 142, 0.25)' : 'rgba(224, 138, 11, 0.25)'}`,
            borderRadius: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: isOnline ? '#0F9E8E' : '#E08A0B',
                  boxShadow: isOnline ? '0 0 10px #0F9E8E' : 'none',
                }}
              />
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--navy)' }}>
                {isOnline ? 'Realtime Database Live' : 'Offline Mode'}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {syncTimeStr}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-sec)', lineHeight: 1.4 }}>
            {isOnline
              ? 'All tasks, ledger entries, shifts, and messages are backed up to Firebase Realtime Database in real time.'
              : 'Changes are cached safely on your device and will auto-sync when connection is restored.'}
          </div>
        </div>

        {/* Database Stats Card */}
        <div style={{ marginBottom: '16px', padding: '14px', background: 'var(--input-bg)', borderRadius: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
            Cloud Database Records
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy)' }}>{tasksCount}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tasks</div>
            </div>
            <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--teal-dark)' }}>{expensesCount + revenuesCount}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ledger</div>
            </div>
            <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#B4531F' }}>{worklogsCount}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shifts</div>
            </div>
          </div>
          {currentPartner && (
            <div style={{ marginTop: '10px', fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Signed in as: <strong>{currentPartner.name}</strong></span>
              <span>{messagesCount} chat messages</span>
            </div>
          )}
        </div>

        {/* Clear Data / Reset */}
        <div style={{ marginBottom: '16px', padding: '14px', background: 'var(--danger-bg)', borderRadius: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)', marginBottom: '3px' }}>
            🗑️ Reset Database
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-sec)', marginBottom: '10px' }}>
            Wipe all records to start fresh operations with zero entries.
          </div>
          <button
            type="button"
            className="sheet-submit-btn"
            onClick={handleWipe}
            style={{ background: 'var(--danger)', color: '#fff', fontSize: '13px', padding: '9px' }}
          >
            Clear All Data
          </button>
        </div>

        <button
          type="button"
          className="sheet-submit-btn"
          onClick={onClose}
          style={{ background: 'transparent', color: 'var(--text-sec)', padding: '10px' }}
        >
          Close
        </button>
      </div>
    </>
  );
}
