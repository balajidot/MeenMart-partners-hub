// Partner allowlist, identity mapping, and shared display metadata.
// TO ADD a new partner or change an email: edit this file only.
// After editing, redeploy AND update the Realtime DB rules in the Firebase
// Console — the rules reference these email addresses (firebase-rtdb-rules.json).

// Each partner can have multiple emails (primary listed first;
// primary is used for display, all are recognized on sign-in).
export const PARTNERS = [
  {
    name: 'Balaji',
    role: 'Tech & Product',
    avatar: '💻',
    initials: 'BA',
    color: '#1B2A5B',
    dot: '#4D7BF3',
    monoClass: 'balaji',
    email: 'itzbalajir@gmail.com',
    aliases: ['balajibala93843@gmail.com'],
  },
  {
    name: 'Nagoor',
    role: 'Procure & Pack',
    avatar: '🐟',
    initials: 'NA',
    color: '#0F9E8E',
    dot: '#0F9E8E',
    monoClass: 'nagoor',
    email: 'abdulfaizal66786@gmail.com',
    aliases: [],
  },
  {
    name: 'JP',
    role: 'Delivery & Sales',
    avatar: '🛵',
    initials: 'JP',
    color: '#B4531F',
    dot: '#E08A0B',
    monoClass: 'jp',
    email: 'jaya84008@gmail.com',
    aliases: [],
  },
];

/** Pseudo-partner used for tasks that belong to the whole team. */
export const SHARED = {
  name: 'Shared',
  role: 'Whole team',
  initials: 'ALL',
  color: '#5A6480',
  dot: null,
  monoClass: 'shared',
};

const EMAIL_TO_PARTNER = PARTNERS.reduce((acc, p) => {
  acc[p.email.toLowerCase()] = p;
  (p.aliases || []).forEach((alias) => {
    acc[alias.toLowerCase()] = p;
  });
  return acc;
}, {});

export function partnerFromEmail(email) {
  if (!email) return null;
  return EMAIL_TO_PARTNER[email.trim().toLowerCase()] || null;
}

export function isAllowedEmail(email) {
  return !!partnerFromEmail(email);
}

export const PARTNER_NAMES = PARTNERS.map((p) => p.name);

export const PARTNER_CONFIG = PARTNERS.reduce((acc, p) => {
  acc[p.name] = p;
  return acc;
}, {});

export const ALLOWED_EMAILS = PARTNERS.flatMap((p) => [p.email, ...(p.aliases || [])]);

/** Metadata for any assignee, including the "Shared" pseudo-partner. */
export function metaFor(name) {
  return PARTNER_CONFIG[name] || SHARED;
}

/** Assignee options for task forms: every partner plus "Shared". */
export const ASSIGNEE_OPTIONS = [...PARTNERS, SHARED];

/** Filter options for the header: "All partners" plus every partner. */
export const FILTER_OPTIONS = [
  { label: 'All Partners', shortLabel: 'All', value: 'all', dot: null },
  ...PARTNERS.map((p) => ({ label: p.name, shortLabel: p.name, value: p.name, dot: p.dot })),
];
