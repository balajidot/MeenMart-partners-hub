import React from 'react';

const PARTNER_COLORS = {
  Balaji: '#1B2A5B',
  Nagoor: '#0F9E8E',
  JP: '#B4531F',
};

const TABS = [
  {
    id: 'home',
    label: 'Hub',
    svg: (
      <path
        d="M3.5 9.2L11 3.5l7.5 5.7v8.3a1 1 0 01-1 1h-13a1 1 0 01-1-1V9.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    svg: (
      <path
        d="M3.5 6h4M3.5 11h4M3.5 16h4M10.5 6h8M10.5 11h8M10.5 16h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    ),
  },
  {
    id: 'hours',
    label: 'Shifts',
    svg: (
      <>
        <circle cx="11" cy="11" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M11 6.8V11l3 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    id: 'ledger',
    label: 'Ledger',
    svg: (
      <path
        d="M3.5 17.5V9M8.5 17.5V4.5M13.5 17.5v-6M18.5 17.5V7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    ),
  },
  {
    id: 'chat',
    label: 'Chat',
    svg: (
      <path
        d="M4 5.5h14a1 1 0 011 1v7a1 1 0 01-1 1h-7l-4 3v-3H4a1 1 0 01-1-1v-7a1 1 0 011-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    ),
  },
];

function SignOutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8.5 4H5a1 1 0 00-1 1v12a1 1 0 001 1h3.5M14.5 7.5L18 11l-3.5 3.5M18 11H9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar({ activeTab, setActiveTab, pendingCount, partner, onSignOut }) {
  const avatarBg = PARTNER_COLORS[partner?.name] ?? '#5A6480';
  const initials = partner?.initials || (partner?.name || '??').slice(0, 2).toUpperCase();

  return (
    <aside className="desktop-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon" aria-hidden="true">🐟</span>
        <span className="sidebar-brand-name">MeenMart</span>
        <span className="sidebar-brand-pill">Partners</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-nav-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="sidebar-nav-icon-wrap">
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {tab.svg}
              </svg>
              {tab.id === 'tasks' && pendingCount > 0 && (
                <span className="sidebar-nav-badge">{pendingCount}</span>
              )}
            </span>
            <span className="sidebar-nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <span
          className="sidebar-avatar"
          style={{ background: avatarBg }}
          aria-hidden="true"
        >
          {initials}
        </span>
        <div className="sidebar-footer-info">
          <span className="sidebar-footer-name">{partner?.name ?? 'Unknown'}</span>
          <span className="sidebar-footer-role">{partner?.role ?? 'Partner'}</span>
        </div>
        <button
          className="sidebar-signout-btn"
          onClick={onSignOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <SignOutIcon />
        </button>
      </div>
    </aside>
  );
}
