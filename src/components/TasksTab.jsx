import React, { useMemo } from 'react';
import { getLocalDateStr } from '../utils/calculations';

/* -- Partner meta ------------------------------------------------ */
const PARTNER_INITIALS  = { Balaji: 'BA', Nagoor: 'NA', JP: 'JP', Shared: 'ALL' };
const PARTNER_MONO_CLASS= { Balaji: 'balaji', Nagoor: 'nagoor', JP: 'jp', Shared: 'shared' };

const PRIORITY_COLORS   = { urgent: '#D93A3A', high: '#E08A0B', normal: '#6B7590' };

/* -- Day helpers ------------------------------------------------- */
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildCalDays() {
  const today = new Date();
  const days  = [];
  for (let i = -3; i <= 3; i++) {
    const d   = new Date(today);
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
  if (!raw) return null;
  const d = new Date(raw);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/* -- Checkmark SVG ---------------------------------------------- */
function CheckSVG() {
  return (
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
      <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* -- Calendar SVG for empty state ------------------------------- */
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

/* ================================================================ */
export default function TasksTab({
  store,
  partnerFilter,
  selectedDate,
  setSelectedDate,
  completeTask,
  _deleteTask,
  _addProof,
  _onOpenLightbox,
  onOpenTask,
  onOpenCompleteTask,
  _currentPartner,
}) {
  const calDays  = useMemo(() => buildCalDays(), []);
  const today    = getLocalDateStr();

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
      list = list.filter((t) => t.to === partnerFilter || t.from === partnerFilter);
    }
    return list;
  }, [allTasks, activeDateStr, partnerFilter]);

  const inProgress  = dateTasks.filter((t) => t.status === 'in_progress');
  const pending     = dateTasks.filter((t) => t.status === 'pending' || (!t.status || t.status === 'active'));
  const completed   = dateTasks.filter((t) => t.status === 'completed');

  const handleComplete = (task) => {
    if (onOpenCompleteTask) onOpenCompleteTask(task);
    else completeTask(task.id);
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="tab-content">

      {/* Calendar strip */}
      <div className="cal-strip">
        {calDays.map(({ dateStr, dow, dom }) => {
          const isActive   = dateStr === activeDateStr;
          const hasTasks   = !!(tasksByDate[dateStr]?.length);
          return (
            <button
              key={dateStr}
              type="button"
              className={`cal-day-pill${isActive ? ' active' : ''}`}
              onClick={() => setSelectedDate(dateStr)}
            >
              <span className="cal-day-dow">{dow}</span>
              <span className="cal-day-dom">{dom}</span>
              <span className={`cal-day-dot${hasTasks ? ' has-tasks' : ''}`} />
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {dateTasks.length === 0 && (
        <div className="empty-state">
          <CalendarSVG />
          <p className="empty-state-text">
            {activeDateStr === today
              ? 'இன்று பணிகள் எதுவும் இல்லை.'
              : `${activeDateStr} அன்று பணிகள் எதுவும் இல்லை.`}
          </p>
          <button className="empty-state-action" type="button" onClick={onOpenTask}>
            + Add a task for this day
          </button>
        </div>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <div className="section-group">
          <div className="section-label-row">
            <span className="section-label teal">In progress</span>
            <div className="section-divider" />
          </div>
          {inProgress.map((task) => (
            <TaskCardActive
              key={task.id}
              task={task}
              isRunning
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="section-group">
          <div className="section-label-row">
            <span className="section-label slate">Pending</span>
            <div className="section-divider" />
          </div>
          {pending.map((task) => (
            <TaskCardActive
              key={task.id}
              task={task}
              isRunning={false}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="section-group">
          <div className="section-label-row">
            <span className="section-label slate">Completed</span>
            <div className="section-divider" />
          </div>
          {completed.map((task) => (
            <TaskCardDone
              key={task.id}
              task={task}
              onUncomplete={() => completeTask && completeTask(task.id, 'pending')}
            />
          ))}
        </div>
      )}

    </div>
  );
}

/* ── Task card (active / in-progress) ─────────────────────── */
function TaskCardActive({ task, isRunning, onComplete }) {
  const partnerClass  = PARTNER_MONO_CLASS[task.to]  || 'shared';
  const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.normal;
  const timeStr       = fmtTaskMeta(task);
  const initials      = PARTNER_INITIALS[task.to]  || 'ALL';

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
          <span
            className="priority-badge"
            style={{ background: priorityColor }}
          >
            {task.priority || 'normal'}
          </span>
        </div>

        <div className="task-card-foot">
          {timeStr && <span className="mono">{timeStr}</span>}
          {timeStr && <span>·</span>}
          <span>{task.to}</span>
          {isRunning && (
            <span className="running-badge" style={{ marginLeft: 'auto' }}>
              <span className="running-dot" />
              Running
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Done card ─────────────────────────────────────────────── */
function TaskCardDone({ task, onUncomplete }) {
  const partnerClass = PARTNER_MONO_CLASS[task.to] || 'shared';
  const initials     = PARTNER_INITIALS[task.to]   || 'ALL';

  return (
    <div className="task-card done-card">
      {/* Teal check */}
      <button
        type="button"
        className="task-card-done-check"
        onClick={onUncomplete}
        aria-label="Mark incomplete"
        title="Undo completion"
      >
        <CheckSVG />
      </button>

      {/* Body */}
      <div className="task-card-body">
        <span className="task-done-title">{task.title}</span>
        <span className="task-done-meta">{task.from} → {task.to}</span>
      </div>

      {/* Right monogram */}
      <div
        className={`partner-monogram ${partnerClass}`}
        style={{ width: 24, height: 24, fontSize: 10, borderRadius: 7, flexShrink: 0 }}
      >
        {initials}
      </div>
    </div>
  );
}
