import React, { useMemo, useState } from 'react';
import { getLocalDateStr, getTaskDeadlineStatus } from '../utils/calculations';
import { triggerHaptic } from '../utils/haptics';
import PartnerDetailModal from './modals/PartnerDetailModal';

/* -- Partner meta ------------------------------------------------ */
const PARTNER_COLORS    = { Balaji: '#1B2A5B', Nagoor: '#0F9E8E', JP: '#B4531F', Shared: '#5A6480' };
const PARTNER_INITIALS  = { Balaji: 'BA', Nagoor: 'NA', JP: 'JP', Shared: 'ALL' };
const PARTNER_MONO_CLASS= { Balaji: 'balaji', Nagoor: 'nagoor', JP: 'jp', Shared: 'shared' };

const PRIORITY_COLORS   = { urgent: '#D93A3A', high: '#E08A0B', normal: '#6B7590' };

/* -- Helpers ----------------------------------------------------- */
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

  // Active Partner Insight Modal state
  const [selectedPartnerDetail, setSelectedPartnerDetail] = useState(null);

  /* Tasks KPI (Memoized) */
  const { pendingTasks, pendingCount, urgentCount, doneCount, completionPct } = useMemo(() => {
    const allTasks = store.tasks || [];
    const activeTasks =
      partnerFilter === 'all'
        ? allTasks
        : allTasks.filter((t) => t.to === partnerFilter || t.from === partnerFilter || !t.to || t.to === 'Shared');

    const isDone = (t) => t.status === 'completed' || t.s === 'done';
    const pending = activeTasks.filter((t) => !isDone(t));
    const done = activeTasks.filter(isDone);
    const total = pending.length + done.length;
    const pct = total > 0 ? Math.round((done.length / total) * 100) : 0;
    const urgent = pending.filter((t) => (t.priority || '').toLowerCase() === 'urgent').length;

    return {
      pendingTasks: pending,
      pendingCount: pending.length,
      urgentCount: urgent,
      doneCount: done.length,
      completionPct: pct,
    };
  }, [store.tasks, partnerFilter]);

  /* Hours KPI (Memoized) */
  const todayHours = useMemo(() => {
    return (store.worklogs || [])
      .filter((w) => (w.date || getLocalDateStr(w.createdAt)) === today && (partnerFilter === 'all' || w.partner === partnerFilter))
      .reduce((s, w) => s + Number(w.hours || 0), 0);
  }, [store.worklogs, today, partnerFilter]);

  const activeShiftsCount = useMemo(() => {
    return Object.keys(store.activeShifts || {}).length;
  }, [store.activeShifts]);

  /* Workload balance (weekly hours per partner, memoized) */
  const { workloadHours, maxWkHours, topWorker } = useMemo(() => {
    const logs = (store.worklogs || []).filter(
      (w) => (w.date || getLocalDateStr(w.createdAt)) >= weekStartStr
    );
    const hours = { Nagoor: 0, JP: 0, Balaji: 0 };
    logs.forEach((w) => {
      if (hours[w.partner] !== undefined) {
        hours[w.partner] += Number(w.hours || 0);
      }
    });
    const max = Math.max(...Object.values(hours), 1);
    const top = Object.keys(hours).reduce((a, b) =>
      hours[a] >= hours[b] ? a : b
    );
    return { workloadHours: hours, maxWkHours: max, topWorker: top };
  }, [store.worklogs, weekStartStr]);

  /* Up next: up to 5 prioritized tasks for the active partner filter */
  const upNextTasks = useMemo(() => {
    return pendingTasks
      .slice()
      .sort((a, b) => {
        const order = { urgent: 0, high: 1, normal: 2 };
        const pA = order[a.priority?.toLowerCase()] ?? 2;
        const pB = order[b.priority?.toLowerCase()] ?? 2;
        if (pA !== pB) return pA - pB;
        const timeA = a.dueDateTime || a.dueAt || a.createdAt || '';
        const timeB = b.dueDateTime || b.dueAt || b.createdAt || '';
        return timeA.localeCompare(timeB);
      })
      .slice(0, 5);
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
            {activeShiftsCount > 0 && (
              <span className="kpi-urgent-badge" style={{ background: '#FEF3C7', color: '#B45309' }}>
                {activeShiftsCount} Active
              </span>
            )}
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
          title="Completed tasks"
        >
          <div className="kpi-label-row">
            <span className="kpi-label">Mudicha Vela</span>
            <span className="kpi-icon-hint">✅</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#0F9E8E' }}>{doneCount}</span>
            <span className="kpi-done-badge">{doneCount > 0 ? '✓ Done' : '0 done'}</span>
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
                className={`live-partner-box ${isOnline ? 'is-online' : isOnShift ? 'is-shift' : 'is-offline'}${isMe ? ' is-me' : ''}`}
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
                  <span className={`live-status-bubble ${isOnline ? 'online' : isOnShift ? 'shift' : 'offline'}`} />
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

      {/* Priority Action Queue: Next Enna Vela? */}
      <div className="section-card up-next-section-card">
        <div className="section-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-team-dot" style={{ backgroundColor: '#D93A3A' }} />
              <span className="section-card-title">Next Enna Vela?</span>
            </div>
            <span className="section-card-meta" style={{ display: 'block', marginTop: 2 }}>
              {partnerFilter !== 'all' ? `${partnerFilter}-ku pending velaiga` : 'High-priority team tasks'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onOpenTask && (
              <button
                type="button"
                className="section-card-link"
                onClick={onOpenTask}
                style={{ fontWeight: 700 }}
              >
                + Pudhu Task
              </button>
            )}
            {onGoToTasks && (
              <button
                type="button"
                className="section-card-link"
                onClick={onGoToTasks}
              >
                Ella Tasks →
              </button>
            )}
          </div>
        </div>

        {upNextTasks.length === 0 ? (
          <div className="home-all-clear-card">
            <span className="home-all-clear-icon">🎉</span>
            <div className="home-all-clear-info">
              <div className="home-all-clear-title">
                {partnerFilter === 'all'
                  ? 'All Clear! Endha pending velayum illa.'
                  : `${partnerFilter}-ku ippo endha velayum pending illa.`}
              </div>
              <div className="home-all-clear-sub">
                Pudhu task irundha keezha irukura button moolama add pannalaam.
              </div>
            </div>
            {onOpenTask && (
              <button
                type="button"
                className="home-quick-add-task-btn"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenTask();
                }}
              >
                + Task Add Pannu
              </button>
            )}
          </div>
        ) : (
          <div className="upnext-tasks-list">
            {upNextTasks.map((task) => {
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
                  <button
                    type="button"
                    className="task-checkbox"
                    title="Mark task completed"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('medium');
                      onCompleteTask?.(task.id);
                    }}
                    aria-label="Complete task"
                  />
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
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
            })}
          </div>
        )}
      </div>

      {/* Workload balance */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <span className="section-card-title">Workload Balance · Indha Vaaram</span>
            <span className="section-card-meta" style={{ display: 'block', marginTop: 2 }}>
              Weekly logged shift hours
            </span>
          </div>
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

      {/* Partner Performance & Insights Modal */}
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
