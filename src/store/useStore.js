import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { db } from '../firebase';
import { DEFAULT_STATE, generateId, getSeedData } from '../utils/seedData';
import { pruneExpiredProofs } from '../utils/calculations';
import { triggerHaptic } from '../utils/haptics';

const STORAGE_KEY = 'meenmart_react_v1';
const DB_PATH = 'meenmart/data';

function toArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (val && typeof val === 'object') return Object.values(val).filter(Boolean);
  return [];
}

export function dedupeById(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.filter((item) => {
    if (!item) return false;
    const key = item.id || (item.title && item.createdAt) || (item.reason && item.createdAt) || JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function stripDemoData(data) {
  if (!data) return data;
  const isDemoTask = (t) => t.title && (t.title.includes('காலை மீன் மார்க்கெட்') || t.title.includes('Notification Setup') || t.title.includes('Route திட்டம்'));
  const isDemoExp = (e) => e.reason && (e.reason.includes('காசிமேடு சந்தை') || e.reason.includes('பைக் சர்வீஸ்') || e.reason.includes('Firebase Blaze Plan'));
  const isDemoWork = (w) => {
    const txt = w.desc || w.activity || w.description || '';
    return txt.includes('காலை 5 மணி மார்க்கெட்') || txt.includes('18 ஆர்டர்கள்') || txt.includes('Firebase Integration');
  };
  const isDemoCap = (c) => c.note === 'ஆரம்ப முதலீடு';
  const isDemoMsg = (m) => m.text && (m.text.includes('நேரலைக்கு வந்துவிட்டது') || m.text.includes('காசிமேடு சந்தை நிலவரம்') || m.text.includes('இன்றைய டெலிவரி ரூட்கள்'));

  return {
    ...data,
    tasks:    dedupeById(data.tasks || []).filter((t) => !isDemoTask(t)),
    expenses: dedupeById(data.expenses || []).filter((e) => !isDemoExp(e)),
    revenues: dedupeById(data.revenues || []),
    capitals: dedupeById(data.capitals || []).filter((c) => !isDemoCap(c)),
    worklogs: dedupeById(data.worklogs || []).filter((w) => !isDemoWork(w)),
    messages: dedupeById(data.messages || []).filter((m) => !isDemoMsg(m)),
  };
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const clean = stripDemoData({
        tasks:    toArray(parsed.tasks),
        expenses: toArray(parsed.expenses).map((e) => ({ ...e, amount: Number(e.amount || 0) })),
        revenues: toArray(parsed.revenues).map((r) => ({ ...r, amount: Number(r.amount || 0) })),
        capitals: toArray(parsed.capitals).map((c) => ({ ...c, amount: Number(c.amount || 0) })),
        worklogs: toArray(parsed.worklogs).map((w) => ({ ...w, hours: Number(w.hours || 0) })),
        messages: toArray(parsed.messages),
      });
      return clean;
    }
  } catch {
    // ignore parse error
  }
  return null;
}

export function useStore(activePartnerName = 'Balaji') {
  const [store, setStore] = useState(() => {
    const local = loadLocal();
    if (local) return pruneExpiredProofs(local);
    const seed = getSeedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  });

  const [activeTab, setActiveTab] = useState('home');
  const [activeModal, setActiveModal] = useState(null);
  const [lightboxProof, setLightboxProof] = useState(null);
  const [toast, setToast] = useState(null);
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => Date.now());
  const toastTimer = useRef(null);
  const fbRef = useRef(null);
  const isMounted = useRef(true);

  // Presence State & Sync
  const [presenceMap, setPresenceMap] = useState({});
  const [profiles, setProfiles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('meenmart_profiles') || '{}');
    } catch {
      return {};
    }
  });

  // Monitor Firebase Realtime Database connection status & Presence
  useEffect(() => {
    const connectedRef = ref(db, '.info/connected');
    const unsubConn = onValue(connectedRef, (snap) => {
      const connected = snap.val() === true;
      setIsOnline(connected && navigator.onLine);

      if (connected && activePartnerName) {
        const userStatusRef = ref(db, `presence/${activePartnerName}`);
        try {
          onDisconnect(userStatusRef)
            .set({ state: 'offline', lastSeen: Date.now() })
            .catch(() => {});
          set(userStatusRef, { state: 'online', lastSeen: Date.now() }).catch(() => {});
        } catch (e) {
          console.warn('Presence registration failed:', e);
        }
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubConn();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activePartnerName]);

  // Periodic heartbeat for presence every 3 minutes
  useEffect(() => {
    if (!activePartnerName || !isOnline) return;
    const interval = setInterval(() => {
      try {
        const userStatusRef = ref(db, `presence/${activePartnerName}`);
        set(userStatusRef, { state: 'online', lastSeen: Date.now() }).catch(() => {});
      } catch {}
    }, 180000);
    return () => clearInterval(interval);
  }, [activePartnerName, isOnline]);

  // Listen to all partners' presence
  useEffect(() => {
    const presenceRef = ref(db, 'presence');
    const unsub = onValue(presenceRef, (snapshot) => {
      const val = snapshot.val();
      if (val) setPresenceMap(val);
    });
    return () => unsub();
  }, []);

  // Listen to partner profiles (avatars, bio)
  useEffect(() => {
    const profilesRef = ref(db, 'profiles');
    const unsub = onValue(profilesRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setProfiles(val);
        try {
          localStorage.setItem('meenmart_profiles', JSON.stringify(val));
        } catch {}
      }
    });
    return () => unsub();
  }, []);

  // Derived map of who is currently online
  const onlinePartners = useMemo(() => {
    const res = { Balaji: false, Nagoor: false, JP: false };
    // Current user is always online locally
    if (activePartnerName) res[activePartnerName] = true;

    Object.entries(presenceMap).forEach(([pName, data]) => {
      if (data && data.state === 'online') {
        res[pName] = true;
      }
    });
    return res;
  }, [presenceMap, activePartnerName]);

  // Realtime Firebase two-way sync
  useEffect(() => {
    isMounted.current = true;
    const dbRef = ref(db, DB_PATH);
    fbRef.current = dbRef;

    const unsub = onValue(dbRef, (snapshot) => {
      const remote = snapshot.val();
      if (!remote || !isMounted.current) return;
      setLastSyncedAt(Date.now());
      // Remote Firebase state is canonical; prevents reviving deleted items
      setStore(() => {
        const canonical = stripDemoData({
          tasks:        dedupeById(toArray(remote.tasks)),
          expenses:     dedupeById(toArray(remote.expenses)).map((e) => ({ ...e, amount: Number(e.amount || 0) })),
          revenues:     dedupeById(toArray(remote.revenues)).map((r) => ({ ...r, amount: Number(r.amount || 0) })),
          capitals:     dedupeById(toArray(remote.capitals)).map((c) => ({ ...c, amount: Number(c.amount || 0) })),
          worklogs:     dedupeById(toArray(remote.worklogs)).map((w) => ({ ...w, hours: Number(w.hours || 0) })),
          messages:     dedupeById(toArray(remote.messages)),
          activeShifts: remote.activeShifts || {},
        });
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
      setIsOnline(false);
    });

    return () => {
      isMounted.current = false;
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const updateStore = useCallback((updater) => {
    setStore((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const deduplicated = {
        ...next,
        tasks:        dedupeById(next.tasks),
        expenses:     dedupeById(next.expenses),
        revenues:     dedupeById(next.revenues),
        capitals:     dedupeById(next.capitals),
        worklogs:     dedupeById(next.worklogs),
        messages:     dedupeById(next.messages),
        activeShifts: next.activeShifts || {},
      };
      const pruned = pruneExpiredProofs(deduplicated);

      // Asynchronously persist out of React state calculation
      queueMicrotask(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
        } catch (e) {
          console.warn('Storage save failed:', e);
        }
        if (fbRef.current) {
          set(fbRef.current, {
            tasks:        pruned.tasks || [],
            expenses:     pruned.expenses || [],
            revenues:     pruned.revenues || [],
            capitals:     pruned.capitals || [],
            worklogs:     pruned.worklogs || [],
            messages:     pruned.messages || [],
            activeShifts: pruned.activeShifts || {},
            lastUpdated:  Date.now(),
          })
            .then(() => setLastSyncedAt(Date.now()))
            .catch((e) => {
              console.warn('Firebase write failed (offline):', e.message);
              setIsOnline(false);
            });
        }
      });

      return pruned;
    });
  }, []);

  const saveStore = useCallback((newStore) => {
    updateStore(() => newStore);
  }, [updateStore]);

  const showToast = useCallback((msg, type = 'success') => {
    if (type === 'warn' || type === 'error') {
      triggerHaptic('warning');
    } else {
      triggerHaptic('success');
    }
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
      tasks: [newTask, ...(prev.tasks || []).filter((t) => t.id !== newTask.id)],
    }));
    showToast('✅ Task added!');
  }, [updateStore, showToast]);

  const completeTask = useCallback((id, status = 'completed') => {
    updateStore((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              completedAt: status === 'completed' ? Date.now() : null,
            }
          : t
      ),
    }));
    showToast(status === 'completed' ? '🎉 Task completed!' : '↩️ Task marked pending');
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
    showToast('🎉 Task completed with proof!');
  }, [updateStore, showToast]);

  const deleteTask = useCallback((id, requesterName = null) => {
    let allowed = true;
    let assignerName = '';
    updateStore((prev) => {
      const target = (prev.tasks || []).find((t) => t.id === id);
      if (target && requesterName) {
        const assigner = target.from || target.createdBy;
        if (assigner && assigner !== requesterName) {
          allowed = false;
          assignerName = assigner;
          return prev;
        }
      }
      return {
        ...prev,
        tasks: (prev.tasks || []).filter((t) => t.id !== id),
      };
    });
    if (!allowed) {
      showToast(`⚠️ Only ${assignerName} (who assigned this) can delete this task!`, 'warn');
      return false;
    }
    setCompletingTask((prev) => (prev?.id === id ? null : prev));
    showToast('🗑️ Task deleted');
    return true;
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
      expenses: [newExp, ...(prev.expenses || []).filter((e) => e.id !== newExp.id)],
    }));
    showToast('💰 Expense logged!');
  }, [updateStore, showToast]);

  const deleteExpense = useCallback((id, requesterName = null) => {
    let allowed = true;
    let owner = '';
    updateStore((prev) => {
      const target = (prev.expenses || []).find((e) => e.id === id);
      if (target && requesterName && target.partner !== requesterName) {
        allowed = false;
        owner = target.partner;
        return prev;
      }
      return {
        ...prev,
        expenses: (prev.expenses || []).filter((e) => e.id !== id),
      };
    });
    if (!allowed) {
      showToast(`⚠️ Idhu ${owner}-oda selavu! Avanga mattum dhaan delete panna mudiyum.`, 'warn');
      return false;
    }
    showToast('🗑️ Expense deleted');
    return true;
  }, [updateStore, showToast]);

  const updateExpense = useCallback((id, updatedData, requesterName = null) => {
    let allowed = true;
    let owner = '';
    updateStore((prev) => {
      const target = (prev.expenses || []).find((e) => e.id === id);
      if (target && requesterName && target.partner !== requesterName) {
        allowed = false;
        owner = target.partner;
        return prev;
      }
      return {
        ...prev,
        expenses: (prev.expenses || []).map((e) =>
          e.id === id
            ? { ...e, ...updatedData, amount: Number(updatedData.amount ?? e.amount), updatedAt: Date.now() }
            : e
        ),
      };
    });
    if (!allowed) {
      showToast(`⚠️ Idhu ${owner}-oda selavu! Avanga mattum dhaan edit panna mudiyum.`, 'warn');
      return false;
    }
    showToast('✏️ Selavu updated!');
    return true;
  }, [updateStore, showToast]);

  const addRevenue = useCallback((revenue) => {
    const now = Date.now();
    const newRev = {
      id: generateId(),
      ...revenue,
      amount: Number(revenue.amount || 0),
      createdAt: now,
    };
    updateStore((prev) => ({
      ...prev,
      revenues: [newRev, ...(prev.revenues || []).filter((r) => r.id !== newRev.id)],
    }));
    showToast('💚 Revenue recorded!');
  }, [updateStore, showToast]);

  const deleteRevenue = useCallback((id, requesterName = null) => {
    let allowed = true;
    let owner = '';
    updateStore((prev) => {
      const target = (prev.revenues || []).find((r) => r.id === id);
      if (target && requesterName && target.partner !== requesterName) {
        allowed = false;
        owner = target.partner;
        return prev;
      }
      return {
        ...prev,
        revenues: (prev.revenues || []).filter((r) => r.id !== id),
      };
    });
    if (!allowed) {
      showToast(`⚠️ Idhu ${owner}-oda varavu! Avanga mattum dhaan delete panna mudiyum.`, 'warn');
      return false;
    }
    showToast('🗑️ Revenue deleted');
    return true;
  }, [updateStore, showToast]);

  const updateRevenue = useCallback((id, updatedData, requesterName = null) => {
    let allowed = true;
    let owner = '';
    updateStore((prev) => {
      const target = (prev.revenues || []).find((r) => r.id === id);
      if (target && requesterName && target.partner !== requesterName) {
        allowed = false;
        owner = target.partner;
        return prev;
      }
      return {
        ...prev,
        revenues: (prev.revenues || []).map((r) =>
          r.id === id
            ? { ...r, ...updatedData, amount: Number(updatedData.amount ?? r.amount), updatedAt: Date.now() }
            : r
        ),
      };
    });
    if (!allowed) {
      showToast(`⚠️ Idhu ${owner}-oda varavu! Avanga mattum dhaan edit panna mudiyum.`, 'warn');
      return false;
    }
    showToast('✏️ Varavu updated!');
    return true;
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
      capitals: [newCap, ...(prev.capitals || []).filter((c) => c.id !== newCap.id)],
    }));
    showToast('🏦 Capital added!');
  }, [updateStore, showToast]);

  const deleteCapital = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      capitals: (prev.capitals || []).filter((c) => c.id !== id),
    }));
    showToast('🗑️ Capital record deleted');
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
      worklogs: [newLog, ...(prev.worklogs || []).filter((w) => w.id !== newLog.id)],
    }));
    showToast('⏱️ Shift log saved!');
  }, [updateStore, showToast]);

  const deleteWorklog = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      worklogs: (prev.worklogs || []).filter((w) => w.id !== id),
    }));
    showToast('🗑️ Shift log deleted');
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
    showToast('📸 Proof photo attached!');
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
      messages: [...(prev.messages || []).filter((m) => m.id !== newMsg.id), newMsg],
    }));
  }, [updateStore]);

  const toggleShift = useCallback((partnerName, forceIn = null) => {
    updateStore((prev) => {
      const currentShifts = { ...(prev.activeShifts || {}) };
      const isCurrentlyIn = !!currentShifts[partnerName];
      const willBeIn = forceIn !== null ? forceIn : !isCurrentlyIn;
      if (willBeIn) {
        currentShifts[partnerName] = Date.now();
      } else {
        delete currentShifts[partnerName];
      }
      return {
        ...prev,
        activeShifts: currentShifts,
      };
    });
  }, [updateStore]);

  const updateProfilePhoto = useCallback((partnerName, avatarUrl) => {
    if (!partnerName) return;
    const profileRef = ref(db, `profiles/${partnerName}`);
    const nextData = {
      ...(profiles[partnerName] || {}),
      avatarUrl,
      updatedAt: Date.now(),
    };
    try {
      set(profileRef, nextData).catch(() => {});
    } catch {}
    setProfiles((prev) => {
      const updated = { ...prev, [partnerName]: nextData };
      try {
        localStorage.setItem('meenmart_profiles', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('📸 Profile photo updated!');
  }, [profiles, showToast]);

  const wipeAll = useCallback(() => {
    const empty = { ...DEFAULT_STATE, tasks: [], expenses: [], capitals: [], worklogs: [], messages: [], activeShifts: {} };
    saveStore(empty);
    showToast('🗑️ All data cleared');
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
    isOnline, lastSyncedAt,
    // Presence & Profiles
    onlinePartners,
    profiles,
    updateProfilePhoto,
    // Actions
    addTask, completeTask, completeTaskWithProof, deleteTask,
    addExpense, updateExpense, deleteExpense,
    addRevenue, updateRevenue, deleteRevenue,
    addCapital, deleteCapital,
    addWorklog, deleteWorklog,
    addProof, sendMessage,
    toggleShift, wipeAll,
  };
}
