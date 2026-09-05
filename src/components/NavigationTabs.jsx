import React from 'react';

const TABS = [
  { id: 'tasks',     label: 'பணிகள்',    icon: '📋', hasBadge: true },
  { id: 'work',      label: 'உழைப்பு',   icon: '⏱️' },
  { id: 'analytics', label: 'பகுப்பாய்வு', icon: '📊' },
  { id: 'finance',   label: 'நிதி',      icon: '💳' },
];

export default function NavigationTabs({ activeTab, setActiveTab, pendingCount }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map(({ id, label, icon, hasBadge }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            className={`bnav-btn ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
          >
            <span className="bnav-icon" aria-hidden="true">{icon}</span>
            <span className="bnav-label">{label}</span>
            {hasBadge && pendingCount > 0 && (
              <span className="bnav-badge" aria-label={`${pendingCount} pending`}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
