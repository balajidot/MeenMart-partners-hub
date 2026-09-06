import React, { useState, useMemo } from 'react';
import {
  calcSettlement,
  fmtCurrency,
  fmtDate,
  shareSettlementWhatsApp,
  exportLedgerCSV,
  getLocalDateStr,
} from '../utils/calculations';

const PARTNERS = [
  { name: 'Balaji', initial: 'BA', cls: 'balaji', color: '#1B2A5B' },
  { name: 'Nagoor', initial: 'NA', cls: 'nagoor', color: '#0F9E8E' },
  { name: 'JP',     initial: 'JP', cls: 'jp',     color: '#B4531F' },
];

export default function FinanceTab({
  store,
  onOpenCapital,
  onOpenExpense,
  onOpenRevenue,
  onOpenLightbox,
  _deleteExpense,
  _deleteRevenue,
  _deleteCapital,
  _currentPartner,
}) {
  const [scope, setScope] = useState('day'); // 'day' | 'month'

  const todayStr = getLocalDateStr();
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

  // Filter entries based on scope
  const filteredData = useMemo(() => {
    const expenses = store.expenses || [];
    const revenues = store.revenues || [];

    const isMatch = (item) => {
      if (scope === 'day') {
        return (item.date || getLocalDateStr(item.createdAt)) === todayStr;
      }
      // Month match (e.g. "2026-09")
      const itemDate = item.date || getLocalDateStr(item.createdAt);
      const currentYearMonth = todayStr.slice(0, 7);
      return itemDate ? itemDate.startsWith(currentYearMonth) : true;
    };

    const expList = expenses.filter(isMatch);
    const revList = revenues.filter(isMatch);

    const totalExp = expList.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalRev = revList.reduce((s, r) => s + Number(r.amount || 0), 0);
    const net = totalRev - totalExp;

    // Unified entries sorted newest first
    const entries = [
      ...revList.map((r) => ({
        ...r,
        kind: 'rev',
        sign: '+',
        amount: Number(r.amount || 0),
        label: r.label || r.source || r.category || 'வருவாய்',
        category: r.category || 'பொது',
        date: r.date || getLocalDateStr(r.createdAt),
      })),
      ...expList.map((e) => ({
        ...e,
        kind: 'exp',
        sign: '−',
        amount: Number(e.amount || 0),
        label: e.reason || e.category || 'செலவு',
        category: e.category || 'பொது',
        date: e.date || getLocalDateStr(e.createdAt),
      })),
    ].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return { totalExp, totalRev, net, entries };
  }, [store.expenses, store.revenues, scope, todayStr]);

  // Founder capital data
  const capitalData = useMemo(() => {
    const capitals = store.capitals || [];
    const total = capitals.reduce((s, c) => s + Number(c.amount || 0), 0);

    const partnerList = PARTNERS.map((p) => {
      const amt = capitals
        .filter((c) => c.partner === p.name)
        .reduce((s, c) => s + Number(c.amount || 0), 0);
      const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
      return { ...p, amount: amt, share: `${pct}%`, pctNum: pct };
    });

    return { total, partnerList };
  }, [store.capitals]);

  const settlement = useMemo(() => calcSettlement(store), [store]);

  const scopeLabel = scope === 'day' ? 'இன்று (Today)' : `${currentMonth}`;

  return (
    <div className="tab-content">
      {/* Day / Month Toggle Tabs */}
      <div className="ledger-scope-tabs">
        <button
          type="button"
          className={`ledger-scope-tab ${scope === 'day' ? 'active' : ''}`}
          onClick={() => setScope('day')}
        >
          இன்று (Today)
        </button>
        <button
          type="button"
          className={`ledger-scope-tab ${scope === 'month' ? 'active' : ''}`}
          onClick={() => setScope('month')}
        >
          {currentMonth}
        </button>
      </div>

      {/* Net Profit Hero Card */}
      <div className="ledger-hero">
        <div className="ledger-hero-label">Net profit · {scopeLabel}</div>
        <div
          className="ledger-hero-amount"
          style={{ color: filteredData.net >= 0 ? '#54D6C4' : '#FF8A80' }}
        >
          {filteredData.net >= 0 ? '+' : '−'}
          {fmtCurrency(Math.abs(filteredData.net))}
        </div>
        <div className="ledger-hero-cards">
          <div className="ledger-hero-card">
            <div className="ledger-hero-card-label">வருவாய் (Revenue)</div>
            <div className="ledger-hero-card-val" style={{ color: '#54D6C4' }}>
              {fmtCurrency(filteredData.totalRev)}
            </div>
          </div>
          <div className="ledger-hero-card">
            <div className="ledger-hero-card-label">செலவு (Expenses)</div>
            <div className="ledger-hero-card-val" style={{ color: '#FFB299' }}>
              {fmtCurrency(filteredData.totalExp)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: + Expense and + Revenue */}
      <div className="ledger-action-row">
        <button
          type="button"
          className="ledger-btn expense-btn"
          onClick={onOpenExpense}
        >
          + செலவு (Expense)
        </button>
        <button
          type="button"
          className="ledger-btn revenue-btn"
          onClick={onOpenRevenue}
        >
          + வருவாய் (Revenue)
        </button>
      </div>

      {/* Entries Section */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-card-title">பதிவுகள் · {scopeLabel}</div>
          <div className="section-card-meta">{filteredData.entries.length} பதிவுகள்</div>
        </div>

        {filteredData.entries.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            இந்தப் பகுதியில் இதுவரை பதிவுகள் எதுவும் இல்லை.
          </div>
        ) : (
          filteredData.entries.map((entry) => (
            <div key={`${entry.kind}-${entry.id}`} className="entry-row">
              <div className={`entry-sign-chip ${entry.kind}`}>
                {entry.sign}
              </div>
              <div className="entry-info">
                <div className="entry-label">{entry.label}</div>
                <div className="entry-meta">
                  {entry.partner} &middot; {fmtDate(entry.date)} &middot; {entry.category}
                </div>
              </div>
              <div className={`entry-amount ${entry.kind}`}>
                {entry.sign}{fmtCurrency(entry.amount)}
              </div>
              {entry.proof && (
                <button
                  type="button"
                  onClick={() => onOpenLightbox?.(entry.proof, entry.partner, entry.label, entry.createdAt)}
                  title="சான்று படம் பார்"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'var(--input-bg)',
                    fontSize: '11px',
                    color: 'var(--text-sec)',
                  }}
                >
                  📷
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Founder Capital Section */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-card-title">பங்குதாரர் மூலதனம் (Founder Capital)</div>
          <div className="section-card-meta" style={{ color: 'var(--teal-dark)', fontWeight: 600 }}>
            {fmtCurrency(capitalData.total)} total
          </div>
        </div>

        <div style={{ padding: '4px 0 10px' }}>
          {capitalData.partnerList.map((p) => (
            <div key={p.name} className="capital-row">
              <div className={`partner-monogram partner-monogram-sm ${p.cls}`}>
                {p.initial}
              </div>
              <div className="capital-info">
                <div className="capital-name-row">
                  <span className="capital-name">{p.name}</span>
                  <span className="capital-amount">{fmtCurrency(p.amount)}</span>
                </div>
                <div className="capital-bar-row">
                  <div className="capital-bar-track">
                    <div
                      className="capital-bar-fill"
                      style={{ width: `${p.pctNum}%`, background: p.color }}
                    />
                  </div>
                  <span className="capital-share">{p.share}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 16px 14px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="section-card-link"
            onClick={onOpenCapital}
            style={{ fontWeight: 600 }}
          >
            + மூலதனம் சேர்க்க
          </button>
          <span style={{ color: 'var(--card-border)' }}>|</span>
          <button
            type="button"
            className="section-card-link"
            onClick={() => shareSettlementWhatsApp(settlement)}
          >
            WhatsApp தீர்வு பகிர்வு
          </button>
          <span style={{ color: 'var(--card-border)' }}>|</span>
          <button
            type="button"
            className="section-card-link"
            onClick={() => exportLedgerCSV(store)}
          >
            CSV ஏற்றுமதி
          </button>
        </div>
      </div>
    </div>
  );
}
