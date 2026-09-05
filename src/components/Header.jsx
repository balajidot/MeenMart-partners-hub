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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

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
        <div className="brand-badge" aria-hidden="true">M</div>
        <div className="brand-name">
          MeenMart <span className="brand-portal-pill">Partners</span>
        </div>
      </div>

      <div className="header-actions">
        {deferredPrompt && (
          <button
            className="pwa-install-btn"
            onClick={handleInstallClick}
            title="ஆப்பை மொபைலில் நிறுவவும் (Install PWA)"
            aria-label="Install App"
          >
            📲 <span className="pwa-install-text">நிறுவு</span>
          </button>
        )}

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
              <span className="user-chip-name">{partner?.name || 'User'}</span>
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
                  {deferredPrompt && (
                    <button
                      className="user-menu-item"
                      onClick={() => { setMenuOpen(false); handleInstallClick(); }}
                    >
                      📲 ஆப்பை நிறுவு (Install App)
                    </button>
                  )}
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

