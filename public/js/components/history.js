// ==========================================
// 📜 MEENMART PARTNERS HUB - HISTORY COMPONENT
// ==========================================

import { state } from '../state.js';
import { PARTNERS } from '../config.js';
import { 
  formatINR, getTodayString, getYesterdayString, getThisWeekStart, getThisMonthStart,
  escapeHtml, getCategoryLabel, renderPartnerAvatar, isPartnerOnline, canUserModify 
} from '../utils.js';

export function renderHistoryList() {
  const container = document.getElementById('historyListContainer');
  if (!container) return;

  const searchInput = document.getElementById('historySearchInput');
  const search = (searchInput?.value || '').toLowerCase().trim();
  const filterTypeEl = document.getElementById('hFilterType');
  const filterType = filterTypeEl?.value || 'all';
  const filterPartnerEl = document.getElementById('hFilterPartner');
  const filterPartner = filterPartnerEl?.value || 'all';
  const filterDate = state.historyFilter.date || 'all';

  const todayStr = getTodayString();
  const yesterdayStr = getYesterdayString();
  const monStr = getThisWeekStart();
  const monthStartStr = getThisMonthStart();

  let filtered = (state.transactions || []).filter(tx => {
    // Date filter
    if (filterDate === 'today' && tx.date !== todayStr) return false;
    if (filterDate === 'yesterday' && tx.date !== yesterdayStr) return false;
    if (filterDate === 'this-week' && (tx.date < monStr || tx.date > todayStr)) return false;
    if (filterDate === 'this-month' && tx.date < monthStartStr) return false;

    // Type filter
    if (filterType !== 'all' && tx.type !== filterType) return false;

    // Partner filter
    if (filterPartner !== 'all') {
      if (tx.type === 'transfer') {
        if (tx.partner !== filterPartner && tx.toPartner !== filterPartner) return false;
      } else if (tx.partner !== filterPartner) {
        return false;
      }
    }

    // Search text
    if (search) {
      const matchDesc = (tx.description || '').toLowerCase().includes(search);
      const matchCat = (tx.category || '').toLowerCase().includes(search);
      const matchPartner = (tx.partner || '').toLowerCase().includes(search) || (tx.toPartner || '').toLowerCase().includes(search);
      const matchAmount = String(tx.amount || '').includes(search);
      if (!matchDesc && !matchCat && !matchPartner && !matchAmount) return false;
    }

    return true;
  });

  // Sort: Newest date first, then newest createdAt first
  filtered.sort((a, b) => {
    if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // Update count & total
  let sum = 0;
  filtered.forEach(tx => sum += Number(tx.amount) || 0);
  const countLabel = document.getElementById('hCountLabel');
  if (countLabel) countLabel.innerText = `${filtered.length} Entries`;
  const totalAmountLabel = document.getElementById('hTotalAmountLabel');
  if (totalAmountLabel) totalAmountLabel.innerText = `Total: ${formatINR(sum)}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="app-card rounded-3xl p-8 text-center space-y-3 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl mx-auto shadow-inner">
          <i class="fa-solid fa-receipt"></i>
        </div>
        <div>
          <h4 class="text-xs font-black text-slate-800 dark:text-slate-200">No Transactions Found</h4>
          <p class="text-[11px] text-slate-400 mt-0.5">No entries match your selected date or search filter.</p>
        </div>
        <div class="flex items-center justify-center gap-2 pt-1">
          <button type="button" onclick="setHistoryDateFilter('all')" class="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition">
            Show All
          </button>
          <button type="button" onclick="openEntryBottomSheet()" class="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-500 shadow-md shadow-teal-600/20 active:scale-95 transition">
            + Add Entry
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Group by Date (YYYY-MM-DD)
  const groups = [];
  const dateMap = {};
  filtered.forEach(tx => {
    const d = tx.date || 'Unknown';
    if (!dateMap[d]) {
      dateMap[d] = { date: d, items: [], totalSales: 0, totalExp: 0 };
      groups.push(dateMap[d]);
    }
    dateMap[d].items.push(tx);
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'sales') dateMap[d].totalSales += amt;
    else if (tx.type === 'expense') dateMap[d].totalExp += amt;
  });

  // Render Date Groups
  container.innerHTML = groups.map(g => {
    let headerBadge = '';
    let subDate = '';
    const dParts = (g.date || '').split('-');

    let formattedDate = g.date;
    let dayOfWeek = '';
    if (dParts.length === 3) {
      const parsedD = new Date(Number(dParts[0]), Number(dParts[1]) - 1, Number(dParts[2]));
      if (!isNaN(parsedD.getTime())) {
        formattedDate = parsedD.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        dayOfWeek = parsedD.toLocaleDateString('en-GB', { weekday: 'short' });
      }
    }

    if (g.date === todayStr) {
      headerBadge = `<span class="px-2.5 py-1 rounded-xl text-[11px] font-black bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">Today</span>`;
      subDate = `<span class="text-[10px] text-slate-400 font-bold">${formattedDate}</span>`;
    } else if (g.date === yesterdayStr) {
      headerBadge = `<span class="px-2.5 py-1 rounded-xl text-[11px] font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">Yesterday</span>`;
      subDate = `<span class="text-[10px] text-slate-400 font-bold">${formattedDate}</span>`;
    } else {
      headerBadge = `<span class="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">${formattedDate}</span>`;
      if (dayOfWeek) {
        subDate = `<span class="text-[10px] text-slate-400 font-bold">(${dayOfWeek})</span>`;
      }
    }

    // Daily Summary on Right
    let daySummary = '';
    if (g.totalSales > 0 && g.totalExp > 0) {
      daySummary = `<span class="text-emerald-600 dark:text-emerald-400 font-bold">+${formatINR(g.totalSales)}</span> <span class="text-slate-400">•</span> <span class="text-rose-600 dark:text-rose-400 font-bold">-${formatINR(g.totalExp)}</span>`;
    } else if (g.totalSales > 0) {
      daySummary = `<span class="text-emerald-600 dark:text-emerald-400 font-bold">Income: +${formatINR(g.totalSales)}</span>`;
    } else if (g.totalExp > 0) {
      daySummary = `<span class="text-rose-600 dark:text-rose-400 font-bold">Expenses: -${formatINR(g.totalExp)}</span>`;
    }

    return `
      <div class="space-y-2 pt-2.5 first:pt-0">
        <!-- Dynamic Date Header -->
        <div class="flex items-center justify-between px-1 py-1">
          <div class="flex items-center space-x-2">
            ${headerBadge}
            ${subDate}
          </div>
          <div class="text-[11px]">
            ${daySummary}
          </div>
        </div>

        <!-- Transactions for this Date -->
        <div class="space-y-2">
          ${g.items.map(tx => renderTransactionItem(tx, true, false)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

export function renderTransactionItem(tx, showActions = true, showDate = false) {
  const p = PARTNERS[tx.partner] || { avatar: '👤', name: tx.partner };
  const isExp = tx.type === 'expense';
  const isSales = tx.type === 'sales';
  const isTransfer = tx.type === 'transfer';

  let typeBadge = '';
  let amountColor = '';
  let sign = '';

  if (isExp) {
    typeBadge = '<span class="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-[10px] font-bold">Expense</span>';
    amountColor = 'text-rose-600 dark:text-rose-400';
    sign = '-';
  } else if (isSales) {
    typeBadge = '<span class="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold">Income</span>';
    amountColor = 'text-emerald-600 dark:text-emerald-400';
    sign = '+';
  } else if (isTransfer) {
    const toText = tx.toPartner ? ` ➔ ${tx.toPartner}` : '';
    typeBadge = `<span class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold">🔄 Transfer${toText}</span>`;
    amountColor = 'text-indigo-600 dark:text-indigo-400';
    sign = '⇄ ';
  } else {
    typeBadge = '<span class="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300 text-[10px] font-bold">Investment</span>';
    amountColor = 'text-teal-600 dark:text-teal-400';
    sign = '';
  }

  const catLabel = getCategoryLabel(tx.type, tx.category);

  // Notes-First Hierarchy with deduplication
  const hasNotes = tx.description && tx.description.trim().length > 0;
  const primaryTitle = hasNotes ? escapeHtml(tx.description.trim()) : catLabel;
  
  const isRedundant = !hasNotes || 
    primaryTitle.toLowerCase() === catLabel.toLowerCase() || 
    ['selavu', 'varavu', 'expense', 'sales', 'mudhaleedu', 'investment', 'entry', 'general'].includes(catLabel.toLowerCase());
  const secondaryLabel = isRedundant ? '' : catLabel;

  // Time formatting
  let timeText = '';
  if (tx.createdAt) {
    const d = new Date(tx.createdAt);
    if (!isNaN(d.getTime())) {
      timeText = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  }

  const isOnline = isPartnerOnline(tx.partner);

  return `
    <div onclick="handleTransactionCardClick('${tx.id}')" role="button" tabindex="0" class="app-card rounded-2xl px-3.5 py-2.5 transition active:scale-[0.98] border border-slate-100 dark:border-slate-800 shadow-xs cursor-pointer hover:border-teal-500/30">
      
      <div class="flex items-center justify-between gap-2.5">
        
        <!-- Left: Partner Photo Avatar + Notes & Metadata -->
        <div class="flex items-center space-x-2.5 min-w-0 flex-1">
          <div class="relative flex-shrink-0">
            ${renderPartnerAvatar(tx.partner, 'w-10 h-10', 'rounded-xl')}
            ${isOnline ? '<span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" title="Online"></span>' : ''}
          </div>
          <div class="min-w-0 flex-1">
            <!-- Notes / Description: wraps cleanly up to 2 lines without truncation -->
            <h4 class="font-extrabold text-sm text-slate-900 dark:text-white leading-snug break-words line-clamp-2">
              ${primaryTitle}
            </h4>
            <!-- Metadata sub-line: Partner • Time • Category -->
            <div class="flex items-center flex-wrap gap-1 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              <span class="font-bold text-slate-600 dark:text-slate-300">${p.name}</span>
              ${timeText ? `<span>•</span><span>${timeText}</span>` : ''}
              ${showDate ? `<span>•</span><span>${tx.date}</span>` : ''}
              ${secondaryLabel ? `<span>•</span><span class="text-teal-600 dark:text-teal-400 font-semibold">${secondaryLabel}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Right: Amount + Type Badge & Chevron -->
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <div class="text-right">
            <div class="text-sm font-black ${amountColor}">${sign}${formatINR(tx.amount)}</div>
            <div class="mt-0.5">${typeBadge}</div>
          </div>
          <div class="text-slate-300 dark:text-slate-600 text-xs pl-0.5">
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
          </div>
        </div>

      </div>

    </div>
  `;
}

export function handleTransactionCardClick(id) {
  const tx = (state.transactions || []).find(t => t.id === id);
  if (!tx) return;
  if (canUserModify(tx)) {
    if (typeof window.openEditModal === 'function') window.openEditModal(id);
  } else {
    if (typeof window.openTxDetailsModal === 'function') window.openTxDetailsModal(id);
  }
}

export function setHistoryDateFilter(p) {
  state.historyFilter.date = p;
  ['all', 'today', 'yesterday', 'this-week', 'this-month'].forEach(k => {
    const btn = document.getElementById(`hDate-${k}`);
    if (btn) {
      btn.className = (k === p) 
        ? "px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 text-white flex-shrink-0 whitespace-nowrap shadow-sm" 
        : "px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex-shrink-0 whitespace-nowrap";
    }
  });
  renderHistoryList();
}

// Ultra-smooth 120ms search input debouncer to eliminate input stutter
let searchDebounceTimer = null;
export function handleHistorySearchInput() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    renderHistoryList();
  }, 120);
}

// Expose handlers on window for HTML onclick
if (typeof window !== 'undefined') {
  window.renderHistoryList = renderHistoryList;
  window.handleHistorySearchInput = handleHistorySearchInput;
  window.renderTransactionItem = renderTransactionItem;
  window.handleTransactionCardClick = handleTransactionCardClick;
  window.setHistoryDateFilter = setHistoryDateFilter;
}

