import React, { useMemo, useState } from 'react';
import { fmtCurrency, getLocalDateStr, getTaskDeadlineStatus } from '../utils/calculations';
import { triggerHaptic } from '../utils/haptics';
import PartnerDetailModal from './modals/PartnerDetailModal';

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
  if (raw && raw.length > 10 && (raw.includes('T') || raw.includes(':'))) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  }
  if (task.createdAt) {
    const d = new Date(task.createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  }
  return '';
}

const WORKLOAD_ORDER = ['Nagoor', 'JP', 'Balaji'];
const PARTNER_ROLES  = { Nagoor: 'Procure & Pack', JP: 'Delivery & Sales', Balaji: 'Tech & Product' };

/* ---------------------------------------------------------------- */
export default function HomeTab({
  store,
  partnerFilter,
  setPartnerFilter: _setPartnerFilter,
  onOpenTask,
  onGoToTasks,
  onGoToHours,
  onGoToLedger,
  onlinePartners,
  profiles,
  currentPartner,
  onOpenSettings,
  onCompleteTask,
}) {
  const today = getLocalDateStr();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const weekStartStr = getLocalDateStr(weekStartDate);

  // Active Partner Insight Modal & Cashflow Scope state
  const [selectedPartnerDetail, setSelectedPartnerDetail] = useState(null);
  const [cashflowScope, setCashflowScope] = useState('today'); // 'today' | 'total'
  const [selectedTaskPartner, setSelectedTaskPartner] = useState(currentPartner?.name || 'Balaji');

  /* Tasks KPI */
  const allTasks = store.tasks || [];
  const activeTasks =
    partnerFilter === 'all'
      ? allTasks
      : allTasks.filter((t) => t.to === partnerFilter || t.from === partnerFilter || !t.to || t.to === 'Shared');

  const isDone = (t) => t.status === 'completed' || t.s === 'done';
  const pendingTasks  = activeTasks.filter((t) => !isDone(t));
  const doneTasks     = activeTasks.filter(isDone);
  const pendingCount  = pendingTasks.length;
  const urgentCount   = pendingTasks.filter((t) => (t.priority || '').toLowerCase() === 'urgent').length;
  const totalTasks    = pendingCount + doneTasks.length;
  const completionPct = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

  /* Hours KPI */
  const todayLogs = (store.worklogs || []).filter(
    (w) => (w.date || getLocalDateStr(w.createdAt)) === today && (partnerFilter === 'all' || w.partner === partnerFilter)
  );
  const todayHours = todayLogs.reduce((s, w) => s + Number(w.hours || 0), 0);

  /* Cashflow KPI: Today vs Total */
  const todayExpenses = (store.expenses || [])
    .filter((e) => (e.date || getLocalDateStr(e.createdAt)) === today && (partnerFilter === 'all' || e.partner === partnerFilter))
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const todayRevenue = (store.revenues || [])
    .filter((r) => (r.date || getLocalDateStr(r.createdAt)) === today && (partnerFilter === 'all' || r.partner === partnerFilter))
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const netToday = todayRevenue - todayExpenses;

  const totalExpenses = useMemo(() => {
    return (store.expenses || [])
      .filter((e) => partnerFilter === 'all' || e.partner === partnerFilter)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
  }, [store.expenses, partnerFilter]);

  const totalRevenue = useMemo(() => {
    return (store.revenues || [])
      .filter((r) => partnerFilter === 'all' || r.partner === partnerFilter)
      .reduce((s, r) => s + Number(r.amount || 0), 0);
  }, [store.revenues, partnerFilter]);

  const displayRevenue  = cashflowScope === 'today' ? todayRevenue : totalRevenue;
  const displayExpenses = cashflowScope === 'today' ? todayExpenses : totalExpenses;
  const displayNet      = displayRevenue - displayExpenses;
  const displayCashTotal= displayRevenue + displayExpenses;
  const revPct = displayCashTotal > 0 ? Math.round((displayRevenue / displayCashTotal) * 100) : 0;
  const expPct = displayCashTotal > 0 ? Math.round((displayExpenses / displayCashTotal) * 100) : 0;

  /* Live Partner Tasks filtering */
  const livePartnerPendingTasks = useMemo(() => {
    return (store.tasks || []).filter((t) => {
      const isPending = t.status !== 'completed' && t.s !== 'done';
      if (!isPending) return false;
      if (selectedTaskPartner === 'all') return true;
      return t.to === selectedTaskPartner;
    });
  }, [store.tasks, selectedTaskPartner]);

  /* Workload balance (weekly hours per partner) */
  const weekLogs = (store.worklogs || []).filter(
    (w) => (w.date || getLocalDateStr(w.createdAt)) >= weekStartStr
  );
  const workloadHours = { Nagoor: 0, JP: 0, Balaji: 0 };
  weekLogs.forEach((w) => {
    if (workloadHours[w.partner] !== undefined) {
      workloadHours[w.partner] += Number(w.hours || 0);
    }
  });
  const maxWkHours = Math.max(...Object.values(workloadHours), 1);
  const topWorker  = Object.keys(workloadHours).reduce((a, b) =>
    workloadHours[a] >= workloadHours[b] ? a : b
  );

  /* Up next: up to 3 active tasks */
  const upNextTasks = useMemo(() => {
    return pendingTasks
      .slice()
      .sort((a, b) => {
        const order = { urgent: 0, high: 1, normal: 2 };
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      })
      .slice(0, 3);
  }, [pendingTasks]);

  /* -- Render ------------------------------------------------ */
  return (
    <div className="tab-content">

      {/* KPI 4-Card Grid */}
      <div className="kpi-grid">
        <div
          className="kpi-card interactive"
          onClick={() => {
            triggerHaptic('light');
            onGoToTasks?.();
          }}
          role="button"
          tabIndex={0}
          title="Go to Tasks"
        >
          <div className="kpi-label-row">
            <span className="kpi-label">Pending Velaiga</span>
            <span className="kpi-icon-hint">📋</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{pendingCount}</span>
            {urgentCount > 0 && (
              <span className="kpi-urgent-badge">{urgentCount} Urgent</span>
            )}
          </div>
        </div>

        <div
          className="kpi-card interactive"
          onClick={() => {
            triggerHaptic('light');
            onGoToHours?.();
          }}
          role="button"
          tabIndex={0}
          title="Go to Shifts"
        >
          <div className="kpi-label-row">
            <span className="kpi-label">Innaiku Shift</span>
            <span className="kpi-icon-hint">⏱️</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{todayHours.toFixed(1)}</span>
            <span className="kpi-unit">hrs</span>
          </div>
        </div>

        <div
          className="kpi-card interactive"
          onClick={() => {
            triggerHaptic('light');
            onGoToLedger?.();
          }}
          role="button"
          tabIndex={0}
          title="Go to Ledger"
        >
          <div className="kpi-label-row">
            <span className="kpi-label">Innaiku Net</span>
            <span className="kpi-icon-hint">💰</span>
          </div>
          <div
            className="kpi-value-sm"
            style={{
              color: netToday > 0 ? '#0B7E71' : netToday < 0 ? '#D93A3A' : 'var(--text-primary)',
              marginTop: 8,
            }}
          >
            {fmtCurrency(netToday)}
          </div>
        </div>

        <div
          className="kpi-card interactive"
          onClick={() => {
            triggerHaptic('light');
            onGoToTasks?.();
          }}
          role="button"
          tabIndex={0}
          title="View completion"
        >
          <div className="kpi-label-row">
            <span className="kpi-label">Work Done</span>
            <span className="kpi-icon-hint">🎯</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{completionPct}%</span>
          </div>
        </div>
      </div>

      {/* Live Active Partners Section */}
      <div className="section-card live-team-card">
        <div className="section-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-team-dot" />
            <span className="section-card-title">Live Active Partners</span>
          </div>
          <span className="section-card-meta">Tap partner for insights</span>
        </div>
        <div className="live-partners-grid">
          {['Balaji', 'Nagoor', 'JP'].map((pName) => {
            const isMe = pName === currentPartner?.name;
            const isOnline = !!onlinePartners?.[pName] || isMe;
            const isOnShift = !!store.activeShifts?.[pName];
            const avatarUrl = profiles?.[pName]?.avatarUrl;
            const initials = PARTNER_INITIALS[pName];
            const pColor = PARTNER_COLORS[pName];

            return (
              <div
                key={pName}
                className={`live-partner-box ${isOnline ? 'is-online' : 'is-offline'}${isMe ? ' is-me' : ''}`}
                onClick={() => {
                  triggerHaptic('medium');
                  setSelectedPartnerDetail(pName);
                }}
                role="button"
                tabIndex={0}
                title={`${pName} (${PARTNER_ROLES[pName] || 'Partner'}) — Performance & Insights`}
                style={{ cursor: 'pointer' }}
              >
                <div className="live-avatar-wrap" style={{ backgroundColor: pColor }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={pName} className="live-avatar-img" />
                  ) : (
                    <span>{initials}</span>
                  )}
                  <span className={`live-status-bubble ${isOnline ? 'online' : 'offline'}`} />
                </div>
                <div className="live-partner-name">
                  {pName} {isMe && <span className="live-you-tag">(You)</span>}
                </div>
                <div className={`live-partner-badge ${isOnline ? 'online' : isOnShift ? 'shift' : 'offline'}`}>
                  {isOnline ? '🟢 Online' : isOnShift ? '⏱️ Shift' : 'Offline'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Partner Tasks Section - Directly below Live Active Partners */}
      <div className="section-card live-partner-tasks-card">
        <div className="section-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-team-dot" style={{ backgroundColor: 'var(--teal)' }} />
              <span className="section-card-title">Live Partner Tasks</span>
            </div>
            <span className="section-card-meta" style={{ display: 'block', marginTop: 2 }}>
              Partner-wise active assignments
            </span>
          </div>
          {onOpenTask && (
            <button
              type="button"
              className="section-card-link"
              onClick={onOpenTask}
            >
              + Pudhu Task
            </button>
          )}
        </div>

        {/* Partner selection tabs for tasks */}
        <div className="live-partner-task-tabs">
          {['all', 'Balaji', 'Nagoor', 'JP'].map((p) => {
            const count = (store.tasks || []).filter((t) => {
              const isPending = t.status !== 'completed' && t.s !== 'done';
              if (!isPending) return false;
              return p === 'all' ? true : t.to === p;
            }).length;

            return (
              <button
                key={p}
                type="button"
                className={`live-task-tab-btn ${selectedTaskPartner === p ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedTaskPartner(p);
                }}
              >
                <span>{p === 'all' ? 'All' : p}</span>
                {count > 0 && <span className="live-task-tab-count">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Tasks List for selected partner */}
        <div className="live-partner-tasks-list">
          {livePartnerPendingTasks.length === 0 ? (
            <div className="live-task-empty">
              <span>🎉 Indha partner-ku pending vela yedhum illa!</span>
            </div>
          ) : (
            livePartnerPendingTasks.slice(0, 5).map((task) => {
              const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.normal;
              const timeStr       = fmtTaskTime(task);
              const deadlineAlert = getTaskDeadlineStatus(task);
              const assignerName  = task.assignedBy || task.from;
              return (
                <div key={task.id} className="live-task-row">
                  <button
                    type="button"
                    className="live-task-check"
                    title="Mark task completed"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('medium');
                      onCompleteTask?.(task.id);
                    }}
                  >
                    ✓
                  </button>
                  <div
                    className="live-task-content"
                    onClick={() => onGoToTasks?.() || onOpenTask?.()}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="live-task-title-row">
                      <span
                        className="task-priority-dot"
                        style={{
                          background: priorityColor,
                          boxShadow: task.priority === 'urgent' ? '0 0 6px rgba(217, 58, 58, 0.4)' : 'none',
                        }}
                      />
                      <span className="live-task-title">{task.title}</span>
                    </div>
                    <div className="live-task-meta-row">
                      <span className="live-task-assigned">
                        {task.to ? `→ ${task.to}` : 'Shared'} {assignerName ? `(${assignerName})` : ''}
                      </span>
                      {deadlineAlert ? (
                        <span className={`task-deadline-pill sm ${deadlineAlert.status}`}>
                          {deadlineAlert.label}
                        </span>
                      ) : (
                        timeStr && <span className="task-time">{timeStr}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {livePartnerPendingTasks.length > 5 && (
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <button
                type="button"
                className="section-card-link"
                onClick={onGoToTasks}
              >
                View all {livePartnerPendingTasks.length} tasks →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cashflow Card (Today vs Total Segmented Control) */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <span className="section-card-title">
              {cashflowScope === 'today' ? 'Innaiku Cashflow' : 'Moththa Cashflow (Total)'}
            </span>
            <span className="section-card-meta" style={{ display: 'block', marginTop: 2 }}>
              {cashflowScope === 'today' ? fmtDDMon(today) : 'Overall Business Records'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* iOS Segmented Control */}
            <div className="cashflow-segmented-control">
              <button
                type="button"
                className={`cashflow-segment-btn ${cashflowScope === 'today' ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setCashflowScope('today');
                }}
              >
                Innaiku
              </button>
              <button
                type="button"
                className={`cashflow-segment-btn ${cashflowScope === 'total' ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setCashflowScope('total');
                }}
              >
                Moththam
              </button>
            </div>

            {onGoToLedger && (
              <button
                type="button"
                className="section-card-link"
                onClick={onGoToLedger}
              >
                Ledger →
              </button>
            )}
          </div>
        </div>

        <div className="cashflow-rows">
          <div className="cashflow-row">
            <div className="cashflow-row-head">
              <span className="cashflow-label">Varavu (Income)</span>
              <span className="cashflow-amount" style={{ color: '#0F9E8E' }}>
                {fmtCurrency(displayRevenue)}
              </span>
            </div>
            <div className="cashflow-bar-track">
              <div
                className="cashflow-bar-fill"
                style={{
                  width: `${revPct}%`,
                  background: 'linear-gradient(90deg, #0F9E8E, #2DD4BF)',
                }}
              />
            </div>
          </div>
          <div className="cashflow-row">
            <div className="cashflow-row-head">
              <span className="cashflow-label">Selavu (Expense)</span>
              <span className="cashflow-amount" style={{ color: '#E08A0B' }}>
                {fmtCurrency(displayExpenses)}
              </span>
            </div>
            <div className="cashflow-bar-track">
              <div
                className="cashflow-bar-fill"
                style={{
                  width: `${expPct}%`,
                  background: 'linear-gradient(90deg, #E08A0B, #FBBF24)',
                }}
              />
            </div>
          </div>
          <div className="cashflow-net-row">
            <span className="cashflow-net-label">
              {displayNet >= 0 ? '📈 Net Profit (Laabam)' : '📉 Net Deficit (Nashtam)'}
            </span>
            <span
              className="cashflow-net-amount"
              style={{ color: displayNet >= 0 ? '#0B7E71' : '#D93A3A' }}
            >
              {fmtCurrency(displayNet)}
            </span>
          </div>
        </div>
      </div>

      {/* Workload balance */}
      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Workload Balance · Indha Vaaram</span>
          {onGoToHours && (
            <button
              type="button"
              className="section-card-link"
              onClick={onGoToHours}
            >
              Shifts →
            </button>
          )}
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
            {workloadHours[topWorker] > 0 ? (
              `${topWorker} leads this week with ${workloadHours[topWorker].toFixed(1)}h logged.`
            ) : (
              <>
                No hours logged this week yet.{' '}
                {onGoToHours && (
                  <button
                    type="button"
                    onClick={onGoToHours}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--teal)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      font: 'inherit',
                    }}
                  >
                    Clock in →
                  </button>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Up next */}
      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Next Enna Vela? (Up Next)</span>
          <button
            className="section-card-link"
            onClick={onGoToTasks || onOpenTask}
            type="button"
          >
            Ella Tasks →
          </button>
        </div>
        {upNextTasks.length === 0 ? (
          <div style={{ padding: '0 16px 18px', color: 'var(--text-muted)', fontSize: 13 }}>
            Pending vela yedhum illa{partnerFilter !== 'all' ? ` (${partnerFilter}-ku)` : ''}.
          </div>
        ) : (
          upNextTasks.map((task) => {
            const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.normal;
            const timeStr       = fmtTaskTime(task);
            const deadlineAlert = getTaskDeadlineStatus(task);
            const assignerName  = task.assignedBy || task.from;
            return (
              <div
                key={task.id}
                className="task-row"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => (onGoToTasks ? onGoToTasks() : onOpenTask())}
              >
                <div className="task-checkbox" aria-label="View task" />
                <div
                  className="task-priority-dot"
                  style={{
                    background: priorityColor,
                    boxShadow: task.priority === 'urgent' ? '0 0 6px rgba(217, 58, 58, 0.4)' : 'none',
                  }}
                />
                <div className="task-info">
                  <span className="task-title">{task.title}</span>
                  <span className="task-meta">
                    {assignerName ? `by ${assignerName} → ` : ''}{task.to || 'Shared'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                  {deadlineAlert ? (
                    <span className={`task-deadline-pill sm ${deadlineAlert.status}`}>
                      {deadlineAlert.label}
                    </span>
                  ) : (
                    timeStr && (
                      <span className="task-time" style={{ color: 'var(--text-muted)' }}>{timeStr}</span>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Partner Performance & Contribution Modal */}
      {selectedPartnerDetail && (
        <PartnerDetailModal
          isOpen={!!selectedPartnerDetail}
          partnerName={selectedPartnerDetail}
          store={store}
          profiles={profiles}
          onlinePartners={onlinePartners}
          onOpenSettings={onOpenSettings}
          isMe={selectedPartnerDetail === currentPartner?.name}
          onClose={() => setSelectedPartnerDetail(null)}
          onCompleteTask={onCompleteTask}
          onOpenTask={onOpenTask}
        />
      )}

    </div>
  );
}
