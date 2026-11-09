// ==============================================================================
// 📦 MODALS & USER INTERACTION CONTROLLERS (Pure ES6 Component Module)
// ==============================================================================

import { state } from '../state.js';
import { PARTNERS, PARTNER_EMAILS, DEFAULT_CATEGORIES, updatePartners } from '../config.js';
import { db, doc, setDoc, addDoc, updateDoc, deleteDoc, collection, updateHeaderAvatar } from '../firebase.js';
import { 
  formatINR, 
  formatLocalDate, 
  getTodayString, 
  escapeHtml, 
  showToast, 
  canUserModify, 
  renderPartnerAvatar, 
  getCategoryLabel 
} from '../utils.js';


    window.modalStack = [];

    window.pushModalState = function(modalId) {
      if (!window.modalStack.includes(modalId)) {
        window.modalStack.push(modalId);
        // Push state into browser history so hardware back key closes modal instead of page
        history.pushState({ modalId: modalId, timestamp: Date.now() }, '');
      }
    };

    window.popModalState = function(modalId, fromPopState = false) {
      const idx = window.modalStack.indexOf(modalId);
      if (idx !== -1) {
        window.modalStack.splice(idx, 1);
      }
      // If closed by user button/backdrop (not by browser back button), pop the history entry cleanly
      if (!fromPopState && history.state && history.state.modalId === modalId) {
        history.back();
      }
    };

    // Global listener for Android Back Button & Browser Back Gestures
    window.addEventListener('popstate', (e) => {
      if (window.modalStack && window.modalStack.length > 0) {
        const topModal = window.modalStack[window.modalStack.length - 1];
        if (topModal === 'entryBottomSheetModal') {
          closeEntryBottomSheet(true);
        } else if (topModal === 'editTransactionModal') {
          closeEditModal(true);
        } else if (topModal === 'txDetailsModal') {
          closeTxDetailsModal(true);
        } else if (topModal === 'recordPaymentModal') {
          closeRecordPaymentModal(true);
        } else if (topModal === 'partnerInvoiceModal') {
          closePartnerInvoiceModal(true);
        } else if (topModal === 'weeklySettlementPdfModal') {
          closeWeeklySettlementPdfModal(true);
        } else if (topModal === 'editInvestmentTargetModal') {
          closeEditInvestmentTargetModal(true);
        } else if (topModal === 'categoryManagerModal') {
          closeCategoryManagerModal(true);
        } else if (topModal === 'partnerIconsModal') {
          closePartnerIconsModal(true);
        } else if (topModal === 'presenceDetailModal') {
          closePresenceDetailModal(true);
        }
      }
    });

    // =========================================================
    // 🟢 REAL-TIME PRESENCE SYNC & RICH LAST SEEN FORMATTER


    function compressImageFile(file, targetSize = 180, quality = 0.8) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
          return reject(new Error('Valid image file thevai!'));
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = targetSize;
              canvas.height = targetSize;
              const ctx = canvas.getContext('2d');
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';

              // Center-crop square calculation to preserve aspect ratio without stretching
              const minDim = Math.min(img.width, img.height);
              const sx = (img.width - minDim) / 2;
              const sy = (img.height - minDim) / 2;
              ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

              // Compress to WebP (fallback to JPEG if browser doesn't support WebP export)
              let dataUrl = canvas.toDataURL('image/webp', quality);
              if (!dataUrl.startsWith('data:image/webp')) {
                dataUrl = canvas.toDataURL('image/jpeg', quality);
              }
              // Safety reduction if dataUrl exceeds 90KB
              if (dataUrl.length > 90000) {
                dataUrl = canvas.toDataURL('image/jpeg', 0.65);
              }
              resolve(dataUrl);
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error('Image decode panna mudiyala!'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('File read error!'));
        reader.readAsDataURL(file);
      });
    }

    // Temporary staging state for photo modal
    const pendingPhotos = {
      Balaji: null,
      Nagoor: null,
      JP: null
    };

    window.handlePartnerPhotoSelect = async function(partner, event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      try {
        showToast("Compressing photo... ⏳");
        const compressedDataUrl = await compressImageFile(file, 180, 0.8);
        pendingPhotos[partner] = compressedDataUrl;

        // Update preview in modal
        const imgEl = document.getElementById(`previewPhoto-${partner}`);
        const emojiEl = document.getElementById(`previewEmoji-${partner}`);
        const badgeEl = document.getElementById(`photoBadge-${partner}`);
        const removeBtn = document.getElementById(`btnRemovePhoto-${partner}`);

        if (imgEl && emojiEl) {
          imgEl.src = compressedDataUrl;
          imgEl.classList.remove('hidden');
          emojiEl.classList.add('hidden');
        }
        if (badgeEl) {
          const kb = Math.round((compressedDataUrl.length * 3 / 4) / 1024);
          badgeEl.innerText = `Photo (${kb} KB) ⚡`;
          badgeEl.className = "inline-block mt-0.5 text-[9px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold";
        }
        if (removeBtn) removeBtn.classList.remove('hidden');

        showToast(`${partner} photo compressed! Click Save to apply ✅`);
      } catch (err) {
        alert("Photo compress error: " + err.message);
      }
    };

    window.removePartnerPhoto = function(partner) {
      pendingPhotos[partner] = ''; // explicitly cleared

      const imgEl = document.getElementById(`previewPhoto-${partner}`);
      const emojiEl = document.getElementById(`previewEmoji-${partner}`);
      const badgeEl = document.getElementById(`photoBadge-${partner}`);
      const removeBtn = document.getElementById(`btnRemovePhoto-${partner}`);

      if (imgEl && emojiEl) {
        imgEl.src = '';
        imgEl.classList.add('hidden');
        emojiEl.classList.remove('hidden');
      }
      if (badgeEl) {
        badgeEl.innerText = "Emoji";
        badgeEl.className = "inline-block mt-0.5 text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-500";
      }
      if (removeBtn) removeBtn.classList.add('hidden');
      showToast(`${partner} photo reset to emoji.`);
    };



    window.handlePartnerPillClick = function() {
      if (state.currentPartner === 'Balaji') {
        openPartnerIconsModal();
      } else {
        showToast("Balaji mattum dhaan partner photos maatha mudiyum! 🔒", "⚠️");
      }
    };

    window.openPartnerIconsModal = function() {
      if (state.currentPartner !== 'Balaji') {
        alert("Balaji mattum dhaan partner photos maatha mudiyum! 🔒");
        return;
      }

      ['Balaji', 'Nagoor', 'JP'].forEach(p => {
        pendingPhotos[p] = null; // reset pending state
        const pObj = PARTNERS[p] || {};
        const imgEl = document.getElementById(`previewPhoto-${p}`);
        const emojiEl = document.getElementById(`previewEmoji-${p}`);
        const badgeEl = document.getElementById(`photoBadge-${p}`);
        const removeBtn = document.getElementById(`btnRemovePhoto-${p}`);

        if (pObj.photoUrl) {
          if (imgEl && emojiEl) {
            imgEl.src = pObj.photoUrl;
            imgEl.classList.remove('hidden');
            emojiEl.classList.add('hidden');
          }
          if (badgeEl) {
            badgeEl.innerText = "Photo Active ⚡";
            badgeEl.className = "inline-block mt-0.5 text-[9px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold";
          }
          if (removeBtn) removeBtn.classList.remove('hidden');
        } else {
          if (imgEl && emojiEl) {
            imgEl.src = '';
            imgEl.classList.add('hidden');
            emojiEl.innerText = pObj.avatar || '👤';
            emojiEl.classList.remove('hidden');
          }
          if (badgeEl) {
            badgeEl.innerText = "Emoji";
            badgeEl.className = "inline-block mt-0.5 text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-500";
          }
          if (removeBtn) removeBtn.classList.add('hidden');
        }
      });

      document.getElementById('partnerIconsModal').classList.remove('hidden');
    };

    window.closePartnerIconsModal = function(fromPopState = false) {
      document.getElementById('partnerIconsModal').classList.add('hidden');
      popModalState('partnerIconsModal', fromPopState);
    };

    window.selectQuickAvatar = function(partner, emoji) {
      if (PARTNERS[partner]) PARTNERS[partner].avatar = emoji;
      const emojiEl = document.getElementById(`previewEmoji-${partner}`);
      if (emojiEl) emojiEl.innerText = emoji;
      // If photo was not uploaded, show emoji
      if (!pendingPhotos[partner] && !PARTNERS[partner].photoUrl) {
        showToast(`${partner} fallback emoji set to ${emoji}`);
      }
    };

    window.handleSavePartnerIcons = async function() {
      if (state.currentPartner !== 'Balaji') {
        alert("Balaji mattum dhaan partner photos maatha mudiyum! 🔒");
        return;
      }

      const btn = document.getElementById('btnSavePartnerIcons');
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Saving...</span>`;

      const updatePayload = {
        updatedAt: Date.now(),
        updatedBy: state.currentUser ? state.currentUser.email : 'Balaji'
      };

      ['Balaji', 'Nagoor', 'JP'].forEach(p => {
        let finalPhoto = PARTNERS[p].photoUrl || '';
        if (pendingPhotos[p] !== null) {
          finalPhoto = pendingPhotos[p]; // updated or cleared
        }
        updatePayload[p] = {
          avatar: PARTNERS[p].avatar || '👤',
          photoUrl: finalPhoto
        };
      });

      try {
        await setDoc(doc(db, "settings", "partners"), updatePayload, { merge: true });

        ['Balaji', 'Nagoor', 'JP'].forEach(p => {
          PARTNERS[p].photoUrl = updatePayload[p].photoUrl;
        });

        showToast("Partner photos updated successfully! ✅");
        closePartnerIconsModal();
        updateHeaderAvatar();
        updateUI();
      } catch (err) {
        alert("Photos save error: " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>Save Profile Photos</span>`;
      }
    };



    window.openEditInvestmentTargetModal = function() {
      const input = document.getElementById('inputCapitalTarget');
      const cur = state.capitalTargetPerPartner || 50000;
      if (input) input.value = cur;
      updateTargetPreview(cur);
      const modal = document.getElementById('editInvestmentTargetModal');
      if (modal) modal.classList.remove('hidden');
      pushModalState('editInvestmentTargetModal');
    };

    window.closeEditInvestmentTargetModal = function(fromPopState = false) {
      const modal = document.getElementById('editInvestmentTargetModal');
      if (modal) modal.classList.add('hidden');
      popModalState('editInvestmentTargetModal', fromPopState);
    };

    window.setTargetPreset = function(val) {
      const input = document.getElementById('inputCapitalTarget');
      if (input) {
        input.value = val;
        updateTargetPreview(val);
      }
    };

    function updateTargetPreview(val) {
      const pText = document.getElementById('previewTotalPoolText');
      const num = Number(val) || 0;
      if (pText) {
        pText.innerHTML = `3 Partners × ${formatINR(num)} = <strong>${formatINR(num * 3)} Total Pool Target</strong>`;
      }
    }

    window.handleSaveInvestmentTarget = async function() {
      const input = document.getElementById('inputCapitalTarget');
      const val = Number(input.value);
      if (isNaN(val) || val <= 0) {
        alert("Please enter a valid target amount.");
        return;
      }

      state.capitalTargetPerPartner = val;
      localStorage.setItem('meenmart_capital_target', val);

      try {
        await setDoc(doc(db, "settings", "metadata"), {
          capitalTargetPerPartner: val,
          updatedAt: Date.now(),
          updatedBy: state.currentUser ? state.currentUser.email : 'partner'
        }, { merge: true });
      } catch (err) {
        console.warn("Target Firestore sync warning:", err);
      }

      closeEditInvestmentTargetModal();
      renderAnalytics();
      showToast(`Investment target updated to ${formatINR(val)} each! 🎯`);
    };



    // Category Manager Logic
    window.openCategoryManagerModal = function() {
      document.getElementById('categoryManagerModal').classList.remove('hidden');
      pushModalState('categoryManagerModal');
      renderCatManagerList();
    };
    window.closeCategoryManagerModal = function(fromPopState = false) {
      document.getElementById('categoryManagerModal').classList.add('hidden');
      popModalState('categoryManagerModal', fromPopState);
    };

    window.switchCatManagerType = function(type) {
      state.catManagerTab = type;
      ['expense', 'sales', 'transfer', 'investment'].forEach(t => {
        const btn = document.getElementById(`catTab-${t}`);
        if (t === type) {
          btn.className = "py-2 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm";
        } else {
          btn.className = "py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400";
        }
      });
      renderCatManagerList();
    };

    function renderCatManagerList() {
      const container = document.getElementById('catManagerList');
      const list = (state.categories && state.categories[state.catManagerTab]) || [];

      if (list.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">No categories found.</div>`;
        return;
      }

      container.innerHTML = list.map((cat, idx) => `
        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
          <span class="font-bold text-slate-800 dark:text-slate-200">${cat.label}</span>
          <button onclick="handleDeleteCategory(${idx})" class="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 hover:text-rose-700 flex items-center justify-center text-[10px]" title="Delete Category">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `).join('');
    }

    window.handleAddCategory = async function() {
      const input = document.getElementById('newCatInput');
      const name = (input.value || '').trim();
      if (!name) return;

      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) || 'cat_' + Date.now();
      const newCat = { id: slug, label: name };

      if (!state.categories[state.catManagerTab]) state.categories[state.catManagerTab] = [];
      state.categories[state.catManagerTab].push(newCat);

      try {
        await setDoc(doc(db, "settings", "categories"), {
          ...state.categories,
          updatedAt: Date.now(),
          updatedBy: state.currentUser ? state.currentUser.email : 'partner'
        });
        showToast("New category added successfully! ✅");
        input.value = '';
        renderCatManagerList();
        updateCategorySelect();
      } catch (err) {
        alert("Category save error: " + err.message);
      }
    };

    window.handleDeleteCategory = async function(idx) {
      const list = state.categories[state.catManagerTab] || [];
      if (list.length <= 1) {
        alert("Kuraivadhu oru category irukanum!");
        return;
      }

      if (confirm(`'${list[idx].label}' category-ah delete panna poringala?`)) {
        list.splice(idx, 1);
        try {
          await setDoc(doc(db, "settings", "categories"), {
            ...state.categories,
            updatedAt: Date.now(),
            updatedBy: state.currentUser ? state.currentUser.email : 'partner'
          });
          showToast("Category deleted! 🗑️");
          renderCatManagerList();
          updateCategorySelect();
        } catch (err) {
          alert("Category delete error: " + err.message);
        }
      }
    };


    window.openEntryBottomSheet = function() {
      if (navigator.vibrate) navigator.vibrate(10);
      if (state.currentPartner) {
        state.entryPartner = state.currentPartner;
        updateSheetPartnerLockUI();
      }
      document.getElementById('entryBottomSheetModal').classList.remove('hidden');
      pushModalState('entryBottomSheetModal');
    };

    window.closeEntryBottomSheet = function(fromPopState = false) {
      document.getElementById('entryBottomSheetModal').classList.add('hidden');
      popModalState('entryBottomSheetModal', fromPopState);
    };

    function updateSheetPartnerLockUI() {
      const active = state.currentPartner;
      ['Balaji', 'Nagoor', 'JP'].forEach(p => {
        const btn = document.getElementById(`sheetPartner-${p}`);
        if (!btn) return;
        if (p === active) {
          btn.disabled = false;
          btn.className = "py-2.5 px-1 rounded-2xl border-2 border-teal-500 bg-teal-50 dark:bg-teal-500/25 text-center font-extrabold text-xs text-slate-900 dark:text-white shadow-sm ring-2 ring-teal-500/20";
          btn.innerHTML = `<div class="flex items-center justify-center gap-1.5">${renderPartnerAvatar(p, "w-5 h-5", "rounded-md")} <span>${PARTNERS[p].name}</span></div> <span class="block text-[9px] text-teal-600 dark:text-teal-400 font-bold mt-0.5"><i class="fa-solid fa-lock text-[8px]"></i> Neenga</span>`;
        } else {
          btn.disabled = true;
          btn.className = "py-2.5 px-1 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-100/60 dark:bg-slate-900/40 text-center font-medium text-xs text-slate-400 dark:text-slate-500 opacity-40 cursor-not-allowed pointer-events-none";
          btn.innerHTML = `<div class="flex items-center justify-center gap-1.5 opacity-60">${renderPartnerAvatar(p, "w-5 h-5", "rounded-md")} <span>${PARTNERS[p].name}</span></div> <span class="block text-[8px] text-slate-400 mt-0.5">🔒 Lock</span>`;
        }
      });
    }

    window.selectEntryToPartner = function(p) {
      state.entryToPartner = p;
      ['Nagoor', 'JP', 'Balaji'].forEach(partner => {
        const btn = document.getElementById(`sheetToPartner-${partner}`);
        if (!btn) return;
        if (partner === p) {
          btn.className = "py-2 px-1 rounded-2xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-center font-bold text-xs text-indigo-900 dark:text-indigo-200 shadow-sm";
        } else {
          btn.className = "py-2 px-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-center font-medium text-xs text-slate-600 dark:text-slate-400";
        }
      });
    };

    window.selectEntryPaymentMethod = function(method) {
      state.entryPaymentMethod = method;
      const map = { 'GPay / UPI': 'pmBtn-gpay', 'Cash': 'pmBtn-cash', 'Bank': 'pmBtn-bank' };
      Object.keys(map).forEach(m => {
        const btn = document.getElementById(map[m]);
        if (!btn) return;
        if (m === method) {
          btn.className = "py-1.5 rounded-xl border border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 text-[11px] font-bold text-center";
        } else {
          btn.className = "py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-medium text-center";
        }
      });
    };

    window.selectEntryType = function(type) {
      state.entryType = type;
      ['expense', 'sales', 'transfer', 'investment'].forEach(t => {
        const btn = document.getElementById(`typeBtn-${t}`);
        if (!btn) return;
        if (t === type) {
          const colors = {
            expense: 'bg-white dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
            sales: 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
            transfer: 'bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40',
            investment: 'bg-white dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 border-teal-300 dark:border-teal-500/40'
          };
          btn.className = `py-2.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1 ${colors[t]} border shadow-sm`;
        } else {
          btn.className = "py-2.5 rounded-xl text-[11px] font-medium flex items-center justify-center space-x-1 text-slate-600 dark:text-slate-400";
        }
      });
      updateCategorySelect();

      const toRow = document.getElementById('entryToPartnerRow');
      const pmRow = document.getElementById('entryPaymentMethodRow');
      const label = document.getElementById('entryPartnerLabel');

      if (type === 'transfer') {
        if (toRow) toRow.classList.remove('hidden');
        if (pmRow) pmRow.classList.remove('hidden');
        if (label) label.innerText = "From Partner (Sender):";
        if (!state.entryToPartner || state.entryToPartner === state.currentPartner) {
          state.entryToPartner = state.currentPartner === 'Balaji' ? 'Nagoor' : 'Balaji';
        }
        selectEntryToPartner(state.entryToPartner);
        selectEntryPaymentMethod(state.entryPaymentMethod || 'GPay / UPI');
      } else {
        if (toRow) toRow.classList.add('hidden');
        if (pmRow) pmRow.classList.add('hidden');
        if (type === 'sales') {
          if (label) label.innerText = "Yaaru income vasool pannadhu?";
        } else if (type === 'expense') {
          if (label) label.innerText = "Paid From Which Partner's Pocket?";
        } else {
          if (label) label.innerText = "Yaaru mudhaleedu pannadhu?";
        }
      }
    };

    window.selectEntryPartner = function(partner) {
      // Strict Rule: You can ONLY register under your own logged in partner profile!
      if (partner !== state.currentPartner) {
        showToast("Unga login-la neenga mattum dhaan add panna mudiyum! 🔒", "⚠️");
        return;
      }
      state.entryPartner = state.currentPartner;
      updateSheetPartnerLockUI();
    };

    window.addAmountValue = function(val) {
      const input = document.getElementById('entryAmount');
      const cur = Number(input.value) || 0;
      input.value = cur + val;
    };

    function updateCategorySelect() {
      const select = document.getElementById('entryCategory');
      if (!select) return;
      select.innerHTML = "";
      const cats = (state.categories && state.categories[state.entryType]) || DEFAULT_CATEGORIES[state.entryType] || [];
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerText = c.label;
        select.appendChild(opt);
      });
    }

    // Submit New Transaction to Firestore (Strictly Stamped with Logged-in Identity)
    window.handleFormSubmit = async function(e) {
      if (e && e.preventDefault) e.preventDefault();

      const amountVal = Number(document.getElementById('entryAmount').value);
      if (!amountVal || amountVal <= 0) {
        alert("Olungana amount type pannunga!");
        return;
      }

      const activePartner = state.currentPartner;
      if (!activePartner) {
        alert("Please Google Login pannunga!");
        return;
      }

      const btn = document.getElementById('btnSubmitEntry');
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Saving...</span>`;

      // STRICT ENFORCEMENT: Partner identity is ALWAYS locked to the logged in user
      const newTx = {
        type: state.entryType,
        partner: activePartner,
        date: document.getElementById('entryDate').value,
        category: document.getElementById('entryCategory').value,
        amount: amountVal,
        description: document.getElementById('entryDescription').value.trim(),
        createdAt: Date.now(),
        createdBy: state.currentUser ? state.currentUser.email : '',
        createdByPartner: activePartner
      };

      if (state.entryType === 'transfer') {
        newTx.toPartner = state.entryToPartner || 'Nagoor';
        newTx.paymentMethod = state.entryPaymentMethod || 'GPay / UPI';
      }

      try {
        await addDoc(collection(db, "transactions"), newTx);
        showToast("Transaction saved successfully! ✅");
        closeEntryBottomSheet();
        document.getElementById('entryAmount').value = '';
        document.getElementById('entryDescription').value = '';
      } catch (err) {
        alert("Entry save panradhula error: " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> <span>Entry Save Pannu</span>`;
      }
    };

    // Delete Transaction (Ownership Protected)
    window.handleDeleteTx = async function(id) {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return;

      if (!canUserModify(tx)) {
        alert(`Idha create panna ${PARTNERS[tx.partner] ? PARTNERS[tx.partner].name : tx.partner} mattum dhaan delete panna mudiyum! 🔒`);
        return;
      }

      if (confirm("Are you sure you want to delete this transaction? 🗑️")) {
        try {
          await deleteDoc(doc(db, "transactions", id));
          showToast("Transaction deleted successfully! 🗑️");
        } catch (err) {
          alert("Delete panradhula error: " + err.message);
        }
      }
    };



    window.openPresenceDetailModal = function() {
      renderPresenceDetailModal();
      document.getElementById('presenceDetailModal').classList.remove('hidden');
      pushModalState('presenceDetailModal');
    };

    window.closePresenceDetailModal = function(fromPopState = false) {
      document.getElementById('presenceDetailModal').classList.add('hidden');
      popModalState('presenceDetailModal', fromPopState);
    };


    window.openTxDetailsModal = function(id) {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return;
      const p = PARTNERS[tx.partner] || { name: tx.partner, avatar: '👤' };

      const avatarContainer = document.getElementById('viewTxPartnerAvatar');
      if (avatarContainer) {
        avatarContainer.innerHTML = renderPartnerAvatar(tx.partner, 'w-9 h-9', 'rounded-xl');
      }

      document.getElementById('viewTxTitle').innerText = `${p.name}-oda Entry`;
      document.getElementById('viewTxPartnerSub').innerText = `${p.name} • ${p.role || 'Partner'}`;

      const isExp = tx.type === 'expense';
      const isSales = tx.type === 'sales';
      const isTransfer = tx.type === 'transfer';
      const sign = isExp ? '-' : (isSales ? '+' : (isTransfer ? '⇄ ' : ''));
      const amountColor = isExp ? 'text-rose-600 dark:text-rose-400' : (isSales ? 'text-emerald-600 dark:text-emerald-400' : (isTransfer ? 'text-indigo-600 dark:text-indigo-400' : 'text-teal-600 dark:text-teal-400'));

      const amtEl = document.getElementById('viewTxAmount');
      amtEl.className = `text-2xl font-black mt-0.5 ${amountColor}`;
      amtEl.innerText = `${sign}${formatINR(tx.amount)}`;

      let typeBadgeHtml = '';
      if (isExp) {
        typeBadgeHtml = '<span class="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-xs font-bold">💸 Expense</span>';
      } else if (isSales) {
        typeBadgeHtml = '<span class="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 text-xs font-bold">📈 Income</span>';
      } else if (isTransfer) {
        const toText = tx.toPartner ? ` ➔ ${tx.toPartner}` : '';
        typeBadgeHtml = `<span class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 text-xs font-bold">🔄 Transfer${toText}</span>`;
      } else {
        typeBadgeHtml = '<span class="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-300 text-xs font-bold">💰 Mudhaleedu</span>';
      }
      document.getElementById('viewTxTypeBadge').innerHTML = typeBadgeHtml;

      // 100% Full Uncut Description / Notes
      const notesEl = document.getElementById('viewTxNotes');
      if (tx.description && tx.description.trim().length > 0) {
        notesEl.innerText = tx.description.trim();
        notesEl.classList.remove('italic', 'text-slate-400');
      } else {
        notesEl.innerText = 'Kurippu (Notes) edhum illai.';
        notesEl.classList.add('italic', 'text-slate-400');
      }

      document.getElementById('viewTxCategory').innerText = getCategoryLabel(tx.type, tx.category);

      let timeStr = '';
      if (tx.createdAt) {
        const d = new Date(tx.createdAt);
        if (!isNaN(d.getTime())) {
          timeStr = ' • ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
      }
      document.getElementById('viewTxDateTime').innerText = `${tx.date || ''}${timeStr}`;

      document.getElementById('viewTxLockText').innerText = `Created by ${p.name}. Only ${p.name} can edit or delete this entry (View Only). 🔒`;

      document.getElementById('txDetailsModal').classList.remove('hidden');
      pushModalState('txDetailsModal');
    };

    window.closeTxDetailsModal = function(fromPopState = false) {
      const modal = document.getElementById('txDetailsModal');
      if (modal) modal.classList.add('hidden');
      popModalState('txDetailsModal', fromPopState);
    };

    window.handleDeleteFromEditModal = async function() {
      const id = document.getElementById('editTxId').value;
      if (!id) return;
      const tx = state.transactions.find(t => t.id === id);
      if (!tx || !canUserModify(tx)) {
        alert("Idha delete panna ungalluku permission illa! 🔒");
        return;
      }

      if (confirm("இந்த பதிவை நிச்சயமாக நீக்க வேண்டுமா? 🗑️")) {
        try {
          await deleteDoc(doc(db, "transactions", id));
          closeEditModal();
          showToast("Transaction deleted successfully! 🗑️");
        } catch (err) {
          alert("Delete panradhula error: " + err.message);
        }
      }
    };

    // Edit Transaction (Ownership Protected)
    window.openEditModal = function(id) {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return;

      if (!canUserModify(tx)) {
        alert(`Idha create panna ${PARTNERS[tx.partner] ? PARTNERS[tx.partner].name : tx.partner} mattum dhaan edit panna mudiyum! 🔒`);
        return;
      }

      document.getElementById('editTxId').value = tx.id;
      const partnerSelect = document.getElementById('editTxPartner');
      partnerSelect.value = tx.partner;
      partnerSelect.disabled = true; // Permanently locked to creator
      document.getElementById('editTxType').value = tx.type;
      document.getElementById('editTxDate').value = tx.date;
      document.getElementById('editTxAmount').value = tx.amount;
      document.getElementById('editTxDescription').value = tx.description || '';
      document.getElementById('editOwnershipBadge').innerText = `${PARTNERS[tx.partner] ? PARTNERS[tx.partner].name : tx.partner}-oda Entry 🔒`;

      const toPartnerEl = document.getElementById('editTxToPartner');
      if (toPartnerEl) toPartnerEl.value = tx.toPartner || 'Nagoor';
      const toPartnerContainer = document.getElementById('editToPartnerContainer');
      if (toPartnerContainer) {
        if (tx.type === 'transfer') toPartnerContainer.classList.remove('hidden');
        else toPartnerContainer.classList.add('hidden');
      }

      updateEditCategoryOptions(tx.category);
      document.getElementById('editTransactionModal').classList.remove('hidden');
      pushModalState('editTransactionModal');
    };

    window.closeEditModal = function(fromPopState = false) {
      document.getElementById('editTransactionModal').classList.add('hidden');
      popModalState('editTransactionModal', fromPopState);
    };

    window.updateEditCategoryOptions = function(selectedCat) {
      const type = document.getElementById('editTxType').value;
      const toPartnerContainer = document.getElementById('editToPartnerContainer');
      if (toPartnerContainer) {
        if (type === 'transfer') toPartnerContainer.classList.remove('hidden');
        else toPartnerContainer.classList.add('hidden');
      }

      const select = document.getElementById('editTxCategory');
      select.innerHTML = '';
      const list = (state.categories && state.categories[type]) || DEFAULT_CATEGORIES[type] || [];
      list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerText = c.label;
        if (c.id === selectedCat) opt.selected = true;
        select.appendChild(opt);
      });
    };

    window.handleEditSubmit = async function(e) {
      if (e && e.preventDefault) e.preventDefault();
      const id = document.getElementById('editTxId').value;
      const tx = state.transactions.find(t => t.id === id);

      if (!tx || !canUserModify(tx)) {
        alert(`Idha create panna ${tx ? (PARTNERS[tx.partner] ? PARTNERS[tx.partner].name : tx.partner) : 'partner'} mattum dhaan edit panna mudiyum! 🔒`);
        return;
      }

      const updated = {
        partner: tx.partner, // Maintain original creator
        type: document.getElementById('editTxType').value,
        category: document.getElementById('editTxCategory').value,
        date: document.getElementById('editTxDate').value,
        amount: Number(document.getElementById('editTxAmount').value),
        description: document.getElementById('editTxDescription').value.trim(),
        updatedAt: Date.now()
      };

      if (updated.type === 'transfer') {
        const toEl = document.getElementById('editTxToPartner');
        if (toEl) updated.toPartner = toEl.value || 'Nagoor';
      }

      try {
        await updateDoc(doc(db, "transactions", id), updated);
        showToast("Transaction updated successfully! ✏️");
        closeEditModal();
      } catch (err) {
        alert("Update panradhula error: " + err.message);
      }
    };



// Expose all modal functions to window for native HTML onclick compatibility
window.modalStack = window.modalStack || [];
window.pushModalState = pushModalState;
window.popModalState = popModalState;

// Profile Photos Modal
window.compressImageFile = compressImageFile;
window.handlePartnerPhotoSelect = handlePartnerPhotoSelect;
window.removePartnerPhoto = removePartnerPhoto;
window.handlePartnerPillClick = handlePartnerPillClick;
window.openPartnerIconsModal = openPartnerIconsModal;
window.closePartnerIconsModal = closePartnerIconsModal;
window.selectQuickAvatar = selectQuickAvatar;
window.handleSavePartnerIcons = handleSavePartnerIcons;

// Investment Target Modal
window.openEditInvestmentTargetModal = openEditInvestmentTargetModal;
window.closeEditInvestmentTargetModal = closeEditInvestmentTargetModal;
window.setTargetPreset = setTargetPreset;
window.handleSaveInvestmentTarget = handleSaveInvestmentTarget;

// Category Manager Modal
window.openCategoryManagerModal = openCategoryManagerModal;
window.closeCategoryManagerModal = closeCategoryManagerModal;
window.switchCatManagerType = switchCatManagerType;
window.renderCatManagerList = renderCatManagerList;
window.handleDeleteCategory = handleDeleteCategory;

// Entry Bottom Sheet Modal
window.openEntryBottomSheet = openEntryBottomSheet;
window.closeEntryBottomSheet = closeEntryBottomSheet;
window.updateSheetPartnerLockUI = updateSheetPartnerLockUI;
window.selectEntryToPartner = selectEntryToPartner;
window.selectEntryPaymentMethod = selectEntryPaymentMethod;
window.selectEntryType = selectEntryType;
window.selectEntryPartner = selectEntryPartner;
window.addAmountValue = addAmountValue;
window.updateCategorySelect = updateCategorySelect;
window.handleFormSubmit = handleFormSubmit;
window.handleDeleteTx = handleDeleteTx;

// Presence Detail Modal
window.openPresenceDetailModal = openPresenceDetailModal;
window.closePresenceDetailModal = closePresenceDetailModal;

// Transaction Details & Edit Modals
window.openTxDetailsModal = openTxDetailsModal;
window.closeTxDetailsModal = closeTxDetailsModal;
window.handleDeleteFromEditModal = handleDeleteFromEditModal;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.updateEditCategoryOptions = updateEditCategoryOptions;
window.handleEditSubmit = handleEditSubmit;
