import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { fmtCurrency } from '../utils/calculations';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function readTextColor(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

const PARTNERS = ['Balaji', 'Nagoor', 'JP'];

export default function AnalyticsTab({ store }) {
  const tickColor = readTextColor('--text-tertiary', '#8e95aa');
  const cardBg = readTextColor('--bg-card', '#131421');
  const gridColor = readTextColor('--border-subtle', 'rgba(255,255,255,0.05)');
  const legend = {
    labels: {
      color: tickColor,
      font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
      padding: 12,
      boxWidth: 12,
      boxHeight: 12,
    },
  };

  const hoursData = useMemo(() => {
    const hours = { Balaji: 0, Nagoor: 0, JP: 0 };
    (store.worklogs || []).forEach((w) => {
      if (hours[w.partner] !== undefined) hours[w.partner] += Number(w.hours || 0);
    });
    return {
      labels: PARTNERS,
      datasets: [{
        label: 'மணிநேரம்',
        data: [hours.Balaji, hours.Nagoor, hours.JP],
        backgroundColor: ['#3d6fe0', '#17a674', '#d19207'],
        borderRadius: 8,
        borderSkipped: false,
      }],
    };
  }, [store.worklogs]);

  const taskData = useMemo(() => {
    const completed = (store.tasks || []).filter((t) => t.status === 'completed').length;
    const pending = (store.tasks || []).filter((t) => t.status !== 'completed').length;
    return {
      labels: ['முடிந்தது', 'நிலுவை'],
      datasets: [{
        data: [completed || (pending === 0 ? 1 : 0), pending],
        backgroundColor: ['#17a674', '#d94848'],
        borderColor: cardBg,
        borderWidth: 3,
      }],
    };
  }, [store.tasks, cardBg]);

  const financialData = useMemo(() => {
    const totals = { Balaji: 0, Nagoor: 0, JP: 0 };
    (store.capitals || []).forEach((c) => {
      if (totals[c.partner] !== undefined) totals[c.partner] += Number(c.amount || 0);
    });
    (store.expenses || []).forEach((e) => {
      if (totals[e.partner] !== undefined) totals[e.partner] += Number(e.amount || 0);
    });
    const hasAny = totals.Balaji > 0 || totals.Nagoor > 0 || totals.JP > 0;
    return {
      labels: PARTNERS,
      datasets: [{
        data: hasAny ? [totals.Balaji, totals.Nagoor, totals.JP] : [1, 1, 1],
        backgroundColor: ['#3d6fe0', '#17a674', '#d19207'],
        borderColor: cardBg,
        borderWidth: 3,
      }],
    };
  }, [store.capitals, store.expenses, cardBg]);

  const expenseCatData = useMemo(() => {
    const cats = {};
    (store.expenses || []).forEach((e) => {
      const c = e.category || 'இதர';
      cats[c] = (cats[c] || 0) + Number(e.amount || 0);
    });
    const labels = Object.keys(cats);
    const data = Object.values(cats);
    const colors = [
      '#3d6fe0', '#17a674', '#d19207', '#d94848', '#7a55d1',
      '#38ef7d', '#ff9966', '#00b4d8', '#4facfe',
    ];
    return {
      labels: labels.length ? labels : ['செலவுகள் இல்லை'],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: colors.slice(0, Math.max(labels.length, 1)),
        borderColor: cardBg,
        borderWidth: 3,
      }],
    };
  }, [store.expenses, cardBg]);

  const summary = useMemo(() => {
    const totalHours = (store.worklogs || []).reduce((s, w) => s + Number(w.hours || 0), 0);
    const completedTasks = (store.tasks || []).filter((t) => t.status === 'completed').length;
    const totalTasks = (store.tasks || []).length;
    const totalSpent = (store.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
    return { totalHours, completedTasks, totalTasks, totalSpent };
  }, [store.worklogs, store.tasks, store.expenses]);

  const insight = `நமது MeenMart குழு இதுவரை மொத்தம் ${summary.totalHours} மணிநேரம் களப்பணியாற்றியுள்ளது. ஒதுக்கப்பட்ட ${summary.totalTasks} பணிகளில் ${summary.completedTasks} பணிகள் வெற்றிகரமாக முடிக்கப்பட்டுள்ளன. இதுவரை நிறுவனத்திற்காக ${fmtCurrency(summary.totalSpent)} செலவிடப்பட்டுள்ளது.`;

  return (
    <div className="tab-content">
      <div className="insight-box">
        <div className="insight-header">
          <span aria-hidden="true">✨</span>
          <span>MeenMart Business Intelligence</span>
        </div>
        <div className="insight-body">{insight}</div>
      </div>

      <div className="mini-stats">
        <div className="mini-stat">
          <div className="mini-stat-val text-green">{summary.totalHours}h</div>
          <div className="mini-stat-lbl">மொத்த உழைப்பு</div>
        </div>
        <div className="mini-stat">
          <div className="mini-stat-val" style={{ color: 'var(--accent-blue)' }}>
            {summary.completedTasks}/{summary.totalTasks}
          </div>
          <div className="mini-stat-lbl">முடிந்த பணிகள்</div>
        </div>
        <div className="mini-stat">
          <div className="mini-stat-val" style={{ color: 'var(--accent-yellow)' }}>
            {fmtCurrency(summary.totalSpent)}
          </div>
          <div className="mini-stat-lbl">மொத்த செலவு</div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-head">
          <div>
            <h3>உழைப்பு மணிநேரம்</h3>
            <p>Balaji · Nagoor · JP</p>
          </div>
        </div>
        <div className="chart-wrap" style={{ height: 220 }}>
          <Bar
            data={hoursData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: tickColor, font: { size: 12, weight: '600' } }, grid: { color: gridColor } },
                y: { ticks: { color: tickColor }, grid: { color: gridColor }, beginAtZero: true },
              },
            }}
          />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-head">
          <div>
            <h3>பணிகள் நிலை</h3>
            <p>முடிந்த பணிகள் vs நிலுவை</p>
          </div>
        </div>
        <div className="chart-wrap" style={{ height: 220 }}>
          <Doughnut
            data={taskData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend },
              cutout: '65%',
            }}
          />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-head">
          <div>
            <h3>நிதிப் பங்களிப்பு</h3>
            <p>முதலீடு + செலவுகள் மொத்த பகிர்வு</p>
          </div>
        </div>
        <div className="chart-wrap" style={{ height: 220 }}>
          <Doughnut
            data={financialData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend },
              cutout: '65%',
            }}
          />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-head">
          <div>
            <h3>செலவுப் பிரிவுகள்</h3>
            <p>கொள்முதல், பேக்கிங், டெலிவரி & டெக்</p>
          </div>
        </div>
        <div className="chart-wrap" style={{ height: 240 }}>
          <Doughnut
            data={expenseCatData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend },
              cutout: '55%',
            }}
          />
        </div>
      </div>
    </div>
  );
}
