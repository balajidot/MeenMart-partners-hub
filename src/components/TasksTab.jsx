import React, { useMemo } from 'react';
import { getLocalDateStr } from '../utils/calculations';
import { triggerHaptic } from '../utils/haptics';

/* -- Partner meta ------------------------------------------------ */
const PARTNER_INITIALS   = { Balaji: 'BA', Nagoor: 'NA', JP: 'JP', Shared: 'ALL' };
const PARTNER_MONO_CLASS = { Balaji: 'balaji', Nagoor: 'nagoor', JP: 'jp', Shared: 'shared' };

const PRIORITY_LABEL = { urgent: 'Urgent', high: 'High', normal: 'Normal' };
const PRIORITY_CLASS = { urgent: 'urgent', high: 'high', normal: 'normal' };

/* -- Day helpers ------------------------------------------------- */
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildCalDays() {
  const today = new Date();
  const days  = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      dateStr: getLocalDateStr(d),
      dow:     DOW_LABELS[d.getDay()],
      dom:     d.getDate(),
    });
  }
  return days;
}

function taskDateStr(task) {
  const raw = task.dueDateTime || task.dueAt || task.createdAt || '';
  return raw ? getLocalDateStr(raw) : '';
}

function fmtTaskMeta(task) {
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
  return null;
}

function formatHeaderDate(dateStr, todayStr) {
  if (!dateStr) return '';
  if (dateStr === todayStr) {
    const d = new Date();
    return `Today · ${d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}`;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return dateStr;
}

/* -- SVGs -------------------------------------------------------- */
function CheckSVG() {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
      <path d="M1.5 5L4.5 8.2L10.5 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <rect x="4" y="8" width="28" height="24" rx="5" stroke="#C3CADB" strokeWidth="1.8" />
      <path d="M4 14h28" stroke="#C3CADB" strokeWidth="1.6" />
      <rect x="11" y="4" width="2.5" height="8" rx="1.25" fill="#C3CADB" />
      <rect x="22.5" y="4" width="2.5" height="8" rx="1.25" fill="#C3CADB" />
      <rect x="10" y="20" width="5" height="5" rx="2" fill="#DFE4EF" />
      <rect x="21" y="20" width="5" height="5" rx="2" fill="#DFE4EF" />
    </svg>
  );
}

function TrashSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function LockSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PlusSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ClockSVG() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/* ================================================================ */
export default function TasksTab({
  store,
  partnerFilter,
  selectedDate,
  setSelectedDate,
  completeTask,
  deleteTask,
  _addProof,
  _onOpenLightbox,
  onOpenTask,
  onOpenCompleteTask,
  currentPartner,
}) {
  const calDays = useMemo(() => buildCalDays(), []);
  const today   = getLocalDateStr();

  const activeUser = currentPartner?.name || 'Balaji';

  /* Active day — default to today */
  const activeDateStr = selectedDate || today;

  /* All tasks */
  const allTasks = useMemo(() => store.tasks || [], [store.tasks]);

  /* Tasks that have activity on a given date (for dot) */
  const tasksByDate = useMemo(() => {
    const map = {};
    allTasks.forEach((t) => {
      const ds = taskDateStr(t);
      if (ds) {
        if (!map[ds]) map[ds] = [];
        map[ds].push(t);
      }
    });
    return map;
  }, [allTasks]);

  /* Tasks filtered by selected date + partner */
  const dateTasks = useMemo(() => {
    let list = allTasks.filter((t) => taskDateStr(t) === activeDateStr);
    if (partnerFilter !== 'all') {
      list = list.filter((t) => t.to === partnerFilter || t.from === partnerFilter || !t.to || t.to === 'Shared');
    }
    return list;
  }, [allTasks, activeDateStr, partnerFilter]);

  const completed  = dateTasks.filter((t) => t.status === 'completed' || t.s === 'done');
  const inProgress = dateTasks.filter((t) => t.status === 'in_progress' && t.s !== 'done');
  const pending    = dateTasks.filter((t) => (t.status === 'pending' || !t.status || t.status === 'active') && t.status !== 'in_progress' && t.s !== 'done');

  const handleComplete = (task) => {
    triggerHaptic('success');
    if (onOpenCompleteTask) onOpenCompleteTask(task);
    else completeTask(task.id);
  };

  const headerDateLabel = formatHeaderDate(activeDateStr, today);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="tab-content">

      {/* Date Header Info */}
      <div className="tasks-date-header">
        <div>
          <h2 className="tasks-date-title">{headerDateLabel}</h2>
          <div className="tasks-date-sub">
            {dateTasks.length === 0
              ? 'Endha velaiyum scheduled illa'
              : `${dateTasks.length} ${dateTasks.length === 1 ? 'task' : 'tasks'} · ${completed.length} mudinjidhu`}
          </div>
        </div>
        {activeDateStr !== today && (
          <button
            type="button"
            className="tasks-today-btn"
            onClick={() => {
              triggerHaptic('light');
              setSelectedDate(today);
            }}
          >
            Innaiku Vaanga
          </button>
        )}
      </div>

      {/* Calendar strip */}
      <div className="cal-strip">
        {calDays.map(({ dateStr, dow, dom }) => {
          const isActive = dateStr === activeDateStr;
          const isToday  = dateStr === today;
          const hasTasks = !!(tasksByDate[dateStr]?.length);
          return (
            <button
              key={dateStr}
              type="button"
              className={`cal-day-pill${isActive ? ' active' : ''}${isToday ? ' today' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setSelectedDate(dateStr);
              }}
              aria-label={`${dow} ${dom}${isToday ? ' (Today)' : ''}${hasTasks ? ' - has tasks' : ''}`}
              aria-pressed={isActive}
            >
              <span className="cal-day-dow">{dow}</span>
              <span className="cal-day-dom">{dom}</span>
              <span className={`cal-day-dot${hasTasks ? ' has-tasks' : ''}`} />
            </button>
          );
        })}
      </div>

      {/* Filter Notice if filtered by a specific partner */}
      {partnerFilter !== 'all' && (
        <div className="task-filter-notice">
          <span>Filtered for <strong>{partnerFilter}</strong></span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tap avatar in header to change</span>
        </div>
      )}

      {/* Empty state */}
      {dateTasks.length === 0 && (
        <div className="empty-state">
          <CalendarSVG />
          <h3>Indha date-la vela yedhum illa!</h3>
          <p>
            {partnerFilter !== 'all'
              ? `${partnerFilter}-ku endha task-um assign aagala.`
              : `Indha date-la tasks yedhum scheduled illa.`}
          </p>
          <button className="empty-state-action" type="button" onClick={onOpenTask}>
            + Pudhu Task Podu
          </button>
        </div>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <div className="section-group">
          <div className="section-label-row">
            <span className="section-label teal">Ippo Nadakudhu</span>
            <span className="section-count-badge teal">{inProgress.length}</span>
            <div className="section-divider" />
          </div>
          {inProgress.map((task) => {
            const assigner = task.from || task.createdBy;
            const canDelete = !assigner || assigner === activeUser;
            return (
              <TaskCardActive
                key={task.id}
                task={task}
                isRunning
                onComplete={handleComplete}
                onDelete={deleteTask}
                canDelete={canDelete}
                assigner={assigner}
                activeUser={activeUser}
              />
            );
          })}
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="section-group">
          <div className="section-label-row">
            <span className="section-label slate">Pending Velaiga</span>
            <span className="section-count-badge">{pending.length}</span>
            <div className="section-divider" />
          </div>
          {pending.map((task) => {
            const assigner = task.from || task.createdBy;
            const canDelete = !assigner || assigner === activeUser;
            return (
              <TaskCardActive
                key={task.id}
                task={task}
                isRunning={false}
                onComplete={handleComplete}
                onDelete={deleteTask}
                canDelete={canDelete}
                assigner={assigner}
                activeUser={activeUser}
              />
            );
          })}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="section-group">
          <div className="section-label-row">
            <span className="section-label slate">Mudinjadhu</span>
            <span className="section-count-badge success">{completed.length}</span>
            <div className="section-divider" />
          </div>
          {completed.map((task) => {
            const assigner = task.from || task.createdBy;
            const canDelete = !assigner || assigner === activeUser;
            return (
              <TaskCardDone
                key={task.id}
                task={task}
                onUncomplete={() => completeTask && completeTask(task.id, 'pending')}
                onDelete={deleteTask}
                canDelete={canDelete}
                assigner={assigner}
                activeUser={activeUser}
              />
            );
          })}
        </div>
      )}

      {/* Quick Add Button below tasks list */}
      {dateTasks.length > 0 && (
        <button
          type="button"
          className="task-quick-add-btn"
          onClick={() => {
            triggerHaptic('medium');
            onOpenTask();
          }}
        >
          <PlusSVG />
          <span>+ {activeDateStr === today ? 'Innaiku' : activeDateStr}-ku Task Podu</span>
        </button>
      )}

    </div>
  );
}

/* ── Task card (active / in-progress) ─────────────────────── */
const TaskCardActive = React.memo(function TaskCardActive({
  task,
  isRunning,
  onComplete,
  onDelete,
  canDelete,
  assigner,
  activeUser,
}) {
  const partnerClass = PARTNER_MONO_CLASS[task.to] || 'shared';
  const rawPriority  = (task.priority || 'normal').toLowerCase();
  const prioClass    = PRIORITY_CLASS[rawPriority] || 'normal';
  const prioLabel    = PRIORITY_LABEL[rawPriority] || 'Normal';
  const timeStr      = fmtTaskMeta(task);
  const initials     = PARTNER_INITIALS[task.to]   || 'ALL';

  return (
    <div className="task-card">
      {/* Checkbox */}
      <button
        type="button"
        className="task-card-checkbox"
        onClick={() => onComplete(task)}
        aria-label="Mark complete"
      />

      {/* Partner monogram */}
      <div className={`partner-monogram partner-monogram-md ${partnerClass}`}>
        {initials}
      </div>

      {/* Body */}
      <div className="task-card-body">
        <div className="task-card-top">
          <span className="task-card-title">{task.title}</span>
          <span className={`priority-badge ${prioClass}`}>
            {prioLabel}
          </span>
        </div>

        <div className="task-card-foot">
          {timeStr && (
            <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <ClockSVG /> {timeStr}
            </span>
          )}
          {timeStr && <span>·</span>}
          <span style={{ fontWeight: 500, color: 'var(--text-sec)' }}>{task.to || 'Shared'}</span>
          {task.from && (
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              by {task.from}
            </span>
          )}
          {isRunning && (
            <span className="running-badge">
              <span className="running-dot" />
              Running
            </span>
          )}
          {canDelete ? (
            onDelete && (
              <button
                type="button"
                className="task-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Delete this task?')) {
                    triggerHaptic('warning');
                    onDelete(task.id, activeUser);
                  }
                }}
                title={`Delete task (assigned by ${assigner || 'you'})`}
                aria-label="Delete task"
              >
                <TrashSVG />
              </button>
            )
          ) : (
            <span
              className="task-lock-badge"
              title={`Assigned by ${assigner}. Only ${assigner} can delete.`}
              aria-label={`Assigned by ${assigner}. Only ${assigner} can delete.`}
            >
              <LockSVG />
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

/* ── Done card ─────────────────────────────────────────────── */
const TaskCardDone = React.memo(function TaskCardDone({
  task,
  onUncomplete,
  onDelete,
  canDelete,
  assigner,
  activeUser,
}) {
  const partnerClass = PARTNER_MONO_CLASS[task.to] || 'shared';
  const initials     = PARTNER_INITIALS[task.to]   || 'ALL';

  return (
    <div className="task-card done-card">
      {/* Teal check */}
      <button
        type="button"
        className="task-card-done-check"
        onClick={() => {
          triggerHaptic('light');
          onUncomplete();
        }}
        aria-label="Mark incomplete"
        title="Undo completion"
      >
        <CheckSVG />
      </button>

      {/* Body */}
      <div className="task-card-body">
        <span className="task-done-title">{task.title}</span>
        <span className="task-done-meta">
          {task.from ? `${task.from} → ` : ''}{task.to || 'Shared'}
        </span>
      </div>

      {canDelete ? (
        onDelete && (
          <button
            type="button"
            className="task-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Delete this task?')) {
                triggerHaptic('warning');
                onDelete(task.id, activeUser);
              }
            }}
            title={`Delete task (assigned by ${assigner || 'you'})`}
            aria-label="Delete task"
          >
            <TrashSVG />
          </button>
        )
      ) : (
        <span
          className="task-lock-badge"
          title={`Assigned by ${assigner}. Only ${assigner} can delete.`}
          aria-label={`Assigned by ${assigner}. Only ${assigner} can delete.`}
        >
          <LockSVG />
        </span>
      )}

      {/* Right monogram */}
      <div
        className={`partner-monogram ${partnerClass}`}
        style={{ width: 26, height: 26, fontSize: 10.5, borderRadius: 8, flexShrink: 0 }}
      >
        {initials}
      </div>
    </div>
  );
});
