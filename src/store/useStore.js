import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, set, off } from 'firebase/database';
import { db } from '../firebase';
import { DEFAULT_STATE, generateId, getSeedData } from '../utils/seedData';
import { pruneExpiredProofs } from '../utils/calculations';

const STORAGE_KEY = 'meenmart_react_v1';
const DB_PATH = 'meenmart/data';

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        tasks:    parsed.tasks    || [],
        expenses: parsed.expenses || [],
        capitals: parsed.capitals || [],
        worklogs: parsed.worklogs || [],
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
  const toastTimer = useRef(null);
  const fbRef = useRef(null);
  const isMounted = useRef(true);

  // Silent Firebase sync
  useEffect(() => {
    isMounted.current = true;
    const dbRef = ref(db, DB_PATH);
    fbRef.current = dbRef;

    onValue(dbRef, (snapshot) => {
      const remote = snapshot.val();
      if (!remote || !isMounted.current) return;
      // Merge remote data silently
      setStore((prev) => {
        const merged = {
          tasks:    mergeById(prev.tasks, remote.tasks || []),
          expenses: mergeById(prev.expenses, remote.expenses || []),
          capitals: mergeById(prev.capitals, remote.capitals || []),
          worklogs: mergeById(prev.worklogs, remote.worklogs || []),
        };
        const pruned = pruneExpiredProofs(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
        return pruned;
      });
    }, (err) => {
      console.warn('Firebase sync error (offline fallback):', err.message);
    });

    return () => {
      isMounted.current = false;
      off(dbRef);
    };
  }, []);

  const saveStore = useCallback((newStore) => {
    const pruned = pruneExpiredProofs(newStore);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    setStore(pruned);
    // Silent background push to Firebase
    if (fbRef.current) {
      set(fbRef.current, {
        tasks:    pruned.tasks,
        expenses: pruned.expenses,
        capitals: pruned.capitals,
        worklogs: pruned.worklogs,
        lastUpdated: Date.now(),
      }).catch((e) => console.warn('Firebase write failed (offline):', e.message));
    }
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // CRUD helpers
  const addTask = useCallback((task) => {
    const newStore = { ...store, tasks: [{ id: generateId(), ...task, status: 'pending', createdAt: Date.now(), proof: null, proofAddedAt: null }, ...store.tasks] };
    saveStore(newStore);
    showToast('✅ பணி சேர்க்கப்பட்டது!');
  }, [store, saveStore, showToast]);

  const completeTask = useCallback((id) => {
    const newStore = { ...store, tasks: store.tasks.map((t) => t.id === id ? { ...t, status: 'completed' } : t) };
    saveStore(newStore);
    showToast('🎉 பணி முடிந்தது!');
  }, [store, saveStore, showToast]);

  const deleteTask = useCallback((id) => {
    const newStore = { ...store, tasks: store.tasks.filter((t) => t.id !== id) };
    saveStore(newStore);
    showToast('🗑️ பணி நீக்கப்பட்டது');
  }, [store, saveStore, showToast]);

  const addExpense = useCallback((expense) => {
    const newExp = { id: generateId(), ...expense, createdAt: Date.now(), proof: null, proofAddedAt: null };
    const newStore = { ...store, expenses: [newExp, ...store.expenses] };
    saveStore(newStore);
    showToast('💰 செலவு பதிவு செய்யப்பட்டது!');
  }, [store, saveStore, showToast]);

  const deleteExpense = useCallback((id) => {
    const newStore = { ...store, expenses: store.expenses.filter((e) => e.id !== id) };
    saveStore(newStore);
    showToast('🗑️ செலவு நீக்கப்பட்டது');
  }, [store, saveStore, showToast]);

  const addCapital = useCallback((capital) => {
    const newStore = { ...store, capitals: [{ id: generateId(), ...capital, createdAt: Date.now() }, ...store.capitals] };
    saveStore(newStore);
    showToast('🏦 மூலதனம் சேர்க்கப்பட்டது!');
  }, [store, saveStore, showToast]);

  const addWorklog = useCallback((log) => {
    const newStore = { ...store, worklogs: [{ id: generateId(), ...log, createdAt: Date.now(), proof: null, proofAddedAt: null }, ...store.worklogs] };
    saveStore(newStore);
    showToast('⏱️ உழைப்பு பதிவு சேர்க்கப்பட்டது!');
  }, [store, saveStore, showToast]);

  const deleteWorklog = useCallback((id) => {
    const newStore = { ...store, worklogs: store.worklogs.filter((w) => w.id !== id) };
    saveStore(newStore);
  }, [store, saveStore]);

  const addProof = useCallback((type, id, dataUrl) => {
    const now = Date.now();
    const updateList = (list) => list.map((item) =>
      item.id === id ? { ...item, proof: dataUrl, proofAddedAt: now } : item
    );
    const newStore = {
      ...store,
      tasks:    type === 'task'    ? updateList(store.tasks)    : store.tasks,
      expenses: type === 'expense' ? updateList(store.expenses) : store.expenses,
      worklogs: type === 'work'    ? updateList(store.worklogs) : store.worklogs,
    };
    saveStore(newStore);
    showToast('📸 சான்று சேர்க்கப்பட்டது!');
  }, [store, saveStore, showToast]);

  const wipeAll = useCallback(() => {
    const empty = { ...DEFAULT_STATE, tasks: [], expenses: [], capitals: [], worklogs: [] };
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
    a.href = url; a.download = `meenmart-backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [store]);

  const importJSON = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        saveStore(data);
        showToast('📥 தரவு இறக்குமதி வெற்றி!');
      } catch { showToast('❌ தவறான கோப்பு', 'error'); }
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
    // Actions
    addTask, completeTask, deleteTask,
    addExpense, deleteExpense,
    addCapital,
    addWorklog, deleteWorklog,
    addProof,
    wipeAll, loadDemo, exportJSON, importJSON,
  };
}

function mergeById(local = [], remote = []) {
  const map = new Map();
  remote.forEach((item) => item?.id && map.set(item.id, item));
  local.forEach((item) => {
    if (!item?.id) return;
    if (!map.has(item.id)) map.set(item.id, item);
    else map.set(item.id, { ...map.get(item.id), ...item });
  });
  return Array.from(map.values());
}
