import React, { memo, useMemo } from 'react';
import { calcKpis, fmtCurrency } from '../utils/calculations';

const CARDS = [
  { key: 'totalInvested', label: 'மொத்த முதலீடு',   icon: '🏦', color: 'green',  format: 'money' },
  { key: 'totalSpent',    label: 'மொத்த செலவு',    icon: '💸', color: 'yellow', format: 'money' },
  { key: 'cashBalance',   label: 'கை இருப்பு',      icon: '💼', color: 'blue',   format: 'money' },
  { key: 'pendingTasks',  label: 'நிலுவை பணிகள்',  icon: '📋', color: 'red',    format: 'num' },
];

function KpiTicker({ store }) {
  const kpis = useMemo(() => calcKpis(store), [store]);

  return (
    <section className="kpi-grid" aria-label="Business KPIs">
      {CARDS.map(({ key, label, icon, color, format }) => {
        const raw = kpis[key];
        const display = format === 'money' ? fmtCurrency(raw) : String(raw ?? 0);
        return (
          <div key={key} className={`kpi-pill ${color}`}>
            <div className="kpi-head">
              <span className="kpi-icon" aria-hidden="true">{icon}</span>
              <span className="kpi-label">{label}</span>
            </div>
            <span className={`kpi-val ${color}`}>{display}</span>
          </div>
        );
      })}
    </section>
  );
}

export default memo(KpiTicker);
