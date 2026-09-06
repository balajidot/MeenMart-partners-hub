import React from 'react';

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast${toast.type === 'error' ? ' error' : ''}`} role="status" aria-live="polite">
      {toast.msg}
    </div>
  );
}
