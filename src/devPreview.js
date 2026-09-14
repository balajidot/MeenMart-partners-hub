/**
 * Development-only design harness.
 *
 * Visiting `?preview=1` on the dev server renders the signed-in shell with
 * sample data, so layout and styling can be reviewed without a real Google
 * session or Realtime Database access. The `import.meta.env.DEV` guard means
 * this is dead code in any production build.
 */

export const isPreview =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('preview') === '1';

const HOUR = 3600000;
const DAY = 24 * HOUR;

function dateStr(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const previewPartner = {
  name: 'Nagoor',
  role: 'Procure & Pack',
  initials: 'NA',
  color: '#0F9E8E',
  monoClass: 'nagoor',
  email: 'preview@example.com',
};

export const previewStore = {
  tasks: [
    {
      id: 'p1', title: 'Kaalai sandhai-la 40kg vanjiram edukanum',
      from: 'Balaji', assignedBy: 'Balaji', to: 'Nagoor',
      priority: 'urgent', status: 'pending',
      dueDateTime: dateStr(0), dueTime: '07:00 AM',
      createdAt: Date.now() - 3 * HOUR, comments: [],
    },
    {
      id: 'p2', title: 'Ice box-la 3 crate pack panni ready pannunga',
      from: 'Nagoor', assignedBy: 'Nagoor', to: 'Shared',
      priority: 'high', status: 'in_progress',
      dueDateTime: dateStr(0), dueTime: '09:30 AM',
      createdAt: Date.now() - 2 * HOUR,
      hasProblem: true,
      comments: [
        { id: 'c1', partner: 'JP', text: 'Crate rendu dhaan stock irukku', isProblem: true, createdAt: Date.now() - HOUR },
      ],
    },
    {
      id: 'p3', title: 'Anna Nagar route-ku 6 delivery mudikanum',
      from: 'Balaji', assignedBy: 'Balaji', to: 'JP',
      priority: 'normal', status: 'pending',
      dueDateTime: dateStr(0), dueTime: '05:00 PM',
      createdAt: Date.now() - HOUR, comments: [],
    },
    {
      id: 'p4', title: 'Customer payment tally panni sollunga',
      from: 'Nagoor', assignedBy: 'Nagoor', to: 'Nagoor',
      priority: 'normal', status: 'completed',
      dueDateTime: dateStr(0), dueTime: '08:30 PM',
      createdAt: Date.now() - 6 * HOUR, completedAt: Date.now() - HOUR, comments: [],
    },
    {
      id: 'p5', title: 'Paatti kadai bill settle pannanum',
      from: 'Balaji', assignedBy: 'Balaji', to: 'Nagoor',
      priority: 'high', status: 'pending',
      dueDateTime: dateStr(-9), dueTime: '01:00 PM',
      createdAt: Date.now() - 9 * DAY, comments: [],
    },
  ],
  expenses: [], revenues: [], capitals: [],
  worklogs: [
    { id: 'w1', partner: 'Nagoor', activity: 'Pazhaverkaadu sandhai — meen procurement', hours: 4.5, date: dateStr(0), createdAt: Date.now() - 7 * HOUR },
    { id: 'w2', partner: 'JP', activity: 'Delivery route — Anna Nagar & Kilpauk', hours: 3, date: dateStr(0), createdAt: Date.now() - 4 * HOUR },
    { id: 'w3', partner: 'Balaji', activity: 'Partner hub — realtime sync fix', hours: 2.5, date: dateStr(-1), createdAt: Date.now() - DAY },
    { id: 'w4', partner: 'Nagoor', activity: 'Cleaning & packing', hours: 3.5, date: dateStr(-2), createdAt: Date.now() - 2 * DAY },
  ],
  messages: [
    { id: 'm1', partner: 'Balaji', text: 'Inaiku sandhai rate epdi irukku?', createdAt: Date.now() - 2 * DAY - HOUR },
    { id: 'm2', partner: 'Nagoor', text: '🐟 Pazhaverkaadu: Vanjiram ₹620/kg, seer ₹540. Fresh stock nalla irukku.', createdAt: Date.now() - 2 * DAY },
    { id: 'm3', partner: 'JP', text: 'Ok, naan 9 maniku kelambaren.', createdAt: Date.now() - DAY },
    { id: 'm4', partner: 'Nagoor', text: '📦 Pack & Clean: Orders clean panni, weigh panni, ice box-la pack aachu.', createdAt: Date.now() - 3 * HOUR },
    { id: 'm5', partner: 'Balaji', text: 'Semma. Delivery slot confirm pannunga.', createdAt: Date.now() - 90 * 60000 },
  ],
  activeShifts: { Nagoor: Date.now() - 2 * HOUR, JP: Date.now() - 40 * 60000 },
};

export const previewOnlinePartners = { Balaji: false, Nagoor: true, JP: true };
