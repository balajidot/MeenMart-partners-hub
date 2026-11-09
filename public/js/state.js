// ==========================================
// 📦 MEENMART PARTNERS HUB - GLOBAL STATE STORE
// ==========================================

import { DEFAULT_CATEGORIES } from './config.js';

export const state = {
  currentUser: null,
  currentPartner: null,
  presence: {},
  theme: (typeof localStorage !== 'undefined' ? localStorage.getItem('meenmart_theme') : null) || 'dark',
  currentTab: 'dashboard',
  dashboardScope: 'today', // 'today', 'yesterday', 'week', 'month', 'custom'
  selectedDashboardDay: null,
  customDateRange: { from: '', to: '' },
  transactions: [],
  settlements: {},
  transactionsLoaded: false,
  settlementsLoaded: false,
  categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
  catManagerTab: 'expense',
  settlementOffsetWeeks: 0,
  settlementSubTab: 'weekly',
  activePayout: null,
  capitalTargetPerPartner: (typeof localStorage !== 'undefined' ? Number(localStorage.getItem('meenmart_capital_target')) : 50000) || 50000,
  entryType: 'expense',
  entryPartner: 'Balaji',
  entryToPartner: 'Nagoor',
  entryPaymentMethod: 'GPay / UPI',
  historyFilter: {
    search: '',
    date: 'all',
    type: 'all',
    partner: 'all'
  },
  analyticsRange: '7',
  charts: {
    daily: null,
    partners: null,
    categories: null,
    capital: null
  }
};

// Expose state globally for browser console debugging and legacy bindings
if (typeof window !== 'undefined') {
  window.state = state;
}

