import React, { memo, useMemo } from 'react';
import { calcKpis, fmtCurrency } from '../utils/calculations';

function KpiTicker({ store }) {
  const kpis = useMemo(() => calcKpis(store), [store]);

  return (
    <section className="fintech-hero-card" aria-label="Financial Overview">
      <div className="fhero-top">
        <div className="fhero-label-wrap">
          <span className="fhero-icon">💼</span>
          <span className="fhero-label">கை இருப்பு (Cash Balance)</span>
        </div>
        {kpis.pendingTasks > 0 && (
          <span className="fhero-badge">
            <span className="fhero-dot" />
            {kpis.pendingTasks} நிலுவை பணிகள்
          </span>
        )}
      </div>

      <div className="fhero-main-val">
        {fmtCurrency(kpis.cashBalance)}
      </div>

      <div className="fhero-sub-stats">
        <div className="fhero-sub-item invest">
          <span className="fhero-sub-lbl">🏦 மொத்த முதலீடு</span>
          <span className="fhero-sub-val green">{fmtCurrency(kpis.totalInvested)}</span>
        </div>
        <div className="fhero-sub-divider" aria-hidden="true" />
        <div className="fhero-sub-item expense">
          <span className="fhero-sub-lbl">💸 மொத்த செலவு</span>
          <span className="fhero-sub-val yellow">{fmtCurrency(kpis.totalSpent)}</span>
        </div>
      </div>
    </section>
  );
}

export default memo(KpiTicker);
