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

export default function Header({ kicker, title, partnerFilter, setPartnerFilter, partner, onCycleUser, onOpenData }) {
  const avatarBg = PARTNER_COLORS[partner?.name] ?? '#5A6480';
  const initials = partner?.initials || (partner?.name || '??').slice(0, 2).toUpperCase();

  return (
    <header className="app-header">
      <div className="header-top-row">
        <div className="header-titles">
          <span className="header-kicker">{kicker}</span>
          <h1 className="header-title">{title}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="user-avatar-btn"
            style={{ background: avatarBg }}
            onClick={onCycleUser}
            aria-label="Cycle active user"
            title={`Active: ${partner?.name ?? 'Unknown'} — click to switch`}
          >
            {initials}
          </button>
          <button
            type="button"
            onClick={onOpenData}
            aria-label="Settings and Data"
            title="தரவு மேலாண்மை (Data & Backup)"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '15px',
            }}
          >
            ⚙️
          </button>
        </div>
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
