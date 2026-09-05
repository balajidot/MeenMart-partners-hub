import React, { useMemo } from 'react';
import {
  calcSettlement,
  fmtCurrency,
  fmtDate,
  shareSettlementWhatsApp,
  exportLedgerCSV,
} from '../utils/calculations';

const PARTNERS = [
  { name: 'Balaji', dotCls: 'dot-b', color: 'var(--balaji)' },
  { name: 'Nagoor', dotCls: 'dot-n', color: 'var(--nagoor)' },
  { name: 'JP',     dotCls: 'dot-j', color: 'var(--jp)' },
];

export default function FinanceTab({ store, onOpenCapital }) {
  const settlement = useMemo(() => calcSettlement(store), [store]);

  const partnerContribs = useMemo(() => {
    const list = PARTNERS.map((p) => {
      const cap = (store.capitals || [])
        .filter((c) => c.partner === p.name)
        .reduce((s, c) => s + Number(c.amount || 0), 0);
      const exp = (store.expenses || [])
        .filter((e) => e.partner === p.name)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      return { ...p, capital: cap, expense: exp, total: cap + exp };
    });
    const grandTotal = list.reduce((s, item) => s + item.total, 0);
    return list.map((item) => ({
      ...item,
      pct: grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0,
    }));
  }, [store.capitals, store.expenses]);

  const partnerChipCls = (name) => name.toLowerCase();

  const transactions = useMemo(() => {
    const list = [];
    (store.capitals || []).forEach((c) => {
      list.push({
        id: `cap-${c.id}`,
        type: 'capital',
        title: `${c.partner} · மூலதன முதலீடு`,
        sub: `${fmtDate(c.date)} · ${c.note || 'மூலதனம்'}`,
        amount: c.amount,
        isCredit: true,
        date: c.date,
      });
    });
    (store.expenses || []).forEach((e) => {
      list.push({
        id: `exp-${e.id}`,
        type: 'expense',
        title: `${e.partner} · ${e.category}`,
        sub: `${fmtDate(e.date)} · ${e.reason || ''}`,
        amount: e.amount,
        isCredit: false,
        date: e.date,
      });
    });
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list;
  }, [store.capitals, store.expenses]);

  return (
    <div className="tab-content">
      <div className="finance-overview">
        <div className="fin-header">
          <div>
            <h3>பங்குதாரர்கள் மொத்த நிதி பங்களிப்பு</h3>
            <p>மூலதனம் + நேரடி செலவுகள்</p>
          </div>
          <button className="btn-sm success" onClick={onOpenCapital}>
            ➕ மூலதனம் சேர்
          </button>
        </div>

        {partnerContribs.map((item) => (
          <div key={item.name} className="capital-row">
            <div className={`cap-dot dot ${item.dotCls}`} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="cap-name">{item.name}</span>
                <span className="cap-pct">{item.pct}%</span>
              </div>
              <div className="cap-bar-wrap">
                <div
                  className="cap-bar"
                  style={{ width: `${item.pct}%`, background: item.color }}
                />
              </div>
            </div>
            <div className="cap-amount mono">{fmtCurrency(item.total)}</div>
          </div>
        ))}
      </div>

      <div className="settlement-card">
        <div className="fin-header">
          <div>
            <h3>⚖️ சம பங்கு கணக்கு தீர்வு</h3>
            <p>தலா 33.3% வீதம் சமமாக பிரிக்கப்பட்டது</p>
          </div>
          <button
            className="btn-sm"
            onClick={() => shareSettlementWhatsApp(settlement)}
            title="WhatsApp-ல் பகிர"
          >
            💬 பகிர
          </button>
        </div>

        {settlement.transactions.length === 0 ? (
          <div style={{
            fontSize: 13,
            color: 'var(--accent-green)',
            padding: '12px',
            background: 'var(--nagoor-bg)',
            borderRadius: 'var(--r-sm)',
            fontWeight: 600,
            textAlign: 'center',
          }}>
            ✓ அனைத்துப் பங்குதாரர்களின் செலவுகளும் சமமாக உள்ளன!
          </div>
        ) : (
          <div>
            {settlement.transactions.map((tx, idx) => (
              <div key={idx} className="settle-txn">
                <span className={`chip ${partnerChipCls(tx.from)}`}>{tx.from}</span>
                <span className="settle-arrow" aria-hidden="true">→</span>
                <span className={`chip ${partnerChipCls(tx.to)}`}>{tx.to}</span>
                <span className="settle-amount mono">{fmtCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="ledger-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h4>பணப் பரிவர்த்தனைகள்</h4>
            <span className="count-badge">({transactions.length})</span>
          </div>
          <button
            className="btn-sm"
            onClick={() => exportLedgerCSV(store)}
            title="CSV கோப்பாக சேமி"
          >
            📥 CSV
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <h3>பரிவர்த்தனைகள் எதுவும் இல்லை</h3>
            <p>முதலீடு அல்லது செலவு பதிவு செய்ய கீழே உள்ள <strong>+</strong> பொத்தானைத் தட்டுங்கள்.</p>
          </div>
        ) : (
          <div>
            {transactions.map((tx) => (
              <div key={tx.id} className="tx-card">
                <span className="tx-icon" aria-hidden="true">{tx.isCredit ? '🏦' : '💰'}</span>
                <div className="tx-body">
                  <div className="tx-title">{tx.title}</div>
                  <div className="tx-sub">{tx.sub}</div>
                </div>
                <div className={`tx-amount mono ${tx.isCredit ? 'capital' : ''}`}>
                  {tx.isCredit ? '+' : '−'}{fmtCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
