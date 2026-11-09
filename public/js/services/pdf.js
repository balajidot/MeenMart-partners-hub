// ==============================================================================
// 📄 PDF & INVOICE SERVICES (Client-side HTML2PDF & Direct Download Engine)
// ==============================================================================
import { state } from '../state.js';
import { PARTNERS } from '../config.js';
import { 
  formatINR, 
  escapeHtml, 
  getTodayString, 
  getYesterdayString, 
  getThisWeekStart, 
  getThisMonthStart, 
  getWeekRange, 
  getWeekFinancialSummary, 
  getPartnerPreviousPendingDue, 
  getCategoryLabel,
  showToast 
} from '../utils.js';

    async function ensureHtml2PdfLoaded() {
      if (typeof html2pdf !== 'undefined') return true;
      return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        s.onload = () => resolve(true);
        s.onerror = () => {
          console.warn("Failed to load html2pdf.js dynamically");
          resolve(false);
        };
        document.head.appendChild(s);
      });
    }

    let currentStatementState = null;

    export async function exportToPDF() {
      if (!state.transactions || state.transactions.length === 0) {
        alert("PDF export panna entries edhum illa!");
        return;
      }

      // Read current filters from History tab
      const search = (document.getElementById('historySearchInput')?.value || '').toLowerCase().trim();
      const filterType = document.getElementById('hFilterType')?.value || 'all';
      const filterPartner = document.getElementById('hFilterPartner')?.value || 'all';
      const filterDate = state.historyFilter?.date || 'all';

      const todayStr = getTodayString();
      const yesterdayStr = getYesterdayString();
      const monStr = getThisWeekStart();
      const monthStartStr = getThisMonthStart();

      let filtered = (state.transactions || []).filter(tx => {
        if (filterDate === 'today' && tx.date !== todayStr) return false;
        if (filterDate === 'yesterday' && tx.date !== yesterdayStr) return false;
        if (filterDate === 'this-week' && (tx.date < monStr || tx.date > todayStr)) return false;
        if (filterDate === 'this-month' && tx.date < monthStartStr) return false;
        if (filterType !== 'all' && tx.type !== filterType) return false;
        if (filterPartner !== 'all' && tx.partner !== filterPartner) return false;
        if (search) {
          const matchDesc = (tx.description || '').toLowerCase().includes(search);
          const matchCat = (tx.category || '').toLowerCase().includes(search);
          const matchPartner = (tx.partner || '').toLowerCase().includes(search);
          const matchAmount = String(tx.amount || '').includes(search);
          if (!matchDesc && !matchCat && !matchPartner && !matchAmount) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        alert("Filter-ku thagundhamari entries illa!");
        return;
      }

      filtered.sort((a, b) => {
        if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      let totalSales = 0;
      let totalExp = 0;
      let totalTransfers = 0;
      let totalCap = 0;

      const pSummary = {
        Balaji: { sales: 0, exp: 0, transfersOut: 0, transfersIn: 0 },
        Nagoor: { sales: 0, exp: 0, transfersOut: 0, transfersIn: 0 },
        JP: { sales: 0, exp: 0, transfersOut: 0, transfersIn: 0 }
      };

      filtered.forEach(tx => {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'sales') {
          totalSales += amt;
          if (pSummary[tx.partner]) pSummary[tx.partner].sales += amt;
        } else if (tx.type === 'expense') {
          totalExp += amt;
          if (pSummary[tx.partner]) pSummary[tx.partner].exp += amt;
        } else if (tx.type === 'transfer') {
          totalTransfers += amt;
          if (pSummary[tx.partner]) pSummary[tx.partner].transfersOut += amt;
          if (tx.toPartner && pSummary[tx.toPartner]) pSummary[tx.toPartner].transfersIn += amt;
        } else if (tx.type === 'investment') {
          totalCap += amt;
        }
      });

      const netProfit = totalSales - totalExp;
      const isProfit = netProfit >= 0;

      let filterTitle = 'All Transactions';
      if (filterDate === 'today') filterTitle = "Today (" + todayStr + ")";
      else if (filterDate === 'yesterday') filterTitle = "Yesterday (" + yesterdayStr + ")";
      else if (filterDate === 'this-week') filterTitle = "This Week (" + monStr + " to " + todayStr + ")";
      else if (filterDate === 'this-month') filterTitle = "This Month (" + monthStartStr + " to " + todayStr + ")";

      const nowFormatted = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      const stmtNo = `MM-STMT-${todayStr.replace(/-/g, '').slice(2)}`;

      currentStatementState = {
        stmtNo,
        filterTitle,
        totalSales,
        totalExp,
        netProfit,
        isProfit,
        filteredCount: filtered.length,
        pSummary
      };

      const rowsHtml = filtered.map((tx, idx) => {
        const isExp = tx.type === 'expense';
        const isSales = tx.type === 'sales';
        const isTransfer = tx.type === 'transfer';
        const isCapital = tx.type === 'investment';

        let typeLabel = 'Varavu';
        let typeColor = '#059669';
        let typeBg = '#ecfdf5';
        let sign = '+';

        if (isExp) {
          typeLabel = 'Selavu';
          typeColor = '#e11d48';
          typeBg = '#fff1f2';
          sign = '-';
        } else if (isTransfer) {
          typeLabel = 'Transfer';
          typeColor = '#0284c7';
          typeBg = '#f0f9ff';
          sign = '';
        } else if (isCapital) {
          typeLabel = 'Mudhaleedu';
          typeColor = '#7c3aed';
          typeBg = '#f5f3ff';
          sign = '+';
        }

        let desc = tx.description ? escapeHtml(tx.description) : '-';
        if (isTransfer && tx.toPartner) {
          desc = `<span style="color:#0284c7; font-weight:800;">${tx.partner} ➔ ${tx.toPartner}</span>: ${desc}`;
        }
        const cat = getCategoryLabel(tx.type, tx.category) || tx.category || '-';

        let time = '';
        if (tx.createdAt) {
          const d = new Date(tx.createdAt);
          if (!isNaN(d.getTime())) time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        }

        return `
          <tr style="border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 10px;">
            <td style="padding: 7px 6px; text-align: center; color: #94a3b8;">${idx + 1}</td>
            <td style="padding: 7px 6px; white-space: nowrap; color: #334155;">
              <strong style="color: #0f172a;">${tx.date}</strong>
              ${time ? `<div style="color: #94a3b8; font-size: 8px;">${time}</div>` : ''}
            </td>
            <td style="padding: 7px 6px; font-weight: 700; color: #0f172a;">${tx.partner}</td>
            <td style="padding: 7px 6px; color: #1e293b; max-width: 200px; word-break: break-word;">${desc}</td>
            <td style="padding: 7px 6px; color: #64748b; font-size: 9px;">${cat}</td>
            <td style="padding: 7px 6px; text-align: center;">
              <span style="background: ${typeBg}; color: ${typeColor}; padding: 2px 6px; border-radius: 6px; font-weight: 800; font-size: 8px; display: inline-block;">${typeLabel}</span>
            </td>
            <td style="padding: 7px 6px; text-align: right; font-weight: 900; color: ${typeColor}; font-size: 11px; white-space: nowrap;">
              ${sign}${formatINR(tx.amount)}
            </td>
          </tr>
        `;
      }).join('');

      const printArea = document.getElementById('accountsStatementPrintArea');
      const modal = document.getElementById('accountsStatementModal');
      if (!printArea || !modal) {
        alert("Statement preview container not found!");
        return;
      }

      printArea.innerHTML = `
        <div class="rounded-3xl p-5 bg-white text-slate-800 border-2 border-slate-200/90 shadow-xl space-y-3.5" style="background:#ffffff; color:#0f172a; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;">
          
          <!-- Header -->
          <div class="flex items-start justify-between pb-3 border-b-2 border-teal-600">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-2xl">🐟</span>
                <div>
                  <h2 class="text-base font-black tracking-tight text-slate-900 leading-none">MEENMART HUB</h2>
                  <span class="text-[9px] uppercase tracking-widest font-black text-teal-600 block mt-1">Official Accounts & Ledger Statement</span>
                </div>
              </div>
              <p class="text-[10px] text-slate-400 font-semibold mt-1">தினசரி நிதி & கணக்கு மேலாண்மை அறிக்கை</p>
            </div>
            <div class="text-right">
              <span class="text-[9px] font-mono font-bold text-slate-400 block">${stmtNo}</span>
              <span class="text-[10px] font-black text-slate-700 block mt-0.5">${filterTitle}</span>
              <span class="text-[8px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block border border-teal-200">${filtered.length} Entries</span>
            </div>
          </div>

          <!-- Summary KPI Grid (3 Columns) -->
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span class="text-[8px] uppercase tracking-wider font-extrabold text-emerald-700 block">Total Income (வரவு)</span>
              <strong class="text-sm font-black text-emerald-800 block mt-0.5">+${formatINR(totalSales)}</strong>
            </div>
            <div class="p-2.5 rounded-2xl bg-rose-50/70 border border-rose-200">
              <span class="text-[8px] uppercase tracking-wider font-extrabold text-rose-700 block">Total Expenses (செலவு)</span>
              <strong class="text-sm font-black text-rose-800 block mt-0.5">-${formatINR(totalExp)}</strong>
            </div>
            <div class="p-2.5 rounded-2xl ${isProfit ? 'bg-teal-50/70 border-teal-200' : 'bg-rose-50/70 border-rose-200'} border">
              <span class="text-[8px] uppercase tracking-wider font-extrabold ${isProfit ? 'text-teal-700' : 'text-rose-700'} block">${isProfit ? 'Net Profit (லாபம்)' : 'Net Loss (நஷ்டம்)'}</span>
              <strong class="text-sm font-black ${isProfit ? 'text-teal-800' : 'text-rose-800'} block mt-0.5">${isProfit ? '+' : ''}${formatINR(netProfit)}</strong>
            </div>
          </div>

          <!-- Partner Financial Summary Cards -->
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Partner Spends & Collections Breakdown</div>
            <div class="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div class="p-2 rounded-xl bg-white border border-slate-200">
                <strong class="text-slate-800 font-extrabold block">Balaji</strong>
                <span class="text-[9px] text-rose-600 block">Spends: ${formatINR(pSummary.Balaji.exp)}</span>
                <span class="text-[9px] text-emerald-600 block font-bold">Income: ${formatINR(pSummary.Balaji.sales)}</span>
              </div>
              <div class="p-2 rounded-xl bg-white border border-slate-200">
                <strong class="text-slate-800 font-extrabold block">Nagoor</strong>
                <span class="text-[9px] text-rose-600 block">Fish: ${formatINR(pSummary.Nagoor.exp)}</span>
                <span class="text-[9px] text-slate-400 block">Income: ${formatINR(pSummary.Nagoor.sales)}</span>
              </div>
              <div class="p-2 rounded-xl bg-white border border-slate-200">
                <strong class="text-slate-800 font-extrabold block">JP</strong>
                <span class="text-[9px] text-rose-600 block">Petrol: ${formatINR(pSummary.JP.exp)}</span>
                <span class="text-[9px] text-slate-400 block">Income: ${formatINR(pSummary.JP.sales)}</span>
              </div>
            </div>
          </div>

          <!-- Detailed Entries Table -->
          <div class="space-y-1.5 pt-1">
            <div class="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              <span>Detailed Entries (${filtered.length} Records)</span>
              <span>Net Total: ${formatINR(netProfit)}</span>
            </div>
            <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <thead>
                <tr style="background: #f1f5f9; color: #475569; font-weight: 800; font-size: 9px; text-transform: uppercase;">
                  <th style="padding: 8px 6px; text-align: center; width: 28px;">#</th>
                  <th style="padding: 8px 6px; text-align: left; width: 75px;">Date</th>
                  <th style="padding: 8px 6px; text-align: left; width: 65px;">Partner</th>
                  <th style="padding: 8px 6px; text-align: left;">Notes / Description</th>
                  <th style="padding: 8px 6px; text-align: left; width: 95px;">Category</th>
                  <th style="padding: 8px 6px; text-align: center; width: 70px;">Type</th>
                  <th style="padding: 8px 6px; text-align: right; width: 75px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc; font-weight: 900; border-top: 2px solid #cbd5e1;">
                  <td colspan="6" style="padding: 8px; text-align: right; color: #475569; font-size: 10px;">NET TOTAL (LAABAM):</td>
                  <td style="padding: 8px; text-align: right; color: ${isProfit ? '#059669' : '#e11d48'}; font-size: 12px;">${isProfit ? '+' : ''}${formatINR(netProfit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Footer Verification -->
          <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-400 font-mono">
            <span>MeenMart Hub Official Financial Statement • Reconciled</span>
            <span>Generated: ${nowFormatted} by ${state.currentPartner || 'Balaji'}</span>
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
      if (typeof window.pushModalState === 'function') {
        window.pushModalState('accountsStatementModal');
      }
    }

    export async function saveOrShareAccountsStatementPDF() {
      const area = document.getElementById('accountsStatementPrintArea');
      const btn = document.getElementById('btnAccountsStatementDrive');
      const textEl = document.getElementById('btnAccountsStatementDriveText');
      if (!area) return;

      const todayStr = getTodayString();
      const fileName = `MeenMart_Accounts_Statement_${todayStr}.pdf`;

      if (btn) btn.disabled = true;
      if (textEl) textEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Creating PDF...';

      try {
        const ready = await ensureHtml2PdfLoaded();
        if (!ready || typeof html2pdf === 'undefined') {
          showToast("PDF engine unavailable offline.");
          return;
        }

        const opt = {
          margin: [6, 6, 6, 6],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(area).outputPdf('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.open(blobUrl, '_blank');
        showToast("Statement PDF downloaded! 📄");
      } catch (err) {
        console.error("Statement PDF error:", err);
        showToast("PDF generation failed: " + err.message);
      } finally {
        if (btn) btn.disabled = false;
        if (textEl) textEl.innerHTML = 'Download PDF';
      }
    }

    export function shareAccountsStatementWhatsApp() {
      if (!currentStatementState) return;
      const s = currentStatementState;
      const text = `🧾 *MEENMART HUB - ACCOUNTS STATEMENT*\n` +
        `🆔 *Statement:* ${s.stmtNo}\n` +
        `📅 *Period:* ${s.filterTitle}\n` +
        `👥 *Entries:* ${s.filteredCount} Records\n` +
        `----------------------------------------\n` +
        `🏪 *FINANCIAL SUMMARY (கடை கணக்கு):*\n` +
        `• Total Income (வரவு): +${formatINR(s.totalSales)}\n` +
        `• Total Expenses (செலவு): -${formatINR(s.totalExp)}\n` +
        `• Net Profit (லாபம்): *${s.isProfit ? '+' : ''}${formatINR(s.netProfit)}*\n` +
        `----------------------------------------\n` +
        `👤 *PARTNER SPENDS & INCOME:*\n` +
        `• Balaji: Spends ${formatINR(s.pSummary.Balaji.exp)} | Income ${formatINR(s.pSummary.Balaji.sales)}\n` +
        `• Nagoor: Fish Spends ${formatINR(s.pSummary.Nagoor.exp)}\n` +
        `• JP: Petrol Spends ${formatINR(s.pSummary.JP.exp)}\n` +
        `----------------------------------------\n` +
        `_Official accounts statement generated from MeenMart Hub_`;

      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }


    window.exportWeeklySettlementPDF = function() {
      const summary = getWeekFinancialSummary(state.settlementOffsetWeeks || 0);
      const { weeklySales, weeklyExp, netProfit, isProfit, equalShare, partnerExp: pExp, startStr, endStr, monday, sunday, weekId } = summary;

      const modal = document.getElementById('weeklySettlementPdfModal');
      const contentEl = document.getElementById('wspmContent');
      if (!modal || !contentEl) {
        alert("Weekly Statement preview container not found!");
        return;
      }

      const formattedRange = `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

      const curDoc = state.settlements[weekId] || {};
      const tData = curDoc.transfers || {};
      const nagPaid = tData.Nagoor ? (Number(tData.Nagoor.paidAmount) || 0) : 0;
      const jpPaid = tData.JP ? (Number(tData.JP.paidAmount) || 0) : 0;

      // Real dynamic previous week carry-forward dues
      const prevNagDue = getPartnerPreviousPendingDue('Nagoor', state.settlementOffsetWeeks || 0);
      const prevJpDue = getPartnerPreviousPendingDue('JP', state.settlementOffsetWeeks || 0);

      const nagBase = pExp.Nagoor + (isProfit ? equalShare : -equalShare);
      const jpBase = pExp.JP + (isProfit ? equalShare : -equalShare);

      const nagTotalDue = Math.max(0, nagBase + prevNagDue);
      const jpTotalDue = Math.max(0, jpBase + prevJpDue);

      const nagRemaining = Math.max(0, nagTotalDue - nagPaid);
      const jpRemaining = Math.max(0, jpTotalDue - jpPaid);

      contentEl.innerHTML = `
        <!-- Printable Statement Card -->
        <div id="weeklyReportPrintArea" class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-xs">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b-2 border-teal-500">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-xl">🐟</span>
                <h2 class="text-base font-black text-slate-900 dark:text-white tracking-tight">MEENMART <span class="text-teal-600 dark:text-teal-400">HUB</span></h2>
              </div>
              <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Weekly Accounts & Settlement Statement</p>
            </div>
            <div class="text-right">
              <span class="text-[9px] uppercase tracking-wider font-extrabold text-teal-600 dark:text-teal-400 block">Statement Period</span>
              <span class="text-xs font-black text-slate-900 dark:text-white">${formattedRange}</span>
            </div>
          </div>

          <!-- KPI Summary Grid -->
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <div class="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Weekly Income</div>
              <div class="text-sm font-black text-slate-900 dark:text-white mt-0.5">+${formatINR(weeklySales)}</div>
            </div>
            <div class="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60">
              <div class="text-[9px] uppercase tracking-wider font-extrabold text-rose-500">Expenses</div>
              <div class="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5">-${formatINR(weeklyExp)}</div>
            </div>
            <div class="p-2.5 rounded-2xl ${isProfit ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60'} border">
              <div class="text-[9px] uppercase tracking-wider font-extrabold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}">${isProfit ? 'Net Profit' : 'Net Loss'}</div>
              <div class="text-sm font-black ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} mt-0.5">${isProfit ? '+' : '-'}${formatINR(Math.abs(netProfit))}</div>
            </div>
          </div>

          <!-- Partner Pocket Spends -->
          <div class="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">1. Partner Out-of-Pocket Spends</div>
            <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>Nagoor (Fish Purchase):</span>
              <strong class="font-bold text-slate-900 dark:text-white">${formatINR(pExp.Nagoor)}</strong>
            </div>
            <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>Balaji (Cleaning, Ice, Bags, Ads):</span>
              <strong class="font-bold text-slate-900 dark:text-white">${formatINR(pExp.Balaji)}</strong>
            </div>
            <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>JP (Petrol & Delivery):</span>
              <strong class="font-bold text-slate-900 dark:text-white">${formatINR(pExp.JP)}</strong>
            </div>
          </div>

          <!-- Equal 1/3 Split -->
          <div class="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50 flex items-center justify-between">
            <div>
              <span class="font-extrabold text-slate-900 dark:text-white">2. Equal 1/3 Profit Share</span>
              <p class="text-[10px] text-teal-700 dark:text-teal-300">Divided equally among Balaji, Nagoor, JP</p>
            </div>
            <span class="text-sm font-black text-teal-600 dark:text-teal-400">+${formatINR(equalShare)} Each</span>
          </div>

          <!-- Money Settlement Transfers -->
          <div class="space-y-2 pt-1">
            <div class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">3. Settlement Transfers Summary</div>
            
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <strong class="text-slate-900 dark:text-white">Balaji ➔ Nagoor</strong>
                <div class="text-[10px] text-slate-400 mt-0.5">
                  Fish Spends ${formatINR(pExp.Nagoor)} + Profit ${formatINR(equalShare)}${prevNagDue > 0 ? ` + Prior Due ${formatINR(prevNagDue)}` : ''}
                </div>
              </div>
              <div class="text-right">
                <span class="text-sm font-black text-slate-900 dark:text-white block">${formatINR(nagTotalDue)}</span>
                <span class="text-[9px] font-bold ${nagRemaining === 0 && nagPaid > 0 ? 'text-emerald-500' : (nagPaid > 0 ? 'text-amber-500' : 'text-slate-400')}">
                  ${nagRemaining === 0 && nagPaid > 0 ? 'Paid in Full ✅' : (nagPaid > 0 ? `Paid ${formatINR(nagPaid)} • Due ${formatINR(nagRemaining)}` : 'Pending ⏳')}
                </span>
              </div>
            </div>

            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <strong class="text-slate-900 dark:text-white">Balaji ➔ JP</strong>
                <div class="text-[10px] text-slate-400 mt-0.5">
                  Petrol Spends ${formatINR(pExp.JP)} + Profit ${formatINR(equalShare)}${prevJpDue > 0 ? ` + Prior Due ${formatINR(prevJpDue)}` : ''}
                </div>
              </div>
              <div class="text-right">
                <span class="text-sm font-black text-slate-900 dark:text-white block">${formatINR(jpTotalDue)}</span>
                <span class="text-[9px] font-bold ${jpRemaining === 0 && jpPaid > 0 ? 'text-emerald-500' : (jpPaid > 0 ? 'text-amber-500' : 'text-slate-400')}">
                  ${jpRemaining === 0 && jpPaid > 0 ? 'Paid in Full ✅' : (jpPaid > 0 ? `Paid ${formatINR(jpPaid)} • Due ${formatINR(jpRemaining)}` : 'Pending ⏳')}
                </span>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>MeenMart Hub Official Financial Record</span>
            <span>Generated: ${new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
      pushModalState('weeklySettlementPdfModal');
    };

    window.closeWeeklySettlementPdfModal = function(fromPopState) {
      const modal = document.getElementById('weeklySettlementPdfModal');
      if (modal) modal.classList.add('hidden');
      popModalState('weeklySettlementPdfModal', fromPopState);
    };

    window.printWeeklyReport = function() {
      saveOrShareWeeklyReportPDF();
    };


        // CSV Export for Excel


    let currentInvoiceState = null;

    window.openPartnerInvoiceModal = function(partner, weekId) {
      const modal = document.getElementById('partnerInvoiceModal');
      const printArea = document.getElementById('partnerInvoicePrintArea');
      if (!modal || !printArea) return;

      const weekSummary = getWeekFinancialSummary(state.settlementOffsetWeeks || 0);
      const { monday, sunday, startStr, endStr, weekId: targetWeekId, weeklySales, weeklyExp, netProfit, isProfit, equalShare, partnerExp } = weekSummary;
      const formattedRange = `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

      // Live dynamic carry-forward from past weeks
      const carriedDue = getPartnerPreviousPendingDue(partner, state.settlementOffsetWeeks || 0);
      const partnerSpends = partnerExp[partner] || 0;
      const baseDue = partnerSpends + (isProfit ? equalShare : -equalShare);
      const totalDue = Math.max(0, baseDue + carriedDue);

      const curSettlement = state.settlements[targetWeekId || weekId];
      const record = curSettlement?.transfers?.[partner];
      const paidAmount = record ? (Number(record.paidAmount) || 0) : 0;
      const remainingDue = Math.max(0, totalDue - paidAmount);

      const isPaid = (totalDue === 0 || (remainingDue === 0 && paidAmount > 0));
      const isPartial = (paidAmount > 0 && remainingDue > 0);

      const billNo = `MM-SETTLE-${startStr.replace(/-/g, '').slice(2)}-${partner.toUpperCase().slice(0, 3)}`;
      const issueDate = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
      const roleText = partner === 'Nagoor' ? 'Fish Procurement & Supply' : 'Delivery & Petrol Operations';
      const roleExpenseLabel = partner === 'Nagoor' ? 'Fish Expense Reimbursement' : 'Petrol & Delivery Reimbursement';

      let formattedPaidAt = null;
      if (record?.paidAt) {
        const pDate = new Date(Number(record.paidAt));
        if (!isNaN(pDate.getTime())) {
          formattedPaidAt = pDate.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        }
      }

      currentInvoiceState = {
        partner,
        roleText,
        roleExpenseLabel,
        billNo,
        formattedRange,
        weeklySales,
        weeklyExp,
        netProfit,
        isProfit,
        partnerSpends,
        equalShare,
        carriedDue,
        totalDue,
        paidAmount,
        remainingDue,
        isPaid,
        isPartial,
        method: record?.paymentMethod || 'GPay / UPI',
        paidAt: formattedPaidAt,
        note: record?.receiptNote || 'Settlement verified'
      };

      printArea.innerHTML = `
        <!-- Luxury Digital Settlement Voucher (Apple Wallet / Cred Style) -->
        <div class="rounded-3xl p-6 bg-white text-slate-800 border border-slate-200/80 shadow-2xl space-y-4 print-voucher relative overflow-hidden" style="background:#ffffff; color:#0f172a; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;">
          
          <!-- Top Perforated Ticket Accent Bar -->
          <div class="h-1.5 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600 rounded-full mb-2"></div>

          <!-- Voucher Header -->
          <div class="flex items-start justify-between pb-3.5 border-b border-slate-100">
            <div>
              <div class="flex items-center gap-2.5">
                <div class="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-xl shadow-xs border border-teal-100">
                  🐟
                </div>
                <div>
                  <h2 class="text-base font-black tracking-tight text-slate-900 leading-none">MEENMART HUB</h2>
                  <span class="text-[9px] uppercase tracking-widest font-black text-teal-600 block mt-1">Official Partner Settlement Voucher</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] font-mono font-extrabold text-slate-500 block bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/60">${billNo}</span>
              <span class="text-[10px] font-black text-slate-700 block mt-1">${formattedRange}</span>
              <span class="text-[8px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-flex items-center gap-1 border border-emerald-200">
                <i class="fa-solid fa-circle-check text-[8px]"></i> Reconciled
              </span>
            </div>
          </div>

          <!-- Parties Card (Cashier Balaji ➔ Payee Partner) -->
          <div class="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200/80 shadow-xs">
            <div class="flex items-center justify-between">
              <!-- Payer: Balaji -->
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shadow-xs flex-shrink-0 bg-white">
                  ${renderPartnerAvatar('Balaji', 'w-full h-full', '')}
                </div>
                <div>
                  <span class="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 block">Payer & Cashier</span>
                  <strong class="text-xs font-black text-slate-900 block leading-tight">Balaji</strong>
                  <span class="text-[9px] text-slate-500 block">MeenMart Revenue</span>
                </div>
              </div>

              <!-- Transfer Direction Indicator -->
              <div class="flex flex-col items-center px-2">
                <span class="text-[8px] font-bold text-teal-600 uppercase">Payout</span>
                <div class="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center text-xs my-0.5 shadow-xs">
                  <i class="fa-solid fa-arrow-right"></i>
                </div>
              </div>

              <!-- Payee: Partner -->
              <div class="flex items-center gap-2.5 text-right flex-row-reverse">
                <div class="w-9 h-9 rounded-xl overflow-hidden border border-teal-200 shadow-xs flex-shrink-0 bg-white">
                  ${renderPartnerAvatar(partner, 'w-full h-full', '')}
                </div>
                <div>
                  <span class="text-[8px] uppercase tracking-wider font-extrabold text-teal-600 block">Payee Partner</span>
                  <strong class="text-xs font-black text-slate-900 block leading-tight">${partner}</strong>
                  <span class="text-[9px] text-slate-500 block truncate max-w-[110px]">${roleText}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 1: Shop Business Financial Summary -->
          <div class="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100 shadow-xs space-y-2.5">
            <div class="flex items-center justify-between pb-1.5 border-b border-teal-200/60">
              <span class="text-[10px] font-black uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                <i class="fa-solid fa-store text-teal-600 text-xs"></i> 1. Shop Financial Summary (கடை கணக்கு)
              </span>
              <span class="text-[8px] font-extrabold text-teal-700 bg-white px-2 py-0.5 rounded-full border border-teal-200 shadow-xs">Weekly Audit</span>
            </div>

            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="bg-white p-2 rounded-xl border border-teal-100/80 shadow-xs">
                <span class="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Total Income</span>
                <strong class="text-slate-900 font-black text-xs text-emerald-600 block mt-0.5">+${formatINR(weeklySales)}</strong>
              </div>
              <div class="bg-white p-2 rounded-xl border border-teal-100/80 shadow-xs">
                <span class="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Total Expenses</span>
                <strong class="text-slate-900 font-black text-xs text-rose-500 block mt-0.5">-${formatINR(weeklyExp)}</strong>
              </div>
              <div class="bg-white p-2 rounded-xl border border-teal-100/80 shadow-xs">
                <span class="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Net Profit</span>
                <strong class="text-slate-900 font-black text-xs text-teal-600 block mt-0.5">+${formatINR(netProfit)}</strong>
              </div>
            </div>

            <div class="bg-white p-2.5 rounded-xl border border-teal-200/70 flex items-center justify-between text-xs shadow-xs">
              <span class="font-bold text-slate-700 flex items-center gap-1.5">
                <i class="fa-solid fa-handshake text-teal-600 text-xs"></i> Equal 1/3 Profit Split:
              </span>
              <div class="text-right">
                <strong class="text-teal-700 font-black text-xs">+${formatINR(equalShare)} Each</strong>
                <span class="text-[8px] text-slate-400 block font-medium">(${formatINR(netProfit)} ÷ 3 Partners)</span>
              </div>
            </div>
          </div>

          <!-- SECTION 2: Partner Step-by-Step Entitlement Breakdown -->
          <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <i class="fa-solid fa-calculator text-teal-600 text-xs"></i> 2. ${partner}'s Settlement Math (உங்களுக்கான கணக்கு)
              </span>
              <span class="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Audit Breakdown</span>
            </div>

            <!-- ① Out of Pocket Reimbursement -->
            <div class="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 font-black text-[10px] flex items-center justify-center">1</div>
                <div>
                  <strong class="text-slate-800 font-bold block text-xs">${roleExpenseLabel}</strong>
                  <span class="text-[9px] text-slate-400 block">Out-of-pocket spend to be refunded 100%</span>
                </div>
              </div>
              <span class="font-black text-slate-900 text-xs">+${formatINR(partnerSpends)}</span>
            </div>

            <!-- ② Equal 1/3 Net Profit Share -->
            <div class="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center">2</div>
                <div>
                  <strong class="text-slate-800 font-bold block text-xs">Equal 1/3 Net Profit Share</strong>
                  <span class="text-[9px] text-emerald-600 font-medium block">Your equal 1/3 share of shop net profit</span>
                </div>
              </div>
              <span class="font-black text-emerald-600 text-xs">+${formatINR(equalShare)}</span>
            </div>

            <!-- ③ Previous Week Carry Forward -->
            ${carriedDue > 0 ? `
            <div class="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-50/70 border border-amber-200">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-amber-200 text-amber-900 font-black text-[10px] flex items-center justify-center">3</div>
                <div>
                  <strong class="text-amber-900 font-bold block text-xs">Previous Week Pending Due</strong>
                  <span class="text-[9px] text-amber-700 block">Unpaid balance carried forward from last week</span>
                </div>
              </div>
              <span class="font-black text-amber-800 text-xs">+${formatINR(carriedDue)}</span>
            </div>
            ` : `
            <div class="flex items-center justify-between text-[11px] text-slate-400 px-2 py-1">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 font-black text-[10px] flex items-center justify-center">3</div>
                <div>
                  <span class="font-bold text-slate-500 block">Previous Week Arrears</span>
                  <span class="text-[9px] text-slate-400 block">All previous weeks cleared (No pending dues)</span>
                </div>
              </div>
              <span class="font-semibold text-slate-400">₹0</span>
            </div>
            `}

            <!-- Total Calculation Bar -->
            <div class="pt-2.5 border-t-2 border-slate-200 flex items-center justify-between">
              <div>
                <span class="text-xs font-black text-slate-900 uppercase tracking-tight block">Total Settlement Due</span>
                <span class="text-[9px] text-slate-400 font-semibold">(Refund + Profit Share + Prior Balance)</span>
              </div>
              <span class="text-xl font-black text-teal-600 tracking-tight">${formatINR(totalDue)}</span>
            </div>
          </div>

          <!-- SECTION 3: Payment Status & Reconciliation Banner -->
          <div class="p-3.5 rounded-2xl ${isPaid ? 'bg-emerald-50 border border-emerald-300/80 shadow-xs' : (isPartial ? 'bg-amber-50 border border-amber-300/80 shadow-xs' : 'bg-slate-50 border border-slate-300')} space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 font-black text-xs ${isPaid ? 'text-emerald-800' : (isPartial ? 'text-amber-800' : 'text-slate-800')}">
                <i class="${isPaid ? 'fa-solid fa-circle-check text-emerald-600' : (isPartial ? 'fa-solid fa-clock text-amber-600' : 'fa-solid fa-hourglass-half text-slate-400')} text-sm"></i>
                <span class="tracking-wide">${isPaid ? 'PAID IN FULL' : (isPartial ? 'PARTIALLY PAID' : 'PAYMENT PENDING')}</span>
              </div>
              <span class="text-[9px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60">
                ${currentInvoiceState.paidAt ? 'Paid: ' + currentInvoiceState.paidAt : 'Due from Balaji'}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-slate-200/60">
              <div>
                <span class="text-slate-500 block font-semibold">Amount Paid:</span>
                <strong class="text-slate-900 font-black text-xs">${formatINR(paidAmount)}</strong>
                ${currentInvoiceState.paidAt ? `<span class="text-[9px] text-teal-700 font-semibold block">via ${currentInvoiceState.method}</span>` : ''}
              </div>
              <div class="text-right">
                <span class="text-slate-500 block font-semibold">Remaining to Pay:</span>
                <strong class="${remainingDue === 0 ? 'text-emerald-600' : 'text-rose-600'} font-black text-xs">
                  ${remainingDue === 0 ? '₹0 (All Cleared)' : formatINR(remainingDue)}
                </strong>
              </div>
            </div>
          </div>

          <!-- SECTION 4: Digital Verification Footer -->
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500">
            <div>
              <span class="block text-slate-400">Payer & Cashier:</span>
              <span class="font-extrabold text-slate-800 block mt-0.5">Balaji (MeenMart)</span>
              <span class="text-[8px] text-emerald-600 font-bold block">Verified & Reconciled ✔</span>
            </div>
            <div class="text-right">
              <span class="block text-slate-400">Payee Partner:</span>
              <span class="font-extrabold text-slate-800 block mt-0.5">${partner}</span>
              <span class="text-[8px] text-teal-600 font-bold block">Official Partnership Record</span>
            </div>
          </div>

          <div class="text-center text-[8px] text-slate-400 font-mono pt-1">
            MeenMart Partners Hub • Automated Ledger • Generated: ${issueDate}
          </div>

        </div>
      `;

      modal.classList.remove('hidden');
      pushModalState('partnerInvoiceModal');
    };

    window.closePartnerInvoiceModal = function(fromPopState) {
      const modal = document.getElementById('partnerInvoiceModal');
      if (modal) modal.classList.add('hidden');
      popModalState('partnerInvoiceModal', fromPopState);
    };

    // ==============================================================================
    // 📂 DIRECT GOOGLE DRIVE / PDF EXPORTER (NO PRINTER SPOOLER DIALOG)
    // ==============================================================================
    window.saveOrSharePartnerInvoicePDF = async function() {
      const area = document.getElementById('partnerInvoicePrintArea');
      const btn = document.getElementById('btnPartnerInvoiceDrive');
      const textEl = document.getElementById('btnPartnerInvoiceDriveText');
      if (!area) return;

      const partner = currentInvoiceState ? currentInvoiceState.partner : 'Partner';
      const billNo = currentInvoiceState ? currentInvoiceState.billNo : 'Voucher';
      const fileName = `MeenMart_Bill_${billNo}_${partner}.pdf`;

      if (btn) btn.disabled = true;
      if (textEl) textEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Creating PDF...';

      try {
        const ready = await ensureHtml2PdfLoaded();
        if (!ready || typeof html2pdf === 'undefined') {
          showToast("PDF engine unavailable offline. Please check connection.");
          return;
        }

        const opt = {
          margin: [6, 6, 6, 6],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(area).outputPdf('blob');

        // Auto-open PDF & trigger download directly (No share popup)
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.open(blobUrl, '_blank');
        showToast("PDF auto-opened & downloaded! 📄");
      } catch (err) {
        console.error("PDF generation error:", err);
        showToast("PDF generation failed: " + err.message);
      } finally {
        if (btn) btn.disabled = false;
        if (textEl) textEl.innerHTML = 'Open PDF / Download';
      }
    };

    window.saveOrShareWeeklyReportPDF = async function() {
      const area = document.getElementById('weeklyReportPrintArea');
      const btn = document.getElementById('btnWeeklyReportDrive');
      const textEl = document.getElementById('btnWeeklyReportDriveText');
      if (!area) return;

      const range = getWeekRange(state.settlementOffsetWeeks || 0);
      const fileName = `MeenMart_Weekly_Settlement_${range.startStr}_to_${range.endStr}.pdf`;

      if (btn) btn.disabled = true;
      if (textEl) textEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Creating PDF...';

      try {
        const ready = await ensureHtml2PdfLoaded();
        if (!ready || typeof html2pdf === 'undefined') {
          showToast("PDF engine unavailable offline.");
          return;
        }

        const opt = {
          margin: [6, 6, 6, 6],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(area).outputPdf('blob');

        // Auto-open PDF & trigger download directly (No share popup)
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.open(blobUrl, '_blank');
        showToast("PDF auto-opened & downloaded! 📄");
      } catch (err) {
        console.error("Weekly PDF generation error:", err);
        showToast("PDF generation failed: " + err.message);
      } finally {
        if (btn) btn.disabled = false;
        if (textEl) textEl.innerHTML = 'Open PDF / Download';
      }
    };

    window.sharePartnerInvoiceWhatsApp = function() {
      if (!currentInvoiceState) return;
      const s = currentInvoiceState;
      const text = `🧾 *MEENMART HUB - PARTNER SETTLEMENT VOUCHER*
🆔 *Bill No:* ${s.billNo}
📅 *Period:* ${s.formattedRange}
👤 *Partner:* ${s.partner} (${s.roleText})
----------------------------------------
🏪 *1. SHOP FINANCIAL SUMMARY (கடை கணக்கு):*
• Total Shop Income: ${formatINR(s.weeklySales)}
• Total Shop Expenses: -${formatINR(s.weeklyExp)}
• Shop Net Profit: +${formatINR(s.netProfit)}
💡 *Equal 1/3 Partner Share:* ${formatINR(s.netProfit)} ÷ 3 = *+${formatINR(s.equalShare)} Each*
----------------------------------------
🔍 *2. ${s.partner.toUpperCase()} SETTLEMENT MATH (உங்களுக்கான கணக்கு):*
1️⃣ ${s.roleExpenseLabel}: +${formatINR(s.partnerSpends)}
2️⃣ 1/3 Business Profit Share: +${formatINR(s.equalShare)}` +
(s.carriedDue > 0 ? `\n3️⃣ Prior Week Pending Due: +${formatINR(s.carriedDue)} (Unpaid carry-forward)` : '\n3️⃣ Prior Week Arrears: ₹0 (Cleared)') +
`\n----------------------------------------
💵 *TOTAL SETTLEMENT DUE: ${formatINR(s.totalDue)}*
` +
(s.paidAmount > 0 
  ? `💳 *Already Paid:* -${formatINR(s.paidAmount)} (${s.method})\n📌 *Balance Remaining:* *${formatINR(s.remainingDue)}*` 
  : `📌 *Balance to Pay:* *${formatINR(s.remainingDue)}*`) +
`\n📌 *Status:* ${s.isPaid ? 'PAID IN FULL ✅' : (s.isPartial ? 'PARTIALLY PAID 🟡' : 'PAYMENT PENDING ⏳')}
----------------------------------------
_Verified official digital record from MeenMart Hub_`;

      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    // CSV Export for Excel
    export function exportToCSV() {
      if (!state.transactions || state.transactions.length === 0) {
        alert("Export panna entries edhum illa!");
        return;
      }

      // UTF-8 BOM so Excel opens Tamil characters perfectly
      let csvContent = "\uFEFF";
      csvContent += "Date,Type,Category,Partner,Amount,Notes,CreatedBy\r\n";

      state.transactions.forEach(tx => {
        const typeTamil = tx.type === 'expense' ? 'Selavu' : (tx.type === 'sales' ? 'Varavu' : (tx.type === 'transfer' ? 'Transfer' : 'Mudhaleedu'));
        const cat = (getCategoryLabel(tx.type, tx.category) || tx.category || '').replace(/,/g, ' ');
        const partnerName = PARTNERS[tx.partner] ? PARTNERS[tx.partner].name : tx.partner;
        const desc = (tx.description || '').replace(/"/g, '""').replace(/,/g, ' ');
        const creator = tx.createdBy || tx.createdByPartner || '';

        csvContent += `"${tx.date}","${typeTamil}","${cat}","${partnerName}","${tx.amount}","${desc}","${creator}"\r\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `meenmart_accounts_${getTodayString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("CSV statement downloaded! 📥");
    }

// Attach to window for inline onclick handlers in HTML
window.ensureHtml2PdfLoaded = ensureHtml2PdfLoaded;
window.exportToPDF = exportToPDF;
window.exportToCSV = exportToCSV;
window.exportWeeklySettlementPDF = exportWeeklySettlementPDF;
window.closeWeeklySettlementPdfModal = closeWeeklySettlementPdfModal;
window.printWeeklyReport = printWeeklyReport;
window.openPartnerInvoiceModal = openPartnerInvoiceModal;
window.closePartnerInvoiceModal = closePartnerInvoiceModal;
window.saveOrSharePartnerInvoicePDF = saveOrSharePartnerInvoicePDF;
window.saveOrShareWeeklyReportPDF = saveOrShareWeeklyReportPDF;
window.sharePartnerInvoiceWhatsApp = sharePartnerInvoiceWhatsApp;

window.saveOrShareAccountsStatementPDF = saveOrShareAccountsStatementPDF;
window.shareAccountsStatementWhatsApp = shareAccountsStatementWhatsApp;
