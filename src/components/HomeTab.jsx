import React, { useMemo } from 'react';
import { fmtCurrency, getLocalDateStr } from '../utils/calculations';

/* -- Partner meta ------------------------------------------------ */
const PARTNER_COLORS    = { Balaji: '#1B2A5B', Nagoor: '#0F9E8E', JP: '#B4531F', Shared: '#5A6480' };
const PARTNER_INITIALS  = { Balaji: 'BA', Nagoor: 'NA', JP: 'JP', Shared: 'ALL' };
const PARTNER_MONO_CLASS= { Balaji: 'balaji', Nagoor: 'nagoor', JP: 'jp', Shared: 'shared' };

const PRIORITY_COLORS   = { urgent: '#D93A3A', high: '#E08A0B', normal: '#6B7590' };

/* -- Helpers ----------------------------------------------------- */
function fmtDDMon(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function fmtTaskTime(task) {
  const raw = task.dueDateTime || task.dueAt;
  if (!raw) return '';
  const d = new Date(raw);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const WORKLOAD_ORDER = ['Nagoor', 'JP', 'Balaji'];
const PARTNER_ROLES  = { Nagoor: 'Operations', JP: 'Logistics', Balaji: 'Finance' };

/* ---------------------------------------------------------------- */
export default function HomeTab({ store, partnerFilter, _setPartnerFilter, onOpenTask }) {
  const today = getLocalDateStr();

  /* KPI derivations */
  const allTasks      = store.tasks || [];
  const pendingTasks  = allTasks.filter((t) => t.status !== 'completed');
  const completedCount= allTasks.filter((t) => t.status === 'completed').length;
  const pendingCount  = pendingTasks.length;
  const urgentCount   = pendingTasks.filter((t) => t.priority === 'urgent').length;
  const completionPct = allTasks.length > 0
    ? Math.round((completedCount / allTasks.length) * 100)
    : 0;

  /* Today's worklogs */
  const todayLogs  = (store.worklogs  || []).filter((w) => w.date === today);
  const todayHours = todayLogs.reduce((s, w) => s + Number(w.hours || 0), 0);

  /* Today revenue & expenses */
  const todayRevenue  = (store.revenues || [])
    .filter((r) => r.date === today)
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const todayExpenses = (store.expenses || [])
    .filter((e) => e.date === today)
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const netToday      = todayRevenue - todayExpenses;

  /* Cashflow bars */
  const cashflowMax = Math.max(todayRevenue, todayExpenses, 1);
  const revPct      = Math.min(100, Math.round((todayRevenue  / cashflowMax) * 100));
  const expPct      = Math.min(100, Math.round((todayExpenses / cashflowMax) * 100));

  /* Workload (this week Mon–today) */
  const now        = new Date();
  const dayOfWeek  = now.getDay();
  const weekStart  = new Date(now);
  weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const weekStartStr = getLocalDateStr(weekStart);
  const weekEndStr   = getLocalDateStr(now);

  const weekLogs = (store.worklogs || []).filter(
    (w) => w.date >= weekStartStr && w.date <= weekEndStr
  );

  const workloadHours = {};
  WORKLOAD_ORDER.forEach((p) => {
    workloadHours[p] = weekLogs
      .filter((w) => w.partner === p)
      .reduce((s, w) => s + Number(w.hours || 0), 0);
  });
  const maxWkHours = Math.max(...Object.values(workloadHours), 1);
  const topWorker  = WORKLOAD_ORDER.reduce((a, b) =>
    workloadHours[a] >= workloadHours[b] ? a : b
  );

  /* Up next */
  const upNextTasks = useMemo(() => {
    let list = pendingTasks;
    if (partnerFilter !== 'all') {
      list = list.filter((t) => t.to === partnerFilter || t.from === partnerFilter);
    }
    const pOrder = { urgent: 0, high: 1, normal: 2 };
    return [...list]
      .sort((a, b) => {
        const pa = pOrder[a.priority] ?? 2;
        const pb = pOrder[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return (a.dueDateTime || a.dueAt || '').localeCompare(b.dueDateTime || b.dueAt || '');
      })
      .slice(0, 3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.tasks, partnerFilter]);

  return (
    <div className="tab-content">

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Pending tasks</div>
          <div className="kpi-value-row">
            <span className="kpi-value">{pendingCount}</span>
            {urgentCount > 0 && (
              <span className="kpi-urgent-badge">{urgentCount} urgent</span>
            )}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Hours today</div>
          <div className="kpi-value-row">
            <span className="kpi-value">{todayHours.toFixed(1)}</span>
            <span className="kpi-unit">hrs</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Net today</div>
          <div
            className="kpi-value-sm"
            style={{ color: netToday >= 0 ? '#0B7E71' : '#D93A3A', marginTop: 8 }}
          >
            {fmtCurrency(netToday)}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Completion</div>
          <div className="kpi-value-row">
            <span className="kpi-value">{completionPct}</span>
            <span className="kpi-unit">%</span>
          </div>
        </div>
      </div>

      {/* Today cashflow */}
      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Today's cashflow</span>
          <span className="section-card-meta">{fmtDDMon(today)}</span>
        </div>
        <div className="cashflow-rows">
          <div className="cashflow-row">
            <div className="cashflow-row-head">
              <span className="cashflow-label">Revenue in</span>
              <span className="cashflow-amount">{fmtCurrency(todayRevenue)}</span>
            </div>
            <div className="cashflow-bar-track">
              <div className="cashflow-bar-fill" style={{ width: `${revPct}%`, background: '#0F9E8E' }} />
            </div>
          </div>
          <div className="cashflow-row">
            <div className="cashflow-row-head">
              <span className="cashflow-label">Expenses out</span>
              <span className="cashflow-amount">{fmtCurrency(todayExpenses)}</span>
            </div>
            <div className="cashflow-bar-track">
              <div className="cashflow-bar-fill" style={{ width: `${expPct}%`, background: '#E08A0B' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Workload balance */}
      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Workload balance · this week</span>
        </div>
        <div className="workload-rows">
          {WORKLOAD_ORDER.map((partner) => {
            const hrs       = workloadHours[partner] || 0;
            const pct       = Math.round((hrs / maxWkHours) * 100);
            const isFiltered = partnerFilter !== 'all' && partnerFilter !== partner;
            return (
              <div key={partner} className="workload-row" style={{ opacity: isFiltered ? 0.35 : 1 }}>
                <div className={`partner-monogram partner-monogram-sm ${PARTNER_MONO_CLASS[partner]}`}>
                  {PARTNER_INITIALS[partner]}
                </div>
                <div className="workload-info">
                  <div className="workload-name-row">
                    <span className="workload-name">{partner} · {PARTNER_ROLES[partner]}</span>
                    <span className="workload-label">{hrs.toFixed(1)}h / wk</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${pct}%`, background: PARTNER_COLORS[partner] }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <p className="workload-note">
            {workloadHours[topWorker] > 0
              ? `${topWorker} leads this week with ${workloadHours[topWorker].toFixed(1)}h logged.`
              : 'No hours logged this week yet. Clock in to track workload.'}
          </p>
        </div>
      </div>

      {/* Up next */}
      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Up next</span>
          <button className="section-card-link" onClick={onOpenTask} type="button">
            All tasks →
          </button>
        </div>
        {upNextTasks.length === 0 ? (
          <div style={{ padding: '0 16px 18px', color: 'var(--text-muted)', fontSize: 13 }}>
            No pending tasks{partnerFilter !== 'all' ? ` for ${partnerFilter}` : ''}.
          </div>
        ) : (
          upNextTasks.map((task) => {
            const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.normal;
            const timeStr       = fmtTaskTime(task);
            return (
              <div key={task.id} className="task-row" role="button" tabIndex={0}>
                <div className="task-checkbox" aria-label="Complete task" />
                <div className="task-priority-dot" style={{ background: priorityColor }} />
                <div className="task-info">
                  <span className="task-title">{task.title}</span>
                  <span className="task-meta">{task.from} → {task.to}</span>
                </div>
                {timeStr && (
                  <span className="task-time" style={{ color: 'var(--text-muted)' }}>{timeStr}</span>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
