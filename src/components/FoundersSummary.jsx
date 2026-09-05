import React, { memo } from 'react';
import { calcFounderStats } from '../utils/calculations';

const FOUNDERS = [
  { name: 'Balaji', role: 'Tech & Product',   avatar: '💻', key: 'balaji', valClass: 'balaji-c' },
  { name: 'Nagoor', role: 'Procure & Pack',   avatar: '🐟', key: 'nagoor', valClass: 'nagoor-c' },
  { name: 'JP',     role: 'Delivery & Sales', avatar: '🛵', key: 'jp',     valClass: 'jp-c' },
];

function FoundersSummary({ store, partnerFilter, setPartnerFilter }) {
  const handleSelect = (name) => {
    setPartnerFilter((prev) => (prev === name ? 'all' : name));
  };

  return (
    <div className="founders-section">
      <div className="founders-section-head">
        <span className="founders-section-title">பங்குதாரர்கள் (Co-Founders)</span>
        {partnerFilter !== 'all' && (
          <button
            className="filter-reset-btn"
            onClick={() => setPartnerFilter('all')}
            type="button"
          >
            அனைத்தும் காண்க ✕
          </button>
        )}
      </div>

      <div className="founders-grid" role="group" aria-label="Co-founders">
        {FOUNDERS.map(({ name, role, avatar, key, valClass }) => {
          const stats = calcFounderStats(store, name);
          const isActive = partnerFilter === name;

          return (
            <button
              key={name}
              className={`founder-card ${key} ${isActive ? 'active-filter' : ''}`}
              onClick={() => handleSelect(name)}
              title={`${name} விபரங்களை மட்டும் பார்க்க தட்டவும்`}
              aria-pressed={isActive}
              type="button"
            >
              <div className="founder-avatar-wrap">
                <span className="founder-avatar" aria-hidden="true">{avatar}</span>
                {isActive && <span className="founder-active-dot" aria-hidden="true" />}
              </div>
              <div className="founder-name">{name}</div>
              <div className="founder-role">{role}</div>

              <div className="founder-metrics">
                <div className="f-metric">
                  <span className="f-metric-lbl">உழைப்பு</span>
                  <span className={`f-metric-val ${valClass}`}>{stats.hours}h</span>
                </div>
                <div className="f-metric">
                  <span className="f-metric-lbl">பணிகள்</span>
                  <span className="f-metric-val">{stats.tasks}</span>
                </div>
                <div className="f-metric">
                  <span className="f-metric-lbl">பங்கு</span>
                  <span className="f-metric-val">{stats.contrib}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(FoundersSummary);
