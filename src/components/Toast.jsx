import React from 'react';

export default function Toast({ toast }) {
  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div className={`toast show ${isError ? 'error' : ''}`}>
      {toast.msg}
    </div>
  );
}
