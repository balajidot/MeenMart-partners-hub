import React, { useState, useMemo } from 'react';
import { fmtDate, compressImage, TAMIL_MONTHS } from '../utils/calculations';

const AVATARS = {
  Balaji: '💻',
  Nagoor: '🐟',
  JP:     '🛵',
};

const PARTNER_PILLS = [
  { id: 'all',    label: 'அனைவரும்' },
  { id: 'Balaji', label: 'Balaji', cls: 'balaji' },
  { id: 'Nagoor', label: 'Nagoor', cls: 'nagoor' },
  { id: 'JP',     label: 'JP',     cls: 'jp' },
];

function groupByDate(logs) {
  const groups = new Map();
  logs.forEach((l) => {
    const key = l.date || 'other';
    if (!groups.has(key)) {
      let label;
      if (key === 'other') label = 'மற்றவை';
      else {
        const d = new Date(key);
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (key === today) label = 'இன்று';
        else if (key === yesterday) label = 'நேற்று';
        else label = `${d.getDate()} ${TAMIL_MONTHS[d.getMonth()]}`;
      }
      groups.set(key, { label, items: [] });
    }
    groups.get(key).items.push(l);
  });
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a === 'other' ? 1 : b === 'other' ? -1 : b.localeCompare(a)))
    .map(([, v]) => v);
}

export default function WorkTab({
  store,
  partnerFilter,
  setPartnerFilter,
  selectedDate,
  deleteWorklog,
  addProof,
  onOpenLightbox,
  onOpenWork,
}) {
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    let list = store.worklogs || [];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((w) =>
        (w.desc || '').toLowerCase().includes(q) ||
        (w.category || '').toLowerCase().includes(q) ||
        (w.partner || '').toLowerCase().includes(q)
      );
    }

    if (partnerFilter !== 'all') {
      list = list.filter((w) => w.partner === partnerFilter);
    }

    if (selectedDate) {
      list = list.filter((w) => w.date === selectedDate);
    }

    return list;
  }, [store.worklogs, search, partnerFilter, selectedDate]);

  const grouped = useMemo(() => groupByDate(filteredLogs), [filteredLogs]);

  const totalHours = useMemo(
    () => filteredLogs.reduce((s, w) => s + Number(w.hours || 0), 0),
    [filteredLogs]
  );

  const handleFileUpload = async (logId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      addProof('work', logId, compressed);
    } catch (err) {
      console.error('Work proof upload error:', err);
    }
  };

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div className="search-wrap">
          <span aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="உழைப்புப் பதிவுகளைத் தேடுங்கள்..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search work logs"
          />
        </div>

        <div className="pill-group" aria-label="Partner filter">
          {PARTNER_PILLS.map(({ id, label, cls }) => (
            <button
              key={id}
              className={`pill ${partnerFilter === id ? `active ${cls || ''}` : ''}`}
              onClick={() => setPartnerFilter(id)}
              aria-pressed={partnerFilter === id}
            >
              {label}
            </button>
          ))}
        </div>

        {filteredLogs.length > 0 && (
          <div className="section-header" style={{ marginBottom: 0 }}>
            <span className="text-secondary" style={{ fontSize: 12, fontWeight: 600 }}>
              மொத்தம் {filteredLogs.length} பதிவுகள்
            </span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 800 }}>
              {totalHours}h
            </span>
          </div>
        )}
      </div>

      {filteredLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⏱️</div>
          <h3>உழைப்புப் பதிவுகள் இல்லை</h3>
          <p>கீழே உள்ள <strong>+</strong> பொத்தானைத் தட்டி இன்றைய வேலையை பதிவு செய்யுங்கள்.</p>
          {onOpenWork && (
            <button className="empty-cta" onClick={onOpenWork}>
              ⏱️ உழைப்பு பதிவு
            </button>
          )}
        </div>
      ) : (
        <div className="tasks-feed">
          {grouped.map((group) => (
            <React.Fragment key={group.label}>
              <div className="date-group-header">
                {group.label} <span className="count-badge">({group.items.length})</span>
              </div>
              {group.items.map((log) => {
                const avatar = AVATARS[log.partner] || '👤';
                const partnerLower = (log.partner || '').toLowerCase();

                return (
                  <div key={log.id} className="worklog-card">
                    <div className="work-top">
                      <div className="work-avatar" aria-hidden="true">{avatar}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                          {log.partner}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <span className={`chip ${partnerLower}`}>{log.category}</span>
                          <span className="chip gray">{fmtDate(log.date)}</span>
                        </div>
                      </div>
                      <div className={`work-hours ${partnerLower}-c`}>
                        {log.hours}h
                      </div>
                    </div>

                    <div className="work-desc">{log.desc}</div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 12,
                      gap: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {log.proof && (
                          <img
                            src={log.proof}
                            alt="Work Proof"
                            className="proof-thumb"
                            onClick={() =>
                              onOpenLightbox(
                                log.proof,
                                log.partner,
                                'உழைப்பு சான்று',
                                log.proofAddedAt
                              )
                            }
                            title="சான்றைப் பெரிதாக்கிப் பார்க்க தட்டவும்"
                          />
                        )}
                        <label className="btn-sm">
                          📷 {log.proof ? 'மாற்று' : 'சான்று'}
                          <input
                            type="file"
                            accept="image/*"
                            className="file-hidden"
                            onChange={(e) => handleFileUpload(log.id, e)}
                          />
                        </label>
                      </div>

                      <button
                        className="btn-sm danger"
                        onClick={() => {
                          if (window.confirm('இப்பதிவை நீக்க வேண்டுமா?')) {
                            deleteWorklog(log.id);
                          }
                        }}
                        title="நீக்கு"
                        aria-label="Delete work log"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
