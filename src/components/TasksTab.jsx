import React, { useState, useMemo } from 'react';
import { fmtDate, compressImage, TAMIL_MONTHS, getLocalDateStr } from '../utils/calculations';

const STATUS_PILLS = [
  { id: 'all',       label: 'அனைத்தும்' },
  { id: 'pending',   label: 'நிலுவை' },
  { id: 'completed', label: 'முடிந்தவை' },
];

const PARTNER_PILLS = [
  { id: 'all',    label: 'அனைவரும்' },
  { id: 'Balaji', label: 'Balaji', cls: 'balaji' },
  { id: 'Nagoor', label: 'Nagoor', cls: 'nagoor' },
  { id: 'JP',     label: 'JP',     cls: 'jp' },
];

function groupByDate(tasks) {
  const groups = new Map();
  const todayStr = getLocalDateStr();
  const yesterdayStr = getLocalDateStr(new Date(Date.now() - 86400000));
  const tomorrowStr = getLocalDateStr(new Date(Date.now() + 86400000));

  tasks.forEach((t) => {
    const raw = t.dueDateTime || t.dueAt || t.createdAt || '';
    const key = raw ? getLocalDateStr(raw) : '';
    if (!key) {
      const fallbackKey = 'other';
      if (!groups.has(fallbackKey)) groups.set(fallbackKey, { label: 'மற்றவை', items: [] });
      groups.get(fallbackKey).items.push(t);
      return;
    }
    const d = new Date(raw);
    let label;
    if (key === todayStr) label = 'இன்று';
    else if (key === tomorrowStr) label = 'நாளை';
    else if (key === yesterdayStr) label = 'நேற்று';
    else label = `${d.getDate()} ${TAMIL_MONTHS[d.getMonth()]}`;
    if (!groups.has(key)) groups.set(key, { label, items: [] });
    groups.get(key).items.push(t);
  });
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a === 'other' ? 1 : b === 'other' ? -1 : b.localeCompare(a)))
    .map(([, v]) => v);
}

export default function TasksTab({
  store,
  partnerFilter,
  setPartnerFilter,
  selectedDate,
  completeTask,
  deleteTask,
  addProof,
  onOpenLightbox,
  onOpenTask,
  onOpenCompleteTask,
  currentPartner,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const counts = useMemo(() => {
    const list = store.tasks || [];
    return {
      all: list.length,
      pending: list.filter((t) => t.status !== 'completed').length,
      completed: list.filter((t) => t.status === 'completed').length,
    };
  }, [store.tasks]);

  const filteredTasks = useMemo(() => {
    let list = store.tasks || [];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.to || '').toLowerCase().includes(q) ||
        (t.from || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'pending') list = list.filter((t) => t.status !== 'completed');
    else if (statusFilter === 'completed') list = list.filter((t) => t.status === 'completed');

    if (partnerFilter !== 'all') {
      list = list.filter((t) => t.to === partnerFilter || t.from === partnerFilter);
    }

    if (selectedDate) {
      list = list.filter((t) => {
        const raw = t.dueDateTime || t.dueAt || t.createdAt;
        return raw ? getLocalDateStr(raw) === selectedDate : false;
      });
    }

    return list;
  }, [store.tasks, search, statusFilter, partnerFilter, selectedDate]);

  const grouped = useMemo(() => groupByDate(filteredTasks), [filteredTasks]);

  const handleFileUpload = async (taskId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      addProof('task', taskId, compressed);
    } catch (err) {
      console.error('Proof upload error:', err);
    }
  };

  const handleTriggerComplete = (task) => {
    if (onOpenCompleteTask) {
      onOpenCompleteTask(task);
    } else {
      completeTask(task.id);
    }
  };

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div className="search-wrap">
          <span aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="பணிகளைத் தேடுங்கள்..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="பணிகளைத் தேடுங்கள்"
          />
        </div>

        <div className="pill-group status-group" role="tablist" aria-label="Task status filter">
          {STATUS_PILLS.map(({ id, label }) => (
            <button
              key={id}
              className={`pill ${statusFilter === id ? 'active' : ''}`}
              onClick={() => setStatusFilter(id)}
              role="tab"
              aria-selected={statusFilter === id}
            >
              {label}
              <span className="pill-count">{counts[id]}</span>
            </button>
          ))}
        </div>

        <div className="pill-group partner-group" aria-label="Partner filter">
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
      </div>

      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>பணிகள் எதுவும் இல்லை</h3>
          <p>கீழே உள்ள <strong>+</strong> பொத்தானைத் தட்டி புதிய பணியை ஒதுக்குங்கள்.</p>
          {onOpenTask && (
            <button className="empty-cta" onClick={onOpenTask}>
              📋 புதிய பணி ஒதுக்கு
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
              {group.items.map((task) => {
                const isDone = task.status === 'completed';
                const toCls = (task.to || '').toLowerCase();
                const me = currentPartner?.name;
                const isAssignee = task.to === me;
                const isCreator = task.from === me;
                const isMine = isAssignee || isCreator;
                const canComplete = isAssignee || isCreator;

                return (
                  <div
                    key={task.id}
                    className={`task-card ${isDone ? 'completed' : ''}`}
                  >
                    <div className="task-top">
                      <button
                        className={`task-check ${isDone ? 'done' : ''} ${!canComplete && !isDone ? 'disabled' : ''}`}
                        onClick={() => !isDone && canComplete && handleTriggerComplete(task)}
                        title={isDone ? 'முடிந்தது' : canComplete ? 'முடிக்க தட்டவும்' : `${task.to} அல்லது உருவாக்கியவர் மட்டுமே முடிக்க முடியும்`}
                        aria-label={isDone ? 'Completed' : 'Mark complete'}
                        aria-disabled={!canComplete && !isDone}
                      />

                      <div className="task-body">
                        <div className={`task-title ${isDone ? 'done-text' : ''}`}>
                          {task.title}
                        </div>

                        <div className="task-meta">
                          <span className={`chip ${toCls}`}>
                            {task.from === task.to ? `${task.to} (சுயம்)` : `${task.from} → ${task.to}`}
                          </span>
                          {(task.dueDateTime || task.dueAt) && (
                            <span className="chip gray">
                              🕒 {fmtDate(task.dueDateTime || task.dueAt)}
                            </span>
                          )}
                          {!isMine && (
                            <span className="chip gray">🔒</span>
                          )}
                          {task.proof && (
                            <img
                              src={task.proof}
                              alt="Proof"
                              className="proof-thumb"
                              onClick={() =>
                                onOpenLightbox(
                                  task.proof,
                                  task.to,
                                  'பணி சான்று',
                                  task.proofAddedAt
                                )
                              }
                              title="சான்றைப் பெரிதாக்கிப் பார்க்க தட்டவும்"
                            />
                          )}
                        </div>

                        <div className="task-actions">
                          {!isDone && canComplete && (
                            <button
                              className="btn-sm success"
                              onClick={() => handleTriggerComplete(task)}
                            >
                              ✓ முடிந்தது
                            </button>
                          )}

                          {isMine && (
                            <label className="btn-sm">
                              📷 {task.proof ? 'மாற்று' : 'சான்று'}
                              <input
                                type="file"
                                accept="image/*"
                                className="file-hidden"
                                onChange={(e) => handleFileUpload(task.id, e)}
                              />
                            </label>
                          )}

                          {isCreator && (
                            <button
                              className="btn-sm danger"
                              onClick={() => {
                                if (window.confirm('இப்பணியை நீக்க வேண்டுமா?')) {
                                  deleteTask(task.id);
                                }
                              }}
                              title="நீக்கு"
                              aria-label="Delete task"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
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

