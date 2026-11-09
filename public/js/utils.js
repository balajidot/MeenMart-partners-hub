// ==========================================
// 🛠️ MEENMART PARTNERS HUB - UTILITY FUNCTIONS
// ==========================================

import { PARTNERS, DEFAULT_CATEGORIES } from './config.js';
import { state } from './state.js';

// Currency Formatter (Safe negative number formatting)
export function formatINR(val) {
  const num = Number(val) || 0;
  if (num < 0) {
    return "-₹" + Math.abs(num).toLocaleString('en-IN');
  }
  return "₹" + num.toLocaleString('en-IN');
}

// Date Helper Utilities (100% Local Timezone Safe - No UTC Date Shifts!)
export function formatLocalDate(dateObj) {
  if (!dateObj) return '';
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayString() {
  return formatLocalDate(new Date());
}

export function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

export function getThisWeekStart() {
  const range = getWeekRange(0);
  return range.startStr;
}

export function getThisMonthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

// Returns local Monday-Sunday week bounds given offset
export function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (offsetWeeks * 7));
  const day = d.getDay();
  // Monday diff: in JS 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMon = d.getDate() - (day === 0 ? 6 : day - 1);

  const mon = new Date(d.getFullYear(), d.getMonth(), diffToMon, 0, 0, 0, 0);
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6, 23, 59, 59, 999);

  const startStr = formatLocalDate(mon);
  const endStr = formatLocalDate(sun);
  const weekId = `week_${startStr}_${endStr}`;

  return { monday: mon, sunday: sun, startStr, endStr, weekId };
}

// Dynamic Financial Summary for Any Week (Always reflects live edited transactions!)
export function getWeekFinancialSummary(offsetWeeks = 0) {
  const range = getWeekRange(offsetWeeks);
  const { startStr, endStr, weekId } = range;

  let sales = 0;
  let expenses = 0;
  let capital = 0;
  const partnerExp = { Balaji: 0, Nagoor: 0, JP: 0 };
  const partnerSales = { Balaji: 0, Nagoor: 0, JP: 0 };

  (state.transactions || []).forEach(tx => {
    if (tx.date >= startStr && tx.date <= endStr) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'sales') {
        sales += amt;
        if (partnerSales[tx.partner] !== undefined) partnerSales[tx.partner] += amt;
      } else if (tx.type === 'expense') {
        expenses += amt;
        if (partnerExp[tx.partner] !== undefined) partnerExp[tx.partner] += amt;
      } else if (tx.type === 'investment') {
        capital += amt;
      }
    }
  });

  const netProfit = sales - expenses;
  const isProfit = netProfit >= 0;
  const equalShare = Math.round(netProfit / 3);
  const lossShare = Math.abs(equalShare);

  const settlementDoc = state.settlements?.[weekId] || {};
  const transfersData = settlementDoc.transfers || {};

  const baseDue = {
    Nagoor: partnerExp.Nagoor + (isProfit ? equalShare : -lossShare),
    JP: partnerExp.JP + (isProfit ? equalShare : -lossShare),
    Balaji: partnerExp.Balaji + (isProfit ? equalShare : -lossShare)
  };

  return {
    ...range,
    sales,
    expenses,
    capital,
    partnerExp,
    partnerSales,
    netProfit,
    isProfit,
    equalShare,
    lossShare,
    baseDue,
    transfersData,
    settlementDoc
  };
}

// Dynamic Carry-Forward Calculator: Chains prior unpaid balances dynamically from live transactions & payments!
export function getPartnerPreviousPendingDue(partner, currentOffsetWeeks) {
  const prevSummary = getWeekFinancialSummary(currentOffsetWeeks + 1);
  const prevBase = prevSummary.baseDue[partner] || 0;

  // Recursive carry-forward for prior weeks if any (up to 12 weeks back)
  let prevPriorCarried = 0;
  if (currentOffsetWeeks + 1 < 12) {
    prevPriorCarried = getPartnerPreviousPendingDue(partner, currentOffsetWeeks + 1);
  }

  const prevTotalDue = Math.max(0, prevBase + prevPriorCarried);
  const prevRecord = prevSummary.transfersData[partner];
  const prevPaid = prevRecord ? (Number(prevRecord.paidAmount) || 0) : 0;
  const prevRemaining = Math.max(0, prevTotalDue - prevPaid);

  return prevRemaining;
}

// HTML Entity sanitizer
export function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Category Label Resolver
export function getCategoryLabel(type, catId) {
  const list = (state.categories && state.categories[type]) || DEFAULT_CATEGORIES[type] || [];
  const found = list.find(c => c.id === catId);
  return found ? found.label.split('(')[0].trim() : (catId || 'Entry');
}

// Ownership Verification (JP edits only JP, etc.)
export function canUserModify(tx) {
  if (!state.currentPartner) return false;
  if (tx.createdByPartner && tx.createdByPartner === state.currentPartner) return true;
  if (tx.createdBy && state.currentUser && tx.createdBy === state.currentUser.email) return true;
  if (!tx.createdByPartner && !tx.createdBy && tx.partner === state.currentPartner) return true;
  return false;
}

// Universal Avatar Renderer
export function renderPartnerAvatar(partnerName, sizeClass = 'w-9 h-9', roundedClass = 'rounded-xl') {
  const p = PARTNERS[partnerName] || { name: partnerName, avatar: '👤', photoUrl: '' };
  if (p.photoUrl && p.photoUrl.trim().length > 0) {
    return `<img src="${p.photoUrl}" alt="${p.name}" class="${sizeClass} ${roundedClass} object-cover border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex-shrink-0 inline-block align-middle" />`;
  }
  let fontSize = 'text-base';
  if (sizeClass.includes('w-4') || sizeClass.includes('h-4')) fontSize = 'text-[10px]';
  else if (sizeClass.includes('w-5') || sizeClass.includes('h-5')) fontSize = 'text-[11px]';
  else if (sizeClass.includes('w-6') || sizeClass.includes('w-7')) fontSize = 'text-xs';
  else if (sizeClass.includes('w-12') || sizeClass.includes('w-14')) fontSize = 'text-2xl';

  return `<div class="${sizeClass} ${roundedClass} bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${fontSize} flex-shrink-0 shadow-xs font-normal leading-none inline-flex align-middle">${p.avatar || '👤'}</div>`;
}

// Real-Time Presence & Last Seen Utilities
export function isPartnerOnline(p) {
  if (!state.presence || !state.presence[p]) return false;
  const item = state.presence[p];
  if (item.online === true && (Date.now() - (item.lastSeen || 0)) < 120000) return true;
  return (Date.now() - (item.lastSeen || 0)) < 65000;
}

export function getPartnerEffectiveLastSeen(p) {
  if (state.presence && state.presence[p] && state.presence[p].lastSeen) {
    return Number(state.presence[p].lastSeen);
  }
  const pTx = (state.transactions || []).filter(t => t.partner === p || t.createdByPartner === p);
  if (pTx.length > 0) {
    pTx.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const latest = pTx[0];
    if (latest.createdAt) return Number(latest.createdAt);
    if (latest.date) {
      const d = new Date(latest.date);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  return null;
}

export function getPartnerShortLastSeen(timestamp) {
  if (!timestamp) return 'Offline';
  const now = Date.now();
  const diffMs = now - timestamp;
  if (diffMs < 65000) return 'Online';

  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return 'Offline';

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const nowDate = new Date();
  if (nowDate.toDateString() === d.toDateString()) {
    return timeStr;
  }
  const yDate = new Date();
  yDate.setDate(nowDate.getDate() - 1);
  if (yDate.toDateString() === d.toDateString()) {
    return `Y'day ${timeStr}`;
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatPartnerLastSeen(timestamp) {
  if (!timestamp) return 'Offline';
  const now = Date.now();
  const diffMs = now - timestamp;
  if (diffMs < 65000) return 'Active Now (Online)';

  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return 'Offline';

  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const nowDate = new Date();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return 'Last seen just now';
  if (mins < 60) return `Last seen ${mins}m ago (${timeStr})`;

  if (nowDate.toDateString() === d.toDateString()) {
    return `Last seen today at ${timeStr}`;
  }
  const yDate = new Date();
  yDate.setDate(nowDate.getDate() - 1);
  if (yDate.toDateString() === d.toDateString()) {
    return `Last seen yesterday at ${timeStr}`;
  }
  return `Last seen on ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${timeStr}`;
}

// Toast Notification
export function showToast(msg, icon = "✅") {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  const msgEl = document.getElementById('toastMessage');
  const iconEl = document.getElementById('toastIcon');
  if (msgEl) msgEl.innerText = msg;
  if (iconEl) iconEl.innerText = icon;
  if (navigator.vibrate) navigator.vibrate(10);
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-[-20px]');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-[-20px]');
    toast.classList.remove('opacity-100', 'translate-y-0');
  }, 2500);
}

// Expose utilities on window for inline HTML onclick handlers
if (typeof window !== 'undefined') {
  window.formatINR = formatINR;
  window.formatLocalDate = formatLocalDate;
  window.getTodayString = getTodayString;
  window.getYesterdayString = getYesterdayString;
  window.getThisWeekStart = getThisWeekStart;
  window.getThisMonthStart = getThisMonthStart;
  window.getWeekRange = getWeekRange;
  window.escapeHtml = escapeHtml;
  window.getCategoryLabel = getCategoryLabel;
  window.canUserModify = canUserModify;
  window.renderPartnerAvatar = renderPartnerAvatar;
  window.isPartnerOnline = isPartnerOnline;
  window.getPartnerEffectiveLastSeen = getPartnerEffectiveLastSeen;
  window.getPartnerShortLastSeen = getPartnerShortLastSeen;
  window.formatPartnerLastSeen = formatPartnerLastSeen;
  window.showToast = showToast;
}
