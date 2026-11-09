// ==========================================
// 📊 MEENMART PARTNERS HUB - DASHBOARD COMPONENT
// ==========================================

import { state } from '../state.js';
import { db, collection, addDoc, updatePartnerCardAvatars } from '../firebase.js';
import { 
  formatINR, formatLocalDate, getTodayString, getThisWeekStart, getThisMonthStart, 
  getWeekRange, getWeekFinancialSummary, getPartnerPreviousPendingDue, 
  renderPartnerAvatar, showToast 
} from '../utils.js';
import { renderTransactionItem } from './history.js';

export const DASH_SCOPE_KEYS = ['today', 'week', 'month', 'all'];

export function setDashboardDateScope(scope) {
  if (navigator.vibrate) navigator.vibrate(8);
  state.dashboardScope = scope;
  state.selectedDashboardDay = null; // Clear single-day calendar filter

  // Update 4 Scope Pills UI
  DASH_SCOPE_KEYS.forEach(k => {
    const btn = document.getElementById(`dashScope-${k}`);
    if (btn) {
      if (k === scope) {
        btn.className = "py-1.5 rounded-xl text-xs font-extrabold bg-teal-600 text-white shadow-md transition-all scale-[1.02]";
      } else {
        btn.className = "py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition";
      }
    }
  });

  const customRow = document.getElementById('dashCustomDateRow');
  if (scope === 'custom') {
    if (customRow) customRow.classList.remove('hidden');
  } else {
    if (customRow) customRow.classList.add('hidden');
  }

  renderDashboard();
}

export function selectWeeklyCalendarDay(dateStr) {
  if (navigator.vibrate) navigator.vibrate(8);
  state.dashboardScope = 'day';
  state.selectedDashboardDay = dateStr;

  // Deactivate all 4 scope pills
  DASH_SCOPE_KEYS.forEach(k => {
    const btn = document.getElementById(`dashScope-${k}`);
    if (btn) {
      btn.className = "py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition";
    }
  });

  const customRow = document.getElementById('dashCustomDateRow');
  if (customRow) customRow.classList.add('hidden');

  renderDashboard();
}

export function renderWeeklyCalendarStrip() {
  const container = document.getElementById('dashWeeklyCalendarStrip');
  if (!container) return;

  const todayStr = getTodayString();
  const { monday } = getWeekRange(0); // Current week's Monday
  const monthLabel = document.getElementById('dashCalMonthLabel');
  if (monthLabel) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    monthLabel.innerText = `${monthNames[monday.getMonth()]} ${monday.getFullYear()}`;
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let stripHtml = '';

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatLocalDate(d);
    const dayNum = d.getDate();
    const dayName = dayNames[i];

    const isToday = (dateStr === todayStr);
    const isSelected = (state.dashboardScope === 'day' && state.selectedDashboardDay === dateStr);

    let btnClasses = "flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer ";
    if (isSelected) {
      btnClasses += "bg-teal-600 text-white shadow-md font-black scale-105 ring-2 ring-teal-400";
    } else if (isToday) {
      btnClasses += "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 font-bold hover:bg-teal-100 dark:hover:bg-teal-900/60";
    } else {
      btnClasses += "bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-medium";
    }

    stripHtml += `
      <button type="button" onclick="selectWeeklyCalendarDay('${dateStr}')" class="${btnClasses}" title="${dateStr}">
        <span class="text-[9px] tracking-wider uppercase opacity-80">${dayName}</span>
        <span class="text-xs font-black mt-0.5">${dayNum}</span>
        ${isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400 mt-1"></span>' : '<span class="w-1.5 h-1.5 mt-1 opacity-0">•</span>'}
      </button>
    `;
  }

  container.innerHTML = stripHtml;
}

export function toggleCustomDateRangeModal() {
  const customRow = document.getElementById('dashCustomDateRow');
  if (customRow && customRow.classList.contains('hidden')) {
    customRow.classList.remove('hidden');
    state.dashboardScope = 'custom';
    DASH_SCOPE_KEYS.forEach(k => {
      const btn = document.getElementById(`dashScope-${k}`);
      if (btn) btn.className = "py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300";
    });
    if (!document.getElementById('dashCustomFrom').value) {
      document.getElementById('dashCustomFrom').value = getThisWeekStart();
      document.getElementById('dashCustomTo').value = getTodayString();
    }
    applyCustomDateRange();
  } else {
    setDashboardDateScope('today');
  }
}

export function applyCustomDateRange() {
  const from = document.getElementById('dashCustomFrom').value;
  const to = document.getElementById('dashCustomTo').value;
  state.customDateRange = { from, to };
  renderDashboard();
}

export function renderDashboard() {
  const todayStr = getTodayString();
  const weekStartStr = getThisWeekStart();
  const monthStartStr = getThisMonthStart();

  let fromDate = todayStr;
  let toDate = todayStr;
  let badgeLabel = "Today";

  if (state.dashboardScope === 'today') {
    fromDate = todayStr;
    toDate = todayStr;
    badgeLabel = "Today";
  } else if (state.dashboardScope === 'week') {
    fromDate = weekStartStr;
    toDate = todayStr;
    badgeLabel = "This Week";
  } else if (state.dashboardScope === 'month') {
    fromDate = monthStartStr;
    toDate = todayStr;
    badgeLabel = "This Month";
  } else if (state.dashboardScope === 'all') {
    fromDate = "2020-01-01";
    toDate = "2099-12-31";
    badgeLabel = "All-Time Total";
  } else if (state.dashboardScope === 'day') {
    fromDate = state.selectedDashboardDay || todayStr;
    toDate = state.selectedDashboardDay || todayStr;
    const dObj = new Date(fromDate);
    badgeLabel = dObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } else if (state.dashboardScope === 'custom') {
    fromDate = state.customDateRange.from || todayStr;
    toDate = state.customDateRange.to || todayStr;
    badgeLabel = `${fromDate.slice(5)} to ${toDate.slice(5)}`;
  }

  const dashRangeEl = document.getElementById('dashRangeLabel');
  if (dashRangeEl) dashRangeEl.innerText = badgeLabel;
  const dashHeroBadgeEl = document.getElementById('dashHeroDateBadge');
  if (dashHeroBadgeEl) dashHeroBadgeEl.innerText = badgeLabel;

  // Always render the 7-day interactive weekly calendar strip
  renderWeeklyCalendarStrip();

  let totalSales = 0;
  let totalExp = 0;
  let totalCap = 0;

  // Scoped partner totals
  const pScoped = {
    Balaji: { exp: 0, sales: 0, cap: 0 },
    Nagoor: { exp: 0, sales: 0, cap: 0 },
    JP: { exp: 0, sales: 0, cap: 0 }
  };

  state.transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    const p = tx.partner;

    // Scope date filter for hero cards
    if (tx.date >= fromDate && tx.date <= toDate) {
      if (tx.type === 'sales') {
        totalSales += amt;
        if (pScoped[p]) pScoped[p].sales += amt;
      } else if (tx.type === 'expense') {
        totalExp += amt;
        if (pScoped[p]) pScoped[p].exp += amt;
      } else if (tx.type === 'investment') {
        totalCap += amt;
        if (pScoped[p]) pScoped[p].cap += amt;
      }
    }
  });

  const netBalance = totalSales - totalExp;

  // Update Hero Card
  const heroCardEl = document.getElementById('dashHeroCardContainer');
  const heroNet = document.getElementById('dashHeroNetBalance');
  if (heroNet) {
    heroNet.innerText = formatINR(netBalance);
    const dtEl = document.getElementById('dashNetTitle');
    if (netBalance >= 0) {
      heroNet.className = "text-3xl font-black tracking-tight mt-1 text-white";
      if (dtEl) dtEl.innerText = "Profit";
      if (heroCardEl) {
        heroCardEl.className = "rounded-3xl p-5 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-950 text-white shadow-xl space-y-4 relative overflow-hidden transition-all duration-300";
      }
    } else {
      heroNet.className = "text-3xl font-black tracking-tight mt-1 text-rose-200";
      if (dtEl) dtEl.innerText = "Loss";
      if (heroCardEl) {
        heroCardEl.className = "rounded-3xl p-5 bg-gradient-to-br from-rose-700 via-rose-800 to-slate-950 text-white shadow-xl space-y-4 relative overflow-hidden transition-all duration-300";
      }
    }
  }

  const heroSales = document.getElementById('dashHeroSales');
  if (heroSales) heroSales.innerText = formatINR(totalSales);
  const heroExp = document.getElementById('dashHeroExpenses');
  if (heroExp) heroExp.innerText = formatINR(totalExp);
  const heroCap = document.getElementById('dashHeroCapital');
  if (heroCap) heroCap.innerText = formatINR(totalCap);

  // Scoped Partner Cards
  const cardBExp = document.getElementById('cardBalajiExp');
  if (cardBExp) cardBExp.innerText = formatINR(pScoped.Balaji.exp);
  const cardBSales = document.getElementById('cardBalajiSales');
  if (cardBSales) cardBSales.innerText = formatINR(pScoped.Balaji.sales);

  const cardNExp = document.getElementById('cardNagoorExp');
  if (cardNExp) cardNExp.innerText = formatINR(pScoped.Nagoor.exp);
  const cardNSales = document.getElementById('cardNagoorSales');
  if (cardNSales) cardNSales.innerText = formatINR(pScoped.Nagoor.sales);

  const cardJExp = document.getElementById('cardJpExp');
  if (cardJExp) cardJExp.innerText = formatINR(pScoped.JP.exp);
  const cardJSales = document.getElementById('cardJpSales');
  if (cardJSales) cardJSales.innerText = formatINR(pScoped.JP.sales);

  // Update Partner Summary Card Avatars
  updatePartnerCardAvatars();

  // -------------------------------------------------------------
  // 💵 REAL-TIME CASH & PARTNER SETTLEMENT BALANCES (100% DYNAMIC & ACCURATE)
  // -------------------------------------------------------------
  const curWeekSummary = getWeekFinancialSummary(0);
  const curTransfers = curWeekSummary.transfersData;

  // Previous week carry-forward dues dynamically computed from live prior transactions
  const prevNagoorCarried = getPartnerPreviousPendingDue('Nagoor', 0);
  const prevJpCarried = getPartnerPreviousPendingDue('JP', 0);

  const currWeekPExp = curWeekSummary.partnerExp;
  const currWeekProfit = curWeekSummary.netProfit;
  const currWeekEqualShare = curWeekSummary.equalShare;

  // --- NAGOOR REAL SETTLEMENT ENTITLEMENT ---
  const nagoorBaseDue = currWeekPExp.Nagoor + (currWeekProfit >= 0 ? currWeekEqualShare : -Math.abs(currWeekEqualShare));
  const nagoorTotalDue = Math.max(0, nagoorBaseDue + prevNagoorCarried);
  const nagoorRecord = curTransfers.Nagoor;
  const nagoorPaid = nagoorRecord ? (Number(nagoorRecord.paidAmount) || 0) : 0;
  const nagoorBalanceToPay = Math.max(0, nagoorTotalDue - nagoorPaid);
  const isNagoorAllPaid = (nagoorBalanceToPay === 0 && (nagoorTotalDue > 0 || nagoorPaid > 0));

  // --- JP REAL SETTLEMENT ENTITLEMENT ---
  const jpBaseDue = currWeekPExp.JP + (currWeekProfit >= 0 ? currWeekEqualShare : -Math.abs(currWeekEqualShare));
  const jpTotalDue = Math.max(0, jpBaseDue + prevJpCarried);
  const jpRecord = curTransfers.JP;
  const jpPaid = jpRecord ? (Number(jpRecord.paidAmount) || 0) : 0;
  const jpBalanceToPay = Math.max(0, jpTotalDue - jpPaid);
  const isJpAllPaid = (jpBalanceToPay === 0 && (jpTotalDue > 0 || jpPaid > 0));

  // --- BALAJI LIVE CASH IN HAND (BANK + CASH) ---
  let totalAllSales = 0;
  let totalAllCapital = 0;
  let totalBalajiSpends = 0;
  state.transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'sales') totalAllSales += amt;
    else if (tx.type === 'investment') totalAllCapital += amt;
    else if (tx.type === 'expense' && tx.partner === 'Balaji') totalBalajiSpends += amt;
  });

  let totalAllPayoutsPaid = 0;
  Object.values(state.settlements || {}).forEach(s => {
    if (s.transfers) {
      if (s.transfers.Nagoor && typeof s.transfers.Nagoor.paidAmount === 'number') {
        totalAllPayoutsPaid += Number(s.transfers.Nagoor.paidAmount) || 0;
      }
      if (s.transfers.JP && typeof s.transfers.JP.paidAmount === 'number') {
        totalAllPayoutsPaid += Number(s.transfers.JP.paidAmount) || 0;
      }
    }
  });
  // Also account for recorded profit withdrawals
  state.transactions.forEach(tx => {
    if (tx.type === 'transfer' && tx.category === 'profit_withdrawal') {
      totalAllPayoutsPaid += Number(tx.amount) || 0;
    }
  });

  const balajiLiveCash = totalAllSales + totalAllCapital - totalBalajiSpends - totalAllPayoutsPaid;
  const pendingToPartners = nagoorBalanceToPay + jpBalanceToPay;
  const balajiRetainedProfit = Math.max(0, balajiLiveCash - pendingToPartners);

  const balajiColorClass = balajiLiveCash > 0 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : (balajiLiveCash < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400');

  const cashContainer = document.getElementById('cashInHandContainer');
  if (cashContainer) {
    cashContainer.innerHTML = `
      <!-- 1. Balaji: Holds Business Cash in Hand & Bank -->
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
        <!-- Row 1: Identity & Amount -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            ${renderPartnerAvatar('Balaji', 'w-9 h-9', 'rounded-xl shadow-xs')}
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-sm text-slate-900 dark:text-white">Balaji</span>
                <span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 whitespace-nowrap">Shop Cash in Hand</span>
              </div>
              <span class="text-[10px] text-slate-400 font-medium block mt-0.5">Collections & Business Account</span>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="font-black ${balajiColorClass} text-base block">${formatINR(balajiLiveCash)}</span>
            <span class="text-[9px] text-slate-400 font-medium block whitespace-nowrap">In Hand & Bank</span>
          </div>
        </div>
        <!-- Row 2: Inset Math Card (Zero Truncation Responsive Layout) -->
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
          <div class="flex items-center justify-between font-semibold text-slate-600 dark:text-slate-300">
            <span>Total Collections:</span>
            <span class="font-extrabold text-slate-900 dark:text-white">+${formatINR(totalAllSales)}</span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 border-t border-slate-200/40 dark:border-slate-700/40">
            <span>Spends (${formatINR(totalBalajiSpends)}) • Paid (${formatINR(totalAllPayoutsPaid)})</span>
            <span class="font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-md border border-teal-100 dark:border-teal-900">${formatINR(balajiLiveCash)} Left</span>
          </div>
        </div>

        <!-- Row 3: Transparent Breakdown (JP Due vs Balaji Profit) -->
        <div class="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 text-[10px] space-y-1.5">
          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span class="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <i class="fa-solid fa-hourglass-half text-[9px]"></i> Owed to Partners (JP Due):
            </span>
            <strong class="font-extrabold text-amber-600 dark:text-amber-400">${formatINR(pendingToPartners)}</strong>
          </div>
          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span class="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <i class="fa-solid fa-circle-check text-[9px]"></i> Balaji's Earned Profit:
            </span>
            <strong class="font-extrabold text-emerald-600 dark:text-emerald-400">${formatINR(balajiRetainedProfit)}</strong>
          </div>
          ${balajiRetainedProfit > 0 ? `
            <div class="pt-1 border-t border-teal-100 dark:border-teal-900/40">
              <button type="button" onclick="quickPocketBalajiProfit(${balajiRetainedProfit})" class="w-full py-1.5 px-3 rounded-xl bg-teal-600/10 hover:bg-teal-600/20 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 text-[10px] font-bold flex items-center justify-center gap-1.5 active:scale-98 transition shadow-xs">
                <i class="fa-solid fa-wallet text-xs"></i>
                <span>Pocket My Profit (${formatINR(balajiRetainedProfit)}) ➔ Leaves only JP Due</span>
              </button>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- 2. Nagoor: Settlement Entitlement & Payment Status -->
      <div onclick="switchTab('accounts', 'settleTransfersContainer')" class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border ${isNagoorAllPaid ? 'border-emerald-200/80 dark:border-emerald-800/40' : (nagoorBalanceToPay > 0 ? 'border-amber-200 dark:border-amber-700/50 hover:border-amber-400' : 'border-slate-200 dark:border-slate-800')} shadow-sm space-y-2.5 cursor-pointer hover:shadow-md active:scale-99 transition" title="Click to view weekly settlement & record payment">
        <!-- Row 1: Identity & Amount -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            ${renderPartnerAvatar('Nagoor', 'w-9 h-9', 'rounded-xl shadow-xs')}
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-sm text-slate-900 dark:text-white">Nagoor</span>
                <span class="text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${isNagoorAllPaid ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : (nagoorBalanceToPay > 0 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')}">
                  ${isNagoorAllPaid ? 'All Paid ✅' : (nagoorBalanceToPay > 0 ? 'Payment Pending ⏳' : 'No Spends')}
                </span>
              </div>
              <span class="text-[10px] text-slate-400 font-medium block mt-0.5">Fish Purchase & Harbor Supply</span>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="font-black ${isNagoorAllPaid ? 'text-emerald-600 dark:text-emerald-400' : (nagoorBalanceToPay > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')} text-base block whitespace-nowrap">
              ${isNagoorAllPaid ? 'All Cleared ✅' : (nagoorBalanceToPay > 0 ? formatINR(nagoorBalanceToPay) + ' to Pay' : '₹0 Balance')}
            </span>
            <span class="text-[9px] text-slate-400 font-medium block whitespace-nowrap">${isNagoorAllPaid ? 'Fully Settled' : (nagoorBalanceToPay > 0 ? 'Balaji to Pay Nagoor' : 'Settled')}</span>
          </div>
        </div>
        <!-- Row 2: Inset Math Card (Zero Truncation Layout) -->
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
          ${nagoorTotalDue > 0 
            ? `<div class="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                 <span>Fish Spends: ${formatINR(currWeekPExp.Nagoor)} • Profit: ${formatINR(currWeekEqualShare)}</span>
                 <span class="font-bold ${isNagoorAllPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} text-[10px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                   ${isNagoorAllPaid ? 'Paid in Full ✅' : formatINR(nagoorBalanceToPay) + ' Due'}
                 </span>
               </div>
               ${prevNagoorCarried > 0 ? `
                 <div class="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-between pt-0.5 border-t border-slate-200/40 dark:border-slate-700/40">
                   <span>+ Prior Week Pending Due:</span>
                   <strong>+${formatINR(prevNagoorCarried)}</strong>
                 </div>
               ` : ''}`
            : `<div class="text-slate-400 text-center py-0.5">No fish purchases recorded this week (₹0)</div>`}
        </div>
      </div>

      <!-- 3. JP: Settlement Entitlement & Payment Status -->
      <div onclick="switchTab('accounts', 'settleTransfersContainer')" class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border ${isJpAllPaid ? 'border-emerald-200/80 dark:border-emerald-800/40' : (jpBalanceToPay > 0 ? 'border-amber-200 dark:border-amber-700/50 hover:border-amber-400' : 'border-slate-200 dark:border-slate-800')} shadow-sm space-y-2.5 cursor-pointer hover:shadow-md active:scale-99 transition" title="Click to view weekly settlement & record payment">
        <!-- Row 1: Identity & Amount -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            ${renderPartnerAvatar('JP', 'w-9 h-9', 'rounded-xl shadow-xs')}
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-sm text-slate-900 dark:text-white">JP</span>
                <span class="text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${isJpAllPaid ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : (jpBalanceToPay > 0 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')}">
                  ${isJpAllPaid ? 'All Paid ✅' : (jpBalanceToPay > 0 ? 'Payment Pending ⏳' : 'No Spends')}
                </span>
              </div>
              <span class="text-[10px] text-slate-400 font-medium block mt-0.5">Petrol & Delivery Operations</span>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="font-black ${isJpAllPaid ? 'text-emerald-600 dark:text-emerald-400' : (jpBalanceToPay > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')} text-base block whitespace-nowrap">
              ${isJpAllPaid ? 'All Cleared ✅' : (jpBalanceToPay > 0 ? formatINR(jpBalanceToPay) + ' to Pay' : '₹0 Balance')}
            </span>
            <span class="text-[9px] text-slate-400 font-medium block whitespace-nowrap">${isJpAllPaid ? 'Fully Settled' : (jpBalanceToPay > 0 ? 'Balaji to Pay JP' : 'Settled')}</span>
          </div>
        </div>
        <!-- Row 2: Inset Math Card (Zero Truncation Layout) -->
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
          ${jpTotalDue > 0 
            ? `<div class="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                 <span>Petrol: ${formatINR(currWeekPExp.JP)} • Profit: ${formatINR(currWeekEqualShare)}</span>
                 <span class="font-bold ${isJpAllPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} text-[10px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                   ${isJpAllPaid ? 'Paid in Full ✅' : formatINR(jpBalanceToPay) + ' Due'}
                 </span>
               </div>
               ${prevJpCarried > 0 ? `
                 <div class="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-between pt-0.5 border-t border-slate-200/40 dark:border-slate-700/40">
                   <span>+ Prior Week Pending Due:</span>
                   <strong>+${formatINR(prevJpCarried)}</strong>
                 </div>
               ` : ''}`
            : `<div class="text-slate-400 text-center py-0.5">No petrol or delivery recorded this week (₹0)</div>`}
        </div>
      </div>
    `;
  }

  // Recent 3 Transactions
  renderRecentTransactions();
}

export function renderRecentTransactions() {
  const recentContainer = document.getElementById('dashRecentTransactions');
  if (!recentContainer) return;

  if (!state.transactions || state.transactions.length === 0) {
    recentContainer.innerHTML = `
      <div class="app-card rounded-2xl p-6 text-center space-y-2">
        <div class="text-3xl">📭</div>
        <div class="text-xs font-bold text-slate-700 dark:text-slate-300">No transactions recorded yet</div>
        <p class="text-[11px] text-slate-400">Tap the '+' button below to add your first expense or income.</p>
        <button onclick="openEntryBottomSheet()" class="mt-2 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-md">
          + Add Transaction
        </button>
      </div>
    `;
  } else {
    const top3 = state.transactions.slice(0, 3);
    recentContainer.innerHTML = top3.map(tx => renderTransactionItem(tx, false, true)).join('');
  }
}

export async function quickPocketBalajiProfit(amt) {
  if (!amt || amt <= 0) return;
  if (!confirm(`Take ${formatINR(amt)} as personal profit withdrawal? This will record a transfer and leave only other partners' pending dues in shop cash.`)) return;
  try {
    const tx = {
      type: 'transfer',
      partner: 'Balaji',
      toPartner: 'Personal',
      category: 'profit_withdrawal',
      amount: amt,
      date: getTodayString(),
      paymentMethod: 'Bank Transfer',
      description: 'Balaji Profit Share Withdrawal',
      createdAt: Date.now(),
      createdBy: state.currentUser ? state.currentUser.email : '',
      createdByPartner: 'Balaji'
    };
    await addDoc(collection(db, "transactions"), tx);
    showToast(`Profit of ${formatINR(amt)} withdrawn! Shop cash now reflects partners' dues. ✅`);
  } catch (err) {
    alert("Withdrawal error: " + err.message);
  }
}

// Expose handlers on window for HTML onclick
if (typeof window !== 'undefined') {
  window.setDashboardDateScope = setDashboardDateScope;
  window.selectWeeklyCalendarDay = selectWeeklyCalendarDay;
  window.renderWeeklyCalendarStrip = renderWeeklyCalendarStrip;
  window.toggleCustomDateRangeModal = toggleCustomDateRangeModal;
  window.applyCustomDateRange = applyCustomDateRange;
  window.renderDashboard = renderDashboard;
  window.renderRecentTransactions = renderRecentTransactions;
  window.quickPocketBalajiProfit = quickPocketBalajiProfit;
}

