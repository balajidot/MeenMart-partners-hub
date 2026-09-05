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
  capitals: [],
  worklogs: [],
  messages: [],
};

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function getSeedData() {
  const now = Date.now();
  const day = 86400000;
  return {
    tasks: [
      {
        id: generateId(), title: 'காலை மீன் மார்க்கெட் கொள்முதல்',
        from: 'Nagoor', to: 'Nagoor',
        dueAt: now + 2 * 60 * 60 * 1000, status: 'pending',
        createdAt: now - day, proof: null, proofAddedAt: null,
      },
      {
        id: generateId(), title: 'MeenMart App வாடிக்கையாளர் Notification Setup',
        from: 'Balaji', to: 'Balaji',
        dueAt: now + day, status: 'pending',
        createdAt: now - 2 * day, proof: null, proofAddedAt: null,
      },
      {
        id: generateId(), title: 'Anna Nagar டெலிவரி Route திட்டம்',
        from: 'JP', to: 'JP',
        dueAt: now - 60 * 60 * 1000, status: 'completed',
        createdAt: now - 3 * day, proof: null, proofAddedAt: null,
      },
    ],
    expenses: [
      {
        id: generateId(), partner: 'Nagoor', amount: 4500,
        category: 'மீன் கொள்முதல்', reason: 'காசிமேடு சந்தை வஞ்சிரம் & இறால்',
        date: new Date(now - day).toISOString().slice(0, 10),
        createdAt: now - day, proof: null, proofAddedAt: null,
      },
      {
        id: generateId(), partner: 'JP', amount: 800,
        category: 'டெலிவரி & பெட்ரோல்', reason: 'டெலிவரி பெட்ரோல் & பைக் சர்வீஸ்',
        date: new Date(now - 2 * day).toISOString().slice(0, 10),
        createdAt: now - 2 * day, proof: null, proofAddedAt: null,
      },
      {
        id: generateId(), partner: 'Balaji', amount: 1200,
        category: 'ஆப் & சர்வர்', reason: 'Firebase Blaze Plan மாத கட்டணம்',
        date: new Date(now - 3 * day).toISOString().slice(0, 10),
        createdAt: now - 3 * day, proof: null, proofAddedAt: null,
      },
    ],
    capitals: [
      { id: generateId(), partner: 'Balaji', amount: 20000, note: 'ஆரம்ப முதலீடு', date: new Date(now - 10 * day).toISOString().slice(0, 10), createdAt: now - 10 * day },
      { id: generateId(), partner: 'Nagoor', amount: 20000, note: 'ஆரம்ப முதலீடு', date: new Date(now - 10 * day).toISOString().slice(0, 10), createdAt: now - 10 * day },
      { id: generateId(), partner: 'JP',     amount: 10000, note: 'ஆரம்ப முதலீடு', date: new Date(now - 10 * day).toISOString().slice(0, 10), createdAt: now - 10 * day },
    ],
    worklogs: [
      { id: generateId(), partner: 'Nagoor', hours: 6, category: 'மீன் கொள்முதல்', description: 'காலை 5 மணி மார்க்கெட் — வஞ்சிரம், சங்கரா கொள்முதல் & 12 ஆர்டர்கள் பேக்கிங்', date: new Date(now - day).toISOString().slice(0, 10), createdAt: now - day, proof: null },
      { id: generateId(), partner: 'JP',     hours: 5, category: 'டெலிவரி மேலாண்மை', description: 'T.Nagar, Nungambakkam, Anna Nagar 18 ஆர்டர்கள் டெலிவரி', date: new Date(now - day).toISOString().slice(0, 10), createdAt: now - day, proof: null },
      { id: generateId(), partner: 'Balaji', hours: 8, category: 'ஆப் & டெவலப்மென்ட்', description: 'MeenMart App Firebase Integration & Order Tracking Feature', date: new Date(now - 2 * day).toISOString().slice(0, 10), createdAt: now - 2 * day, proof: null },
    ],
    messages: [
      { id: generateId(), partner: 'Balaji', text: 'வணக்கம் தோழர்களே! MeenMart Partners Hub நேரலைக்கு வந்துவிட்டது 🚀', createdAt: now - 3600000 * 5 },
      { id: generateId(), partner: 'Nagoor', text: 'சூப்பர் பாலாஜி! காலை காசிமேடு சந்தை நிலவரம் அப்டேட் செய்துள்ளேன் 🐟', createdAt: now - 3600000 * 3 },
      { id: generateId(), partner: 'JP', text: 'இன்றைய டெலிவரி ரூட்கள் அனைத்தும் தயார் 🛵⚡', createdAt: now - 3600000 },
    ],
  };
}
