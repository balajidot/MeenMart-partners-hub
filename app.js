/**
 * MEENMART - Co-Founder Operations Hub
 * Google-Grade Partner Performance, 48-Hour Auto-Expiry Proof Engine, & 3-Way Fair Settlement
 * Founders: Balaji (Tech & App), Nagoor (Procurement & Packaging), JP (Delivery & Marketing)
 */

// Storage Schema & Configuration
const STORAGE_KEY = 'meenmart_google_v14_prod';
const PROOF_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 Hours

const DEFAULT_STATE = {
  tasks: [],
  expenses: [],
  capitals: [],
  worklogs: []
};

let store = {};

// Calendar & Filter State
let currentWeekOffset = 0;
let selectedDateFilter = null;
let activePartnerQuickFilter = 'all';

// Chart.js Instances
let workHoursChartInst = null;
let taskStatusChartInst = null;
let capitalShareChartInst = null;
let expenseCategoryChartInst = null;

const TAMIL_DAYS = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];
const TAMIL_MONTHS = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  pruneExpiredProofs();
  initDateTimeDefaults();
  setupFormListeners();
  renderAll();
});

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      store = JSON.parse(raw);
      if (!store.tasks) store.tasks = [];
      if (!store.expenses) store.expenses = [];
      if (!store.capitals) store.capitals = [];
      if (!store.worklogs) store.worklogs = [];
    } catch (e) {
      store = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  } else {
    // Seed with realistic initial data for MeenMart co-founders
    seedInitialDemoData();
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// 48-Hour In-Browser Auto-Expiry Proof Engine
function pruneExpiredProofs() {
  const now = Date.now();
  let modified = false;

  ['tasks', 'expenses', 'worklogs'].forEach(key => {
    store[key].forEach(item => {
      if (item.proof && item.proofExpiresAt && now > item.proofExpiresAt) {
        item.proof = null;
        modified = true;
      }
    });
  });

  if (modified) saveData();
}

function initDateTimeDefaults() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const dateTimeStr = `${todayStr}T${hours}:${minutes}`;

  const taskTimeEl = document.getElementById('taskDateTime');
  if (taskTimeEl && !taskTimeEl.value) taskTimeEl.value = dateTimeStr;

  ['expDate', 'capDate', 'workDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = todayStr;
  });
}

// In-Browser Ultra-Fast Canvas Image Compressor (10MB -> ~75KB WebP/JPEG)
async function compressImage(file, maxWidth = 900, quality = 0.72) {
  if (!file) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(null);
    };
    reader.onerror = () => resolve(null);
  });
}

// File label update helper
window.handleFileSelect = function(input, labelId) {
  const labelEl = document.getElementById(labelId);
  if (input.files && input.files[0]) {
    const fileName = input.files[0].name;
    const sizeMb = (input.files[0].size / (1024 * 1024)).toFixed(1);
    labelEl.innerText = `✅ ${fileName} (${sizeMb} MB - சுருக்கப்படுகிறது)`;
  }
};

window.setWorkHours = function(h) {
  const el = document.getElementById('workHours');
  if (el) el.value = h;
};

// ================= FORM SUBMISSION LISTENERS =================
function setupFormListeners() {
  // 1. Task Form with Delegation & Auto-Expiry Proof
  document.getElementById('taskForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    const assignedBy = document.getElementById('taskFromPartner').value;
    const assignedTo = document.getElementById('taskToPartner').value;
    const priority = document.getElementById('taskPriority').value;
    const dueDateTime = document.getElementById('taskDateTime').value;
    const fileInput = document.getElementById('taskProofInput');

    let proof = null;
    if (fileInput && fileInput.files[0]) {
      proof = await compressImage(fileInput.files[0]);
    }

    const now = Date.now();
    store.tasks.unshift({
      id: 't_' + now,
      title,
      assignedBy,
      assignedTo,
      priority: priority || 'normal',
      dueDateTime: dueDateTime || new Date().toISOString(),
      proof: proof,
      proofCreatedAt: proof ? now : null,
      proofExpiresAt: proof ? now + PROOF_EXPIRY_MS : null,
      done: false
    });

    saveData();
    closeModal();
    document.getElementById('taskForm').reset();
    document.getElementById('taskProofLabel').innerText = 'புகைப்படம் இணைக்க தட்டவும்';
    initDateTimeDefaults();
    renderAll();
    showToast(`பணி ${assignedTo}-க்கு வெற்றிகரமாக ஒதுக்கப்பட்டது! 📋`);
  });

  // 2. Expense Form with Receipt Proof & Auto Capital Credit
  document.getElementById('expenseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const partner = document.getElementById('expPartner').value;
    const amount = Number(document.getElementById('expAmount').value);
    const category = document.getElementById('expCategory').value;
    const reason = document.getElementById('expReason').value.trim();
    const date = document.getElementById('expDate').value;
    const fileInput = document.getElementById('expProofInput');

    let proof = null;
    if (fileInput && fileInput.files[0]) {
      proof = await compressImage(fileInput.files[0]);
    }

    const now = Date.now();
    store.expenses.unshift({
      id: 'e_' + now,
      partner,
      amount,
      category: category || 'இதர செலவுகள்',
      reason,
      date: date || new Date().toISOString().split('T')[0],
      proof: proof,
      proofCreatedAt: proof ? now : null,
      proofExpiresAt: proof ? now + PROOF_EXPIRY_MS : null
    });

    saveData();
    closeModal();
    document.getElementById('expenseForm').reset();
    document.getElementById('expProofLabel').innerText = 'ரசீது இணைக்க தட்டவும்';
    initDateTimeDefaults();
    renderAll();
    showToast(`செலவு ₹${amount.toLocaleString('en-IN')} (${partner}) மூலதனத்தில் வரவு வைக்கப்பட்டது! 💰`);
  });

  // 3. Direct Capital Deposit Form
  document.getElementById('capitalForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const partner = document.getElementById('capPartner').value;
    const amount = Number(document.getElementById('capAmount').value);
    const note = document.getElementById('capNote').value.trim() || 'ஆரம்ப மூலதன முதலீடு';
    const date = document.getElementById('capDate').value;

    store.capitals.unshift({
      id: 'c_' + Date.now(),
      partner,
      amount,
      note,
      date: date || new Date().toISOString().split('T')[0]
    });

    saveData();
    closeModal();
    document.getElementById('capitalForm').reset();
    initDateTimeDefaults();
    renderAll();
    showToast(`மூலதன முதலீடு ₹${amount.toLocaleString('en-IN')} (${partner}) சேர்க்கப்பட்டது! 🏦`);
  });

  // 4. Work Log Form with Photo Proof
  document.getElementById('workForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const partner = document.getElementById('workPartner').value;
    const hours = Number(document.getElementById('workHours').value);
    const category = document.getElementById('workCategory').value;
    const desc = document.getElementById('workDesc').value.trim();
    const date = document.getElementById('workDate').value;
    const fileInput = document.getElementById('workProofInput');

    let proof = null;
    if (fileInput && fileInput.files[0]) {
      proof = await compressImage(fileInput.files[0]);
    }

    const now = Date.now();
    store.worklogs.unshift({
      id: 'w_' + now,
      partner,
      hours,
      category: category || 'செயல்பாடுகள்',
      desc,
      date: date || new Date().toISOString().split('T')[0],
      proof: proof,
      proofCreatedAt: proof ? now : null,
      proofExpiresAt: proof ? now + PROOF_EXPIRY_MS : null
    });

    saveData();
    closeModal();
    document.getElementById('workForm').reset();
    document.getElementById('workProofLabel').innerText = 'புகைப்படம் இணைக்க தட்டவும்';
    initDateTimeDefaults();
    renderAll();
    showToast(`உழைப்பு ${hours}h (${partner}) சேமிக்கப்பட்டது! ⏱️`);
  });
}

// ================= MASTER RENDERER =================
function renderAll() {
  renderKpis();
  renderFoundersSummary();
  renderCalendarStrip();
  renderTasks();
  renderWorklogs();
  renderCapitalAndLedger();
  renderSettlements();
  renderAnalyticsCharts();
}

// 1. KPI Top Bar
function renderKpis() {
  const totals = calculatePartnerContributions();
  const grandInvested = totals.Balaji.capital + totals.Nagoor.capital + totals.JP.capital;
  const grandSpent = totals.Balaji.expenses + totals.Nagoor.expenses + totals.JP.expenses;
  const balance = grandInvested - grandSpent;
  const pendingTasks = store.tasks.filter(t => !t.done).length;

  document.getElementById('kpi-total-invested').innerText = `₹${grandInvested.toLocaleString('en-IN')}`;
  document.getElementById('kpi-total-spent').innerText = `₹${grandSpent.toLocaleString('en-IN')}`;
  document.getElementById('kpi-cash-balance').innerText = `₹${balance.toLocaleString('en-IN')}`;
  document.getElementById('kpi-pending-tasks').innerText = pendingTasks;
  document.getElementById('taskCountBadge').innerText = pendingTasks;
}

// 2. Co-Founders Summary Cards
function renderFoundersSummary() {
  const totals = calculatePartnerContributions();
  const grandTotal = totals.Balaji.total + totals.Nagoor.total + totals.JP.total;

  const hours = { Balaji: 0, Nagoor: 0, JP: 0 };
  store.worklogs.forEach(w => {
    if (hours[w.partner] !== undefined) hours[w.partner] += Number(w.hours);
  });

  const taskStats = {
    Balaji: { total: 0, done: 0 },
    Nagoor: { total: 0, done: 0 },
    JP: { total: 0, done: 0 }
  };

  store.tasks.forEach(t => {
    const p = t.assignedTo || 'Balaji';
    if (taskStats[p]) {
      taskStats[p].total++;
      if (t.done) taskStats[p].done++;
    }
  });

  ['Balaji', 'Nagoor', 'JP'].forEach(p => {
    const key = p.toLowerCase();
    const pTotal = totals[p].total;
    const sharePct = grandTotal > 0 ? ((pTotal / grandTotal) * 100).toFixed(1) : '33.3';

    document.getElementById(`f-${key}-hours`).innerText = `${hours[p]}h`;
    document.getElementById(`f-${key}-tasks`).innerText = `${taskStats[p].done}/${taskStats[p].total}`;
    document.getElementById(`f-${key}-contrib`).innerText = `${sharePct}%`;
  });
}

// 3. Interactive Calendar Strip
function renderCalendarStrip() {
  const strip = document.getElementById('weeklyDaysStrip');
  if (!strip) return;
  strip.innerHTML = '';

  const today = new Date();
  const baseDate = new Date();
  baseDate.setDate(today.getDate() + (currentWeekOffset * 7));

  const dayOfWeek = baseDate.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const startOfWeek = new Date(baseDate);
  startOfWeek.setDate(baseDate.getDate() + diffToMonday);

  const monthIdx = startOfWeek.getMonth();
  const year = startOfWeek.getFullYear();
  document.getElementById('currentMonthName').innerText = `${TAMIL_MONTHS[monthIdx]} ${year}`;

  const todayStr = today.toISOString().split('T')[0];

  const filterBadge = document.getElementById('calFilterBadge');
  const filterText = document.getElementById('calFilterText');
  if (selectedDateFilter) {
    filterBadge.style.display = 'inline-flex';
    filterText.innerText = selectedDateFilter;
  } else {
    filterBadge.style.display = 'none';
  }

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    const isSelected = selectedDateFilter === dateStr;

    const hasTasks = store.tasks.some(t => t.dueDateTime && t.dueDateTime.startsWith(dateStr));
    const hasExpenses = store.expenses.some(e => e.date === dateStr);
    const hasWork = store.worklogs.some(w => w.date === dateStr);

    const cell = document.createElement('div');
    cell.className = `cal-day-cell ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}`;
    cell.onclick = () => toggleCalendarDate(dateStr);

    let dots = '<div class="cal-dots-row">';
    if (hasTasks) dots += '<span class="cal-dot dot-task" title="பணிகள்"></span>';
    if (hasExpenses) dots += '<span class="cal-dot dot-exp" title="செலவுகள்"></span>';
    if (hasWork) dots += '<span class="cal-dot dot-work" title="உழைப்பு"></span>';
    dots += '</div>';

    cell.innerHTML = `
      <span class="cal-day-name">${TAMIL_DAYS[d.getDay()].slice(0, 3)}</span>
      <span class="cal-day-num">${d.getDate()}</span>
      ${dots}
    `;
    strip.appendChild(cell);
  }
}

window.prevWeek = function() {
  currentWeekOffset--;
  renderCalendarStrip();
};

window.nextWeek = function() {
  currentWeekOffset++;
  renderCalendarStrip();
};

window.jumpToToday = function() {
  currentWeekOffset = 0;
  selectedDateFilter = new Date().toISOString().split('T')[0];
  renderAll();
  showToast('இன்றைய நாள் தேர்ந்தெடுக்கப்பட்டது 📅');
};

window.toggleCalendarDate = function(dateStr) {
  if (selectedDateFilter === dateStr) {
    selectedDateFilter = null;
  } else {
    selectedDateFilter = dateStr;
  }
  renderAll();
  if (selectedDateFilter) {
    showToast(`📅 ${selectedDateFilter} பதிவுகள்`);
  }
};

window.clearDateFilter = function() {
  selectedDateFilter = null;
  renderAll();
  showToast('அனைத்து நாட்களும் காட்டப்படுகின்றன 📅');
};

window.filterByPartner = function(partner) {
  activePartnerQuickFilter = activePartnerQuickFilter === partner ? 'all' : partner;
  const taskPartnerSelect = document.getElementById('taskPartnerFilter');
  const workPartnerSelect = document.getElementById('workPartnerFilter');
  if (taskPartnerSelect) taskPartnerSelect.value = activePartnerQuickFilter;
  if (workPartnerSelect) workPartnerSelect.value = activePartnerQuickFilter;
  renderTasks();
  renderWorklogs();
  showToast(activePartnerQuickFilter === 'all' ? 'அனைத்து பார்ட்னர்ஸ்' : `👤 ${activePartnerQuickFilter} பதிவுகள்`);
};

// ================= 4. TASKS TAB =================
function renderTasks() {
  const container = document.getElementById('tasksContainer');
  if (!container) return;
  container.innerHTML = '';

  const search = (document.getElementById('taskSearchInput')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('taskStatusFilter')?.value || 'all';
  const partnerFilter = document.getElementById('taskPartnerFilter')?.value || 'all';

  let list = store.tasks;

  if (selectedDateFilter) {
    list = list.filter(t => t.dueDateTime && t.dueDateTime.startsWith(selectedDateFilter));
  }
  if (partnerFilter !== 'all') {
    list = list.filter(t => (t.assignedTo === partnerFilter) || (t.assignedBy === partnerFilter));
  }
  if (statusFilter === 'pending') {
    list = list.filter(t => !t.done);
  } else if (statusFilter === 'completed') {
    list = list.filter(t => t.done);
  }
  if (search) {
    list = list.filter(t => t.title.toLowerCase().includes(search) || (t.assignedTo || '').toLowerCase().includes(search));
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-box">
        <div class="empty-icon">📋</div>
        <div class="empty-title">பணிகள் எதுவும் இல்லை</div>
        <div class="empty-desc">மேலே உள்ள "+ புதிய பணி ஒதுக்கீடு" பட்டனைத் தட்டி பணிகளை அசைன் செய்யவும்.</div>
      </div>
    `;
    return;
  }

  list.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card ${task.done ? 'is-done' : ''}`;

    const priorityClass = task.priority === 'urgent' ? 'priority-urgent' : (task.priority === 'high' ? 'priority-high' : 'priority-normal');
    const priorityLabel = task.priority === 'urgent' ? 'அவசரம்' : (task.priority === 'high' ? 'முக்கியம்' : 'இயல்பு');
    const formattedTime = formatDateTimePretty(task.dueDateTime);
    const proofHtml = task.proof ? `<button class="btn-proof-pill" onclick="openProofModal('${task.id}', 'task')">📸 சான்று பார்</button>` : '';

    card.innerHTML = `
      <div class="card-top-row">
        <div class="delegation-chip">
          <span>${task.assignedBy || 'Balaji'}</span>
          <span class="arrow">➔</span>
          <strong>${task.assignedTo || 'Nagoor'}</strong>
        </div>
        <div style="display:flex;align-items:center;gap:0.4rem;">
          <span class="priority-tag ${priorityClass}">${priorityLabel}</span>
          <button class="btn-delete-card" onclick="deleteTask('${task.id}')" title="பணியை நீக்கு">🗑️</button>
        </div>
      </div>

      <div class="task-main-row">
        <label class="custom-checkbox-wrap">
          <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask('${task.id}')">
        </label>
        <span class="task-title-text ${task.done ? 'line-through' : ''}">${escapeHtml(task.title)}</span>
      </div>

      <div class="card-meta-bottom">
        <span class="due-time-badge">⏰ ${formattedTime}</span>
        <div class="card-action-group">
          ${proofHtml}
          <button class="btn-wa-pill" onclick="shareTaskWhatsApp('${task.id}')" title="WhatsApp-ல் பகிர்">💬 WA</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

window.toggleTask = function(id) {
  const task = store.tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveData();
    renderAll();
    showToast(task.done ? 'பணி முடிந்தது என குறிக்கப்பட்டது! ✅' : 'பணி நிலுவைக்கு மாற்றப்பட்டது');
  }
};

window.deleteTask = function(id) {
  if (confirm('இந்தப் பணியை நிச்சயமாக நீக்க வேண்டுமா?')) {
    store.tasks = store.tasks.filter(t => t.id !== id);
    saveData();
    renderAll();
    showToast('பணி நீக்கப்பட்டது 🗑️');
  }
};

window.shareTaskWhatsApp = function(id) {
  const task = store.tasks.find(t => t.id === id);
  if (!task) return;

  const text = `🐟 *MeenMart Task Alert*\n\n📋 *பணி:* ${task.title}\n👤 *From:* ${task.assignedBy} ➔ *To:* ${task.assignedTo}\n⏰ *Due:* ${formatDateTimePretty(task.dueDateTime)}\n⚡ *நிலை:* ${task.done ? 'முடிந்தது ✅' : 'நிலுவையில் உள்ளது ⏳'}\n\nMeenMart Operations Hub`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

// ================= 5. WORK LOGS TAB =================
function renderWorklogs() {
  const container = document.getElementById('worklogsContainer');
  if (!container) return;
  container.innerHTML = '';

  const search = (document.getElementById('workSearchInput')?.value || '').toLowerCase();
  const partnerFilter = document.getElementById('workPartnerFilter')?.value || 'all';

  let list = store.worklogs;

  if (selectedDateFilter) {
    list = list.filter(w => w.date === selectedDateFilter);
  }
  if (partnerFilter !== 'all') {
    list = list.filter(w => w.partner === partnerFilter);
  }
  if (search) {
    list = list.filter(w => w.desc.toLowerCase().includes(search) || (w.partner || '').toLowerCase().includes(search));
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-box">
        <div class="empty-icon">⏱️</div>
        <div class="empty-title">உழைப்புப் பதிவுகள் இல்லை</div>
        <div class="empty-desc">மேலே உள்ள "உழைப்புப் பதிவு" பட்டனைத் தட்டி நேரத்தைப் பதிவு செய்யவும்.</div>
      </div>
    `;
    return;
  }

  list.forEach(log => {
    const card = document.createElement('div');
    card.className = 'work-card';
    const badgeClass = log.partner === 'Balaji' ? 'badge-balaji' : (log.partner === 'Nagoor' ? 'badge-nagoor' : 'badge-jp');
    const proofHtml = log.proof ? `<button class="btn-proof-pill" onclick="openProofModal('${log.id}', 'work')">📸 சான்று பார்</button>` : '';

    card.innerHTML = `
      <div class="card-top-row">
        <div style="display:flex;align-items:center;gap:0.4rem;">
          <span class="work-partner-badge ${badgeClass}">${log.partner}</span>
          <span style="font-size:0.68rem;color:var(--text-tertiary);">${log.category || 'செயல்பாடு'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.4rem;">
          <span class="work-hours-tag">⏱️ ${log.hours} மணிநேரம்</span>
          <button class="btn-delete-card" onclick="deleteWorklog('${log.id}')">🗑️</button>
        </div>
      </div>

      <div class="work-desc-text">${escapeHtml(log.desc)}</div>

      <div class="card-meta-bottom">
        <span>📅 ${log.date}</span>
        <div class="card-action-group">
          ${proofHtml}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

window.deleteWorklog = function(id) {
  if (confirm('இந்த உழைப்புப் பதிவை நீக்க வேண்டுமா?')) {
    store.worklogs = store.worklogs.filter(w => w.id !== id);
    saveData();
    renderAll();
    showToast('உழைப்புப் பதிவு நீக்கப்பட்டது 🗑️');
  }
};

// ================= 6. FINANCE & CAPITAL LEDGER =================
function renderCapitalAndLedger() {
  const breakdownContainer = document.getElementById('capitalBreakdownContainer');
  const feedContainer = document.getElementById('transactionFeedContainer');
  if (!breakdownContainer || !feedContainer) return;

  const totals = calculatePartnerContributions();
  const grandTotal = totals.Balaji.total + totals.Nagoor.total + totals.JP.total;

  let breakdownHtml = '';
  ['Balaji', 'Nagoor', 'JP'].forEach(p => {
    const pData = totals[p];
    const pct = grandTotal > 0 ? ((pData.total / grandTotal) * 100).toFixed(1) : '33.3';
    breakdownHtml += `
      <div class="capital-row-item">
        <div>
          <div class="cap-partner-name">${p}</div>
          <div class="cap-details-sub">மூலதனம்: ₹${pData.capital.toLocaleString('en-IN')} • செலவுகள்: ₹${pData.expenses.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div class="cap-total-val">₹${pData.total.toLocaleString('en-IN')}</div>
          <div class="cap-share-pct">${pct}% பங்களிப்பு</div>
        </div>
      </div>
    `;
  });
  breakdownContainer.innerHTML = breakdownHtml;

  // Build Unified Ledger Feed
  const allTx = [];

  store.capitals.forEach(c => {
    allTx.push({
      id: c.id,
      type: 'capital',
      partner: c.partner,
      amount: c.amount,
      title: `${c.partner} மூலதன முதலீடு`,
      subtitle: c.note || 'டெபாசிட்',
      date: c.date,
      proof: null
    });
  });

  store.expenses.forEach(e => {
    allTx.push({
      id: e.id,
      type: 'expense',
      partner: e.partner,
      amount: e.amount,
      title: `${e.partner} - ${e.category || 'வணிகச் செலவு'}`,
      subtitle: `${e.reason} (முதலீட்டு வரவு)`,
      date: e.date,
      proof: e.proof
    });
  });

  allTx.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  let filtered = allTx;
  if (selectedDateFilter) {
    filtered = filtered.filter(t => t.date === selectedDateFilter);
  }

  document.getElementById('txCountBadge').innerText = `${filtered.length} பதிவுகள்`;

  if (filtered.length === 0) {
    feedContainer.innerHTML = `
      <div class="empty-box">
        <div class="empty-icon">💳</div>
        <div class="empty-title">பரிவர்த்தனைகள் எதுவும் இல்லை</div>
        <div class="empty-desc">செலவு அல்லது மூலதனத்தை பதிவு செய்யும்போது வரலாறு தானாகத் தோன்றும்.</div>
      </div>
    `;
    return;
  }

  let txHtml = '';
  filtered.forEach(tx => {
    const isCap = tx.type === 'capital';
    const pillClass = isCap ? 'tx-type-capital' : 'tx-type-expense';
    const icon = isCap ? '🏦' : '💰';
    const proofHtml = tx.proof ? `<button class="btn-proof-pill" onclick="openProofModal('${tx.id}', 'expense')">🧾 ரசீது</button>` : '';

    txHtml += `
      <div class="tx-card">
        <div class="tx-left">
          <div class="tx-type-pill ${pillClass}">${icon}</div>
          <div class="tx-info">
            <span class="tx-title">${escapeHtml(tx.title)}</span>
            <span class="tx-subtitle">${escapeHtml(tx.subtitle)} • 📅 ${tx.date}</span>
          </div>
        </div>
        <div class="tx-right">
          ${proofHtml}
          <div class="tx-amount">+₹${Number(tx.amount).toLocaleString('en-IN')}</div>
        </div>
      </div>
    `;
  });
  feedContainer.innerHTML = txHtml;
}

function calculatePartnerContributions() {
  const res = {
    Balaji: { capital: 0, expenses: 0, total: 0 },
    Nagoor: { capital: 0, expenses: 0, total: 0 },
    JP: { capital: 0, expenses: 0, total: 0 }
  };

  store.capitals.forEach(c => {
    if (res[c.partner]) res[c.partner].capital += Number(c.amount);
  });

  store.expenses.forEach(e => {
    if (res[e.partner]) res[e.partner].expenses += Number(e.amount);
  });

  ['Balaji', 'Nagoor', 'JP'].forEach(p => {
    res[p].total = res[p].capital + res[p].expenses;
  });

  return res;
}

// ================= 7. 3-WAY FAIR SETTLEMENT ENGINE =================
function renderSettlements() {
  const container = document.getElementById('settleListContainer');
  if (!container) return;

  const totalSpent = store.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fairShare = totalSpent / 3;

  const paid = { Balaji: 0, Nagoor: 0, JP: 0 };
  store.expenses.forEach(e => {
    if (paid[e.partner] !== undefined) paid[e.partner] += Number(e.amount);
  });

  const net = {
    Balaji: paid.Balaji - fairShare,
    Nagoor: paid.Nagoor - fairShare,
    JP: paid.JP - fairShare
  };

  const debtors = [];
  const creditors = [];

  ['Balaji', 'Nagoor', 'JP'].forEach(name => {
    const val = Math.round(net[name]);
    if (val < -1) debtors.push({ name, amount: -val });
    else if (val > 1) creditors.push({ name, amount: val });
  });

  const settlements = [];
  let d = 0, c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amt = Math.min(debtors[d].amount, creditors[c].amount);
    settlements.push({ from: debtors[d].name, to: creditors[c].name, amount: amt });
    debtors[d].amount -= amt;
    creditors[c].amount -= amt;
    if (debtors[d].amount === 0) d++;
    if (creditors[c].amount === 0) c++;
  }

  if (settlements.length === 0) {
    container.innerHTML = `
      <div style="font-size:0.82rem;color:var(--accent-green);font-weight:600;padding:0.6rem;text-align:center;background:var(--color-nagoor-bg);border-radius:var(--radius-sm);">
        ✅ செலவு பகிர்வு சமமாக உள்ளது! பார்ட்னர்களுக்குள் எந்த பாக்கியும் இல்லை.
      </div>
    `;
  } else {
    let html = '';
    settlements.forEach(t => {
      html += `
        <div class="settle-item">
          <div>
            <div class="settle-direction"><strong>${t.from}</strong> ➔ <strong>${t.to}</strong></div>
            <div class="settle-sub">வழங்க வேண்டிய தீர்வுத் தொகை</div>
          </div>
          <div style="display:flex;align-items:center;gap:0.55rem;">
            <span class="settle-amount">₹${t.amount.toLocaleString('en-IN')}</span>
            <button class="btn-paid-badge" onclick="markSettled('${t.from}', '${t.to}', ${t.amount})">Paid ✅</button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }
}

window.markSettled = function(from, to, amount) {
  if (confirm(`${from} அவர்கள் ${to} அவர்களுக்கு ₹${amount} வழங்கிவிட்டதை உறுதிசெய்கிறீர்களா?`)) {
    store.expenses.push({
      id: 'e_' + Date.now(),
      partner: from,
      category: 'செட்டில்மென்ட் தீர்வு',
      reason: `Settlement: ${from} ➔ ${to}`,
      amount: amount,
      date: new Date().toISOString().split('T')[0]
    });
    saveData();
    renderAll();
    showToast('தீர்வு பரிவர்த்தனை கணக்கில் சேர்க்கப்பட்டது! 🤝');
  }
};

window.shareSettlementWhatsApp = function() {
  const totals = calculatePartnerContributions();
  const totalSpent = store.expenses.reduce((s, e) => s + Number(e.amount), 0);
  const fairShare = Math.round(totalSpent / 3);

  let text = `🐟 *MeenMart 3-Way Expense Settlement*\n\n💰 *மொத்த வணிகச் செலவு:* ₹${totalSpent.toLocaleString('en-IN')}\n🎯 *தலா பங்கு (Fair Share):* ₹${fairShare.toLocaleString('en-IN')}\n\n*செலவு செய்த விவரம்:*\n• Balaji: ₹${totals.Balaji.expenses.toLocaleString('en-IN')}\n• Nagoor: ₹${totals.Nagoor.expenses.toLocaleString('en-IN')}\n• JP: ₹${totals.JP.expenses.toLocaleString('en-IN')}\n\nMeenMart Operations Hub`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

// ================= 8. 3D PERFORMANCE ANALYTICS CHARTS =================
function renderAnalyticsCharts() {
  if (typeof Chart === 'undefined') return;

  const tooltipCfg = {
    backgroundColor: '#1a1c24',
    titleColor: '#ffffff',
    bodyColor: '#f2f3f8',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    bodyFont: { family: 'Plus Jakarta Sans', weight: '400', size: 12 },
    titleFont: { family: 'Plus Jakarta Sans', weight: '700', size: 13 }
  };

  const totals = calculatePartnerContributions();
  const grandTotal = totals.Balaji.total + totals.Nagoor.total + totals.JP.total;

  // Chart 1: Co-Founder Work Hours (Bar Chart)
  const hours = { Balaji: 0, Nagoor: 0, JP: 0 };
  store.worklogs.forEach(w => {
    if (hours[w.partner] !== undefined) hours[w.partner] += Number(w.hours);
  });

  const hoursCtx = document.getElementById('workHoursChart')?.getContext('2d');
  if (hoursCtx) {
    if (workHoursChartInst) workHoursChartInst.destroy();
    workHoursChartInst = new Chart(hoursCtx, {
      type: 'bar',
      data: {
        labels: ['Balaji (Tech)', 'Nagoor (Procure)', 'JP (Sales)'],
        datasets: [{
          label: 'Hours',
          data: [hours.Balaji, hours.Nagoor, hours.JP],
          backgroundColor: ['#689ff8', '#5cdb95', '#fec84d'],
          borderRadius: 8,
          maxBarThickness: 42
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipCfg,
            callbacks: { label: (ctx) => ` ${ctx.raw} மணிநேரம் உழைப்பு` }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#656b7c', font: { family: 'Plus Jakarta Sans', size: 11 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          x: {
            ticks: { color: '#f2f3f8', font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  // Chart 2: Task Completion Progress (Donut Chart)
  const doneCount = store.tasks.filter(t => t.done).length;
  const pendingCount = store.tasks.filter(t => !t.done).length;

  const taskCtx = document.getElementById('taskStatusChart')?.getContext('2d');
  if (taskCtx) {
    const hasTasks = (doneCount + pendingCount) > 0;
    const taskData = hasTasks ? [doneCount, pendingCount] : [1, 0];
    const taskColors = hasTasks ? ['#5cdb95', '#fec84d'] : ['#222530', '#222530'];

    if (taskStatusChartInst) taskStatusChartInst.destroy();
    taskStatusChartInst = new Chart(taskCtx, {
      type: 'doughnut',
      data: {
        labels: ['முடிந்தது (Done)', 'நிலுவை (Pending)'],
        datasets: [{
          data: taskData,
          backgroundColor: taskColors,
          borderColor: '#121318',
          borderWidth: 3,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        animation: { duration: 600 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9da3b4', font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 }, boxWidth: 12 }
          },
          tooltip: {
            ...tooltipCfg,
            callbacks: {
              label: (ctx) => {
                if (!hasTasks) return ' பணிகள் எதுவும் இல்லை';
                return ` ${ctx.label}: ${ctx.raw} பணிகள்`;
              }
            }
          }
        }
      }
    });
  }

  // Chart 3: Capital & Expense Share Split (Donut Chart)
  const capCtx = document.getElementById('capitalShareChart')?.getContext('2d');
  if (capCtx) {
    const hasCap = grandTotal > 0;
    const capData = hasCap ? [totals.Balaji.total, totals.Nagoor.total, totals.JP.total] : [1, 1, 1];
    const capColors = hasCap ? ['#689ff8', '#5cdb95', '#fec84d'] : ['#222530', '#222530', '#222530'];

    if (capitalShareChartInst) capitalShareChartInst.destroy();
    capitalShareChartInst = new Chart(capCtx, {
      type: 'doughnut',
      data: {
        labels: ['Balaji', 'Nagoor', 'JP'],
        datasets: [{
          data: capData,
          backgroundColor: capColors,
          borderColor: '#121318',
          borderWidth: 3,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        animation: { duration: 600 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9da3b4', font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 }, boxWidth: 12 }
          },
          tooltip: {
            ...tooltipCfg,
            callbacks: {
              label: (ctx) => {
                if (!hasCap) return ' பதிவுகள் இல்லை';
                const pct = ((ctx.raw / grandTotal) * 100).toFixed(1);
                return ` ₹${ctx.raw.toLocaleString('en-IN')} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // Chart 4: Expense Categories Breakdown (Polar / Bar)
  const catMap = {};
  store.expenses.forEach(e => {
    const cat = e.category || 'இதர செலவுகள்';
    catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
  });

  const catLabels = Object.keys(catMap);
  const catData = Object.values(catMap);

  const catCtx = document.getElementById('expenseCategoryChart')?.getContext('2d');
  if (catCtx) {
    if (expenseCategoryChartInst) expenseCategoryChartInst.destroy();
    expenseCategoryChartInst = new Chart(catCtx, {
      type: 'bar',
      data: {
        labels: catLabels.length > 0 ? catLabels : ['மீன் கொள்முதல்', 'பேக்கிங்'],
        datasets: [{
          label: 'Expenses ₹',
          data: catData.length > 0 ? catData : [0, 0],
          backgroundColor: ['#689ff8', '#5cdb95', '#fec84d', '#ff6b6b', '#b588f8', '#25d366'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipCfg,
            callbacks: { label: (ctx) => ` ₹${ctx.raw.toLocaleString('en-IN')}` }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#656b7c', font: { family: 'Plus Jakarta Sans', size: 10 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          x: {
            ticks: { color: '#9da3b4', font: { family: 'Plus Jakarta Sans', size: 10 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  // Update Insight Text
  const totalWorkHours = hours.Balaji + hours.Nagoor + hours.JP;
  const insightEl = document.getElementById('analyticsInsightText');
  if (insightEl) {
    insightEl.innerHTML = `
      🔥 <strong>செயல்பாட்டு சுருக்கம்:</strong> இதுவரை மொத்தம் <strong>${totalWorkHours} மணிநேரம்</strong> உழைப்பு பதிவாகியுள்ளது. 
      மொத்த பணிகளில் <strong>${doneCount} முடிந்துள்ளன</strong>, <strong>${pendingCount} நிலுவையில்</strong> உள்ளன. 
      நிதிப் பங்களிப்பில் Balaji: <strong>₹${totals.Balaji.total.toLocaleString('en-IN')}</strong>, Nagoor: <strong>₹${totals.Nagoor.total.toLocaleString('en-IN')}</strong>, JP: <strong>₹${totals.JP.total.toLocaleString('en-IN')}</strong>.
    `;
  }
}

// ================= 9. LIGHTBOX PHOTO VIEWER =================
let currentProofData = null;

window.openProofModal = function(itemId, type) {
  let item = null;
  if (type === 'task') item = store.tasks.find(t => t.id === itemId);
  else if (type === 'expense') item = store.expenses.find(e => e.id === itemId);
  else if (type === 'work') item = store.worklogs.find(w => w.id === itemId);

  if (!item || !item.proof) return;
  currentProofData = item.proof;

  const modal = document.getElementById('proofLightboxModal');
  const img = document.getElementById('proofModalImg');
  const tagEl = document.getElementById('proofModalTag');
  const partnerEl = document.getElementById('proofModalPartner');
  const expiryEl = document.getElementById('proofModalExpiry');

  img.src = item.proof;
  tagEl.innerText = type === 'task' ? 'பணி சான்று' : (type === 'expense' ? 'பில் ரசீது' : 'உழைப்பு சான்று');
  partnerEl.innerText = `பதிவு: ${item.assignedTo || item.partner || 'MeenMart'}`;

  if (item.proofExpiresAt) {
    const remainingMs = item.proofExpiresAt - Date.now();
    const remainingHours = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60)));
    expiryEl.innerText = `⏳ இன்னும் ${remainingHours} மணிநேரத்தில் தானாக அழியும்`;
  } else {
    expiryEl.innerText = `⏳ 48 மணிநேரத்தில் தானாக அழியும்`;
  }

  modal.classList.add('open');
};

window.closeProofModal = function() {
  document.getElementById('proofLightboxModal')?.classList.remove('open');
  currentProofData = null;
};

window.downloadCurrentProof = function() {
  if (!currentProofData) return;
  const a = document.createElement('a');
  a.href = currentProofData;
  a.download = `MeenMart_Proof_${Date.now()}.jpg`;
  a.click();
};

// ================= 10. BACKUP & EXPORT HELPERS =================
window.exportDataJSON = function() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(store, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `MeenMart_Hub_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  showToast('பேக்கப் கோப்பு பதிவிறக்கம் செய்யப்பட்டது 💾');
};

window.importDataJSON = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.tasks && imported.expenses) {
        store = imported;
        saveData();
        renderAll();
        closeModal();
        showToast('தரவுகள் வெற்றிகரமாக மீட்டெடுக்கப்பட்டன! ✅');
      } else {
        alert('தவறான கோப்பு வடிவம் (Invalid JSON format)');
      }
    } catch (err) {
      alert('கோப்பை வாசிப்பதில் பிழை ஏற்பட்டது');
    }
  };
  reader.readAsText(file);
};

window.exportLedgerCSV = function() {
  const allTx = [];
  store.capitals.forEach(c => {
    allTx.push({ Date: c.date, Partner: c.partner, Type: 'Capital', Category: 'Deposit', Amount: c.amount, Notes: c.note || '' });
  });
  store.expenses.forEach(e => {
    allTx.push({ Date: e.date, Partner: e.partner, Type: 'Expense', Category: e.category, Amount: e.amount, Notes: e.reason });
  });

  allTx.sort((a, b) => b.Date.localeCompare(a.Date));

  let csvContent = 'Date,Partner,Type,Category,Amount,Notes\n';
  allTx.forEach(row => {
    csvContent += `"${row.Date}","${row.Partner}","${row.Type}","${row.Category}","${row.Amount}","${row.Notes.replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MeenMart_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('CSV கோப்பு பதிவிறக்கம் செய்யப்பட்டது 📥');
};

window.shareDaySummaryWhatsApp = function() {
  const todayStr = new Date().toISOString().split('T')[0];
  const pending = store.tasks.filter(t => !t.done).length;
  const done = store.tasks.filter(t => t.done).length;

  const hours = { Balaji: 0, Nagoor: 0, JP: 0 };
  store.worklogs.filter(w => w.date === todayStr).forEach(w => {
    if (hours[w.partner] !== undefined) hours[w.partner] += Number(w.hours);
  });

  const todaySpent = store.expenses.filter(e => e.date === todayStr).reduce((s, e) => s + Number(e.amount), 0);

  const text = `🐟 *MeenMart Daily Operations Summary (${todayStr})*\n\n📋 *பணிகள்:* ${done} முடிந்தது | ${pending} நிலுவை\n💰 *இன்றைய செலவு:* ₹${todaySpent.toLocaleString('en-IN')}\n\n⏱️ *இன்றைய உழைப்பு நேரம்:*\n• Balaji: ${hours.Balaji}h\n• Nagoor: ${hours.Nagoor}h\n• JP: ${hours.JP}h\n\nMeenMart Operations Hub`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

window.loadSampleDemoData = function() {
  seedInitialDemoData();
  saveData();
  renderAll();
  closeModal();
  showToast('மாதிரி தரவுகள் ஏற்றப்பட்டன! 🔄');
};

window.wipeAllData = function() {
  if (confirm('அனைத்து தரவுகளையும் அழிக்க நிச்சயமாக விரும்புகிறீர்களா?')) {
    store = JSON.parse(JSON.stringify(DEFAULT_STATE));
    saveData();
    renderAll();
    closeModal();
    showToast('அனைத்து தரவுகளும் அழிக்கப்பட்டன 🗑️');
  }
};

function seedInitialDemoData() {
  const today = new Date().toISOString().split('T')[0];
  store = {
    tasks: [
      {
        id: 't_1',
        title: 'காசிமேடு மார்க்கெட்டில் 15kg பிரெஷ் வஞ்சிரம் மற்றும் 8kg இறால் கொள்முதல்',
        assignedBy: 'Balaji',
        assignedTo: 'Nagoor',
        priority: 'urgent',
        dueDateTime: `${today}T06:30`,
        proof: null,
        done: true
      },
      {
        id: 't_2',
        title: 'அண்ணா நகர் & டி.நகர் வாடிக்கையாளர் ஆர்டர்கள் பேக்கிங் & தரம் சரிபார்த்தல்',
        assignedBy: 'Nagoor',
        assignedTo: 'JP',
        priority: 'high',
        dueDateTime: `${today}T08:30`,
        proof: null,
        done: true
      },
      {
        id: 't_3',
        title: 'MeenMart ஆன்ட்ராய்டு ஆப் புதிய வெர்ஷன் அப்டேட் & கேஷ்ப்ரீ பேமெண்ட் கேட்வே சோதனை',
        assignedBy: 'JP',
        assignedTo: 'Balaji',
        priority: 'normal',
        dueDateTime: `${today}T18:00`,
        proof: null,
        done: false
      }
    ],
    expenses: [
      {
        id: 'e_1',
        partner: 'Nagoor',
        amount: 8500,
        category: 'மீன் கொள்முதல்',
        reason: 'காசிமேடு துறைமுகம் வஞ்சிரம் & சீலா மீன் கொள்முதல்',
        date: today,
        proof: null
      },
      {
        id: 'e_2',
        partner: 'JP',
        amount: 1200,
        category: 'டெலிவரி & பெட்ரோல்',
        reason: 'டெலிவரி வாகன பெட்ரோல் & பேக்கிங் பாக்ஸ்',
        date: today,
        proof: null
      },
      {
        id: 'e_3',
        partner: 'Balaji',
        amount: 2400,
        category: 'ஆப் & சர்வர்',
        reason: 'Google Cloud & Firebase ஹோஸ்டிங் சர்வர் சந்தா',
        date: today,
        proof: null
      }
    ],
    capitals: [
      { id: 'c_1', partner: 'Balaji', amount: 30000, note: 'ஆரம்ப மூலதன முதலீடு', date: today },
      { id: 'c_2', partner: 'Nagoor', amount: 30000, note: 'ஆரம்ப மூலதன முதலீடு', date: today },
      { id: 'c_3', partner: 'JP', amount: 30000, note: 'ஆரம்ப மூலதன முதலீடு', date: today }
    ],
    worklogs: [
      {
        id: 'w_1',
        partner: 'Nagoor',
        hours: 5.5,
        category: 'மீன் கொள்முதல்',
        desc: 'காலை 4:30 முதல் காசிமேடு மார்க்கெட்டில் இருந்து மீன் தேர்வு செய்து பேக்கிங் ஒப்படைத்தேன்.',
        date: today,
        proof: null
      },
      {
        id: 'w_2',
        partner: 'JP',
        hours: 6.0,
        category: 'டெலிவரி மேலாண்மை',
        desc: '14 வீடுகளுக்கு காலை 8 மணிக்குள் டெலிவரி செய்து பணம் பெற்றேன்.',
        date: today,
        proof: null
      },
      {
        id: 'w_3',
        partner: 'Balaji',
        hours: 7.0,
        category: 'ஆப் & டெவலப்மென்ட்',
        desc: 'MeenMart Android App-ல் புஷ் நோட்டிபிகேஷன் மற்றும் லைவ் டிராக்கிங் சரிசெய்தேன்.',
        date: today,
        proof: null
      }
    ]
  };
}

// ================= MODAL CONTROLS & HELPERS =================
window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });
  if (tabId === 'analyticsTab') {
    renderAnalyticsCharts();
  }
};

window.openModal = function(modalId) {
  initDateTimeDefaults();
  const m = document.getElementById(modalId);
  if (m) m.classList.add('open');
};

window.closeModal = function() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
};

function formatDateTimePretty(dtStr) {
  if (!dtStr) return 'தேதியில்லை';
  try {
    const dt = new Date(dtStr);
    const datePart = `${dt.getDate()} ${TAMIL_MONTHS[dt.getMonth()].slice(0, 3)}`;
    let hours = dt.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    return `${datePart} • ${hours}:${minutes} ${ampm}`;
  } catch (e) {
    return dtStr;
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add('visible');
  setTimeout(() => { toast.classList.remove('visible'); }, 2600);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
