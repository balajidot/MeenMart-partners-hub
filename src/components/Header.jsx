import React, { useEffect, useState, useRef } from 'react';
import Icon from './Icons';

const THEME_KEY = 'meenmart_theme';

const NAV_TABS = [
  { id: 'tasks',     label: 'பணிகள்',    sub: 'Tasks',     icon: 'tasks', hasBadge: true },
  { id: 'work',      label: 'உழைப்பு',   sub: 'Work',      icon: 'work' },
  { id: 'chat',      label: 'அரட்டை',    sub: 'Chat',      icon: 'chat' },
  { id: 'finance',   label: 'நிதி',      sub: 'Finance',   icon: 'finance' },
  { id: 'analytics', label: 'பகுப்பாய்வு', sub: 'Analytics', icon: 'analytics' },
];

function readInitialTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'system'; }
  catch { return 'system'; }
}

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

export default function Header({
  onOpenData,
  onShareWA,
  user,
  partner,
  onSignOut,
  activeTab,
  setActiveTab,
  pendingCount = 0
}) {
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

  const initial = (partner?.name || user?.displayName || 'U').charAt(0).toUpperCase();

  return (
    <header className="app-header">
      <div className="brand-area">
        <div className="brand-logo-icon">
          <Icon name="fish" size={20} />
        </div>
        <div className="brand-name">
          MeenMart <span className="brand-portal-pill">Partners</span>
        </div>
      </div>

      {/* Desktop Navigation Bar (shown on >= 768px) */}
      {activeTab && setActiveTab && (
        <nav className="desktop-nav-tabs" aria-label="Desktop Primary Navigation">
          {NAV_TABS.map(({ id, label, icon, hasBadge }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                className={`dnav-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
                type="button"
              >
                <Icon name={icon} size={16} className="dnav-icon" />
                <span>{label}</span>
                {hasBadge && pendingCount > 0 && (
                  <span className="dnav-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      <div className="header-actions">
        {deferredPrompt && (
          <button
            className="pwa-install-btn"
            onClick={handleInstallClick}
            title="ஆப்பை நிறுவவும் (Install PWA)"
            aria-label="Install App"
          >
            <Icon name="download" size={14} />
            <span className="pwa-install-text">நிறுவு</span>
          </button>
        )}

        <button
          className="btn-icon"
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? (
            <Icon name="sun" size={16} />
          ) : theme === 'dark' ? (
            <Icon name="moon" size={16} />
          ) : (
            <Icon name="monitor" size={16} />
          )}
        </button>

        <button
          className="btn-icon wa-btn"
          onClick={onShareWA}
          title="WhatsApp பகிர்வு (Day Summary)"
          aria-label="WhatsApp Share"
        >
          <Icon name="whatsapp" size={16} />
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
              <span className="user-name-text">{partner?.name || 'User'}</span>
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
                      <span className={`partner-dot ${partner?.name?.toLowerCase() || ''}`} />
                      {partner?.name} — <span className="user-role-text">{partner?.role}</span>
                    </div>
                    <div className="user-menu-email">{user.email}</div>
                  </div>

                  {deferredPrompt && (
                    <button
                      className="user-menu-item"
                      onClick={() => { setMenuOpen(false); handleInstallClick(); }}
                    >
                      <Icon name="download" size={15} />
                      <span>ஆப்பை நிறுவு (Install App)</span>
                    </button>
                  )}

                  <button
                    className="user-menu-item"
                    onClick={() => { setMenuOpen(false); onOpenData(); }}
                  >
                    <Icon name="database" size={15} />
                    <span>தரவு மேலாண்மை (Data Backup)</span>
                  </button>

                  <button
                    className="user-menu-item danger"
                    onClick={() => { setMenuOpen(false); onSignOut?.(); }}
                  >
                    <Icon name="logout" size={15} />
                    <span>வெளியேறு (Sign out)</span>
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
            <Icon name="database" size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
