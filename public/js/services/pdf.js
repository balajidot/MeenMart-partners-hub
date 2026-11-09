// ==============================================================================
// 📄 PDF & INVOICE SERVICES (Client-side HTML2PDF & Direct Download Engine)
// ==============================================================================
import { state } from '../state.js';
import { 
  formatINR, 
  getTodayString, 
  getYesterdayString, 
  getThisWeekStart, 
  getThisMonthStart, 
  getWeekRange, 
  getWeekFinancialSummary, 
  getPartnerPreviousPendingDue, 
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

    window.exportToPDF = async function() {
      if (state.transactions.length === 0) {
        alert("PDF export panna entries edhum illa!");
        return;
      }

      // Read current filters
      const search = (document.getElementById('historySearchInput')?.value || '').toLowerCase().trim();
      const filterType = document.getElementById('hFilterType')?.value || 'all';
      const filterPartner = document.getElementById('hFilterPartner')?.value || 'all';
      const filterDate = state.historyFilter?.date || 'all';

      const todayStr = getTodayString();
      const yesterdayStr = getYesterdayString();
      const monStr = getThisWeekStart();
      const monthStartStr = getThisMonthStart();

      let filtered = state.transactions.filter(tx => {
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
      let totalCap = 0;
      const pSummary = {
        Balaji: { sales: 0, exp: 0 },
        Nagoor: { sales: 0, exp: 0 },
        JP: { sales: 0, exp: 0 }
      };

      filtered.forEach(tx => {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'sales') {
          totalSales += amt;
          if (pSummary[tx.partner]) pSummary[tx.partner].sales += amt;
        } else if (tx.type === 'expense') {
          totalExp += amt;
          if (pSummary[tx.partner]) pSummary[tx.partner].exp += amt;
        } else if (tx.type === 'investment') {
          totalCap += amt;
        }
      });

      const netProfit = totalSales - totalExp;
      const isProfit = netProfit >= 0;

      let filterTitle = 'All Transactions';
      if (filterDate === 'today') filterTitle = "Today (" + todayStr + ")";
      else if (filterDate === 'yesterday') filterTitle = "Yesterday (" + yesterdayStr + ")";
      else if (filterDate === 'this-week') filterTitle = "This Week (" + monStr + " - " + todayStr + ")";
      else if (filterDate === 'this-month') filterTitle = "This Month (" + monthStartStr + " - " + todayStr + ")";

      const nowFormatted = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      const rowsHtml = filtered.map((tx, idx) => {
        const isExp = tx.type === 'expense';
        const isSales = tx.type === 'sales';
        const typeLabel = isExp ? 'Selavu' : (isSales ? 'Varavu' : 'Mudhaleedu');
        const typeColor = isExp ? '#dc2626' : (isSales ? '#16a34a' : '#0d9488');
        const typeBg = isExp ? '#fef2f2' : (isSales ? '#f0fdf4' : '#f0fdfa');
        const sign = isExp ? '-' : (isSales ? '+' : '');
        const notes = tx.description ? escapeHtml(tx.description) : '-';
        const cat = getCategoryLabel(tx.type, tx.category);

        let time = '';
        if (tx.createdAt) {
          const d = new Date(tx.createdAt);
          if (!isNaN(d.getTime())) time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        }

        return `
          <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
            <td style="padding: 8px 6px; color: #64748b; text-align: center;">${idx + 1}</td>
            <td style="padding: 8px 6px; white-space: nowrap;">
              <div style="font-weight: 700; color: #1e293b;">${tx.date}</div>
              <div style="color: #94a3b8; font-size: 9px;">${time}</div>
            </td>
            <td style="padding: 8px 6px; font-weight: 700; color: #334155;">${tx.partner}</td>
            <td style="padding: 8px 6px; font-weight: 700; color: #0f172a; max-width: 220px; word-break: break-word;">${notes}</td>
            <td style="padding: 8px 6px; color: #475569;">${cat}</td>
            <td style="padding: 8px 6px; text-align: center;">
              <span style="background: ${typeBg}; color: ${typeColor}; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 10px; display: inline-block;">${typeLabel}</span>
            </td>
            <td style="padding: 8px 6px; text-align: right; font-weight: 900; color: ${typeColor}; font-size: 12px; white-space: nowrap;">
              ${sign}${formatINR(tx.amount)}
            </td>
          </tr>
        `;
      }).join('');

      const pdfHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MeenMart_Accounts_Statement_${todayStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 20px; font-size: 12px; }
    .print-container { max-width: 820px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 16px; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .btn-print { background: #0d9488; color: #ffffff; border: none; padding: 10px 18px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(13,148,136,0.3); }
    .btn-close { background: #f1f5f9; color: #475569; border: none; padding: 10px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
    .summary-card { padding: 12px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; }
    .partner-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }
    .partner-card { padding: 10px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 11px; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th { background: #f8fafc; color: #475569; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 8px; border-bottom: 2px solid #e2e8f0; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .action-bar { display: none !important; }
      .print-container { box-shadow: none; border: none; padding: 0; width: 100%; max-width: 100%; }
      @page { margin: 10mm; size: A4 portrait; }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="action-bar">
      <div>
        <h2 style="font-size: 16px; font-weight: 800; color: #0f172a;">MeenMart Accounts Statement</h2>
        <p style="font-size: 11px; color: #64748b;">Save as PDF or Print directly</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-print" onclick="window.print()">🖨️ Save as PDF / Print</button>
        <button class="btn-close" onclick="window.close()">✕ Close</button>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #0d9488;">
      <div>
        <h1 style="font-size: 22px; font-weight: 900; color: #0d9488; letter-spacing: -0.5px;">MEENMART <span style="font-size: 12px; background: #ccfbf1; color: #0f766e; padding: 2px 8px; border-radius: 20px; font-weight: 700;">HUB</span></h1>
        <p style="color: #64748b; font-size: 11px; margin-top: 2px;">தினசரி நிதி & கணக்கு மேலாண்மை அறிக்கை (Daily Accounts Statement)</p>
      </div>
      <div style="text-align: right; font-size: 10px; color: #64748b;">
        <div><strong>Period:</strong> ${filterTitle}</div>
        <div><strong>Generated:</strong> ${nowFormatted}</div>
        <div><strong>Generated By:</strong> ${state.currentPartner || 'Admin'}</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card" style="background: #f0fdf4; border-color: #bbf7d0;">
        <div style="font-size: 10px; font-weight: 800; color: #166534; text-transform: uppercase;">Total Income</div>
        <div style="font-size: 18px; font-weight: 900; color: #16a34a; margin-top: 4px;">+${formatINR(totalSales)}</div>
      </div>
      <div class="summary-card" style="background: #fef2f2; border-color: #fecaca;">
        <div style="font-size: 10px; font-weight: 800; color: #991b1b; text-transform: uppercase;">Total Expenses</div>
        <div style="font-size: 18px; font-weight: 900; color: #dc2626; margin-top: 4px;">-${formatINR(totalExp)}</div>
      </div>
      <div class="summary-card" style="background: ${isProfit ? '#f0fdfa' : '#fff1f2'}; border-color: ${isProfit ? '#99f6e4' : '#fecdd3'};">
        <div style="font-size: 10px; font-weight: 800; color: ${isProfit ? '#115e59' : '#9f1239'}; text-transform: uppercase;">${isProfit ? 'Net Profit (Laabam)' : 'Net Loss (Nashtam)'}</div>
        <div style="font-size: 18px; font-weight: 900; color: ${isProfit ? '#0d9488' : '#e11d48'}; margin-top: 4px;">${isProfit ? '+' : ''}${formatINR(netProfit)}</div>
      </div>
    </div>

    <div>
      <div style="font-size: 11px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">Partner Wise Summary</div>
      <div class="partner-grid">
        <div class="partner-card">
          <div style="font-weight: 800; color: #1e293b;">👨‍💻 Balaji</div>
          <div style="color: #dc2626; margin-top: 2px;">Selavu: <strong>${formatINR(pSummary.Balaji.exp)}</strong></div>
          <div style="color: #16a34a;">Varavu: <strong>${formatINR(pSummary.Balaji.sales)}</strong></div>
        </div>
        <div class="partner-card">
          <div style="font-weight: 800; color: #1e293b;">🦐 Nagoor</div>
          <div style="color: #dc2626; margin-top: 2px;">Selavu: <strong>${formatINR(pSummary.Nagoor.exp)}</strong></div>
          <div style="color: #16a34a;">Varavu: <strong>${formatINR(pSummary.Nagoor.sales)}</strong></div>
        </div>
        <div class="partner-card">
          <div style="font-weight: 800; color: #1e293b;">🛵 JP</div>
          <div style="color: #dc2626; margin-top: 2px;">Selavu: <strong>${formatINR(pSummary.JP.exp)}</strong></div>
          <div style="color: #16a34a;">Varavu: <strong>${formatINR(pSummary.JP.sales)}</strong></div>
        </div>
      </div>
    </div>

    <div style="margin-top: 14px;">
      <div style="font-size: 11px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">Detailed Entries (${filtered.length} Records)</div>
      <table>
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">#</th>
            <th style="text-align: left; width: 85px;">Date & Time</th>
            <th style="text-align: left; width: 65px;">Partner</th>
            <th style="text-align: left;">Notes / Description</th>
            <th style="text-align: left; width: 100px;">Category</th>
            <th style="text-align: center; width: 75px;">Type</th>
            <th style="text-align: right; width: 85px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background: #f8fafc; font-weight: 900; border-top: 2px solid #cbd5e1; font-size: 11px;">
            <td colspan="6" style="padding: 10px 8px; text-align: right; color: #334155;">Net Total:</td>
            <td style="padding: 10px 8px; text-align: right; color: ${isProfit ? '#16a34a' : '#dc2626'}; font-size: 13px;">${isProfit ? '+' : ''}${formatINR(netProfit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8;">
      <div>MeenMart Hub • Official Financial Record</div>
      <div>Confidential • Partners Only</div>
    </div>
  </div>
</body>
</html>`;

      const ready = await ensureHtml2PdfLoaded();
      if (!ready || typeof html2pdf === 'undefined') {
        const blob = new Blob([pdfHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        showToast("Accounts statement opened 📂");
        return;
      }

      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = pdfHtml;
      const bodyContent = tempContainer.querySelector('.print-container') || tempContainer;
      bodyContent.style.background = '#ffffff';
      bodyContent.style.color = '#0f172a';
      bodyContent.style.padding = '16px';
      document.body.appendChild(bodyContent);

      const fileName = `MeenMart_Accounts_${getTodayString()}.pdf`;
      const opt = {
        margin: [6, 6, 6, 6],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      try {
        const pdfBlob = await html2pdf().set(opt).from(bodyContent).outputPdf('blob');
        if (bodyContent.parentNode) document.body.removeChild(bodyContent);

        // Auto-open PDF & trigger download (No share popup)
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
        if (bodyContent.parentNode) document.body.removeChild(bodyContent);
        console.error("PDF generation failed:", err);
        showToast("PDF generation failed: " + err.message);
      }
    };

    // ==========================================
    // 📄 WEEKLY SETTLEMENT PDF STATEMENT
    // ==========================================


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
      const issueDate = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const roleText = partner === 'Nagoor' ? 'Fish Procurement & Supply' : 'Delivery & Petrol Operations';
      const roleExpenseLabel = partner === 'Nagoor' ? 'Fish Expense Reimbursement' : 'Petrol & Delivery Reimbursement';

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
        method: record?.paymentMethod || 'Cash / UPI',
        paidAt: record?.paidAt || null,
        note: record?.receiptNote || 'Settlement verified'
      };

      printArea.innerHTML = `
        <!-- Authentic Digital Voucher Card with Clean White Print Canvas -->
        <div class="rounded-3xl p-5 bg-white text-slate-800 border-2 border-slate-200/90 shadow-xl space-y-3.5 print-voucher" style="background:#ffffff; color:#0f172a; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;">
          
          <!-- Voucher Header -->
          <div class="flex items-start justify-between pb-3 border-b-2 border-teal-600">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-2xl">🐟</span>
                <div>
                  <h2 class="text-base font-black tracking-tight text-slate-900 leading-none">MEENMART HUB</h2>
                  <span class="text-[9px] uppercase tracking-widest font-black text-teal-600 block mt-1">Official Partner Settlement Bill</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[9px] font-mono font-bold text-slate-400 block">${billNo}</span>
              <span class="text-[10px] font-black text-slate-700 block mt-0.5">${formattedRange}</span>
              <span class="text-[8px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block border border-teal-200">Reconciled Voucher</span>
            </div>
          </div>

          <!-- Parties Row (Cashier Balaji & Payee Partner) -->
          <div class="grid grid-cols-2 gap-2 text-[10px] p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div class="border-r border-slate-200 pr-2">
              <span class="text-slate-400 font-bold block uppercase text-[8px] tracking-wider">Payer (கடை காசாளர்):</span>
              <strong class="text-slate-900 font-black text-xs block mt-0.5">Balaji</strong>
              <span class="text-slate-500 text-[9px] block">MeenMart Revenue & Collections</span>
            </div>
            <div class="pl-1">
              <span class="text-slate-400 font-bold block uppercase text-[8px] tracking-wider">Payee (பங்குதாரர்):</span>
              <strong class="text-teal-700 font-black text-xs block mt-0.5">${partner}</strong>
              <span class="text-slate-500 text-[9px] block">${roleText}</span>
            </div>
          </div>

          <!-- SECTION 1: Shop Business Financial Context (கடை மொத்தக் கணக்கு) -->
          <div class="p-3 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
            <div class="flex items-center justify-between pb-1.5 border-b border-teal-200/80">
              <span class="text-[10px] font-black uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                <span>🏪</span> 1. Shop Financial Summary (கடை கணக்கு)
              </span>
              <span class="text-[8px] font-extrabold text-teal-700 bg-white px-2 py-0.5 rounded-full border border-teal-200">Weekly Audit</span>
            </div>

            <div class="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div class="bg-white p-2 rounded-xl border border-teal-100">
                <span class="text-slate-400 block text-[8px] uppercase font-bold">Total Income</span>
                <strong class="text-slate-900 font-black text-xs text-emerald-700">+${formatINR(weeklySales)}</strong>
              </div>
              <div class="bg-white p-2 rounded-xl border border-teal-100">
                <span class="text-slate-400 block text-[8px] uppercase font-bold">Total Expenses</span>
                <strong class="text-slate-900 font-black text-xs text-rose-600">-${formatINR(weeklyExp)}</strong>
              </div>
              <div class="bg-white p-2 rounded-xl border border-teal-100">
                <span class="text-slate-400 block text-[8px] uppercase font-bold">Net Profit</span>
                <strong class="text-slate-900 font-black text-xs text-teal-700">+${formatINR(netProfit)}</strong>
              </div>
            </div>

            <div class="bg-white p-2 rounded-xl border border-teal-200/70 flex items-center justify-between text-[11px]">
              <span class="font-bold text-slate-700 flex items-center gap-1">
                <span>🤝</span> Equal 1/3 Profit Split:
              </span>
              <div class="text-right">
                <strong class="text-teal-700 font-black text-xs">+${formatINR(equalShare)} Each</strong>
                <span class="text-[8px] text-slate-400 block font-medium">(${formatINR(netProfit)} ÷ 3 Partners)</span>
              </div>
            </div>
          </div>

          <!-- SECTION 2: Inch-by-Inch Step-by-Step Partner Settlement Math (உங்களுக்கான கணக்கு) -->
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div class="flex items-center justify-between pb-1 border-b border-slate-200">
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <span>🔍</span> 2. ${partner}'s Settlement Math (உங்களுக்கான கணக்கு)
              </span>
              <span class="text-[8px] text-slate-400 font-bold uppercase">Inch-by-Inch Breakdown</span>
            </div>

            <!-- 1. Pocket Reimbursement -->
            <div class="flex items-start justify-between text-xs">
              <div>
                <strong class="text-slate-800 font-extrabold block">① ${roleExpenseLabel}</strong>
                <span class="text-[9px] text-slate-500 block">Out-of-pocket spend to be refunded 100%</span>
              </div>
              <span class="font-black text-slate-900 text-xs">+${formatINR(partnerSpends)}</span>
            </div>

            <!-- 2. Profit Share -->
            <div class="flex items-start justify-between text-xs">
              <div>
                <strong class="text-slate-800 font-extrabold block">② Equal 1/3 Net Profit Share</strong>
                <span class="text-[9px] text-teal-700 block">Your equal 1/3 share of shop net profit</span>
              </div>
              <span class="font-black text-teal-700 text-xs">+${formatINR(equalShare)}</span>
            </div>

            <!-- 3. Carry Forward -->
            ${carriedDue > 0 ? `
            <div class="flex items-start justify-between text-xs p-2 rounded-xl bg-amber-50 border border-amber-200">
              <div>
                <strong class="text-amber-900 font-extrabold block">③ Previous Week Pending Due</strong>
                <span class="text-[9px] text-amber-700 block">Unpaid balance carried forward from last week</span>
              </div>
              <span class="font-black text-amber-800 text-xs">+${formatINR(carriedDue)}</span>
            </div>
            ` : `
            <div class="flex items-start justify-between text-[11px] text-slate-400">
              <div>
                <span class="font-bold block">③ Previous Week Arrears</span>
                <span class="text-[9px] text-slate-400 block">All previous weeks cleared (No pending dues)</span>
              </div>
              <span class="font-semibold text-slate-500">₹0</span>
            </div>
            `}

            <!-- Total Calculation Bar -->
            <div class="pt-2 border-t-2 border-slate-300 flex items-center justify-between">
              <div>
                <span class="text-xs font-black text-slate-900 uppercase tracking-tight block">Total Settlement Due</span>
                <span class="text-[8px] text-slate-500 font-semibold">(Refund + Profit Share + Prior Balance)</span>
              </div>
              <span class="text-base font-black text-teal-700">${formatINR(totalDue)}</span>
            </div>
          </div>

          <!-- SECTION 3: Payment Status & Reconciliation -->
          <div class="p-3 rounded-2xl ${isPaid ? 'bg-emerald-50 border border-emerald-300' : (isPartial ? 'bg-amber-50 border border-amber-300' : 'bg-slate-100 border border-slate-300')} space-y-1.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 font-black text-xs ${isPaid ? 'text-emerald-800' : (isPartial ? 'text-amber-800' : 'text-slate-800')}">
                ${isPaid ? '<span>✅</span> PAID IN FULL' : (isPartial ? '<span>🟡</span> PARTIALLY PAID' : '<span>⏳</span> PAYMENT PENDING')}
              </div>
              <span class="text-[9px] font-bold text-slate-500">${currentInvoiceState.paidAt ? 'Paid: ' + currentInvoiceState.paidAt : 'Due from Balaji'}</span>
            </div>

            <div class="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-200/80">
              <div>
                <span class="text-slate-500 block font-semibold">Amount Paid:</span>
                <strong class="text-slate-900 font-black text-xs">${formatINR(paidAmount)}</strong>
                ${currentInvoiceState.paidAt ? `<span class="text-[8px] text-slate-400 block">via ${currentInvoiceState.method}</span>` : ''}
              </div>
              <div class="text-right">
                <span class="text-slate-500 block font-semibold">Remaining to Pay:</span>
                <strong class="${remainingDue === 0 ? 'text-emerald-700' : 'text-rose-600'} font-black text-xs">${remainingDue === 0 ? '₹0 (All Cleared)' : formatINR(remainingDue)}</strong>
              </div>
            </div>
          </div>

          <!-- SECTION 4: Digital Verification & Signatures -->
          <div class="pt-2 border-t border-slate-200 grid grid-cols-2 gap-4 text-[9px] text-slate-500">
            <div>
              <span class="block text-slate-400">Payer & Cashier:</span>
              <span class="font-bold text-slate-800 block mt-0.5">Balaji (MeenMart)</span>
              <span class="text-[8px] text-emerald-600 block">Verified & Reconciled ✔</span>
            </div>
            <div class="text-right">
              <span class="block text-slate-400">Payee Partner:</span>
              <span class="font-bold text-slate-800 block mt-0.5">${partner}</span>
              <span class="text-[8px] text-slate-400 block">Official Partnership Record</span>
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



// Attach to window for inline onclick handlers in HTML
window.ensureHtml2PdfLoaded = ensureHtml2PdfLoaded;
window.exportToPDF = exportToPDF;
window.exportWeeklySettlementPDF = exportWeeklySettlementPDF;
window.closeWeeklySettlementPdfModal = closeWeeklySettlementPdfModal;
window.printWeeklyReport = printWeeklyReport;
window.openPartnerInvoiceModal = openPartnerInvoiceModal;
window.closePartnerInvoiceModal = closePartnerInvoiceModal;
window.saveOrSharePartnerInvoicePDF = saveOrSharePartnerInvoicePDF;
window.saveOrShareWeeklyReportPDF = saveOrShareWeeklyReportPDF;
window.sharePartnerInvoiceWhatsApp = sharePartnerInvoiceWhatsApp;
