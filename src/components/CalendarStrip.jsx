import React, { useMemo } from 'react';
import { TAMIL_DAYS, TAMIL_MONTHS, getLocalDateStr } from '../utils/calculations';
import Icon from './Icons';

export default function CalendarStrip({ store, weekOffset, setWeekOffset, selectedDate, setSelectedDate }) {
  const todayStr = useMemo(() => getLocalDateStr(), []);

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
      const dateStr = getLocalDateStr(d);

      const hasActivity =
        (store.tasks || []).some((t) => {
          const raw = t.dueDateTime || t.dueAt || t.createdAt;
          return raw ? getLocalDateStr(raw) === dateStr : false;
        }) ||
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
    <div className="cal-clean-bar">
      <div className="cal-header">
        <div className="cal-title-wrap">
          <span className="cal-month-title">{monthTitle}</span>
          {selectedDate && (
            <button
              className="cal-reset-pill"
              onClick={() => setSelectedDate(null)}
              title="தேதி வடிகட்டலை நீக்கு"
            >
              அனைத்தும் ✕
            </button>
          )}
        </div>

        <div className="cal-actions">
          <button className="cal-today-link" onClick={jumpToToday}>
            இன்று
          </button>
          <div className="cal-nav-arrows">
            <button
              className="cal-nav-btn"
              onClick={() => setWeekOffset((w) => w - 1)}
              title="முந்தைய வாரம்"
              aria-label="Previous Week"
            >
              <Icon name="chevron-left" size={13} />
            </button>
            <button
              className="cal-nav-btn"
              onClick={() => setWeekOffset((w) => w + 1)}
              title="அடுத்த வாரம்"
              aria-label="Next Week"
            >
              <Icon name="chevron-right" size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="cal-days-row">
        {days.map(({ dateStr, dayNum, dayName, hasActivity }) => {
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              type="button"
              className={`cal-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
              onClick={() => handleDayClick(dateStr)}
            >
              <span className="day-name">{dayName}</span>
              <span className="day-number">{dayNum}</span>
              {hasActivity && <span className="day-activity-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
