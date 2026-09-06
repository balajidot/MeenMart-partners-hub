import React from 'react';

const PARTNER_COLORS = {
  Balaji: '#1B2A5B',
  Nagoor: '#0F9E8E',
  JP: '#B4531F',
};

const FILTER_CHIPS = [
  { label: 'All Partners', value: 'all' },
  { label: 'Balaji', value: 'Balaji' },
  { label: 'Nagoor', value: 'Nagoor' },
  { label: 'JP', value: 'JP' },
];

export default function Header({ kicker, title, partnerFilter, setPartnerFilter, partner, onCycleUser }) {
  const avatarBg = PARTNER_COLORS[partner?.name] ?? '#5A6480';
  const initials = partner?.initials || (partner?.name || '??').slice(0, 2).toUpperCase();

  return (
    <header className="app-header">
      <div className="header-top-row">
        <div className="header-titles">
          <span className="header-kicker">{kicker}</span>
          <h1 className="header-title">{title}</h1>
        </div>
        <button
          className="user-avatar-btn"
          style={{ background: avatarBg }}
          onClick={onCycleUser}
          aria-label="Cycle active user"
          title={`Active: ${partner?.name ?? 'Unknown'} — click to switch`}
        >
          {initials}
        </button>
      </div>

      <div className="filter-chips">
        {FILTER_CHIPS.map(({ label, value }) => (
          <button
            key={value}
            className={`filter-chip${partnerFilter === value ? ' active' : ''}`}
            onClick={() => setPartnerFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}
