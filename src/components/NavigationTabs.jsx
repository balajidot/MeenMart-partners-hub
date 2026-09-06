import React from 'react';
import Icon from './Icons';

const TABS = [
  { id: 'tasks',     label: 'பணிகள்',    icon: 'tasks', hasBadge: true },
  { id: 'work',      label: 'உழைப்பு',   icon: 'work' },
  { id: 'chat',      label: 'அரட்டை',    icon: 'chat' },
  { id: 'finance',   label: 'நிதி',      icon: 'finance' },
  { id: 'analytics', label: 'பகுப்பாய்வு', icon: 'analytics' },
];

export default function NavigationTabs({ activeTab, setActiveTab, pendingCount }) {
  return (
    <nav className="bottom-nav" aria-label="Primary Mobile Navigation">
      {TABS.map(({ id, label, icon, hasBadge }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            className={`bnav-btn ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
            type="button"
          >
            <div className="bnav-icon-wrap">
              <Icon name={icon} size={20} className="bnav-icon" />
              {hasBadge && pendingCount > 0 && (
                <span className="bnav-badge" aria-label={`${pendingCount} pending`}>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </div>
            <span className="bnav-label">{label}</span>
            {isActive && <span className="bnav-active-bar" aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
}
