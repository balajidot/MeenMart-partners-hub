import React from 'react';
import { triggerHaptic } from '../utils/haptics';

const PARTNER_COLORS = {
  Balaji: '#1B2A5B',
  Nagoor: '#0F9E8E',
  JP: '#B4531F',
};

const FILTER_CHIPS = [
  { label: 'All Partners', value: 'all', dot: null },
  { label: 'Balaji', value: 'Balaji', dot: '#4D7BF3' },
  { label: 'Nagoor', value: 'Nagoor', dot: '#0F9E8E' },
  { label: 'JP', value: 'JP', dot: '#E08A0B' },
];

export default function Header({
  title,
  partnerFilter,
  setPartnerFilter,
  partner,
  onOpenSettings,
  profiles,
  _onOpenData,
  _isOnline,
}) {
  const avatarBg = PARTNER_COLORS[partner?.name] ?? '#5A6480';
  const initials = partner?.initials || (partner?.name || '??').slice(0, 2).toUpperCase();
  const avatarUrl = profiles?.[partner?.name]?.avatarUrl;

  return (
    <header className="app-header">
      <div className="header-top-row">
        <div className="header-titles">
          <h1 className="header-title">{title}</h1>
        </div>
        <button
          type="button"
          className="user-avatar-btn"
          style={{ background: avatarBg }}
          onClick={() => {
            triggerHaptic('medium');
            if (onOpenSettings) onOpenSettings();
          }}
          aria-label="Open settings and profile"
          title={`Active: ${partner?.name ?? 'Unknown'} — tap for Settings & Profile`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={partner?.name} className="header-avatar-img" />
          ) : (
            initials
          )}
        </button>
      </div>

      <div className="filter-chips">
        {FILTER_CHIPS.map(({ label, value, dot }) => {
          const isActive = partnerFilter === value;
          return (
            <button
              key={value}
              type="button"
              className={`filter-chip${isActive ? ' active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setPartnerFilter(value);
              }}
            >
              {dot && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: dot,
                    marginRight: '5px',
                    display: 'inline-block',
                    boxShadow: isActive ? `0 0 5px ${dot}` : 'none',
                  }}
                />
              )}
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
