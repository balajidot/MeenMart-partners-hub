// ==========================================
// 📈 MEENMART PARTNERS HUB - ANALYTICS COMPONENT
// ==========================================

import { state } from '../state.js';
import { formatINR, formatLocalDate, getCategoryLabel, renderPartnerAvatar } from '../utils.js';

export function setAnalyticsRange(r) {
  state.analyticsRange = r;
  ['7', '30', 'month', 'all'].forEach(k => {
    const btn = document.getElementById(`range-${k}`);
    if (btn) {
      btn.className = (String(k) === String(r))
        ? "py-1.5 text-xs rounded-xl font-bold bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm transition"
        : "py-1.5 text-xs rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition";
    }
  });
  renderAnalytics();
}

export function renderAnalytics() {
  const isDark = state.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  const range = state.analyticsRange || '7';
  const now = new Date();
  let limitDays = 7;
  let filterStartDate = null;

  if (range === '7') {
    limitDays = 7;
  } else if (range === '30') {
    limitDays = 30;
  } else if (range === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    limitDays = Math.ceil((now - firstDay) / (1000 * 60 * 60 * 24)) + 1;
    filterStartDate = formatLocalDate(firstDay);
  } else if (range === 'all') {
    limitDays = 9999;
  }

  // Compute Period Totals for Header Grid
  let periodSales = 0;
  let periodExp = 0;
  let periodCapital = 0;
  const todayStr = formatLocalDate(now);

  let cutoffDateStr = '';
  if (range === '7' || range === '30') {
    const dCutoff = new Date();
    dCutoff.setDate(now.getDate() - (limitDays - 1));
    cutoffDateStr = formatLocalDate(dCutoff);
  } else if (range === 'month') {
    cutoffDateStr = filterStartDate;
  }

  (state.transactions || []).forEach(tx => {
    let inRange = true;
    if (range !== 'all') {
      inRange = tx.date >= cutoffDateStr && tx.date <= todayStr;
    }
    if (inRange) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'sales') periodSales += amt;
      else if (tx.type === 'expense') periodExp += amt;
      else if (tx.type === 'investment') periodCapital += amt;
    }
  });

  const periodNet = periodSales - periodExp;

  // Update Period Grand Totals
  const pSalesEl = document.getElementById('analyticsPeriodSales');
  const pExpEl = document.getElementById('analyticsPeriodExp');
  const pNetEl = document.getElementById('analyticsPeriodNet');
  const pCapEl = document.getElementById('analyticsPeriodCapital');

  if (pSalesEl) pSalesEl.innerText = formatINR(periodSales);
  if (pExpEl) pExpEl.innerText = formatINR(periodExp);
  if (pNetEl) {
    pNetEl.innerText = `${periodNet >= 0 ? '+' : '-'}${formatINR(Math.abs(periodNet))}`;
    pNetEl.className = `text-xs font-black ${periodNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
  }
  if (pCapEl) pCapEl.innerText = formatINR(periodCapital);

  // ========================================================
  // 💰 SECTION A: CAPITAL INVESTMENT & TARGET TRACKER
  // ========================================================
  const partnerInvested = { Balaji: 0, Nagoor: 0, JP: 0 };
  let totalCapitalInvested = 0;

  (state.transactions || []).forEach(tx => {
    if (tx.type === 'investment') {
      const amt = Number(tx.amount) || 0;
      totalCapitalInvested += amt;
      if (partnerInvested[tx.partner] !== undefined) {
        partnerInvested[tx.partner] += amt;
      }
    }
  });

  const targetEach = state.capitalTargetPerPartner || 50000;
  const targetPool = targetEach * 3;
  const pendingPool = Math.max(0, targetPool - totalCapitalInvested);
  const percentPool = targetPool > 0 ? Math.round((totalCapitalInvested / targetPool) * 100) : 0;

  const capTargetSubtext = document.getElementById('capitalTargetSubtext');
  if (capTargetSubtext) {
    capTargetSubtext.innerText = `Target: ${formatINR(targetEach)} per partner (${formatINR(targetPool)} total pool)`;
  }

  const capTotalInvText = document.getElementById('capitalTotalInvestedText');
  if (capTotalInvText) capTotalInvText.innerText = formatINR(totalCapitalInvested);

  const capTotalTargetText = document.getElementById('capitalTotalTargetText');
  if (capTotalTargetText) capTotalTargetText.innerText = formatINR(targetPool);

  const capPercentText = document.getElementById('capitalPercentText');
  if (capPercentText) capPercentText.innerText = `${percentPool}% Reached`;

  const capPendingText = document.getElementById('capitalPendingText');
  if (capPendingText) {
    capPendingText.innerText = pendingPool > 0 
      ? `${formatINR(pendingPool)} Pending Deficit`
      : `Target Fully Reached! 🎯 ✅`;
  }

  // Render Multi-Segment Colored Progress Bar
  const multiBarEl = document.getElementById('capitalMultiProgressBar');
  if (multiBarEl) {
    const pctB = targetPool > 0 ? Math.min(100, (partnerInvested.Balaji / targetPool) * 100) : 0;
    const pctN = targetPool > 0 ? Math.min(100, (partnerInvested.Nagoor / targetPool) * 100) : 0;
    const pctJ = targetPool > 0 ? Math.min(100, (partnerInvested.JP / targetPool) * 100) : 0;
    const pctPending = Math.max(0, 100 - (pctB + pctN + pctJ));

    multiBarEl.innerHTML = `
      <div style="width: ${pctB}%" class="bg-blue-500 h-full transition-all" title="Balaji: ${formatINR(partnerInvested.Balaji)}"></div>
      <div style="width: ${pctN}%" class="bg-emerald-500 h-full transition-all" title="Nagoor: ${formatINR(partnerInvested.Nagoor)}"></div>
      <div style="width: ${pctJ}%" class="bg-amber-500 h-full transition-all" title="JP: ${formatINR(partnerInvested.JP)}"></div>
      <div style="width: ${pctPending}%" class="bg-slate-200 dark:bg-slate-700 h-full transition-all" title="Pending: ${formatINR(pendingPool)}"></div>
    `;
  }

  // Render Stacked Bar Chart (Invested vs Pending Target)
  const capCanvas = document.getElementById('chartCapital');
  if (capCanvas && typeof Chart !== 'undefined') {
    if (state.charts.capital) state.charts.capital.destroy();

    const pendingBalaji = Math.max(0, targetEach - partnerInvested.Balaji);
    const pendingNagoor = Math.max(0, targetEach - partnerInvested.Nagoor);
    const pendingJp = Math.max(0, targetEach - partnerInvested.JP);

    state.charts.capital = new Chart(capCanvas, {
      type: 'bar',
      data: {
        labels: ['Balaji', 'Nagoor', 'JP', 'Total Pool'],
        datasets: [
          {
            label: 'Contributed (₹)',
            data: [partnerInvested.Balaji, partnerInvested.Nagoor, partnerInvested.JP, totalCapitalInvested],
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#0D9488'],
            borderRadius: 4,
            stack: 'stack1'
          },
          {
            label: 'Pending to Target (₹)',
            data: [pendingBalaji, pendingNagoor, pendingJp, pendingPool],
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            borderRadius: 4,
            stack: 'stack1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, font: { size: 10 } }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                return `${ctx.dataset.label}: ${formatINR(ctx.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: textColor, font: { size: 10, weight: 'bold' } }
          },
          y: {
            stacked: true,
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 9 },
              callback: (val) => '₹' + val.toLocaleString('en-IN')
            }
          }
        }
      }
    });
  }

  // Render Individual Partner Capital Cards
  const partnerCardsContainer = document.getElementById('capitalPartnerCardsContainer');
  if (partnerCardsContainer) {
    const partnersList = [
      { name: 'Balaji', role: 'Income Collection & Tech Lead', color: 'bg-blue-500', barText: 'text-blue-500', amount: partnerInvested.Balaji },
      { name: 'Nagoor', role: 'Fish Purchase Lead', color: 'bg-emerald-500', barText: 'text-emerald-500', amount: partnerInvested.Nagoor },
      { name: 'JP', role: 'Delivery & Operations', color: 'bg-amber-500', barText: 'text-amber-500', amount: partnerInvested.JP }
    ];

    partnerCardsContainer.innerHTML = partnersList.map(p => {
      const pPending = Math.max(0, targetEach - p.amount);
      const pPct = Math.round((p.amount / targetEach) * 100);
      const pSurplus = Math.max(0, p.amount - targetEach);
      const isComplete = p.amount >= targetEach;

      const statusBadge = isComplete
        ? `<span class="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Target Reached! 🎯</span>`
        : `<span class="text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1"><i class="fa-solid fa-hourglass-half text-[9px]"></i> ${pPct}% Contributed</span>`;

      const pendingText = isComplete
        ? (pSurplus > 0 ? `<strong class="text-teal-600 dark:text-teal-400 font-bold">+${formatINR(pSurplus)} Surplus</strong>` : 'Zero Pending Balance ✅')
        : `Pending: <strong class="text-slate-900 dark:text-white font-bold">${formatINR(pPending)}</strong> to reach ${formatINR(targetEach)}`;

      return `
        <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border ${isComplete ? 'border-emerald-200 dark:border-emerald-800/40' : 'border-slate-200 dark:border-slate-800'} shadow-sm space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              ${renderPartnerAvatar(p.name, 'w-8 h-8', 'rounded-xl')}
              <div>
                <div class="text-xs font-black text-slate-900 dark:text-white">${p.name}</div>
                <div class="text-[10px] text-slate-400">${p.role}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs font-black text-slate-900 dark:text-white">${formatINR(p.amount)}</div>
              <div class="text-[9px] text-slate-400">Target ${formatINR(targetEach)} (${pPct}%)</div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div class="h-full rounded-full ${p.color} transition-all" style="width: ${Math.min(100, pPct)}%"></div>
          </div>

          <div class="flex items-center justify-between text-[10px] pt-0.5">
            ${statusBadge}
            <span class="text-slate-500 dark:text-slate-400">${pendingText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ========================================================
  // 📈 SECTION B: DAILY REVENUE VS EXPENSES CHART
  // ========================================================
  const dailyCanvas = document.getElementById('chartDaily');
  if (dailyCanvas && typeof Chart !== 'undefined') {
    if (state.charts.daily) state.charts.daily.destroy();

    const daysMap = {};
    let daysToDisplay = limitDays > 30 ? 30 : limitDays;

    for (let i = daysToDisplay - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = formatLocalDate(d);
      daysMap[key] = { sales: 0, expense: 0 };
    }

    (state.transactions || []).forEach(tx => {
      if (daysMap[tx.date]) {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'sales') daysMap[tx.date].sales += amt;
        else if (tx.type === 'expense') daysMap[tx.date].expense += amt;
      }
    });

    const labels = Object.keys(daysMap).map(d => {
      const parts = d.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const salesData = Object.values(daysMap).map(v => v.sales);
    const expData = Object.values(daysMap).map(v => v.expense);

    const totalDailySales = salesData.reduce((a, b) => a + b, 0);
    const totalDailyExp = expData.reduce((a, b) => a + b, 0);

    const dailyBadge = document.getElementById('chartDailyTotalBadge');
    if (dailyBadge) dailyBadge.innerText = `Total: ${formatINR(totalDailySales + totalDailyExp)}`;

    const dailySummaryEl = document.getElementById('chartDailySummaryText');
    if (dailySummaryEl) {
      const net = totalDailySales - totalDailyExp;
      dailySummaryEl.innerHTML = `
        <span>Income: <strong class="text-emerald-600 dark:text-emerald-400">${formatINR(totalDailySales)}</strong> | Exp: <strong class="text-rose-600 dark:text-rose-400">${formatINR(totalDailyExp)}</strong></span>
        <span class="${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">Net: ${net >= 0 ? '+' : '-'}${formatINR(Math.abs(net))}</span>
      `;
    }

    state.charts.daily = new Chart(dailyCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Income', data: salesData, backgroundColor: '#10B981', borderRadius: 4, barThickness: 16, maxBarThickness: 24 },
          { label: 'Expenses', data: expData, backgroundColor: '#EF4444', borderRadius: 4, barThickness: 16, maxBarThickness: 24 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatINR(ctx.raw)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 9 } } },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 9 },
              callback: (v) => '₹' + v.toLocaleString('en-IN')
            }
          }
        }
      }
    });
  }

  // ========================================================
  // 📊 SECTION C: PARTNER EXPENSE SHARE CHART
  // ========================================================
  const partnerCanvas = document.getElementById('chartPartners');
  if (partnerCanvas && typeof Chart !== 'undefined') {
    if (state.charts.partners) state.charts.partners.destroy();

    const pExp = { Balaji: 0, Nagoor: 0, JP: 0 };
    (state.transactions || []).forEach(tx => {
      let inRange = true;
      if (range !== 'all') {
        inRange = tx.date >= cutoffDateStr && tx.date <= todayStr;
      }
      if (inRange && tx.type === 'expense' && pExp[tx.partner] !== undefined) {
        pExp[tx.partner] += Number(tx.amount) || 0;
      }
    });

    const totalPExp = pExp.Balaji + pExp.Nagoor + pExp.JP;

    const pBadge = document.getElementById('chartPartnerTotalBadge');
    if (pBadge) pBadge.innerText = `Total: ${formatINR(totalPExp)}`;

    const breakdownList = document.getElementById('chartPartnerBreakdownList');
    if (breakdownList) {
      const pctB = totalPExp > 0 ? Math.round((pExp.Balaji / totalPExp) * 100) : 0;
      const pctN = totalPExp > 0 ? Math.round((pExp.Nagoor / totalPExp) * 100) : 0;
      const pctJ = totalPExp > 0 ? Math.round((pExp.JP / totalPExp) * 100) : 0;

      breakdownList.innerHTML = `
        <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
          <span class="text-slate-400 block text-[9px]">Balaji</span>
          <strong class="text-blue-600 dark:text-blue-400 text-xs font-bold">${formatINR(pExp.Balaji)}</strong>
          <span class="text-slate-400 block text-[8px]">${pctB}%</span>
        </div>
        <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
          <span class="text-slate-400 block text-[9px]">Nagoor</span>
          <strong class="text-emerald-600 dark:text-emerald-400 text-xs font-bold">${formatINR(pExp.Nagoor)}</strong>
          <span class="text-slate-400 block text-[8px]">${pctN}%</span>
        </div>
        <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
          <span class="text-slate-400 block text-[9px]">JP</span>
          <strong class="text-amber-600 dark:text-amber-400 text-xs font-bold">${formatINR(pExp.JP)}</strong>
          <span class="text-slate-400 block text-[8px]">${pctJ}%</span>
        </div>
      `;
    }

    if (totalPExp === 0) {
      const container = document.getElementById('chartPartnersContainer');
      if (container) {
        container.innerHTML = `
          <div class="text-center py-8 space-y-1">
            <span class="text-2xl">📊</span>
            <p class="text-xs text-slate-400 font-medium">No expense entries in this period</p>
          </div>
        `;
      }
    } else {
      const container = document.getElementById('chartPartnersContainer');
      if (container) container.innerHTML = '<canvas id="chartPartners"></canvas>';
      const newPartnerCanvas = document.getElementById('chartPartners');

      if (newPartnerCanvas) {
        state.charts.partners = new Chart(newPartnerCanvas, {
          type: 'doughnut',
          data: {
            labels: ['Balaji (Clean/Ads)', 'Nagoor (Fish)', 'JP (Petrol)'],
            datasets: [{
              data: [pExp.Balaji, pExp.Nagoor, pExp.JP],
              backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: textColor, font: { size: 10 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.label}: ${formatINR(ctx.raw)}`
                }
              }
            }
          }
        });
      }
    }
  }

  // ========================================================
  // 📦 SECTION D: CATEGORY BREAKDOWN BAR
  // ========================================================
  const catCanvas = document.getElementById('chartCategories');
  if (catCanvas && typeof Chart !== 'undefined') {
    if (state.charts.categories) state.charts.categories.destroy();

    const catMap = {};
    let totalCatExp = 0;

    (state.transactions || []).forEach(tx => {
      let inRange = true;
      if (range !== 'all') {
        inRange = tx.date >= cutoffDateStr && tx.date <= todayStr;
      }
      if (inRange && tx.type === 'expense') {
        const cat = getCategoryLabel('expense', tx.category);
        const amt = Number(tx.amount) || 0;
        catMap[cat] = (catMap[cat] || 0) + amt;
        totalCatExp += amt;
      }
    });

    const catBadge = document.getElementById('chartCategoryTotalBadge');
    if (catBadge) catBadge.innerText = `Total: ${formatINR(totalCatExp)}`;

    const catLabels = Object.keys(catMap);
    const catValues = Object.values(catMap);

    const catContainer = document.getElementById('chartCategoriesContainer');
    if (catValues.length === 0) {
      if (catContainer) {
        catContainer.innerHTML = `
          <div class="text-center py-8 space-y-1">
            <span class="text-2xl">📦</span>
            <p class="text-xs text-slate-400 font-medium">No expense categories in this period</p>
          </div>
        `;
      }
    } else {
      if (catContainer) catContainer.innerHTML = '<canvas id="chartCategories"></canvas>';
      const newCatCanvas = document.getElementById('chartCategories');

      if (newCatCanvas) {
        state.charts.categories = new Chart(newCatCanvas, {
          type: 'bar',
          data: {
            labels: catLabels,
            datasets: [{
              label: 'Expenses (₹)',
              data: catValues,
              backgroundColor: '#0F9E8E',
              borderRadius: 6
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `Expenses: ${formatINR(ctx.raw)}`
                }
              }
            },
            scales: {
              x: {
                grid: { color: gridColor },
                ticks: {
                  color: textColor,
                  font: { size: 9 },
                  callback: (v) => '₹' + v.toLocaleString('en-IN')
                }
              },
              y: { grid: { display: false }, ticks: { color: textColor, font: { size: 9 } } }
            }
          }
        });
      }
    }
  }
}

// Expose handlers on window for HTML onclick
if (typeof window !== 'undefined') {
  window.renderAnalytics = renderAnalytics;
  window.setAnalyticsRange = setAnalyticsRange;
}
