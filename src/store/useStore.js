import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../firebase';
import { DEFAULT_STATE, generateId, getSeedData } from '../utils/seedData';
import { pruneExpiredProofs } from '../utils/calculations';

const STORAGE_KEY = 'meenmart_react_v1';
const DB_PATH = 'meenmart/data';

function toArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (val && typeof val === 'object') return Object.values(val).filter(Boolean);
  return [];
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        tasks:    toArray(parsed.tasks),
        expenses: toArray(parsed.expenses).map((e) => ({ ...e, amount: Number(e.amount || 0) })),
        capitals: toArray(parsed.capitals).map((c) => ({ ...c, amount: Number(c.amount || 0) })),
        worklogs: toArray(parsed.worklogs).map((w) => ({ ...w, hours: Number(w.hours || 0) })),
        messages: toArray(parsed.messages),
      };
    }
  } catch {
    // ignore parse error
  }
  return null;
}

export function useStore() {
  const [store, setStore] = useState(() => {
    const local = loadLocal();
    if (local) return pruneExpiredProofs(local);
    const seed = getSeedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  });

  const [activeTab, setActiveTab] = useState('tasks');
  const [activeModal, setActiveModal] = useState(null);
  const [lightboxProof, setLightboxProof] = useState(null);
  const [toast, setToast] = useState(null);
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);
  const toastTimer = useRef(null);
  const fbRef = useRef(null);
  const isMounted = useRef(true);

  // Silent Firebase sync
  useEffect(() => {
    isMounted.current = true;
    const dbRef = ref(db, DB_PATH);
    fbRef.current = dbRef;

    const unsub = onValue(dbRef, (snapshot) => {
      const remote = snapshot.val();
      if (!remote || !isMounted.current) return;
      // Remote Firebase state is canonical; prevents reviving deleted items
      setStore(() => {
        const canonical = {
          tasks:    toArray(remote.tasks),
          expenses: toArray(remote.expenses).map((e) => ({ ...e, amount: Number(e.amount || 0) })),
          capitals: toArray(remote.capitals).map((c) => ({ ...c, amount: Number(c.amount || 0) })),
          worklogs: toArray(remote.worklogs).map((w) => ({ ...w, hours: Number(w.hours || 0) })),
          messages: toArray(remote.messages),
        };
        const pruned = pruneExpiredProofs(canonical);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
        } catch (e) {
          console.warn('Storage save failed:', e);
        }
        return pruned;
      });
    }, (err) => {
      console.warn('Firebase sync error (offline fallback):', err.message);
    });

    return () => {
      isMounted.current = false;
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const updateStore = useCallback((updater) => {
    setStore((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const pruned = pruneExpiredProofs(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
      } catch (e) {
        console.warn('Storage save failed:', e);
      }
      // Silent background push to Firebase
      if (fbRef.current) {
        set(fbRef.current, {
          tasks:    pruned.tasks,
          expenses: pruned.expenses,
          capitals: pruned.capitals,
          worklogs: pruned.worklogs,
          messages: pruned.messages || [],
          lastUpdated: Date.now(),
        }).catch((e) => console.warn('Firebase write failed (offline):', e.message));
      }
      return pruned;
    });
  }, []);

  const saveStore = useCallback((newStore) => {
    updateStore(() => newStore);
  }, [updateStore]);

  const showToast = useCallback((msg, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // CRUD helpers (stable callback references)
  const addTask = useCallback((task) => {
    const now = Date.now();
    const newTask = {
      id: generateId(),
      ...task,
      status: 'pending',
      createdAt: now,
      proof: task.proof || null,
      proofAddedAt: task.proof ? (task.proofAddedAt || now) : null,
    };
    updateStore((prev) => ({
      ...prev,
      tasks: [newTask, ...(prev.tasks || [])],
    }));
    showToast('✅ பணி சேர்க்கப்பட்டது!');
  }, [updateStore, showToast]);

  const completeTask = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).map((t) => (t.id === id ? { ...t, status: 'completed', completedAt: Date.now() } : t)),
    }));
    showToast('🎉 பணி முடிந்தது!');
  }, [updateStore, showToast]);

  const completeTaskWithProof = useCallback((id, proof) => {
    const now = Date.now();
    updateStore((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'completed',
              completedAt: now,
              proof: proof || t.proof || null,
              proofAddedAt: proof ? now : t.proofAddedAt,
            }
          : t
      ),
    }));
    showToast('🎉 பணி வெற்றிகரமாக முடிந்தது!');
  }, [updateStore, showToast]);

  const deleteTask = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).filter((t) => t.id !== id),
    }));
    setCompletingTask((prev) => (prev?.id === id ? null : prev));
    showToast('🗑️ பணி நீக்கப்பட்டது');
  }, [updateStore, showToast]);

  const addExpense = useCallback((expense) => {
    const now = Date.now();
    const newExp = {
      id: generateId(),
      ...expense,
      amount: Number(expense.amount || 0),
      createdAt: now,
      proof: expense.proof || null,
      proofAddedAt: expense.proof ? (expense.proofAddedAt || now) : null,
    };
    updateStore((prev) => ({
      ...prev,
      expenses: [newExp, ...(prev.expenses || [])],
    }));
    showToast('💰 செலவு பதிவு செய்யப்பட்டது!');
  }, [updateStore, showToast]);

  const deleteExpense = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      expenses: (prev.expenses || []).filter((e) => e.id !== id),
    }));
    showToast('🗑️ செலவு நீக்கப்பட்டது');
  }, [updateStore, showToast]);

  const addCapital = useCallback((capital) => {
    const newCap = {
      id: generateId(),
      ...capital,
      amount: Number(capital.amount || 0),
      createdAt: Date.now(),
    };
    updateStore((prev) => ({
      ...prev,
      capitals: [newCap, ...(prev.capitals || [])],
    }));
    showToast('🏦 மூலதனம் சேர்க்கப்பட்டது!');
  }, [updateStore, showToast]);

  const deleteCapital = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      capitals: (prev.capitals || []).filter((c) => c.id !== id),
    }));
    showToast('🗑️ மூலதன பதிவு நீக்கப்பட்டது');
  }, [updateStore, showToast]);

  const addWorklog = useCallback((log) => {
    const now = Date.now();
    const newLog = {
      id: generateId(),
      ...log,
      hours: Number(log.hours || 0),
      createdAt: now,
      proof: log.proof || null,
      proofAddedAt: log.proof ? (log.proofAddedAt || now) : null,
    };
    updateStore((prev) => ({
      ...prev,
      worklogs: [newLog, ...(prev.worklogs || [])],
    }));
    showToast('⏱️ உழைப்பு பதிவு சேர்க்கப்பட்டது!');
  }, [updateStore, showToast]);

  const deleteWorklog = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      worklogs: (prev.worklogs || []).filter((w) => w.id !== id),
    }));
    showToast('🗑️ உழைப்பு பதிவு நீக்கப்பட்டது');
  }, [updateStore, showToast]);

  const addProof = useCallback((type, id, dataUrl) => {
    const now = Date.now();
    const updateList = (list) =>
      (list || []).map((item) =>
        item.id === id ? { ...item, proof: dataUrl, proofAddedAt: now } : item
      );
    updateStore((prev) => ({
      ...prev,
      tasks:    type === 'task'    ? updateList(prev.tasks)    : prev.tasks,
      expenses: type === 'expense' ? updateList(prev.expenses) : prev.expenses,
      worklogs: type === 'work'    ? updateList(prev.worklogs) : prev.worklogs,
    }));
    showToast('📸 சான்று சேர்க்கப்பட்டது!');
  }, [updateStore, showToast]);

  const sendMessage = useCallback((msg) => {
    const now = Date.now();
    const newMsg = {
      id: generateId(),
      partner: msg.partner,
      text: msg.text || '',
      proof: msg.proof || null,
      proofAddedAt: msg.proof ? now : null,
      createdAt: now,
    };
    updateStore((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), newMsg],
    }));
  }, [updateStore]);

  const wipeAll = useCallback(() => {
    const empty = { ...DEFAULT_STATE, tasks: [], expenses: [], capitals: [], worklogs: [], messages: [] };
    saveStore(empty);
    showToast('🗑️ எல்லா தரவும் நீக்கப்பட்டது');
  }, [saveStore, showToast]);

  const loadDemo = useCallback(() => {
    saveStore(getSeedData());
    showToast('🔄 மாதிரி தரவு ஏற்றப்பட்டது');
  }, [saveStore, showToast]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meenmart-backup-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [store]);

  const importJSON = useCallback((file) => {
    const reader = new FileReader();
    reader.onerror = () => showToast('❌ கோப்பை வாசிக்க முடியவில்லை', 'error');
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object') throw new Error('Invalid format');
        const sanitized = {
          tasks:    toArray(data.tasks),
          expenses: toArray(data.expenses).map((exp) => ({ ...exp, amount: Number(exp.amount || 0) })),
          capitals: toArray(data.capitals).map((cap) => ({ ...cap, amount: Number(cap.amount || 0) })),
          worklogs: toArray(data.worklogs).map((w) => ({ ...w, hours: Number(w.hours || 0) })),
          messages: toArray(data.messages),
        };
        saveStore(sanitized);
        showToast('📥 தரவு இறக்குமதி வெற்றி!');
      } catch {
        showToast('❌ தவறான கோப்பு', 'error');
      }
    };
    reader.readAsText(file);
  }, [saveStore, showToast]);

  return {
    store, activeTab, setActiveTab,
    activeModal, setActiveModal,
    lightboxProof, setLightboxProof,
    toast, showToast,
    partnerFilter, setPartnerFilter,
    weekOffset, setWeekOffset,
    selectedDate, setSelectedDate,
    completingTask, setCompletingTask,
    // Actions
    addTask, completeTask, completeTaskWithProof, deleteTask,
    addExpense, deleteExpense,
    addCapital, deleteCapital,
    addWorklog, deleteWorklog,
    addProof, sendMessage,
    wipeAll, loadDemo, exportJSON, importJSON,
  };
}
