import React, { memo, useMemo } from 'react';
import { calcFounderStats } from '../utils/calculations';

const FOUNDERS = [
  { name: 'Balaji', role: 'Tech & Product',   avatar: '💻', key: 'balaji', valClass: 'balaji-c' },
  { name: 'Nagoor', role: 'Procure & Pack',   avatar: '🐟', key: 'nagoor', valClass: 'nagoor-c' },
  { name: 'JP',     role: 'Delivery & Sales', avatar: '🛵', key: 'jp',     valClass: 'jp-c' },
];

function TaskPerformanceHero({ store, partnerFilter, setPartnerFilter }) {
  const allTasks = store.tasks || [];
  const completedTasks = allTasks.filter((t) => t.status === 'completed');
  const pendingTasks = allTasks.filter((t) => t.status !== 'completed');
  const rawHours = (store.worklogs || []).reduce((s, w) => s + Number(w.hours || 0), 0);
  const totalHours = Number(rawHours.toFixed(1));

  const completionRate = useMemo(() => {
    if (allTasks.length === 0) return 0;
    return Math.round((completedTasks.length / allTasks.length) * 100);
  }, [allTasks.length, completedTasks.length]);

  const handleSelect = (name) => {
    setPartnerFilter((prev) => (prev === name ? 'all' : name));
  };

  return (
    <div className="task-performance-hero-wrap">
      {/* Main Task Performance Summary Card */}
      <section className="task-hero-card">
        <div className="task-hero-top">
          <div className="task-hero-label-wrap">
            <span className="task-hero-icon">🎯</span>
            <div>
              <span className="task-hero-label">பணி செயல்திறன் (Task Performance)</span>
              <span className="task-hero-sublabel">Co-Founders Daily Execution</span>
            </div>
          </div>
          <div className={`task-hero-rate-badge ${completionRate === 100 ? 'perfect' : ''}`}>
            {completionRate}% நிறைவு
          </div>
        </div>

        <div className="task-progress-track">
          <div
            className="task-progress-bar"
            style={{ width: `${completionRate}%` }}
            role="progressbar"
            aria-valuenow={completionRate}
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>

        <div className="task-hero-stats-grid">
          <div className="task-stat-tile">
            <span className="task-stat-num">{allTasks.length}</span>
            <span className="task-stat-lbl">📋 மொத்த பணிகள்</span>
          </div>
          <div className="task-stat-tile pending">
            <span className="task-stat-num orange">{pendingTasks.length}</span>
            <span className="task-stat-lbl">⏳ நிலுவை</span>
          </div>
          <div className="task-stat-tile done">
            <span className="task-stat-num green">{completedTasks.length}</span>
            <span className="task-stat-lbl">✅ முடிந்தது</span>
          </div>
          <div className="task-stat-tile hours">
            <span className="task-stat-num blue">{totalHours}h</span>
            <span className="task-stat-lbl">⏱️ உழைப்பு</span>
          </div>
        </div>
      </section>

      {/* Co-Founders Accountability & Task Cards */}
      <div className="founders-section">
        <div className="founders-section-head">
          <span className="founders-section-title">பங்குதாரர்கள் பணி நிலை (Founders Workload)</span>
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

        <div className="founders-grid" role="group" aria-label="Co-founders Task Performance">
          {FOUNDERS.map(({ name, role, avatar, key }) => {
            const stats = calcFounderStats(store, name);
            const isActive = partnerFilter === name;

            const partnerTasks = allTasks.filter((t) => t.to === name);
            const partnerDone = partnerTasks.filter((t) => t.status === 'completed').length;
            const partnerPending = partnerTasks.length - partnerDone;
            const partnerRate = partnerTasks.length > 0 ? Math.round((partnerDone / partnerTasks.length) * 100) : 0;

            return (
              <button
                key={name}
                className={`founder-card ${key} ${isActive ? 'active-filter' : ''}`}
                onClick={() => handleSelect(name)}
                title={`${name} பணிகளை மட்டும் பார்க்க தட்டவும்`}
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
                    <span className="f-metric-lbl">பணிகள்</span>
                    <span className="f-metric-val">{partnerDone}/{partnerTasks.length}</span>
                  </div>
                  <div className="f-metric">
                    <span className="f-metric-lbl">உழைப்பு</span>
                    <span className="f-metric-val">{stats.hours}h</span>
                  </div>
                </div>

                <div className="founder-card-progress">
                  <div className="founder-card-bar" style={{ width: `${partnerRate}%` }} />
                </div>

                <div className="founder-status-badge">
                  {partnerTasks.length === 0 ? (
                    <span className="status-done-tag" style={{ background: 'var(--card-subtle, #f0f3f8)', color: 'var(--text-muted)' }}>
                      பணிகள் இல்லை
                    </span>
                  ) : partnerPending > 0 ? (
                    <span className="status-pending-tag">{partnerPending} நிலுவை</span>
                  ) : (
                    <span className="status-done-tag">✓ அனைத்தும் முடிந்தது</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(TaskPerformanceHero);
