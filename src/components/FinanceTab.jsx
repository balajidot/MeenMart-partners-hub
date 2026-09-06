import React, { useMemo } from 'react';
import KpiTicker from './KpiTicker';
import Icon from './Icons';
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

export default function FinanceTab({
  store,
  onOpenCapital,
  onOpenLightbox,
  deleteExpense,
  deleteCapital,
  currentPartner,
}) {
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
        rawId: c.id,
        type: 'capital',
        partner: c.partner,
        title: `${c.partner} · மூலதன முதலீடு`,
        sub: `${fmtDate(c.date)} · ${c.note || 'மூலதனம்'}`,
        amount: Number(c.amount || 0),
        isCredit: true,
        date: c.date,
        proof: null,
      });
    });
    (store.expenses || []).forEach((e) => {
      list.push({
        id: `exp-${e.id}`,
        rawId: e.id,
        type: 'expense',
        partner: e.partner,
        title: `${e.partner} · ${e.category}`,
        sub: `${fmtDate(e.date)} · ${e.reason || ''}`,
        amount: Number(e.amount || 0),
        isCredit: false,
        date: e.date,
        proof: e.proof || null,
        proofAddedAt: e.proofAddedAt || null,
      });
    });
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list;
  }, [store.capitals, store.expenses]);

  return (
    <div className="tab-content">
      {/* Financial Overview Cards */}
      <KpiTicker store={store} />

      <div className="finance-overview">
        <div className="fin-header">
          <div>
            <h3>பங்குதாரர்கள் மொத்த நிதி பங்களிப்பு</h3>
            <p>மூலதனம் + நேரடி செலவுகள்</p>
          </div>
          <button className="btn-sm success" onClick={onOpenCapital}>
            <Icon name="plus" size={12} /> மூலதனம் சேர்
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
            <h3>சம பங்கு கணக்கு தீர்வு</h3>
            <p>தலா 33.3% வீதம் சமமாக பிரிக்கப்பட்டது</p>
          </div>
          <button
            className="btn-sm"
            onClick={() => shareSettlementWhatsApp(settlement)}
            title="WhatsApp-ல் பகிர"
          >
            <Icon name="whatsapp" size={13} /> பகிர
          </button>
        </div>

        {settlement.transactions.length === 0 ? (
          <div style={{
            fontSize: 13,
            color: 'var(--ok)',
            padding: '12px',
            background: 'var(--ok-soft)',
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
            <Icon name="download" size={13} /> CSV
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="credit-card" size={32} />
            </div>
            <h3>பரிவர்த்தனைகள் எதுவும் இல்லை</h3>
            <p>முதலீடு அல்லது செலவு பதிவு செய்ய கீழே உள்ள <strong>+</strong> பொத்தானைத் தட்டுங்கள்.</p>
          </div>
        ) : (
          <div>
            {transactions.map((tx) => (
              <div key={tx.id} className="tx-card">
                <span className="tx-icon" aria-hidden="true">
                  {tx.isCredit ? <Icon name="credit-card" size={16} /> : <Icon name="dollar" size={16} />}
                </span>
                <div className="tx-body">
                  <div className="tx-title">{tx.title}</div>
                  <div className="tx-sub">{tx.sub}</div>
                </div>
                {tx.proof && (
                  <img
                    src={tx.proof}
                    alt="Receipt Proof"
                    className="proof-thumb"
                    style={{ margin: '0 8px' }}
                    onClick={() =>
                      onOpenLightbox?.(
                        tx.proof,
                        tx.partner,
                        'செலவு ரசீது',
                        tx.proofAddedAt
                      )
                    }
                    title="ரசீதைப் பார்க்க தட்டவும்"
                  />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className={`tx-amount mono ${tx.isCredit ? 'capital' : ''}`}>
                    {tx.isCredit ? '+' : '−'}{fmtCurrency(tx.amount)}
                  </div>
                  {tx.partner === currentPartner?.name && (
                    <button
                      className="btn-sm danger"
                      style={{ padding: '3px 7px', fontSize: 11 }}
                      onClick={() => {
                        const typeLabel = tx.isCredit ? 'மூலதனப் பதிவை' : 'செலவுப் பதிவை';
                        if (window.confirm(`இப் ${typeLabel} நீக்க வேண்டுமா?`)) {
                          if (tx.isCredit) {
                            deleteCapital?.(tx.rawId);
                          } else {
                            deleteExpense?.(tx.rawId);
                          }
                        }
                      }}
                      title="நீக்கு"
                      aria-label="Delete transaction"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
