import React, { useState, useMemo } from 'react';
import { fmtDate, compressImage, TAMIL_MONTHS, getLocalDateStr } from '../utils/calculations';
import Icon from './Icons';

const STATUS_TABS = [
  { id: 'all',       label: 'அனைத்தும்' },
  { id: 'pending',   label: 'நிலுவை' },
  { id: 'completed', label: 'முடிந்தவை' },
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
    if (key === todayStr) label = 'இன்று (Today)';
    else if (key === tomorrowStr) label = 'நாளை (Tomorrow)';
    else if (key === yesterdayStr) label = 'நேற்று (Yesterday)';
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

  const allTasks = useMemo(() => store.tasks || [], [store.tasks]);

  const counts = useMemo(() => ({
    all: allTasks.length,
    pending: allTasks.filter((t) => t.status !== 'completed').length,
    completed: allTasks.filter((t) => t.status === 'completed').length,
  }), [allTasks]);

  const filteredTasks = useMemo(() => {
    let list = allTasks;

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
  }, [allTasks, search, statusFilter, partnerFilter, selectedDate]);

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
    <div className="tasks-workspace">
      {/* Control Bar: Search & Status Filter */}
      <div className="tasks-toolbar">
        <div className="search-box">
          <Icon name="search" size={14} className="search-box-icon" />
          <input
            type="text"
            placeholder="பணிகளைத் தேடுங்கள்..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear-search-btn" onClick={() => setSearch('')} aria-label="Clear">✕</button>
          )}
        </div>

        <div className="status-tabs" role="tablist">
          {STATUS_TABS.map(({ id, label }) => (
            <button
              key={id}
              className={`status-tab-btn ${statusFilter === id ? 'active' : ''}`}
              onClick={() => setStatusFilter(id)}
              role="tab"
              aria-selected={statusFilter === id}
            >
              <span>{label}</span>
              <span className="status-count">{counts[id]}</span>
            </button>
          ))}
        </div>

        {onOpenTask && (
          <button className="btn-primary-add" onClick={onOpenTask} type="button">
            <Icon name="plus" size={14} />
            <span>புதிய பணி</span>
          </button>
        )}
      </div>

      {/* Task List Items */}
      {filteredTasks.length === 0 ? (
        <div className="todoist-empty">
          <div className="empty-circle-icon">
            <Icon name="check" size={24} />
          </div>
          <h4>அனைத்துப் பணிகளும் முடிந்தது!</h4>
          <p>புதிய பணிகளை ஒதுக்க மேலே உள்ள <strong>+ புதிய பணி</strong> பொத்தானைப் பயன்படுத்தவும்.</p>
        </div>
      ) : (
        <div className="todoist-list">
          {grouped.map((group) => (
            <div key={group.label} className="date-group-section">
              <div className="group-heading">
                <span>{group.label}</span>
                <span className="group-count">{group.items.length}</span>
              </div>

              <div className="group-items">
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
                      className={`todoist-row ${isDone ? 'is-completed' : ''}`}
                    >
                      {/* Todoist Circular Checkbox */}
                      <button
                        className={`todoist-checkbox ${isDone ? 'checked' : ''} ${!canComplete && !isDone ? 'disabled' : ''}`}
                        onClick={() => !isDone && canComplete && handleTriggerComplete(task)}
                        title={isDone ? 'முடிந்தது' : canComplete ? 'முடிக்க தட்டவும்' : `${task.to} மட்டுமே முடிக்க முடியும்`}
                        aria-label={isDone ? 'Completed' : 'Mark task complete'}
                        type="button"
                      >
                        {isDone && <Icon name="check" size={11} />}
                      </button>

                      {/* Content */}
                      <div className="todoist-content">
                        <div className="todoist-title">
                          {task.title}
                        </div>

                        <div className="todoist-meta-row">
                          <span className={`partner-tag ${toCls}`}>
                            {task.from === task.to ? task.to : `${task.from} → ${task.to}`}
                          </span>

                          {(task.dueDateTime || task.dueAt) && (
                            <span className="due-date-tag">
                              <Icon name="calendar" size={11} />
                              <span>{fmtDate(task.dueDateTime || task.dueAt)}</span>
                            </span>
                          )}

                          {task.proof && (
                            <button
                              type="button"
                              className="proof-badge-btn"
                              onClick={() => onOpenLightbox(task.proof, task.to, 'பணி சான்று', task.proofAddedAt)}
                              title="சான்றைப் பார்க்க"
                            >
                              <Icon name="camera" size={11} />
                              <span>சான்று</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Hover Actions */}
                      <div className="todoist-row-actions">
                        {isMine && (
                          <label className="row-action-btn" title="புகைப்படச் சான்று இணைக்க">
                            <Icon name="camera" size={13} />
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
                            className="row-action-btn danger"
                            onClick={() => {
                              if (window.confirm('இப்பணியை நீக்க வேண்டுமா?')) {
                                deleteTask(task.id);
                              }
                            }}
                            title="நீக்கு"
                            type="button"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
