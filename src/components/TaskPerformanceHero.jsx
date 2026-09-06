import React, { memo, useMemo } from 'react';
import Icon from './Icons';

const FOUNDERS = [
  { name: 'Balaji', role: 'Tech',     icon: 'laptop', key: 'balaji' },
  { name: 'Nagoor', role: 'Procure',  icon: 'fish',   key: 'nagoor' },
  { name: 'JP',     role: 'Delivery', icon: 'bike',   key: 'jp' },
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

  return (
    <div className="task-summary-strip">
      <div className="summary-row">
        <div className="summary-left">
          <span className="summary-title">செயல்திறன்</span>
          <span className="summary-badge">
            {completedTasks.length}/{allTasks.length} ({completionRate}%)
          </span>
        </div>

        <div className="summary-right">
          <span className="metric-tag pending">
            <Icon name="hourglass" size={12} /> {pendingTasks.length} நிலுவை
          </span>
          <span className="metric-tag hours">
            <Icon name="clock" size={12} /> {totalHours}h உழைப்பு
          </span>
        </div>
      </div>

      <div className="summary-progress-track">
        <div
          className="summary-progress-fill"
          style={{ width: `${completionRate}%` }}
        />
      </div>

      {/* Founder Filter Pills */}
      <div className="founder-filter-strip">
        <button
          className={`founder-pill ${partnerFilter === 'all' ? 'active' : ''}`}
          onClick={() => setPartnerFilter('all')}
          type="button"
        >
          அனைவரும்
          <span className="pill-num">{allTasks.length}</span>
        </button>

        {FOUNDERS.map(({ name, role, icon, key }) => {
          const partnerTasks = allTasks.filter((t) => t.to === name);
          const pDone = partnerTasks.filter((t) => t.status === 'completed').length;
          const isActive = partnerFilter === name;

          return (
            <button
              key={name}
              className={`founder-pill ${key} ${isActive ? 'active' : ''}`}
              onClick={() => setPartnerFilter((prev) => (prev === name ? 'all' : name))}
              type="button"
              title={`${name} (${role}): ${pDone}/${partnerTasks.length} முடிந்தது`}
            >
              <Icon name={icon} size={13} className="pill-icon" />
              <span>{name}</span>
              <span className="pill-num">{pDone}/{partnerTasks.length}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(TaskPerformanceHero);
