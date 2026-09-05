import React from 'react';
import { calcFounderStats } from '../utils/calculations';

const FOUNDERS = [
  { name: 'Balaji', role: 'Tech & Product',    avatar: '💻', key: 'balaji', valClass: 'balaji-c' },
  { name: 'Nagoor', role: 'Procure & Pack',    avatar: '🐟', key: 'nagoor', valClass: 'nagoor-c' },
  { name: 'JP',     role: 'Delivery & Sales',  avatar: '🛵', key: 'jp',     valClass: 'jp-c' },
];

export default function FoundersSummary({ store, partnerFilter, setPartnerFilter }) {
  const handleSelect = (name) => {
    setPartnerFilter((prev) => (prev === name ? 'all' : name));
  };

  return (
    <section className="founders-grid" aria-label="Co-founders">
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
          >
            <div className="founder-avatar" aria-hidden="true">{avatar}</div>
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
    </section>
  );
}
