import React, { useEffect, useState, useRef } from 'react';

const THEME_KEY = 'meenmart_theme';

function readInitialTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'system'; }
  catch { return 'system'; }
}

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

export default function Header({ onOpenData, onShareWA, user, partner, onSignOut }) {
  const [theme, setTheme] = useState(readInitialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const cycleTheme = () => {
    setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'));
  };
  const themeIcon = theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🖥️';
  const themeTitle =
    theme === 'light' ? 'Light theme — tap to switch to Dark'
    : theme === 'dark' ? 'Dark theme — tap to switch to System'
    : 'System theme — tap to switch to Light';

  const initial = (partner?.name || user?.displayName || 'U').charAt(0).toUpperCase();

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

        {user ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              className="user-chip"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={`Signed in as ${partner?.name || user.displayName}`}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              {user.photoURL ? (
                <img className="user-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="user-avatar-fallback" aria-hidden="true">{initial}</span>
              )}
              <span>{partner?.name || 'User'}</span>
            </button>

            {menuOpen && (
              <>
                <div
                  className="user-menu-overlay"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="user-menu" role="menu">
                  <div className="user-menu-header">
                    <div className="user-menu-name">
                      {partner?.avatar} {partner?.name} — {partner?.role}
                    </div>
                    <div className="user-menu-email">{user.email}</div>
                  </div>
                  <button
                    className="user-menu-item"
                    onClick={() => { setMenuOpen(false); onOpenData(); }}
                  >
                    ⚙️ தரவு மேலாண்மை
                  </button>
                  <button
                    className="user-menu-item danger"
                    onClick={() => { setMenuOpen(false); onSignOut?.(); }}
                  >
                    🚪 வெளியேறு (Sign out)
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            className="btn-icon"
            onClick={onOpenData}
            title="தரவு மேலாண்மை"
            aria-label="தரவு மேலாண்மை"
          >
            ⚙️
          </button>
        )}
      </div>
    </header>
  );
}
