// ==========================================
// 🔄 MEENMART PARTNERS HUB - REAL-TIME SYNC & BACKFILL ENGINE
// ==========================================

import { 
  db, collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, updateHeaderAvatar, updateLoginAvatars, updatePartnerCardAvatars 
} from './firebase.js';
import { PARTNERS, DEFAULT_CATEGORIES, PARTNER_EMAILS } from './config.js';
import { state } from './state.js';
import { 
  formatLocalDate, getTodayString, formatINR, renderPartnerAvatar, 
  isPartnerOnline, getPartnerEffectiveLastSeen, getPartnerShortLastSeen, formatPartnerLastSeen 
} from './utils.js';

// Real-time Partner Avatars & Photos Sync (settings/partners)
export function initPartnersSync() {
  const partnersDocRef = doc(db, "settings", "partners");
  onSnapshot(partnersDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      ['Balaji', 'Nagoor', 'JP'].forEach(p => {
        if (data[p]) {
          if (data[p].avatar) PARTNERS[p].avatar = data[p].avatar;
          PARTNERS[p].photoUrl = data[p].photoUrl || '';
        }
      });

      updateHeaderAvatar();

      if (typeof window.updateSheetPartnerLockUI === 'function') {
        window.updateSheetPartnerLockUI();
      }

      try {
        localStorage.setItem('meenmart_partners_cache', JSON.stringify({
          Balaji: { avatar: PARTNERS.Balaji.avatar, photoUrl: PARTNERS.Balaji.photoUrl },
          Nagoor: { avatar: PARTNERS.Nagoor.avatar, photoUrl: PARTNERS.Nagoor.photoUrl },
          JP: { avatar: PARTNERS.JP.avatar, photoUrl: PARTNERS.JP.photoUrl }
        }));
      } catch (e) {}

      updateLoginAvatars();
      updatePartnerCardAvatars();

      if (typeof window.updateUI === 'function') {
        window.updateUI();
      }
    }
  }, (err) => {
    console.warn("Partners avatar sync warning:", err);
  });
}

// Real-time Categories Sync with Firestore (settings/categories)
export function initCategoriesSync() {
  const catDocRef = doc(db, "settings", "categories");
  onSnapshot(catDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.expense && data.sales && data.investment) {
        state.categories = {
          expense: data.expense,
          sales: data.sales,
          investment: data.investment,
          transfer: data.transfer || DEFAULT_CATEGORIES.transfer
        };
        if (typeof window.updateCategorySelect === 'function') {
          window.updateCategorySelect();
        }
        const catModal = document.getElementById('categoryManagerModal');
        if (catModal && !catModal.classList.contains('hidden') && typeof window.renderCatManagerList === 'function') {
          window.renderCatManagerList();
        }
      }
    } else {
      setDoc(catDocRef, {
        ...DEFAULT_CATEGORIES,
        updatedAt: Date.now(),
        updatedBy: state.currentUser ? state.currentUser.email : 'system'
      }).catch(console.error);
    }
  }, (err) => {
    console.warn("Categories sync warning:", err);
  });
}

// Real-Time Transactions Sync
export function initLiveSync() {
  const q = query(collection(db, "transactions"), orderBy("date", "desc"));
  onSnapshot(q, (snapshot) => {
    const txs = [];
    snapshot.forEach((docSnap) => {
      txs.push({ id: docSnap.id, ...docSnap.data() });
    });
    state.transactions = txs;
    state.transactionsLoaded = true;
    syncSettlementTransfersToLedger();
    if (typeof window.updateUI === 'function') {
      window.updateUI();
    }
  }, (err) => {
    console.error("Firestore Listen Error:", err);
  });
}

// Real-Time Weekly Settlement Status Sync
export function initSettlementsSync() {
  const q = query(collection(db, "settlements"));
  onSnapshot(q, (snapshot) => {
    const sMap = {};
    snapshot.forEach((docSnap) => {
      sMap[docSnap.id] = docSnap.data();
    });
    state.settlements = sMap;
    state.settlementsLoaded = true;
    syncSettlementTransfersToLedger();
    if (typeof window.updateUI === 'function') {
      window.updateUI();
    }
  }, (err) => {
    console.warn("Settlements listen error:", err);
  });
}

// Auto-Sync Settlement Payouts to Transactions Ledger (Backfill & Consistency Engine)
let isSyncingTransfers = false;
export async function syncSettlementTransfersToLedger() {
  if (isSyncingTransfers) return;
  if (!state.currentUser || !state.settlementsLoaded || !state.transactionsLoaded) return;
  if (!state.settlements || !Array.isArray(state.transactions)) return;

  const currentEmail = (state.currentUser.email || '').toLowerCase().trim();
  const currentPartner = PARTNER_EMAILS[currentEmail] || '';
  // Due to strict Firestore security rules, only Balaji can record payout transactions paid by Balaji
  if (currentPartner !== 'Balaji') return;

  const missing = [];
  Object.entries(state.settlements).forEach(([weekId, weekDoc]) => {
    if (!weekDoc || !weekDoc.transfers) return;
    ['Nagoor', 'JP'].forEach(partner => {
      const rec = weekDoc.transfers[partner];
      if (rec && Number(rec.paidAmount) > 0) {
        const amt = Number(rec.paidAmount);
        // Check if transfer already exists in transactions collection
        const alreadyExists = state.transactions.some(t => 
          t.type === 'transfer' && 
          (
            (t.weekId && t.weekId === weekId && t.toPartner === partner) ||
            (t.toPartner === partner && Number(t.amount) === amt && (t.category === 'settlement_payout' || t.category === 'transfer'))
          )
        );
        if (!alreadyExists) {
          missing.push({ weekId, weekDoc, partner, rec, amt });
        }
      }
    });
  });

  if (missing.length === 0) return;

  isSyncingTransfers = true;
  try {
    for (const item of missing) {
      // Double check to prevent duplicate transactions
      const doubleCheck = state.transactions.some(t => 
        t.type === 'transfer' && 
        (
          (t.weekId && t.weekId === item.weekId && t.toPartner === item.partner) ||
          (t.toPartner === item.partner && Number(t.amount) === item.amt && (t.category === 'settlement_payout' || t.category === 'transfer'))
        )
      );
      if (doubleCheck) continue;

      const paidDate = item.rec.paidAt ? formatLocalDate(new Date(item.rec.paidAt)) : (item.weekDoc.weekEnd || getTodayString());
      const newTx = {
        type: 'transfer',
        partner: 'Balaji',
        toPartner: item.partner,
        category: 'settlement_payout',
        amount: item.amt,
        date: paidDate || getTodayString(),
        paymentMethod: item.rec.paymentMethod || 'GPay / UPI',
        description: item.rec.notes ? `Settlement Payout: ${item.rec.notes}` : `Weekly Settlement Payout (${item.weekDoc.weekStart || ''} - ${item.weekDoc.weekEnd || ''})`,
        weekId: item.weekId,
        createdAt: item.rec.paidAt || Date.now(),
        createdBy: currentEmail,
        createdByPartner: 'Balaji'
      };

      await addDoc(collection(db, "transactions"), newTx);
      console.log(`Auto-synced settlement transfer to transactions ledger: Balaji -> ${item.partner} (${formatINR(item.amt)})`);
    }
  } catch (err) {
    console.warn("Settlement transfer auto-sync notice:", err);
  } finally {
    isSyncingTransfers = false;
  }
}

// Presence Heartbeat
export async function sendPresenceHeartbeat(isOnline = true) {
  if (!state.currentPartner) return;
  try {
    await setDoc(doc(db, "metadata", "presence"), {
      [state.currentPartner]: {
        online: isOnline,
        lastSeen: Date.now()
      },
      updatedAt: Date.now(),
      updatedBy: state.currentPartner
    }, { merge: true });
  } catch (err) {
    console.warn("Presence heartbeat warning:", err);
  }
}

// Presence Listener & Timers
export function initPresenceSync() {
  onSnapshot(doc(db, "metadata", "presence"), (snap) => {
    if (snap.exists()) {
      state.presence = snap.data() || {};
      renderPartnerPresence();
      if (state.currentTab === 'history' && typeof window.renderHistoryList === 'function') {
        window.renderHistoryList();
      } else if (state.currentTab === 'dashboard' && typeof window.renderRecentTransactions === 'function') {
        window.renderRecentTransactions();
      }
    }
  }, (err) => {
    console.warn("Presence sync warning:", err);
  });

  sendPresenceHeartbeat(true);

  if (window._presenceInterval) clearInterval(window._presenceInterval);
  window._presenceInterval = setInterval(() => {
    if (document.visibilityState === 'visible' && state.currentPartner) {
      sendPresenceHeartbeat(true);
    }
  }, 25000);

  if (window._presenceUIRefresh) clearInterval(window._presenceUIRefresh);
  window._presenceUIRefresh = setInterval(() => {
    renderPartnerPresence();
  }, 15000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sendPresenceHeartbeat(true);
    } else {
      sendPresenceHeartbeat(false);
    }
  });

  window.addEventListener('beforeunload', () => {
    sendPresenceHeartbeat(false);
  });
}

// Update partner presence on cards
export function updatePartnerCardsPresence() {
  ['Balaji', 'Nagoor', 'JP'].forEach(p => {
    const el = document.getElementById(`partnerCardPresence-${p}`);
    if (!el) return;
    const online = isPartnerOnline(p);
    const effectiveLastSeen = getPartnerEffectiveLastSeen(p);

    if (online) {
      el.innerHTML = `<span class="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active</span>`;
    } else if (effectiveLastSeen) {
      const shortText = getPartnerShortLastSeen(effectiveLastSeen);
      el.innerHTML = `<span class="inline-flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-full" title="${formatPartnerLastSeen(effectiveLastSeen)}"><i class="fa-regular fa-clock text-[8px]"></i> Seen ${shortText}</span>`;
    } else {
      el.innerHTML = `<span class="text-[9px] text-slate-400 font-medium">Offline</span>`;
    }
  });
}

// Top Bar Partner Presence List Renderer
export function renderPartnerPresence() {
  const list = document.getElementById('partnerPresenceList');
  if (!list) return;
  const partners = ['Balaji', 'Nagoor', 'JP'];
  list.innerHTML = partners.map(p => {
    const isOnline = isPartnerOnline(p);
    const effectiveLastSeen = getPartnerEffectiveLastSeen(p);
    const shortLastSeen = isOnline ? 'Online' : getPartnerShortLastSeen(effectiveLastSeen);
    const fullLastSeen = isOnline ? 'Active Now' : formatPartnerLastSeen(effectiveLastSeen);

    const dotColor = isOnline ? 'bg-emerald-500 animate-pulse ring-1 ring-white dark:ring-slate-900' : 'bg-slate-300 dark:bg-slate-600 ring-1 ring-white dark:ring-slate-900';
    const statusClass = isOnline ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 font-medium';
    const bgClass = isOnline ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/50';

    return `
      <button type="button" onclick="openPresenceDetailModal()" class="flex items-center justify-between px-2 py-1 rounded-xl border ${bgClass} text-[10px] min-w-0 transition active:scale-95 cursor-pointer shadow-2xs hover:shadow-xs" title="${p}: ${fullLastSeen} (Click for co-founder live status)">
        <div class="flex items-center gap-1.5 min-w-0">
          <div class="relative flex-shrink-0 flex items-center justify-center">
            ${renderPartnerAvatar(p, 'w-4 h-4', 'rounded-full')}
            <span class="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${dotColor}"></span>
          </div>
          <span class="font-extrabold text-slate-800 dark:text-slate-200 truncate text-[11px]">${p}</span>
        </div>
        <span class="${statusClass} text-[9px] flex-shrink-0 ml-1 whitespace-nowrap">${isOnline ? 'Online' : shortLastSeen}</span>
      </button>
    `;
  }).join('');

  updatePartnerCardsPresence();
  renderPresenceDetailModal();
}

// Presence Detail Modal List Renderer
export function renderPresenceDetailModal() {
  const container = document.getElementById('presenceDetailModalList');
  if (!container) return;
  const partners = ['Balaji', 'Nagoor', 'JP'];
  container.innerHTML = partners.map(p => {
    const isOnline = isPartnerOnline(p);
    const effectiveLastSeen = getPartnerEffectiveLastSeen(p);
    const statusText = isOnline ? 'Active Now (Online)' : formatPartnerLastSeen(effectiveLastSeen);
    const partnerInfo = PARTNERS[p] || { name: p, role: 'Partner' };
    const isMe = state.currentPartner === p;

    return `
      <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="relative flex-shrink-0">
            ${renderPartnerAvatar(p, 'w-11 h-11', 'rounded-xl')}
            <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}"></span>
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <h4 class="font-bold text-xs text-slate-900 dark:text-white">${partnerInfo.name}</h4>
              ${isMe ? '<span class="text-[9px] px-1.5 py-0.2 rounded font-black bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30">You</span>' : ''}
            </div>
            <p class="text-[10px] text-slate-400 font-medium">${partnerInfo.role}</p>
            <div class="text-[10px] mt-0.5 font-semibold ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}">
              ${isOnline ? '🟢 Active Now' : '⚪ ' + statusText}
            </div>
          </div>
        </div>
        <div>
          ${isOnline ? '<span class="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">ONLINE</span>' : '<span class="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold">OFFLINE</span>'}
        </div>
      </div>
    `;
  }).join('');
}

// Expose handlers on window
if (typeof window !== 'undefined') {
  window.initPartnersSync = initPartnersSync;
  window.initCategoriesSync = initCategoriesSync;
  window.initLiveSync = initLiveSync;
  window.initSettlementsSync = initSettlementsSync;
  window.syncSettlementTransfersToLedger = syncSettlementTransfersToLedger;
  window.sendPresenceHeartbeat = sendPresenceHeartbeat;
  window.initPresenceSync = initPresenceSync;
  window.updatePartnerCardsPresence = updatePartnerCardsPresence;
  window.renderPartnerPresence = renderPartnerPresence;
  window.renderPresenceDetailModal = renderPresenceDetailModal;
}
