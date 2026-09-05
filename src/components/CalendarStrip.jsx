import React, { useMemo } from 'react';
import { TAMIL_DAYS, TAMIL_MONTHS } from '../utils/calculations';

export default function CalendarStrip({ store, weekOffset, setWeekOffset, selectedDate, setSelectedDate }) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const days = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const dayOfWeek = base.getDay();
    const start = new Date(base);
    start.setDate(base.getDate() - dayOfWeek);

    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${date}`;

      const hasActivity =
        (store.tasks || []).some((t) => (t.dueDateTime || '').startsWith(dateStr)) ||
        (store.expenses || []).some((e) => e.date === dateStr) ||
        (store.worklogs || []).some((w) => w.date === dateStr);

      list.push({
        dateObj: d,
        dateStr,
        dayNum: d.getDate(),
        dayName: TAMIL_DAYS[d.getDay()],
        hasActivity,
      });
    }
    return list;
  }, [weekOffset, store]);

  // Display Month & Year of the middle day
  const midDay = days[3]?.dateObj || new Date();
  const monthTitle = `${TAMIL_MONTHS[midDay.getMonth()]} ${midDay.getFullYear()}`;

  const handleDayClick = (dateStr) => {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  };

  const jumpToToday = () => {
    setWeekOffset(0);
    setSelectedDate(todayStr);
  };

  return (
    <section className="calendar-card">
      <div className="cal-topbar">
        <div className="cal-title">
          <span>📅</span>
          <span>{monthTitle}</span>
          {selectedDate && (
            <button
              className="cal-today-btn"
              onClick={() => setSelectedDate(null)}
              title="தேதி வடிகட்டலை நீக்கு"
              style={{ marginLeft: 8 }}
            >
              வடிகட்டலை நீக்கு ✕
            </button>
          )}
        </div>

        <div className="cal-controls">
          <button className="cal-today-btn" onClick={jumpToToday}>
            இன்று
          </button>
          <button
            className="cal-arrow"
            onClick={() => setWeekOffset((w) => w - 1)}
            title="முந்தைய வாரம்"
          >
            ‹
          </button>
          <button
            className="cal-arrow"
            onClick={() => setWeekOffset((w) => w + 1)}
            title="அடுத்த வாரம்"
          >
            ›
          </button>
        </div>
      </div>

      <div className="cal-strip">
        {days.map(({ dateStr, dayNum, dayName, hasActivity }) => {
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <div
              key={dateStr}
              className={`cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleDayClick(dateStr)}
              title={`${dateStr} பதிவுகளை பார்க்க`}
            >
              <span className="cal-day-name">{dayName}</span>
              <span className="cal-day-num">{dayNum}</span>
              {hasActivity && <span className="cal-dot" />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
