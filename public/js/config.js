// ==========================================
// ⚙️ MEENMART PARTNERS HUB - CONFIGURATION
// ==========================================

export const firebaseConfig = {
  apiKey: "AIzaSyDgmMzKiRKM8mn9FgOdkWCanqZ7RihV0k8",
  authDomain: "meenmart-partners-hub.firebaseapp.com",
  projectId: "meenmart-partners-hub",
  storageBucket: "meenmart-partners-hub.firebasestorage.app",
  messagingSenderId: "49631212929",
  appId: "1:49631212929:web:15f09cb19dab3110ac2480"
};

// 3 Fixed Partners & Profile Defaults
export let PARTNERS = {
  Balaji: { name: "Balaji", role: "Tech & Vasool", avatar: "👨‍💻", photoUrl: "", color: "#3B82F6" },
  Nagoor: { name: "Nagoor", role: "Fish Purchase", avatar: "🦐", photoUrl: "", color: "#10B981" },
  JP: { name: "JP", role: "Delivery & Petrol", avatar: "🛵", photoUrl: "", color: "#F59E0B" }
};

export function updatePartners(newPartners) {
  PARTNERS = { ...PARTNERS, ...newPartners };
  if (typeof window !== 'undefined') {
    window.PARTNERS = PARTNERS;
  }
}

export const PARTNER_EMAILS = {
  'itzbalajir@gmail.com': 'Balaji',
  'balajibala93843@gmail.com': 'Balaji',
  'abdulfaizal66786@gmail.com': 'Nagoor',
  'jaya84008@gmail.com': 'JP'
};

// Default Startup Categories for MeenMart
export const DEFAULT_CATEGORIES = {
  expense: [
    { id: "fish_purchase", label: "🐟 Fish Purchase" },
    { id: "fish_cleaning", label: "🧼 Cleaning Coolie" },
    { id: "ice_storage", label: "🧊 Ice & Box" },
    { id: "packing_covers", label: "📦 Packing Covers" },
    { id: "petrol_delivery", label: "🛵 Petrol & Delivery" },
    { id: "marketing_ads", label: "📢 Meta Ads & App" },
    { id: "other_expense", label: "🛠️ Other Expenses" }
  ],
  sales: [
    { id: "cash_sales", label: "💵 Customer Cash Income" },
    { id: "online_gateway", label: "💳 Online Gateway (Bank)" },
    { id: "bulk_hotel_sales", label: "🏢 Bulk / Hotel Income" }
  ],
  investment: [
    { id: "freezer_box", label: "🧊 Deep Freezer Box" },
    { id: "weighing_scale", label: "⚖️ Weighing Scale" },
    { id: "initial_capital", label: "💵 Initial Capital" },
    { id: "tech_branding", label: "💻 App & Branding" }
  ],
  transfer: [
    { id: "settlement_payout", label: "🤝 Weekly Settlement Payout" },
    { id: "harbor_advance", label: "⚓ Harbor / Fish Advance" },
    { id: "fuel_advance", label: "⛽ Fuel / Delivery Advance" },
    { id: "cash_handover", label: "💵 Cash Handover (Hand to Hand)" },
    { id: "profit_withdrawal", label: "💼 Partner Profit Withdrawal" }
  ]
};

// Expose globals for window access
if (typeof window !== 'undefined') {
  window.PARTNERS = PARTNERS;
  window.PARTNER_EMAILS = PARTNER_EMAILS;
  window.DEFAULT_CATEGORIES = DEFAULT_CATEGORIES;
}
