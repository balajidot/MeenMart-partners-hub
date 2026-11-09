// ==============================================================================
// 🚀 MEENMART PARTNERS HUB - MASTER APPLICATION BOOTSTRAP (ES6 MODULE ENTRY)
// ==============================================================================

// 1. Core State & Configuration
import { firebaseConfig, PARTNERS, PARTNER_EMAILS, DEFAULT_CATEGORIES, updatePartners } from './config.js';
import { state } from './state.js';

// 2. Pure Utility Helpers
import { 
  formatINR, 
  formatLocalDate, 
  getTodayString, 
  getYesterdayString, 
  getThisWeekStart, 
  getThisMonthStart, 
  getWeekRange, 
  getWeekFinancialSummary, 
  getPartnerPreviousPendingDue, 
  escapeHtml, 
  getCategoryLabel, 
  canUserModify, 
  renderPartnerAvatar, 
  isPartnerOnline, 
  getPartnerEffectiveLastSeen, 
  getPartnerShortLastSeen, 
  formatPartnerLastSeen, 
  showToast 
} from './utils.js';

// 3. Firebase & Authentication Services
import { 
  app, 
  db, 
  auth, 
  googleProvider, 
  setupAuthObserver, 
  handleGoogleSignIn, 
  handleSignOut, 
  updateHeaderAvatar, 
  updateLoginAvatars, 
  updatePartnerCardAvatars 
} from './firebase.js';

// 4. Real-time Firestore Listeners & Presence Engine
import { 
  initPartnersSync, 
  initCategoriesSync, 
  initLiveSync, 
  initSettlementsSync, 
  syncSettlementTransfersToLedger, 
  initPresenceSync, 
  sendPresenceHeartbeat, 
  updatePartnerCardsPresence, 
  renderPartnerPresence, 
  renderPresenceDetailModal 
} from './sync.js';

// 5. PDF & Statement Generation Service
import './services/pdf.js';

// 6. UI View Components
import { 
  renderDashboard, 
  renderRecentTransactions, 
  renderWeeklyCalendarStrip, 
  setDashboardDateScope, 
  selectWeeklyCalendarDay, 
  toggleCustomDateRangeModal, 
  applyCustomDateRange, 
  quickPocketBalajiProfit 
} from './components/dashboard.js';

import { 
  renderHistoryList, 
  renderTransactionItem, 
  handleTransactionCardClick, 
  setHistoryDateFilter 
} from './components/history.js';

import { 
  renderAccounts, 
  renderAllTimeLedger, 
  changeSettlementWeek, 
  switchSettlementSubTab, 
  openRecordPaymentModal, 
  closeRecordPaymentModal, 
  setPaymentInputAmount, 
  updatePaymentLivePreview, 
  handleRecordPaymentSubmit, 
  copyWeeklyReportWhatsApp 
} from './components/settlement.js';

import { 
  renderAnalytics, 
  setAnalyticsRange 
} from './components/analytics.js';

// 7. Modals & Sheet Controllers
import './components/modals.js';

// ==============================================================================
// 🎨 THEME MANAGEMENT (Dark / Light Theme Controller)
// ==============================================================================
export function applyTheme(theme) {
  const root = document.documentElement;
  const themeToggleIcon = document.getElementById('themeToggleIcon');
  const loginThemeIcon = document.getElementById('loginThemeIcon');
  const metaColor = document.getElementById('metaThemeColor');

  if (theme === 'dark') {
    root.classList.add('dark');
    if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-sun';
    if (loginThemeIcon) loginThemeIcon.innerText = '☀️';
    if (metaColor) metaColor.setAttribute('content', '#070d1e');
  } else {
    root.classList.remove('dark');
    if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-moon';
    if (loginThemeIcon) loginThemeIcon.innerText = '🌙';
    if (metaColor) metaColor.setAttribute('content', '#0d9488');
  }
}

export function toggleTheme() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  state.theme = newTheme;
  localStorage.setItem('meenmart_theme', newTheme);
  applyTheme(newTheme);
  if (state.currentTab === 'analytics') renderAnalytics();
}
window.toggleTheme = toggleTheme;
window.applyTheme = applyTheme;

// ==============================================================================
// 🧭 MASTER UI ROUTER & DISPATCHER
// ==============================================================================
export function updateUI() {
  try {
    renderDashboard();
    renderHistoryList();
    if (state.currentTab === 'analytics') renderAnalytics();
    if (state.currentTab === 'accounts') renderAccounts();
  } catch (err) {
    console.error("Master updateUI error:", err);
  }
}
window.updateUI = updateUI;

// Navigation Switcher (Multi-Tab Safe with Smooth Section Scroll & Haptics)
window.switchTab = function(tabName, scrollTargetId = null) {
  if (navigator.vibrate) navigator.vibrate(8);

  // Alias mapping to safeguard against blank screens
  if (tabName === 'settlement') tabName = 'accounts';
  if (tabName === 'home') tabName = 'dashboard';

  state.currentTab = tabName;
  ['dashboard', 'history', 'analytics', 'accounts'].forEach(t => {
    const sec = document.getElementById(`tab-${t}`);
    const nav = document.getElementById(`nav-${t}`);
    if (sec && nav) {
      if (t === tabName) {
        sec.classList.remove('hidden');
        nav.className = "flex flex-col items-center justify-center py-1 text-teal-600 dark:text-teal-400 font-extrabold scale-105 transition-all";
      } else {
        sec.classList.add('hidden');
        nav.className = "flex flex-col items-center justify-center py-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-all";
      }
    }
  });

  if (tabName === 'dashboard') renderDashboard();
  if (tabName === 'analytics') renderAnalytics();
  if (tabName === 'accounts') renderAccounts();
  if (tabName === 'history') renderHistoryList();

  if (scrollTargetId) {
    setTimeout(() => {
      const el = document.getElementById(scrollTargetId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// ==============================================================================
// ⚡ INITIALIZATION & BOOTSTRAP
// ==============================================================================
function initApp() {
  // 1. Apply Initial Theme
  applyTheme(state.theme);

  // 2. Initialize default dates
  const entryDateInput = document.getElementById('entryDate');
  if (entryDateInput) entryDateInput.value = getTodayString();

  if (window.updateCategorySelect) {
    window.updateCategorySelect();
  }

  // 3. Register PWA Service Worker with Instant Auto-Activation
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('ServiceWorker controller updated. Reloading for fresh cache...');
        window.location.reload();
      }
    });

    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        // Check for SW updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New version of MeenMart available. Activating immediately...');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                showToast("Updating MeenMart to latest version... 🚀");
              }
            });
          }
        });
      })
      .catch(err => {
        console.warn('ServiceWorker registration notice:', err);
      });
  }

  // 4. Setup Authentication Observer and Launch Data Streams
  setupAuthObserver(matchedPartner => {
    console.log(`Authenticated as partner: ${matchedPartner || 'Unknown'}`);
    initPartnersSync();
    initCategoriesSync();
    initLiveSync();
    initSettlementsSync();
    initPresenceSync();
  });
}

// Ensure DOM is ready before bootstrapping
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

console.log("MeenMart Partners Hub initialized in modular React-like ES6 architecture 🚀");

