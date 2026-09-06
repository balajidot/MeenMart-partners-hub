import React, { useState, useEffect, useRef } from 'react';
import { getLocalDateStr } from '../utils/calculations';

/* ── Partner config ─────────────────────────────────────── */
const PARTNERS = [
  { name: 'Balaji', initial: 'BA', cls: 'balaji', color: '#1B2A5B' },
  { name: 'Nagoor', initial: 'NA', cls: 'nagoor', color: '#0F9E8E' },
  { name: 'JP',     initial: 'JP', cls: 'jp',     color: '#B4531F' },
];

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

/* ── Component ───────────────────────────────────────────── */
export default function WorkTab({
  store,
  partnerFilter,
  onOpenWork,
}) {
  const [clockedIn, setClockedIn]     = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [now, setNow]                 = useState(() => Date.now());
  const intervalRef                   = useRef(null);

  /* Tick every second while clocked in */
  useEffect(() => {
    if (clockedIn) {
      intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [clockedIn]);

  const todayStr = getLocalDateStr();

  /* ── Derived data ───────────────────────────────────────── */
  const todayLogs = (store.worklogs || []).filter((w) => {
    const matchDate    = w.date === todayStr;
    const matchPartner = partnerFilter === 'all' || w.partner === partnerFilter;
    return matchDate && matchPartner;
  });

  /* Elapsed display */
  const elapsedDisplay = clockedIn
    ? fmtHMS(now - clockInTime)
    : (() => {
        const lastLog = (store.worklogs || [])
          .filter((w) => partnerFilter === 'all' || w.partner === partnerFilter)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
        return lastLog ? hoursToHM(lastLog.hours) : '0:00';
      })();

  /* Week hours per partner */
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  const weekStartStr = getLocalDateStr(weekStart);

  const weekHours = PARTNERS.map((p) => {
    const hrs = (store.worklogs || [])
      .filter((w) => w.partner === p.name && w.date >= weekStartStr)
      .reduce((s, w) => s + Number(w.hours || 0), 0);
    return { ...p, hrs: Number(hrs.toFixed(1)) };
  });
  const maxWeekHrs = Math.max(...weekHours.map((p) => p.hrs), 1);
  const totalWeekHrs = weekHours.reduce((s, p) => s + p.hrs, 0);

  /* Today per-partner performance */
  const todayPerf = PARTNERS.map((p) => {
    const logs     = (store.worklogs || []).filter((w) => w.partner === p.name && w.date === todayStr);
    const hrs      = logs.reduce((s, w) => s + Number(w.hours || 0), 0);
    const allTasks = (store.tasks || []).filter((t) => t.to === p.name);
    const doneTasks = allTasks.filter((t) => t.status === 'completed').length;
    const cap = (store.capitals || [])
      .filter((c) => c.partner === p.name)
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    const exp = (store.expenses || [])
      .filter((e) => e.partner === p.name)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    return { ...p, hrs: Number(hrs.toFixed(1)), doneTasks, allTasks: allTasks.length, net: cap - exp };
  });
  const maxPerfHrs = Math.max(...todayPerf.map((p) => p.hrs), 1);

  function handleClockToggle() {
    if (clockedIn) {
      setClockedIn(false);
      setClockInTime(null);
    } else {
      const ts = Date.now();
      setClockedIn(true);
      setClockInTime(ts);
      setNow(ts);
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
              {clockedIn ? 'On shift now' : 'Shift closed'}
            </span>
            <span className="shift-elapsed">{elapsedDisplay}</span>
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
          {clockedIn ? 'Check out' : 'Check in'}
        </button>
      </div>

      {/* 2 ── Activity log today ──────────────────────────── */}
      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Activity log · today</span>
          <button type="button" className="section-card-link" onClick={onOpenWork}>
            + Log activity
          </button>
        </div>

        {todayLogs.length === 0 ? (
          <div
            className="empty-state"
            style={{ margin: '0 16px 16px', borderRadius: 12 }}
          >
            <p className="empty-state-text">இன்று எந்த செயல்பாடும் பதியவில்லை</p>
            <button type="button" className="empty-state-action" onClick={onOpenWork}>
              + Log activity
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
              </div>
            );
          })
        )}
      </div>

      {/* 3 ── Hours this week ────────────────────────────── */}
      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Hours this week</span>
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
            இந்த வாரம் மொத்தம் <strong>{totalWeekHrs.toFixed(1)}h</strong> உழைப்பு பதிவு செய்யப்பட்டது.{' '}
            {weekHours.reduce((top, p) => (p.hrs > top.hrs ? p : top), weekHours[0]).name} leads this week.
          </div>
        </div>
      </div>

      {/* 4 ── Partner performance today ──────────────────── */}
      <div className="section-card" style={{ overflow: 'visible' }}>
        <div className="section-card-header">
          <span className="section-card-title">Partner performance · today</span>
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          {todayPerf.map((p) => {
            const barPct = maxPerfHrs > 0 ? Math.round((p.hrs / maxPerfHrs) * 100) : 0;
            const netStr = `₹${Math.abs(Math.round(p.net)).toLocaleString('en-IN')}`;
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
                  <span className="perf-net-label">net</span>
                  <span className="perf-net">{netStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
