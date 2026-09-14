import React, { useState, useEffect, useMemo } from 'react';
import { getLocalDateStr } from '../utils/calculations';
import { triggerHaptic } from '../utils/haptics';
import { PARTNERS as PARTNER_LIST } from '../config/partners';

const PARTNERS = PARTNER_LIST.map((p) => ({
  name: p.name, initial: p.initials, cls: p.monoClass, color: p.color,
}));

/** Namespaced so two partners sharing one device never inherit each other's shift. */
const shiftKey = (name) => `meenmart_shift_in_${name}`;

/* ── Helpers ─────────────────────────────────────────────── */
function fmtHMS(ms) {
  if (ms <= 0) return '0:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtClockTime(ts) {
  if (!ts) return '--:--';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtEntryTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function hoursToHM(hours) {
  const totalMin = Math.round(Number(hours || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function ShiftClockDisplay({ clockInTime, clockedIn, fallbackText = '0:00' }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!clockedIn || !clockInTime) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [clockedIn, clockInTime]);

  if (!clockedIn || !clockInTime) {
    return <span className="shift-elapsed">{fallbackText}</span>;
  }

  return <span className="shift-elapsed">{fmtHMS(Math.max(0, now - clockInTime))}</span>;
}

/* ── Component ───────────────────────────────────────────── */
export default function WorkTab({
  store,
  partnerFilter,
  deleteWorklog,
  onOpenWork,
  currentPartner,
  toggleShift,
  isOnline = true,
}) {
  const partnerName = currentPartner?.name || 'Balaji';

  // The cloud record is authoritative: clocking out on another device must end
  // the shift here too, so the local copy is only a fallback while offline.
  const cloudShiftTime = store.activeShifts?.[partnerName] ?? null;
  const [localShiftTime, setLocalShiftTime] = useState(() => {
    try {
      const raw = localStorage.getItem(shiftKey(partnerName));
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  });

  // Keep the offline fallback in step with the cloud rather than letting it linger.
  useEffect(() => {
    try {
      if (cloudShiftTime) {
        localStorage.setItem(shiftKey(partnerName), String(cloudShiftTime));
        setLocalShiftTime(cloudShiftTime);
      } else if (isOnline) {
        localStorage.removeItem(shiftKey(partnerName));
        setLocalShiftTime(null);
      }
    } catch {
      // Private mode — the cloud value still drives the UI.
    }
  }, [cloudShiftTime, partnerName, isOnline]);

  const clockInTime = cloudShiftTime ?? (isOnline ? null : localShiftTime);
  const clockedIn = !!clockInTime;

  const todayStr = getLocalDateStr();

  /* ── Derived data (Memoized to avoid re-renders) ────────── */
  const todayLogs = useMemo(() => {
    return (store.worklogs || []).filter((w) => {
      const matchDate    = w.date === todayStr;
      const matchPartner = partnerFilter === 'all' || w.partner === partnerFilter;
      return matchDate && matchPartner;
    });
  }, [store.worklogs, todayStr, partnerFilter]);

  /* Fallback text when not clocked in */
  const fallbackHours = useMemo(() => {
    const lastLog = (store.worklogs || [])
      .filter((w) => partnerFilter === 'all' || w.partner === partnerFilter)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    return lastLog ? hoursToHM(lastLog.hours) : '0:00';
  }, [store.worklogs, partnerFilter]);

  /* Week hours per partner */
  const { weekHours, maxWeekHrs, totalWeekHrs } = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const weekStartStr = getLocalDateStr(weekStart);

    const hoursList = PARTNERS.map((p) => {
      const hrs = (store.worklogs || [])
        .filter((w) => w.partner === p.name && w.date >= weekStartStr)
        .reduce((s, w) => s + Number(w.hours || 0), 0);
      return { ...p, hrs: Number(hrs.toFixed(1)) };
    });
    const max = Math.max(...hoursList.map((p) => p.hrs), 1);
    const total = hoursList.reduce((s, p) => s + p.hrs, 0);

    return { weekHours: hoursList, maxWeekHrs: max, totalWeekHrs: total };
  }, [store.worklogs]);

  /* Today per-partner performance */
  const todayPerf = useMemo(() => {
    return PARTNERS.map((p) => {
      const logs      = (store.worklogs || []).filter((w) => w.partner === p.name && (w.date || getLocalDateStr(w.createdAt)) === todayStr);
      const hrs       = logs.reduce((s, w) => s + Number(w.hours || 0), 0);
      const allTasks  = (store.tasks || []).filter((t) => t.to === p.name);
      const doneTasks = allTasks.filter((t) => t.status === 'completed' || t.s === 'done').length;
      const completionRate = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;
      return { ...p, hrs: Number(hrs.toFixed(1)), doneTasks, allTasks: allTasks.length, completionRate };
    });
  }, [store.worklogs, store.tasks, todayStr]);

  const maxPerfHrs = useMemo(() => {
    return Math.max(...todayPerf.map((p) => p.hrs), 1);
  }, [todayPerf]);

  function handleClockToggle() {
    triggerHaptic('success');
    if (clockedIn) {
      try { localStorage.removeItem(shiftKey(partnerName)); } catch { /* private mode */ }
      setLocalShiftTime(null);
      toggleShift?.(partnerName, false);
      if (onOpenWork) onOpenWork();
    } else {
      const ts = Date.now();
      try { localStorage.setItem(shiftKey(partnerName), String(ts)); } catch { /* private mode */ }
      setLocalShiftTime(ts);
      toggleShift?.(partnerName, true);
    }
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="tab-content">

      {/* 1 ── Shift card ─────────────────────────────────── */}
      <div className={`shift-card${clockedIn ? ' clocked-in' : ''}`}>
        <div className="shift-card-top">
          <div className="shift-card-left">
            <span className="shift-kicker">
              {clockedIn ? 'Ippo Shift-la Irrukeenga' : 'Shift Start Aagala'}
            </span>
            <ShiftClockDisplay
              clockInTime={clockInTime}
              clockedIn={clockedIn}
              fallbackText={fallbackHours}
            />
          </div>
          <div className="shift-card-right">
            <span className="shift-in-label">In</span>
            <span className="shift-in-time">{fmtClockTime(clockInTime)}</span>
          </div>
        </div>
        <button
          type="button"
          className={`shift-btn ${clockedIn ? 'check-out' : 'check-in'}`}
          onClick={handleClockToggle}
        >
          {clockedIn ? 'Shift Mudichiko (Check out)' : 'Shift Start Pannu (Check in)'}
        </button>
      </div>

      {/* Active partners on shift badge */}
      {Object.entries(store.activeShifts || {}).filter(([p, ts]) => ts && p !== partnerName).length > 0 && (
        <div
          style={{
            margin: '0 16px 12px',
            padding: '8px 12px',
            background: 'rgba(15, 158, 142, 0.08)',
            border: '1px solid rgba(15, 158, 142, 0.2)',
            borderRadius: '10px',
            fontSize: '12px',
            color: 'var(--teal-dark)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500,
          }}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0F9E8E', boxShadow: '0 0 8px #0F9E8E' }} />
          <span>
            Ippo Shift-la irukavanga:{' '}
            <strong>
              {Object.entries(store.activeShifts || {})
                .filter(([p, ts]) => ts && p !== partnerName)
                .map(([p]) => p)
                .join(', ')}
            </strong>
          </span>
        </div>
      )}

      {/* 2 ── Activity log today ──────────────────────────── */}
      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Innaiku Work Activity</span>
          <button type="button" className="section-card-link" onClick={onOpenWork}>
            + Activity Log Pannu
          </button>
        </div>

        {todayLogs.length === 0 ? (
          <div
            className="empty-state"
            style={{ margin: '0 16px 16px', borderRadius: 12 }}
          >
            <p className="empty-state-text">Innaiku innum activity yedhum log aagala.</p>
            <button type="button" className="empty-state-action" onClick={onOpenWork}>
              + Activity Log Pannu
            </button>
          </div>
        ) : (
          todayLogs.map((log) => {
            const partner  = PARTNERS.find((p) => p.name === log.partner) || PARTNERS[0];
            const startTime = fmtEntryTime(log.createdAt || null);
            const endTs     = log.createdAt
              ? log.createdAt + Number(log.hours || 0) * 3600000
              : null;
            const endTime   = endTs ? fmtEntryTime(endTs) : '';

            return (
              <div key={log.id} className="activity-row">
                <div className="activity-time-col">
                  <span className="activity-time">{startTime}</span>
                  <div className="activity-time-line" />
                  <span className="activity-time-end">{endTime}</span>
                </div>
                <div className="activity-body">
                  <div className="activity-what">
                    {log.activity || log.desc || log.description || '—'}
                  </div>
                  <div className="activity-meta">
                    <span
                      className="activity-who-badge"
                      style={{ background: partner.color }}
                    >
                      {partner.name}
                    </span>
                    <span className="activity-dur">{log.hours}h</span>
                  </div>
                </div>
                {deleteWorklog && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this activity log?')) {
                        deleteWorklog(log.id, partnerName);
                      }
                    }}
                    title="Delete"
                    aria-label="Delete worklog"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '4px 6px',
                      opacity: 0.5,
                      alignSelf: 'center',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3 ── Hours this week ────────────────────────────── */}
      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Indha Vaaram Shift Hours</span>
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          <div className="week-bars">
            {weekHours.map((p) => {
              const pxHeight = maxWeekHrs > 0 ? Math.max(4, (p.hrs / maxWeekHrs) * 88) : 4;
              const dimmed   = partnerFilter !== 'all' && partnerFilter !== p.name;
              return (
                <div
                  key={p.name}
                  className="week-bar-col"
                  style={{ opacity: dimmed ? 0.28 : 1 }}
                >
                  <span className="week-bar-val">{p.hrs}h</span>
                  <div
                    className="week-bar-fill"
                    style={{ height: `${pxHeight}px`, background: p.color }}
                  />
                  <span className="week-bar-name">{p.initial}</span>
                </div>
              );
            })}
          </div>
          <div className="week-note">
            {totalWeekHrs > 0 ? (
              <>
                Total <strong>{totalWeekHrs.toFixed(1)}h</strong> logged this week.{' '}
                {weekHours.reduce((top, p) => (p.hrs > top.hrs ? p : top), weekHours[0]).name} leads this week.
              </>
            ) : (
              'Indha vaaram innum shift hours log aagala. Check in panni track pannunga.'
            )}
          </div>
        </div>
      </div>

      {/* 4 ── Partner performance today ──────────────────── */}
      <div className="section-card" style={{ overflow: 'visible' }}>
        <div className="section-card-header">
          <span className="section-card-title">Innaiku Partner Performance</span>
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          {todayPerf.map((p) => {
            const barPct = maxPerfHrs > 0 ? Math.round((p.hrs / maxPerfHrs) * 100) : 0;
            return (
              <div key={p.name} className="perf-row">
                <div className={`partner-monogram partner-monogram-lg ${p.cls}`}>
                  {p.initial}
                </div>
                <div className="perf-info">
                  <div className="perf-name-row">
                    <span className="perf-name">{p.name}</span>
                    <span className="perf-hours">{p.hrs}h</span>
                  </div>
                  <div className="perf-bar-row">
                    <div className="perf-bar-track">
                      <div
                        className="perf-bar-fill"
                        style={{ width: `${barPct}%`, background: p.color }}
                      />
                    </div>
                    <span className="perf-tasks-label">
                      {p.doneTasks}/{p.allTasks} done
                    </span>
                  </div>
                </div>
                <div className="perf-right">
                  <span className="perf-net-label">Success</span>
                  <span className="perf-net" style={{ color: p.doneTasks > 0 ? '#0F9E8E' : 'var(--text-sec)' }}>
                    {p.allTasks > 0 ? `${p.completionRate}%` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
