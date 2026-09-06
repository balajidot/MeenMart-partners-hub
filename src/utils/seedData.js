export const PARTNERS = ['Balaji', 'Nagoor', 'JP'];

export const PARTNER_META = {
  Balaji: { emoji: '👨‍💻', role: 'Tech & Product', color: 'balaji' },
  Nagoor: { emoji: '🦐', role: 'Procure & Pack', color: 'nagoor' },
  JP:     { emoji: '🛵', role: 'Delivery & Sales', color: 'jp' },
};

export const EXPENSE_CATEGORIES = [
  { value: 'மீன் கொள்முதல்',       label: '🐟 மீன் கொள்முதல் (Fish Stock)' },
  { value: 'ஐஸ் & பாக்ஸ்',         label: '🧊 ஐஸ் & பாக்ஸ் (Ice & Packing)' },
  { value: 'டெலிவரி & பெட்ரோல்',   label: '🛵 டெலிவரி & பெட்ரோல் (Fuel & Delivery)' },
  { value: 'பேக்கிங் கவர்கள்',      label: '📦 பேக்கிங் கவர்கள் (Pouches & Bags)' },
  { value: 'மார்க்கெட்டிங்',        label: '📢 மார்க்கெட்டிங் & விளம்பரம் (Ads)' },
  { value: 'ஆப் & சர்வர்',          label: '💻 ஆப் & சர்வர் செலவு (Tech/Hosting)' },
  { value: 'இதர செலவுகள்',          label: '🏷️ இதர செலவுகள் (Miscellaneous)' },
];

export const WORK_CATEGORIES = [
  { value: 'மீன் கொள்முதல்',               label: '🐟 மீன் கொள்முதல் (Procurement)' },
  { value: 'பேக்கிங் & கிளீனிங்',           label: '📦 பேக்கிங் & கிளீனிங் (Packaging)' },
  { value: 'டெலிவரி மேலாண்மை',             label: '🛵 டெலிவரி மேலாண்மை (Delivery)' },
  { value: 'ஆப் & டெவலப்மென்ட்',           label: '💻 ஆப் & டெவலப்மென்ட் (Tech/App)' },
  { value: 'மார்க்கெட்டிங் & கஸ்டமர் கேர்', label: '📢 மார்க்கெட்டிங் & வாடிக்கையாளர் (Sales)' },
  { value: 'வணிகத் திட்டம் & கணக்கு',      label: '📋 வணிகத் திட்டம் & கணக்கு (Operations)' },
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
