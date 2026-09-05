import React from 'react';
import { calcKpis, fmtCurrency } from '../utils/calculations';

const CARDS = [
  { key: 'totalInvested', label: 'மொத்த முதலீடு',   color: 'green',  format: 'money' },
  { key: 'totalSpent',    label: 'மொத்த செலவு',    color: 'yellow', format: 'money' },
  { key: 'cashBalance',   label: 'கை இருப்பு',      color: 'blue',   format: 'money' },
  { key: 'pendingTasks',  label: 'நிலுவை பணிகள்',  color: 'red',    format: 'num' },
];

export default function KpiTicker({ store }) {
  const kpis = calcKpis(store);

  return (
    <section className="kpi-grid" aria-label="Business KPIs">
      {CARDS.map(({ key, label, color, format }) => {
        const raw = kpis[key];
        const display = format === 'money' ? fmtCurrency(raw) : String(raw ?? 0);
        return (
          <div key={key} className={`kpi-pill ${color}`}>
            <span className="kpi-label">{label}</span>
            <span className={`kpi-val ${color}`}>{display}</span>
          </div>
        );
      })}
    </section>
  );
}
