// Partner allowlist + email → identity mapping.
// TO ADD a new partner or change an email: edit this file only.
// After editing, redeploy AND update Realtime DB rules in Firebase Console
// (rules also reference these email addresses — see supabase/rtdb.rules.json).

export const PARTNERS = [
  {
    name: 'Balaji',
    role: 'Tech & Product',
    avatar: '💻',
    email: 'balajibala93843@gmail.com',
  },
  {
    name: 'Nagoor',
    role: 'Procure & Pack',
    avatar: '🐟',
    // TODO: replace with Nagoor's real Gmail before shipping to him
    email: 'nagoor.meenmart@gmail.com',
  },
  {
    name: 'JP',
    role: 'Delivery & Sales',
    avatar: '🛵',
    // TODO: replace with JP's real Gmail before shipping to him
    email: 'jp.meenmart@gmail.com',
  },
];

const EMAIL_TO_PARTNER = PARTNERS.reduce((acc, p) => {
  acc[p.email.toLowerCase()] = p;
  return acc;
}, {});

export function partnerFromEmail(email) {
  if (!email) return null;
  return EMAIL_TO_PARTNER[email.toLowerCase()] || null;
}

export function isAllowedEmail(email) {
  return !!partnerFromEmail(email);
}

export const PARTNER_NAMES = PARTNERS.map((p) => p.name);
export const ALLOWED_EMAILS = PARTNERS.map((p) => p.email);
