import { PROOF_EXPIRY_MS } from './seedData';

export function pruneExpiredProofs(store) {
  const now = Date.now();
  const prune = (list) =>
    list.map((item) => {
      if (item.proof && item.proofAddedAt && now - item.proofAddedAt > PROOF_EXPIRY_MS) {
        return { ...item, proof: null, proofAddedAt: null };
      }
      return item;
    });
  return {
    ...store,
    tasks:    prune(store.tasks || []),
    expenses: prune(store.expenses || []),
    worklogs: prune(store.worklogs || []),
  };
}

export function calcKpis(store) {
  const totalInvested = (store.capitals || []).reduce((s, c) => s + (c.amount || 0), 0)
    + (store.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const totalSpent = (store.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const cashBalance = (store.capitals || []).reduce((s, c) => s + (c.amount || 0), 0) - totalSpent;
  const pendingTasks = (store.tasks || []).filter((t) => t.status !== 'completed').length;
  return { totalInvested, totalSpent, cashBalance, pendingTasks };
}

export function calcFounderStats(store, name) {
  const hours = (store.worklogs || [])
    .filter((w) => w.partner === name)
    .reduce((s, w) => s + (w.hours || 0), 0);
  const allTasks = (store.tasks || []).filter((t) => t.to === name);
  const doneTasks = allTasks.filter((t) => t.status === 'completed').length;
  const totalContrib =
    (store.capitals || []).filter((c) => c.partner === name).reduce((s, c) => s + (c.amount || 0), 0) +
    (store.expenses || []).filter((e) => e.partner === name).reduce((s, e) => s + (e.amount || 0), 0);
  const grandTotal =
    (store.capitals || []).reduce((s, c) => s + (c.amount || 0), 0) +
    (store.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const contrib = grandTotal > 0 ? Math.round((totalContrib / grandTotal) * 100) : 0;
  return { hours, tasks: `${doneTasks}/${allTasks.length}`, contrib: `${contrib}%` };
}

export function calcSettlement(store) {
  const partners = ['Balaji', 'Nagoor', 'JP'];
  const paid = {};
  partners.forEach((p) => { paid[p] = 0; });
  (store.expenses || []).forEach((e) => { paid[e.partner] = (paid[e.partner] || 0) + e.amount; });
  const total = Object.values(paid).reduce((s, v) => s + v, 0);
  const fair = total / 3;
  const balance = {};
  partners.forEach((p) => { balance[p] = paid[p] - fair; });
  const transactions = [];
  const debtors = partners.filter((p) => balance[p] < -0.01).map((p) => ({ name: p, amt: -balance[p] }));
  const creditors = partners.filter((p) => balance[p] > 0.01).map((p) => ({ name: p, amt: balance[p] }));
  debtors.forEach((d) => {
    let remaining = d.amt;
    creditors.forEach((c) => {
      if (remaining < 0.01 || c.amt < 0.01) return;
      const transfer = Math.min(remaining, c.amt);
      transactions.push({ from: d.name, to: c.name, amount: Math.round(transfer) });
      remaining -= transfer;
      c.amt -= transfer;
    });
  });
  return { transactions, paid, fair: Math.round(fair), total: Math.round(total) };
}

export function compressImage(file, maxKB = 80) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > maxKB * 1024 * 1.37 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function fmtCurrency(n) {
  if (n === undefined || n === null) return '₹0';
  return '₹' + Math.abs(n).toLocaleString('en-IN');
}

export function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ta-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtRelativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'இப்போதுதான்';
  if (mins < 60) return `${mins} நிமிடம் முன்பு`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} மணி முன்பு`;
  return `${Math.floor(hrs / 24)} நாள் முன்பு`;
}

export function getProofExpiryText(addedAt) {
  if (!addedAt) return '';
  const remaining = PROOF_EXPIRY_MS - (Date.now() - addedAt);
  if (remaining <= 0) return 'காலாவதி';
  const hrs = Math.floor(remaining / 3600000);
  if (hrs < 1) return '< 1 மணி நேரம் உள்ளது';
  return `${hrs} மணி நேரம் உள்ளது`;
}

export const TAMIL_DAYS = ['ஞா', 'திங்', 'செவ்', 'புத', 'வியா', 'வெள்', 'சன'];
export const TAMIL_MONTHS = ['ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'];

export function shareDaySummaryWhatsApp(store) {
  const todayStr = new Date().toISOString().split('T')[0];
  const pending = (store.tasks || []).filter((t) => t.status !== 'completed').length;
  const done = (store.tasks || []).filter((t) => t.status === 'completed').length;

  const hours = { Balaji: 0, Nagoor: 0, JP: 0 };
  (store.worklogs || []).filter((w) => w.date === todayStr).forEach((w) => {
    if (hours[w.partner] !== undefined) hours[w.partner] += Number(w.hours || 0);
  });

  const todaySpent = (store.expenses || []).filter((e) => e.date === todayStr).reduce((s, e) => s + Number(e.amount || 0), 0);

  const text = `🐟 *MeenMart Daily Operations Summary (${todayStr})*\n\n📋 *பணிகள்:* ${done} முடிந்தது | ${pending} நிலுவை\n💰 *இன்றைய செலவு:* ₹${todaySpent.toLocaleString('en-IN')}\n\n⏱️ *இன்றைய உழைப்பு நேரம்:*\n• Balaji: ${hours.Balaji}h\n• Nagoor: ${hours.Nagoor}h\n• JP: ${hours.JP}h\n\nMeenMart Operations Hub`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

export function shareSettlementWhatsApp(settlement) {
  if (!settlement || !settlement.transactions || settlement.transactions.length === 0) {
    const text = `🐟 *MeenMart கணக்கு தீர்வு (Fair Settlement)*\n\nஅனைத்துப் பங்குதாரர்களின் செலவுகளும் சமமாக உள்ளன! கூடுதல் பாக்கி ஏதுமில்லை. ✅`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    return;
  }
  let text = `🐟 *MeenMart கணக்கு தீர்வு (Fair Settlement)*\n\nமொத்த செலவு: ₹${settlement.total.toLocaleString('en-IN')}\nதனிநபர் பங்கு (33.3%): ₹${settlement.fair.toLocaleString('en-IN')}\n\n*பணம் மாற்ற வேண்டிய விவரம்:*\n`;
  settlement.transactions.forEach((t) => {
    text += `👉 *${t.from}* என்பவர் *${t.to}*-க்கு செலுத்த வேண்டியது: ₹${t.amount.toLocaleString('en-IN')}\n`;
  });
  text += `\nMeenMart Operations Hub`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

export function exportLedgerCSV(store) {
  const allTx = [];
  (store.capitals || []).forEach((c) => {
    allTx.push({ Date: c.date, Partner: c.partner, Type: 'Capital', Category: 'மூலதனம்', Amount: c.amount, Notes: c.note || '' });
  });
  (store.expenses || []).forEach((e) => {
    allTx.push({ Date: e.date, Partner: e.partner, Type: 'Expense', Category: e.category, Amount: e.amount, Notes: e.reason || '' });
  });

  allTx.sort((a, b) => (b.Date || '').localeCompare(a.Date || ''));

  let csvContent = 'Date,Partner,Type,Category,Amount,Notes\n';
  allTx.forEach((row) => {
    csvContent += `"${row.Date}","${row.Partner}","${row.Type}","${row.Category}","${row.Amount}","${(row.Notes || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MeenMart_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

