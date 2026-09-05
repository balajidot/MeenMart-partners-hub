import React, { useEffect, useState } from 'react';

const THEME_KEY = 'meenmart_theme';

function readInitialTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

export default function Header({ onOpenData, onShareWA }) {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const cycleTheme = () => {
    setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'));
  };
  const themeIcon = theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🖥️';
  const themeTitle =
    theme === 'light' ? 'Light theme — tap to switch to Dark'
    : theme === 'dark' ? 'Dark theme — tap to switch to System'
    : 'System theme — tap to switch to Light';

  return (
    <header className="app-header">
      <div className="brand-area">
        <div className="brand-badge" aria-hidden="true">🐟</div>
        <div>
          <div className="brand-name">
            MeenMart <span className="hub-pill">OPS HUB</span>
          </div>
          <div className="brand-founders">
            <span className="dot dot-b" />Balaji ·{' '}
            <span className="dot dot-n" />Nagoor ·{' '}
            <span className="dot dot-j" />JP
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button
          className="btn-icon"
          onClick={cycleTheme}
          title={themeTitle}
          aria-label={themeTitle}
        >
          {themeIcon}
        </button>
        <button
          className="btn-icon"
          onClick={onShareWA}
          title="WhatsApp Share"
          aria-label="WhatsApp Share"
        >
          💬
        </button>
        <button
          className="btn-icon"
          onClick={onOpenData}
          title="தரவு மேலாண்மை"
          aria-label="தரவு மேலாண்மை"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
