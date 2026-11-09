// ==========================================
// 🤝 MEENMART PARTNERS HUB - SETTLEMENT COMPONENT
// ==========================================

import { state } from '../state.js';
import { db, collection, addDoc, doc, setDoc } from '../firebase.js';
import { PARTNERS, PARTNER_EMAILS } from '../config.js';
import { 
  formatINR, formatLocalDate, getTodayString, getWeekRange, 
  getWeekFinancialSummary, getPartnerPreviousPendingDue, 
  renderPartnerAvatar, showToast 
} from '../utils.js';

export function changeSettlementWeek(delta) {
  state.settlementOffsetWeeks += delta;
  if (state.settlementOffsetWeeks < 0) state.settlementOffsetWeeks = 0;
  renderAccounts();
}

export function switchSettlementSubTab(subTab) {
  state.settlementSubTab = subTab;
  const weeklyView = document.getElementById('settlementWeeklyView');
  const allTimeView = document.getElementById('settlementAllTimeView');
  const btnWeekly = document.getElementById('btnSubTabWeekly');
  const btnAllTime = document.getElementById('btnSubTabAllTime');

  if (subTab === 'alltime') {
    if (weeklyView) weeklyView.classList.add('hidden');
    if (allTimeView) allTimeView.classList.remove('hidden');
    if (btnWeekly) btnWeekly.className = "flex-1 py-2 text-xs font-extrabold rounded-xl transition text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5";
    if (btnAllTime) btnAllTime.className = "flex-1 py-2 text-xs font-extrabold rounded-xl transition bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm flex items-center justify-center gap-1.5";
    renderAllTimeLedger();
  } else {
    if (weeklyView) weeklyView.classList.remove('hidden');
    if (allTimeView) allTimeView.classList.add('hidden');
    if (btnWeekly) btnWeekly.className = "flex-1 py-2 text-xs font-extrabold rounded-xl transition bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm flex items-center justify-center gap-1.5";
    if (btnAllTime) btnAllTime.className = "flex-1 py-2 text-xs font-extrabold rounded-xl transition text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5";
    renderAccounts();
  }
}

// Open Record Payment Modal
export function openRecordPaymentModal(partner, totalDue, alreadyPaid, remainingDue, carriedDue, weekId, reason) {
  state.activePayout = { partner, totalDue, alreadyPaid, remainingDue, carriedDue, weekId, reason };
  
  const titleEl = document.getElementById('rpmTitle');
  const subEl = document.getElementById('rpmSubtitle');
  const nameEl = document.getElementById('rpmPartnerName');
  const reasonEl = document.getElementById('rpmTransferReason');
  const dueEl = document.getElementById('rpmTotalDue');
  const avatarEl = document.getElementById('rpmPartnerAvatar');
  const paidInput = document.getElementById('rpmPaidAmount');
  const refInput = document.getElementById('rpmReference');
  const chipsEl = document.getElementById('rpmQuickChips');

  if (titleEl) titleEl.innerText = `Pay ${partner}`;
  if (subEl) subEl.innerText = `Weekly Settlement Payment`;
  if (nameEl) nameEl.innerText = partner;
  if (avatarEl) avatarEl.innerHTML = renderPartnerAvatar(partner, 'w-8 h-8', 'rounded-xl');
  if (dueEl) dueEl.innerText = formatINR(totalDue);
  if (reasonEl) {
    reasonEl.innerText = carriedDue > 0 
      ? `Includes ${formatINR(carriedDue)} carry-forward from previous week` 
      : (reason || 'Expense Refund + Profit Share');
  }

  // Default amount is remaining due (or total due)
  const defaultAmount = remainingDue > 0 ? remainingDue : totalDue;
  if (paidInput) {
    paidInput.value = defaultAmount;
    paidInput.max = totalDue * 2;
  }
  if (refInput) refInput.value = '';

  // Render quick suggestion chips
  const chips = [];
  chips.push({ label: `Full ${formatINR(totalDue)}`, val: totalDue });
  if (remainingDue > 0 && remainingDue !== totalDue) {
    chips.push({ label: `Balance ${formatINR(remainingDue)}`, val: remainingDue });
  }
  const roundVals = [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000].filter(v => v < totalDue && v !== remainingDue);
  roundVals.slice(-2).forEach(v => {
    chips.push({ label: `Round ${formatINR(v)}`, val: v });
  });

  if (chipsEl) {
    chipsEl.innerHTML = chips.map(c => `
      <button type="button" onclick="setPaymentInputAmount(${c.val})" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700 whitespace-nowrap active:scale-95 transition">
        ${c.label}
      </button>
    `).join('');
  }

  updatePaymentLivePreview();

  const modal = document.getElementById('recordPaymentModal');
  if (modal) modal.classList.remove('hidden');
  if (typeof window.pushModalState === 'function') window.pushModalState('recordPaymentModal');
}

export function closeRecordPaymentModal(fromPopState = false) {
  const modal = document.getElementById('recordPaymentModal');
  if (modal) modal.classList.add('hidden');
  state.activePayout = null;
  if (typeof window.popModalState === 'function') window.popModalState('recordPaymentModal', fromPopState);
}

export function setPaymentInputAmount(val) {
  const input = document.getElementById('rpmPaidAmount');
  if (input) {
    input.value = val;
    updatePaymentLivePreview();
  }
}

export function updatePaymentLivePreview() {
  if (!state.activePayout) return;
  const input = document.getElementById('rpmPaidAmount');
  const val = Number(input?.value) || 0;
  const totalDue = state.activePayout.totalDue;
  const box = document.getElementById('rpmLivePreviewBox');
  if (!box) return;

  if (val === totalDue) {
    box.className = "p-3 rounded-2xl border text-xs space-y-1 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300";
    box.innerHTML = `
      <div class="font-extrabold flex items-center gap-1.5">
        <i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400"></i>
        <span>Full Settlement ✅</span>
      </div>
      <p class="text-[11px] opacity-80">${state.activePayout.partner} account will be marked fully settled for this week with 0 arrears.</p>
    `;
  } else if (val > 0 && val < totalDue) {
    const rem = totalDue - val;
    box.className = "p-3 rounded-2xl border text-xs space-y-1 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300";
    box.innerHTML = `
      <div class="font-extrabold flex items-center gap-1.5">
        <i class="fa-solid fa-clock-rotate-left text-amber-600 dark:text-amber-400"></i>
        <span>Partial Payment • Remaining: ${formatINR(rem)} ⏳</span>
      </div>
      <p class="text-[11px] opacity-80">The unpaid balance of <strong>${formatINR(rem)}</strong> will automatically carry forward to next week's settlement.</p>
    `;
  } else if (val > totalDue) {
    const extra = val - totalDue;
    box.className = "p-3 rounded-2xl border text-xs space-y-1 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/40 text-teal-800 dark:text-teal-300";
    box.innerHTML = `
      <div class="font-extrabold flex items-center gap-1.5">
        <i class="fa-solid fa-hand-holding-dollar text-teal-600 dark:text-teal-400"></i>
        <span>Advance Payment (+${formatINR(extra)})</span>
      </div>
      <p class="text-[11px] opacity-80">Paid amount exceeds current entitlement. Extra credit will adjust next week.</p>
    `;
  } else {
    box.className = "p-3 rounded-2xl border text-xs space-y-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400";
    box.innerHTML = `<span>Enter the amount sent to ${state.activePayout.partner}</span>`;
  }
}

export async function handleRecordPaymentSubmit() {
  if (!state.activePayout) return;
  const p = state.activePayout;
  const paidInput = document.getElementById('rpmPaidAmount');
  const paidVal = Number(paidInput?.value);

  if (isNaN(paidVal) || paidVal < 0) {
    alert("Please enter a valid payment amount.");
    return;
  }

  const methodSelect = document.getElementById('rpmPaymentMethod');
  const method = methodSelect?.value || 'GPay / UPI';
  const refInput = document.getElementById('rpmReference');
  const notes = (refInput?.value || '').trim();
  const btn = document.getElementById('btnSavePayment');
  
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  }

  try {
    const weekId = p.weekId;
    const currentDoc = state.settlements[weekId] || {};
    const existingTransfers = currentDoc.transfers || {};

    const remDue = Math.max(0, p.totalDue - paidVal);
    const transferStatus = remDue === 0 ? 'paid' : (paidVal > 0 ? 'partial' : 'pending');

    const updatedTransfer = {
      dueAmount: p.totalDue,
      paidAmount: paidVal,
      remainingDue: remDue,
      status: transferStatus,
      paidAt: Date.now(),
      paidBy: state.currentUser ? (PARTNER_EMAILS[state.currentUser.email] || state.currentUser.email) : 'Balaji',
      paymentMethod: method,
      notes: notes
    };

    const newTransfers = { ...existingTransfers, [p.partner]: updatedTransfer };

    const nagoorRem = newTransfers.Nagoor ? (Number(newTransfers.Nagoor.remainingDue) || 0) : (p.partner === 'Nagoor' ? remDue : 0);
    const jpRem = newTransfers.JP ? (Number(newTransfers.JP.remainingDue) || 0) : (p.partner === 'JP' ? remDue : 0);
    
    let overallStatus = 'pending';
    if (nagoorRem === 0 && jpRem === 0) {
      overallStatus = 'settled';
    }

    const range = getWeekRange(state.settlementOffsetWeeks || 0);
    const monStr = range.startStr;
    const sunStr = range.endStr;

    const totalSalesEl = document.getElementById('settleTotalSales');
    const totalExpEl = document.getElementById('settleTotalExpenses');
    const netProfitEl = document.getElementById('settleNetProfit');

    const payload = {
      weekStart: currentDoc.weekStart || monStr,
      weekEnd: currentDoc.weekEnd || sunStr,
      totalSales: Number(currentDoc.totalSales || totalSalesEl?.innerText.replace(/[^0-9]/g, '')) || 0,
      totalExpenses: Number(currentDoc.totalExpenses || totalExpEl?.innerText.replace(/[^0-9]/g, '')) || 0,
      netProfit: Number(currentDoc.netProfit || netProfitEl?.innerText.replace(/[^0-9-]/g, '')) || 0,
      status: overallStatus,
      transfers: newTransfers,
      settledAt: Date.now(),
      settledBy: state.currentUser ? state.currentUser.email : 'partner',
      updatedAt: Date.now()
    };

    await setDoc(doc(db, "settlements", weekId), payload, { merge: true });

    // Auto-create a Transfer Transaction in ledger if paidVal > 0
    if (paidVal > 0) {
      const sender = state.currentUser ? (PARTNER_EMAILS[state.currentUser.email] || 'Balaji') : 'Balaji';
      const transferTx = {
        type: 'transfer',
        partner: sender,
        toPartner: p.partner,
        category: 'settlement_payout',
        amount: paidVal,
        date: getTodayString(),
        paymentMethod: method,
        description: notes ? `Settlement Payout: ${notes}` : `Weekly Settlement Payout (${monStr} - ${sunStr})`,
        weekId: weekId,
        createdAt: Date.now(),
        createdBy: state.currentUser ? state.currentUser.email : '',
        createdByPartner: sender
      };
      try {
        await addDoc(collection(db, "transactions"), transferTx);
      } catch (txErr) {
        console.warn("Transfer transaction auto-log warning:", txErr);
      }
    }

    if (!state.settlements[weekId]) state.settlements[weekId] = {};
    state.settlements[weekId] = { ...state.settlements[weekId], ...payload };

    closeRecordPaymentModal();
    if (typeof window.updateUI === 'function') window.updateUI();
    showToast(`Payment of ${formatINR(paidVal)} to ${p.partner} saved! ✅`);
  } catch (err) {
    alert("Payment Save Error: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Save Payment</span>';
    }
  }
}

export function renderAccounts() {
  if (state.settlementSubTab === 'alltime') {
    renderAllTimeLedger();
  }

  const weekSummary = getWeekFinancialSummary(state.settlementOffsetWeeks || 0);
  const { 
    monday, sunday, weekId, sales: weeklySales, expenses: weeklyExp, 
    partnerExp: weeklyPartnerExp, netProfit, isProfit, equalShare, lossShare 
  } = weekSummary;

  // Update Header Text
  const weekLabelEl = document.getElementById('settleWeekLabel');
  if (weekLabelEl) {
    weekLabelEl.innerText = (state.settlementOffsetWeeks || 0) === 0 ? "This Week" : `${state.settlementOffsetWeeks} Weeks Ago`;
  }
  const weekRangeEl = document.getElementById('settleWeekRangeText');
  if (weekRangeEl) {
    weekRangeEl.innerText = `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  // Check Previous Week Carry-Forward Pending Dues (LIVE DYNAMIC CALCULATION)
  const prevNagoorRemaining = getPartnerPreviousPendingDue('Nagoor', state.settlementOffsetWeeks || 0);
  const prevJpRemaining = getPartnerPreviousPendingDue('JP', state.settlementOffsetWeeks || 0);

  // 1. Weekly Overview Card
  const titleEl = document.getElementById('settleStatusTitle');
  const netProfitEl = document.getElementById('settleNetProfit');
  if (isProfit) {
    if (titleEl) {
      titleEl.innerText = "Net Profit";
      titleEl.className = "text-[10px] uppercase tracking-wider font-extrabold text-emerald-500";
    }
    if (netProfitEl) {
      netProfitEl.className = "text-3xl font-black text-emerald-600 dark:text-emerald-400";
      netProfitEl.innerText = `+${formatINR(netProfit)}`;
    }
  } else {
    if (titleEl) {
      titleEl.innerText = "Net Loss";
      titleEl.className = "text-[10px] uppercase tracking-wider font-extrabold text-rose-500";
    }
    if (netProfitEl) {
      netProfitEl.className = "text-3xl font-black text-rose-600 dark:text-rose-400";
      netProfitEl.innerText = `-${formatINR(Math.abs(netProfit))}`;
    }
  }

  const totalSalesEl = document.getElementById('settleTotalSales');
  const totalExpEl = document.getElementById('settleTotalExpenses');
  if (totalSalesEl) totalSalesEl.innerText = formatINR(weeklySales);
  if (totalExpEl) totalExpEl.innerText = formatINR(weeklyExp);

  // 2. Step 1: Reimbursements List
  const reimbList = document.getElementById('settleReimbursementList');
  if (reimbList) {
    reimbList.innerHTML = `
      <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
        <div class="flex items-center gap-1.5">
          ${renderPartnerAvatar('Nagoor', 'w-5 h-5', 'rounded-md')}
          <span class="font-medium text-slate-800 dark:text-slate-200">Nagoor (Fish Purchase):</span>
        </div>
        <strong class="text-rose-600 dark:text-rose-400 font-bold">${formatINR(weeklyPartnerExp.Nagoor)}</strong>
      </div>
      <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
        <div class="flex items-center gap-1.5">
          ${renderPartnerAvatar('Balaji', 'w-5 h-5', 'rounded-md')}
          <span class="font-medium text-slate-800 dark:text-slate-200">Balaji (Cleaning, Ice, Covers, Ads):</span>
        </div>
        <strong class="text-rose-600 dark:text-rose-400 font-bold">${formatINR(weeklyPartnerExp.Balaji)}</strong>
      </div>
      <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
        <div class="flex items-center gap-1.5">
          ${renderPartnerAvatar('JP', 'w-5 h-5', 'rounded-md')}
          <span class="font-medium text-slate-800 dark:text-slate-200">JP (Petrol & Delivery):</span>
        </div>
        <strong class="text-rose-600 dark:text-rose-400 font-bold">${formatINR(weeklyPartnerExp.JP)}</strong>
      </div>
    `;
  }

  // 3. Step 2: Equal Partner Split (1/3)
  const eachShareEl = document.getElementById('settleEachPartnerShare');
  if (eachShareEl) {
    eachShareEl.innerText = isProfit ? `Each: +${formatINR(equalShare)}` : `Each Loss: -${formatINR(lossShare)}`;
  }
  const splitGrid = document.getElementById('settleProfitSplitGrid');
  const shareColor = isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  const shareText = isProfit ? `+${formatINR(equalShare)}` : `-${formatINR(lossShare)}`;

  if (splitGrid) {
    splitGrid.innerHTML = `
      <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
        <div class="flex justify-center">${renderPartnerAvatar('Balaji', 'w-7 h-7', 'rounded-lg')}</div>
        <div class="text-[10px] text-slate-400 mt-0.5 font-bold">Balaji</div>
        <div class="text-xs font-bold ${shareColor}">${shareText}</div>
      </div>
      <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
        <div class="flex justify-center">${renderPartnerAvatar('Nagoor', 'w-7 h-7', 'rounded-lg')}</div>
        <div class="text-[10px] text-slate-400 mt-0.5 font-bold">Nagoor</div>
        <div class="text-xs font-bold ${shareColor}">${shareText}</div>
      </div>
      <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
        <div class="flex justify-center">${renderPartnerAvatar('JP', 'w-7 h-7', 'rounded-lg')}</div>
        <div class="text-[10px] text-slate-400 mt-0.5 font-bold">JP</div>
        <div class="text-xs font-bold ${shareColor}">${shareText}</div>
      </div>
    `;
  }

  // 4. Step 3: Transfers (Who Pays Whom)
  const transfersContainer = document.getElementById('settleTransfersContainer');

  if (weeklySales === 0 && weeklyExp === 0 && prevNagoorRemaining === 0 && prevJpRemaining === 0) {
    if (transfersContainer) {
      transfersContainer.innerHTML = `
        <div class="text-center py-3 text-xs text-slate-400 font-medium">
          No transactions recorded for this week.
        </div>
      `;
    }
    return;
  }

  const currentSettlement = state.settlements[weekId];
  const transfersData = currentSettlement?.transfers || {};

  function renderTransferCard(partner, baseDue, carriedDue, reasonText, roleLabel, baseExp, shareAmt) {
    const totalDue = Math.max(0, baseDue + carriedDue);
    const record = transfersData[partner];
    const paidAmount = record ? (Number(record.paidAmount) || 0) : 0;
    const remainingDue = Math.max(0, totalDue - paidAmount);

    let status = 'pending';
    if (totalDue === 0 || (remainingDue === 0 && paidAmount > 0)) {
      status = 'paid';
    } else if (paidAmount > 0 && remainingDue > 0) {
      status = 'partial';
    }

    let cardBorderClass = 'border-teal-200 dark:border-teal-500/30';
    let statusBannerBg = 'bg-slate-50 dark:bg-slate-800/80';
    let statusBannerBorder = 'border-slate-200 dark:border-slate-700/60';
    let statusTextClass = 'text-slate-600 dark:text-slate-400';
    let statusBadgeText = 'Unpaid ⏳';
    let statusIcon = '<i class="fa-solid fa-hourglass-half text-[11px] text-slate-400"></i>';
    let paymentDetailsText = 'Payment pending';
    let statusDetailsClass = 'text-slate-400';
    let payBtnLabel = 'Record Payment 💳';
    let payBtnClass = 'bg-teal-600 hover:bg-teal-500 text-white';
    let payBtnIcon = 'fa-solid fa-money-bill-transfer';

    if (status === 'paid') {
      cardBorderClass = 'border-emerald-200 dark:border-emerald-800/40';
      statusBannerBg = 'bg-emerald-50 dark:bg-emerald-950/40';
      statusBannerBorder = 'border-emerald-200 dark:border-emerald-800/50';
      statusTextClass = 'text-emerald-700 dark:text-emerald-300';
      statusBadgeText = 'Paid in Full ✅';
      statusIcon = '<i class="fa-solid fa-circle-check text-xs text-emerald-500"></i>';
      payBtnLabel = 'Edit Receipt 📝';
      payBtnClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
      payBtnIcon = 'fa-solid fa-receipt';
      if (record && record.paidAt) {
        paymentDetailsText = `${record.paymentMethod || 'GPay'} (${formatINR(paidAmount)}) paid`;
        statusDetailsClass = 'text-emerald-600 dark:text-emerald-400';
      }
    } else if (status === 'partial') {
      cardBorderClass = 'border-amber-200 dark:border-amber-700/50';
      statusBannerBg = 'bg-amber-50 dark:bg-amber-950/40';
      statusBannerBorder = 'border-amber-200 dark:border-amber-800/50';
      statusTextClass = 'text-amber-700 dark:text-amber-300';
      statusBadgeText = `Paid ${formatINR(paidAmount)} • Due ${formatINR(remainingDue)} 🟡`;
      statusIcon = '<i class="fa-solid fa-triangle-exclamation text-xs text-amber-500"></i>';
      payBtnLabel = `Pay Balance (${formatINR(remainingDue)}) 💳`;
      payBtnClass = 'bg-teal-600 hover:bg-teal-500 text-white';
      payBtnIcon = 'fa-solid fa-money-bill-transfer';
      if (record && record.paidAt) {
        paymentDetailsText = `${record.paymentMethod || 'GPay'} paid (${formatINR(paidAmount)})`;
        statusDetailsClass = 'text-amber-600 dark:text-amber-400';
      }
    }

    const carryForwardHtml = carriedDue > 0
      ? `<div class="flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold">
           <span class="flex items-center gap-1"><i class="fa-solid fa-arrow-turn-down text-[9px]"></i> Previous Week Pending Due:</span>
           <span>+${formatINR(carriedDue)}</span>
         </div>`
      : '';

    const escapedReason = (reasonText || '').replace(/'/g, "\\'");
    const roleExpenseLabel = partner === 'Nagoor' ? 'Fish Expense Reimbursement' : 'Petrol & Delivery Reimbursement';

    return `
      <div class="p-4 rounded-3xl bg-white dark:bg-slate-900 border ${cardBorderClass} shadow-md space-y-3">
        
        <!-- Top Row: Transfer Route & Total Due -->
        <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              ${renderPartnerAvatar('Balaji', 'w-5 h-5', 'rounded-lg')}
              <span class="text-xs font-black text-slate-900 dark:text-white">Balaji</span>
            </div>
            <i class="fa-solid fa-arrow-right text-xs text-teal-500"></i>
            <div class="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              ${renderPartnerAvatar(partner, 'w-5 h-5', 'rounded-lg')}
              <span class="text-xs font-black text-slate-900 dark:text-white">${partner}</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block whitespace-nowrap">Total Due</span>
            <span class="text-base font-black text-teal-600 dark:text-teal-400 block whitespace-nowrap">${formatINR(totalDue)}</span>
          </div>
        </div>

        <!-- Middle Row: Status Banner & Payment Info -->
        <div class="p-2.5 rounded-2xl ${statusBannerBg} border ${statusBannerBorder} flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 font-extrabold ${statusTextClass} whitespace-nowrap">
            ${statusIcon}
            <span class="whitespace-nowrap">${statusBadgeText}</span>
          </div>
          <div class="text-[10px] font-bold ${statusDetailsClass} whitespace-nowrap">
            ${paymentDetailsText}
          </div>
        </div>

        <!-- Structured Math Breakdown Inset Box -->
        <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 space-y-1.5 text-xs">
          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>${roleExpenseLabel}:</span>
            <strong class="font-bold text-slate-900 dark:text-white">${formatINR(baseExp)}</strong>
          </div>
          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span class="flex items-center gap-1">
              <span>Equal 1/3 Profit Share</span>
              <span class="text-[9px] text-teal-600 dark:text-teal-400 font-semibold">(Shop: ${formatINR(netProfit)} ÷ 3)</span>
            </span>
            <strong class="font-bold text-teal-600 dark:text-teal-400">+${formatINR(shareAmt)}</strong>
          </div>
          ${carryForwardHtml}
          <div class="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between font-black text-slate-900 dark:text-white">
            <span>Total Payable Amount:</span>
            <span class="text-teal-600 dark:text-teal-400 text-sm font-black">${formatINR(totalDue)}</span>
          </div>
        </div>

        <!-- Bottom Row: Record Payment & View Invoice / Bill -->
        <div class="grid grid-cols-2 gap-2 pt-0.5">
          <button type="button" onclick="openRecordPaymentModal('${partner}', ${totalDue}, ${paidAmount}, ${remainingDue}, ${carriedDue}, '${weekId}', '${escapedReason}')" class="w-full py-2.5 px-3 rounded-xl ${payBtnClass} text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm">
            <i class="${payBtnIcon}"></i>
            <span>${payBtnLabel}</span>
          </button>
          <button type="button" onclick="openPartnerInvoiceModal('${partner}', '${weekId}')" class="w-full py-2.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-extrabold border border-teal-200 dark:border-teal-700/60 flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm" title="View Settlement Invoice / Bill">
            <i class="fa-solid fa-receipt text-xs"></i>
            <span>View Bill 🧾</span>
          </button>
        </div>

      </div>
    `;
  }

  let nagoorHtml = '';
  let jpHtml = '';
  let balajiHtml = '';

  if (isProfit) {
    const baseNagoor = weeklyPartnerExp.Nagoor + equalShare;
    const nagoorReason = `Fish refund ${formatINR(weeklyPartnerExp.Nagoor)} + Profit share ${formatINR(equalShare)}`;
    nagoorHtml = renderTransferCard('Nagoor', baseNagoor, prevNagoorRemaining, nagoorReason, 'Fish Purchase', weeklyPartnerExp.Nagoor, equalShare);

    const baseJp = weeklyPartnerExp.JP + equalShare;
    const jpReason = `Petrol refund ${formatINR(weeklyPartnerExp.JP)} + Profit share ${formatINR(equalShare)}`;
    jpHtml = renderTransferCard('JP', baseJp, prevJpRemaining, jpReason, 'Delivery & Petrol', weeklyPartnerExp.JP, equalShare);

    const balajiTotal = weeklyPartnerExp.Balaji + equalShare;
    balajiHtml = `
      <div class="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-500/30 flex items-center justify-between text-xs shadow-sm">
        <div class="flex items-center gap-2.5">
          ${renderPartnerAvatar('Balaji', 'w-8 h-8', 'rounded-xl')}
          <div>
            <span class="font-bold text-teal-950 dark:text-teal-200">Balaji Net Retained Cash</span>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Spends ${formatINR(weeklyPartnerExp.Balaji)} + Profit share ${formatINR(equalShare)}</div>
          </div>
        </div>
        <span class="font-black text-teal-600 dark:text-teal-400 text-sm">${formatINR(balajiTotal)}</span>
      </div>
    `;
  } else {
    const netNagoor = weeklyPartnerExp.Nagoor - lossShare;
    const netJp = weeklyPartnerExp.JP - lossShare;

    if (netNagoor >= 0) {
      const reason = `Fish refund ${formatINR(weeklyPartnerExp.Nagoor)} - Loss share ${formatINR(lossShare)}`;
      nagoorHtml = renderTransferCard('Nagoor', netNagoor, prevNagoorRemaining, reason, 'Fish Purchase', weeklyPartnerExp.Nagoor, -lossShare);
    } else {
      const owes = Math.abs(netNagoor);
      nagoorHtml = `
        <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-sm space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-rose-600 dark:text-rose-400">Nagoor Pays Balaji</span>
            <span class="text-sm font-black text-rose-600 dark:text-rose-400">${formatINR(owes)}</span>
          </div>
          <p class="text-[10px] text-slate-500">Loss share ${formatINR(lossShare)} exceeds fish expenses ${formatINR(weeklyPartnerExp.Nagoor)}</p>
        </div>
      `;
    }

    if (netJp >= 0) {
      const reason = `Petrol refund ${formatINR(weeklyPartnerExp.JP)} - Loss share ${formatINR(lossShare)}`;
      jpHtml = renderTransferCard('JP', netJp, prevJpRemaining, reason, 'Delivery & Petrol', weeklyPartnerExp.JP, -lossShare);
    } else {
      const owes = Math.abs(netJp);
      jpHtml = `
        <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-sm space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-rose-600 dark:text-rose-400">JP Pays Balaji</span>
            <span class="text-sm font-black text-rose-600 dark:text-rose-400">${formatINR(owes)}</span>
          </div>
          <p class="text-[10px] text-slate-500">Loss share ${formatINR(lossShare)} exceeds delivery expenses ${formatINR(weeklyPartnerExp.JP)}</p>
        </div>
      `;
    }

    balajiHtml = `
      <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between text-xs">
        <div class="flex items-center gap-2.5">
          ${renderPartnerAvatar('Balaji', 'w-8 h-8', 'rounded-xl')}
          <div>
            <span class="font-bold text-slate-900 dark:text-white">Balaji Loss Share</span>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Spends: ${formatINR(weeklyPartnerExp.Balaji)} | Loss: ${formatINR(lossShare)}</div>
          </div>
        </div>
        <span class="font-black text-rose-600 dark:text-rose-400 text-sm">-${formatINR(lossShare)}</span>
      </div>
    `;
  }

  if (transfersContainer) {
    transfersContainer.innerHTML = nagoorHtml + jpHtml + balajiHtml;
  }

  // Update Top Status Badge
  const statusBadge = document.getElementById('settleStatusBadge');
  const btnToggle = document.getElementById('btnToggleSettleText');
  const isDocSettled = currentSettlement && currentSettlement.status === 'settled';

  const nagoorTransfer = transfersData.Nagoor;
  const jpTransfer = transfersData.JP;
  const hasAnyPayment = (nagoorTransfer && nagoorTransfer.paidAmount > 0) || (jpTransfer && jpTransfer.paidAmount > 0);
  const isAllTransfersPaid = (nagoorTransfer && nagoorTransfer.status === 'paid') && (jpTransfer && jpTransfer.status === 'paid');

  if (isDocSettled || isAllTransfersPaid) {
    if (statusBadge) {
      statusBadge.innerText = "Settled ✅";
      statusBadge.className = "text-[9px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300";
    }
    if (btnToggle) btnToggle.innerText = "Reopen Settlement";
  } else if (hasAnyPayment) {
    if (statusBadge) {
      statusBadge.innerText = "Partially Paid 🟡";
      statusBadge.className = "text-[9px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300";
    }
    if (btnToggle) btnToggle.innerText = "Mark Week as Settled";
  } else {
    if (statusBadge) {
      statusBadge.innerText = "Pending ⏳";
      statusBadge.className = "text-[9px] px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
    }
    if (btnToggle) btnToggle.innerText = "Mark Week as Settled";
  }
}

// All-Time Master Ledger Calculation & Rendering
export function renderAllTimeLedger() {
  let allTimeSales = 0;
  let allTimeExpenses = 0;
  const pExp = { Balaji: 0, Nagoor: 0, JP: 0 };
  const pSales = { Balaji: 0, Nagoor: 0, JP: 0 };

  (state.transactions || []).forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'sales') {
      allTimeSales += amt;
      if (pSales[tx.partner] !== undefined) pSales[tx.partner] += amt;
    } else if (tx.type === 'expense') {
      allTimeExpenses += amt;
      if (pExp[tx.partner] !== undefined) pExp[tx.partner] += amt;
    }
  });

  const allTimeProfit = allTimeSales - allTimeExpenses;
  const eachShare = Math.round(allTimeProfit / 3);

  const salesEl = document.getElementById('allTimeSales');
  const expEl = document.getElementById('allTimeExpenses');
  const profitEl = document.getElementById('allTimeProfit');
  const eachShareEl = document.getElementById('allTimeEachShare');

  if (salesEl) salesEl.innerText = formatINR(allTimeSales);
  if (expEl) expEl.innerText = formatINR(allTimeExpenses);
  if (profitEl) {
    profitEl.innerText = `${allTimeProfit >= 0 ? '+' : '-'}${formatINR(Math.abs(allTimeProfit))}`;
    profitEl.className = `text-sm font-black ${allTimeProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
  }
  if (eachShareEl) {
    eachShareEl.innerText = `${eachShare >= 0 ? '+' : '-'}${formatINR(Math.abs(eachShare))}`;
  }

  let totalPaidToNagoor = 0;
  let totalPaidToJp = 0;

  Object.values(state.settlements || {}).forEach(s => {
    if (s.transfers) {
      if (s.transfers.Nagoor && s.transfers.Nagoor.paidAmount) {
        totalPaidToNagoor += Number(s.transfers.Nagoor.paidAmount) || 0;
      }
      if (s.transfers.JP && s.transfers.JP.paidAmount) {
        totalPaidToJp += Number(s.transfers.JP.paidAmount) || 0;
      }
    }
  });

  const nagoorEntitled = pExp.Nagoor + eachShare;
  const nagoorOutstanding = Math.max(0, nagoorEntitled - totalPaidToNagoor);

  const jpEntitled = pExp.JP + eachShare;
  const jpOutstanding = Math.max(0, jpEntitled - totalPaidToJp);

  const balajiRetained = allTimeSales - pExp.Balaji - totalPaidToNagoor - totalPaidToJp;

  const cardsContainer = document.getElementById('allTimePartnerCardsList');
  if (cardsContainer) {
    cardsContainer.innerHTML = `
      <!-- Nagoor Card -->
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            ${renderPartnerAvatar('Nagoor', 'w-8 h-8', 'rounded-xl')}
            <div>
              <div class="text-xs font-black text-slate-900 dark:text-white">Nagoor</div>
              <div class="text-[10px] text-slate-500">Fish Purchase Lead</div>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">Net Outstanding</span>
            <span class="text-xs font-black ${nagoorOutstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}">
              ${nagoorOutstanding > 0 ? formatINR(nagoorOutstanding) + ' Due' : 'Fully Settled ✅'}
            </span>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-center">
          <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span class="text-[9px] text-slate-400 block">Total Purchases</span>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200">${formatINR(pExp.Nagoor)}</span>
          </div>
          <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span class="text-[9px] text-slate-400 block">Profit Share</span>
            <span class="text-xs font-bold text-teal-600 dark:text-teal-400">+${formatINR(eachShare)}</span>
          </div>
          <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span class="text-[9px] text-slate-400 block">Total Received</span>
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">${formatINR(totalPaidToNagoor)}</span>
          </div>
        </div>
      </div>

      <!-- JP Card -->
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            ${renderPartnerAvatar('JP', 'w-8 h-8', 'rounded-xl')}
            <div>
              <div class="text-xs font-black text-slate-900 dark:text-white">JP</div>
              <div class="text-[10px] text-slate-500">Delivery & Operations Lead</div>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">Net Outstanding</span>
            <span class="text-xs font-black ${jpOutstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}">
              ${jpOutstanding > 0 ? formatINR(jpOutstanding) + ' Due' : 'Fully Settled ✅'}
            </span>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-center">
          <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span class="text-[9px] text-slate-400 block">Total Petrol/Exp</span>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200">${formatINR(pExp.JP)}</span>
          </div>
          <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span class="text-[9px] text-slate-400 block">Profit Share</span>
            <span class="text-xs font-bold text-teal-600 dark:text-teal-400">+${formatINR(eachShare)}</span>
          </div>
          <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span class="text-[9px] text-slate-400 block">Total Received</span>
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">${formatINR(totalPaidToJp)}</span>
          </div>
        </div>
      </div>

      <!-- Balaji Card -->
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            ${renderPartnerAvatar('Balaji', 'w-8 h-8', 'rounded-xl')}
            <div>
              <div class="text-xs font-black text-slate-900 dark:text-white">Balaji</div>
              <div class="text-[10px] text-slate-500">Income Collection & Tech Lead</div>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">Cash in Hand/Bank</span>
            <span class="text-xs font-black text-teal-600 dark:text-teal-400">${formatINR(balajiRetained)}</span>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-center">
          <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span class="text-[9px] text-slate-400 block">Total Spends</span>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200">${formatINR(pExp.Balaji)}</span>
          </div>
          <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span class="text-[9px] text-slate-400 block">Total Sales</span>
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">${formatINR(allTimeSales)}</span>
          </div>
          <div class="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span class="text-[9px] text-slate-400 block">Payouts to Partners</span>
            <span class="text-xs font-bold text-amber-600 dark:text-amber-400">${formatINR(totalPaidToNagoor + totalPaidToJp)}</span>
          </div>
        </div>
      </div>
    `;
  }
}

// Copy Weekly Report for WhatsApp
export function copyWeeklyReportWhatsApp() {
  const range = getWeekRange(state.settlementOffsetWeeks || 0);
  const { monday, sunday, startStr: monStr, endStr: sunStr } = range;
  const mStr = `${monday.getDate()}/${monday.getMonth()+1}`;
  const sStr = `${sunday.getDate()}/${sunday.getMonth()+1}/${sunday.getFullYear()}`;

  let sales = 0, exp = 0;
  const pExp = { Balaji: 0, Nagoor: 0, JP: 0 };

  (state.transactions || []).forEach(tx => {
    if (tx.date >= monStr && tx.date <= sunStr) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'sales') sales += amt;
      else if (tx.type === 'expense') {
        exp += amt;
        if (pExp[tx.partner] !== undefined) pExp[tx.partner] += amt;
      }
    }
  });

  const profit = sales - exp;
  const isProfit = profit >= 0;
  const split = Math.round(profit / 3);
  const lossShare = Math.abs(split);

  let transferSection = '';
  if (isProfit) {
    transferSection = `🚀 Balaji Anupa Vendiyadhu:
  ➔ Nagoor: ${formatINR(pExp.Nagoor + split)}
  ➔ JP: ${formatINR(pExp.JP + split)}
  ➔ Balaji Kaila Meedham: ${formatINR(pExp.Balaji + split)}`;
  } else {
    const netNagoor = pExp.Nagoor - lossShare;
    const netJp = pExp.JP - lossShare;
    transferSection = `🚀 Settlement Transfers (Loss):
  ➔ Nagoor: ${netNagoor >= 0 ? 'Balaji thara vendiyadhu ' + formatINR(netNagoor) : 'Nagoor thara vendiyadhu ' + formatINR(Math.abs(netNagoor))}
  ➔ JP: ${netJp >= 0 ? 'Balaji thara vendiyadhu ' + formatINR(netJp) : 'JP thara vendiyadhu ' + formatINR(Math.abs(netJp))}
  ➔ Balaji Loss: -${formatINR(lossShare)}`;
  }

  const msg = `*MeenMart Hub - Weekly Settlement Statement* 🐟
📅 Week: ${mStr} - ${sStr}
-----------------------
📈 Total Income: ${formatINR(sales)}
💸 Total Expenses: ${formatINR(exp)}
💎 ${isProfit ? 'Net Profit' : 'Net Loss'}: ${formatINR(Math.abs(profit))}
-----------------------
🤝 Equal 1/3 Share: ${isProfit ? '+' : '-'}${formatINR(Math.abs(split))}
-----------------------
🔄 Expense Reimbursements:
  🦐 Nagoor: ${formatINR(pExp.Nagoor)}
  👨‍💻 Balaji: ${formatINR(pExp.Balaji)}
  🛵 JP: ${formatINR(pExp.JP)}
-----------------------
${transferSection}
-----------------------
✅ MeenMart Hub`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(msg).then(() => showToast("WhatsApp Report Copy Aagiduchi! 📋"));
  }
}

// Expose handlers on window for HTML onclick
if (typeof window !== 'undefined') {
  window.changeSettlementWeek = changeSettlementWeek;
  window.switchSettlementSubTab = switchSettlementSubTab;
  window.openRecordPaymentModal = openRecordPaymentModal;
  window.closeRecordPaymentModal = closeRecordPaymentModal;
  window.setPaymentInputAmount = setPaymentInputAmount;
  window.updatePaymentLivePreview = updatePaymentLivePreview;
  window.handleRecordPaymentSubmit = handleRecordPaymentSubmit;
  window.renderAccounts = renderAccounts;
  window.renderAllTimeLedger = renderAllTimeLedger;
  window.copyWeeklyReportWhatsApp = copyWeeklyReportWhatsApp;
}

