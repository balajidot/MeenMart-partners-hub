import React, { useMemo } from 'react';
import { getLocalDateStr } from '../../utils/calculations';
import { triggerHaptic } from '../../utils/haptics';

const PARTNER_ROLES = {
  Balaji: 'Tech & Product',
  Nagoor: 'Procure & Pack',
  JP:     'Delivery & Sales',
};

const PARTNER_COLORS = {
  Balaji: '#1B2A5B',
  Nagoor: '#0F9E8E',
  JP:     '#B4531F',
};

const PARTNER_INITIALS = {
  Balaji: 'BA',
  Nagoor: 'NA',
  JP:     'JP',
};

export default function PartnerDetailModal({
  partnerName,
  isOpen,
  onClose,
  store,
  profiles,
  onlinePartners,
  onOpenSettings,
  isMe,
  onCompleteTask,
  onOpenTask,
}) {
  const color = PARTNER_COLORS[partnerName] || '#16224A';
  const role = PARTNER_ROLES[partnerName] || 'Co-Founder';
  const initials = PARTNER_INITIALS[partnerName] || partnerName.slice(0, 2).toUpperCase();
  const avatarUrl = profiles?.[partnerName]?.avatarUrl;
  const isOnline = !!onlinePartners?.[partnerName] || isMe;
  const isOnShift = !!store?.activeShifts?.[partnerName];

  // 1. Calculate Shift Hours (Total & Past 7 Days)
  const { totalHours, weekHours, dailyHours } = useMemo(() => {
    const worklogs = store?.worklogs || [];
    const partnerLogs = worklogs.filter((w) => w.partner === partnerName);
    const total = partnerLogs.reduce((acc, w) => acc + Number(w.hours || 0), 0);

    // Calculate daily hours for past 7 days
    const now = new Date();
    const days = [];
    let thisWeekTotal = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateStr(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();

      const dayLogs = partnerLogs.filter((w) => {
        const logDate = w.date || (w.createdAt ? getLocalDateStr(w.createdAt) : '');
        return logDate === dateStr;
      });
      const hrs = dayLogs.reduce((acc, w) => acc + Number(w.hours || 0), 0);
      thisWeekTotal += hrs;

      days.push({
        dateStr,
        dayName,
        dayNum,
        hrs: Number(hrs.toFixed(1)),
        isToday: i === 0,
      });
    }

    return {
      totalHours: Number(total.toFixed(1)),
      weekHours: Number(thisWeekTotal.toFixed(1)),
      dailyHours: days,
    };
  }, [store?.worklogs, partnerName]);

  const maxDailyHrs = useMemo(() => {
    const max = Math.max(...dailyHours.map((d) => d.hrs), 1);
    return max;
  }, [dailyHours]);

  // 2. Weekly Shifts & Active Work Pattern
  const { weeklyShiftsCount, activeDaysCount, avgShiftHrs } = useMemo(() => {
    const worklogs = store?.worklogs || [];
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoStr = getLocalDateStr(weekAgo);

    const partnerRecentLogs = worklogs.filter((w) => {
      const dStr = w.date || (w.createdAt ? getLocalDateStr(w.createdAt) : '');
      return w.partner === partnerName && dStr >= weekAgoStr;
    });

    const shiftCount = partnerRecentLogs.length;
    const uniqueDays = new Set(partnerRecentLogs.map((w) => w.date || (w.createdAt ? getLocalDateStr(w.createdAt) : ''))).size;
    const avg = shiftCount > 0 ? (weekHours / shiftCount).toFixed(1) : '0.0';

    return {
      weeklyShiftsCount: shiftCount,
      activeDaysCount: uniqueDays,
      avgShiftHrs: avg,
    };
  }, [store?.worklogs, partnerName, weekHours]);

  // 3. Task Performance & Assigned Tasks List
  const { assignedTasks, completedTasks, pendingTasks, completionRate } = useMemo(() => {
    const tasks = (store?.tasks || []).filter((t) => t.to === partnerName);
    const done = tasks.filter((t) => t.status === 'completed' || t.s === 'done');
    const pending = tasks.filter((t) => t.status !== 'completed' && t.s !== 'done');
    const rate = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 100;

    return {
      assignedTasks: tasks,
      completedTasks: done,
      pendingTasks: pending,
      completionRate: rate,
    };
  }, [store?.tasks, partnerName]);

  if (!isOpen || !partnerName) return null;

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet partner-detail-sheet">
        <div className="sheet-handle" />

        {/* Header Row */}
        <div className="sheet-header-row">
          <div className="sheet-title" style={{ margin: 0 }}>Partner Insights</div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Partner Hero Card */}
        <div className="partner-detail-hero" style={{ borderColor: `${color}30` }}>
          <div className="partner-detail-avatar-wrap" style={{ backgroundColor: color }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={partnerName} className="partner-detail-avatar-img" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="partner-detail-info">
            <div className="partner-detail-name-row">
              <h3 className="partner-detail-name">{partnerName}</h3>
              <span className={`partner-detail-badge ${isOnline ? 'online' : isOnShift ? 'shift' : 'offline'}`}>
                {isOnline ? '🟢 Live' : isOnShift ? '⏱️ Shift' : 'Offline'}
              </span>
            </div>
            <div className="partner-detail-role">{role}</div>
            {isMe && onOpenSettings && (
              <button
                type="button"
                className="partner-detail-settings-link"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  onOpenSettings();
                }}
              >
                ✏️ Edit Profile & Avatar
              </button>
            )}
          </div>
        </div>

        {/* 4 KPI Metrics Grid */}
        <div className="partner-kpi-grid">
          <div className="partner-kpi-tile">
            <span className="partner-kpi-label">This Week</span>
            <div className="partner-kpi-value-row">
              <span className="partner-kpi-val">{weekHours}</span>
              <span className="partner-kpi-unit">hrs</span>
            </div>
            <span className="partner-kpi-sub">Total: {totalHours}h logged</span>
          </div>

          <div className="partner-kpi-tile">
            <span className="partner-kpi-label">Task Success</span>
            <div className="partner-kpi-value-row">
              <span className="partner-kpi-val">{completionRate}%</span>
            </div>
            <span className="partner-kpi-sub">{completedTasks.length}/{assignedTasks.length} done</span>
          </div>

          <div className="partner-kpi-tile">
            <span className="partner-kpi-label">Active Days</span>
            <div className="partner-kpi-value-row">
              <span className="partner-kpi-val">{activeDaysCount}</span>
              <span className="partner-kpi-unit">days/wk</span>
            </div>
            <span className="partner-kpi-sub">{weeklyShiftsCount} shifts logged (avg {avgShiftHrs}h)</span>
          </div>

          <div className="partner-kpi-tile">
            <span className="partner-kpi-label">Pending Tasks</span>
            <div className="partner-kpi-value-row">
              <span className="partner-kpi-val" style={{ color: pendingTasks.length > 0 ? '#E08A0B' : '#0F9E8E' }}>
                {pendingTasks.length}
              </span>
              <span className="partner-kpi-unit">velai</span>
            </div>
            <span className="partner-kpi-sub">{pendingTasks.length === 0 ? 'All caught up' : 'Needs attention'}</span>
          </div>
        </div>

        {/* Visual Graph 1: Shift Hours Daily Trend (Last 7 Days) */}
        <div className="partner-chart-card">
          <div className="partner-chart-header">
            <div>
              <h4 className="partner-chart-title">7-Day Shift Hours Activity</h4>
              <span className="partner-chart-sub">Daily time logged on MeenMart operations</span>
            </div>
            <span className="partner-chart-total-pill">{weekHours}h this week</span>
          </div>

          <div className="partner-bar-chart">
            {dailyHours.map((d) => {
              const heightPct = maxDailyHrs > 0 ? Math.max(8, (d.hrs / maxDailyHrs) * 100) : 8;
              const hasWork = d.hrs > 0;
              return (
                <div key={d.dateStr} className="partner-bar-col">
                  <span className="partner-bar-val">{hasWork ? `${d.hrs}h` : '—'}</span>
                  <div className="partner-bar-track">
                    <div
                      className={`partner-bar-fill${d.isToday ? ' is-today' : ''}`}
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: hasWork ? color : '#E2E8F0',
                      }}
                    />
                  </div>
                  <span className={`partner-bar-label${d.isToday ? ' is-today' : ''}`}>
                    {d.dayName}
                  </span>
                  <span className="partner-bar-date">{d.dayNum}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Graph 2: Task Execution & Success Ratio */}
        <div className="partner-chart-card">
          <div className="partner-chart-header">
            <div>
              <h4 className="partner-chart-title">Task Completion & Efficiency</h4>
              <span className="partner-chart-sub">Overall assignments completed vs pending</span>
            </div>
            <span className="partner-chart-total-pill" style={{ background: '#E6FAF6', color: '#0F9E8E' }}>
              {completionRate}% Success
            </span>
          </div>

          <div className="partner-contrib-progress-wrap">
            <div className="partner-contrib-progress-track">
              <div
                className="partner-contrib-progress-fill"
                style={{ width: `${Math.min(100, Math.max(5, completionRate))}%`, background: '#0F9E8E' }}
              />
            </div>
            <div className="partner-contrib-labels">
              <span>{completedTasks.length} completed tasks</span>
              <span>{pendingTasks.length} pending</span>
            </div>
          </div>

          <div className="partner-contrib-details-grid">
            <div className="partner-contrib-detail-box">
              <span className="partner-contrib-detail-label">Completed Tasks</span>
              <span className="partner-contrib-detail-val" style={{ color: '#0F9E8E' }}>
                {completedTasks.length}
              </span>
            </div>
            <div className="partner-contrib-detail-box">
              <span className="partner-contrib-detail-label">Pending / Active</span>
              <span className="partner-contrib-detail-val" style={{ color: pendingTasks.length > 0 ? '#E08A0B' : 'var(--navy)' }}>
                {pendingTasks.length}
              </span>
            </div>
          </div>
        </div>

        {/* Current Active Tasks for this Partner */}
        <div className="partner-chart-card" style={{ marginBottom: 0 }}>
          <div className="partner-chart-header">
            <div>
              <h4 className="partner-chart-title">Active Tasks Assigned to {partnerName}</h4>
              <span className="partner-chart-sub">{pendingTasks.length} pending tasks currently</span>
            </div>
            {onOpenTask && (
              <button
                type="button"
                className="partner-chart-link-btn"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  onOpenTask();
                }}
              >
                + Add Task
              </button>
            )}
          </div>

          <div className="partner-tasks-list">
            {pendingTasks.length === 0 ? (
              <div className="partner-empty-tasks">
                <span>🎉 No pending tasks for {partnerName}!</span>
              </div>
            ) : (
              pendingTasks.map((t) => (
                <div key={t.id} className="partner-task-item">
                  <button
                    type="button"
                    className="partner-task-check-circle"
                    title="Mark as completed"
                    onClick={() => {
                      triggerHaptic('medium');
                      onCompleteTask?.(t.id);
                    }}
                  >
                    ✓
                  </button>
                  <div className="partner-task-item-content">
                    <span className="partner-task-item-title">{t.title}</span>
                    <div className="partner-task-item-meta">
                      <span className={`task-badge ${t.priority || 'normal'}`}>{t.priority || 'Normal'}</span>
                      {t.dueTime && <span className="partner-task-time">⏰ {t.dueTime}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </>
  );
}
