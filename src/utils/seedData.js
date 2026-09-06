export const PARTNERS = ['Balaji', 'Nagoor', 'JP'];

export const PARTNER_META = {
  Balaji: { emoji: '👨‍💻', role: 'Tech & Product', color: 'balaji' },
  Nagoor: { emoji: '🦐', role: 'Procure & Pack', color: 'nagoor' },
  JP:     { emoji: '🛵', role: 'Delivery & Sales', color: 'jp' },
};

export const EXPENSE_CATEGORIES = [
  { value: 'Fish Procurement',    label: '🐟 Fish Stock / Procurement' },
  { value: 'Ice & Cold Storage',  label: '🧊 Ice & Cold Storage' },
  { value: 'Delivery & Fuel',      label: '🛵 Delivery & Fuel' },
  { value: 'Packaging & Pouches', label: '📦 Packaging & Pouches' },
  { value: 'Marketing & Ads',     label: '📢 Marketing & Ads' },
  { value: 'Tech & Hosting',       label: '💻 Tech & Hosting' },
  { value: 'Miscellaneous',       label: '🏷️ Miscellaneous' },
];

export const WORK_CATEGORIES = [
  { value: 'Procurement',             label: '🐟 Fish Procurement (Pazhaverkaadu)' },
  { value: 'Packaging',               label: '📦 Cleaning & Packing' },
  { value: 'Delivery',                label: '🛵 Delivery Operations' },
  { value: 'Tech & App',              label: '💻 Tech & App Development' },
  { value: 'Sales & Customer Care',   label: '📢 Sales & Customer Care' },
  { value: 'Operations',              label: '📋 Business Planning & Accounts' },
];

export const PROOF_EXPIRY_MS = 48 * 60 * 60 * 1000;

export const DEFAULT_STATE = {
  tasks: [],
  expenses: [],
  revenues: [],
  capitals: [],
  worklogs: [],
  messages: [],
};

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function getSeedData() {
  return {
    tasks: [],
    expenses: [],
    revenues: [],
    capitals: [],
    worklogs: [],
    messages: [],
  };
}
