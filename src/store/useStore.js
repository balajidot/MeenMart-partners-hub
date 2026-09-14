import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ref, onValue, set, update, remove, onDisconnect } from 'firebase/database';
import { db } from '../firebase';
import { PARTNER_NAMES } from '../config/partners';
import { generateId } from '../utils/constants';
import { pruneExpiredProofs } from '../utils/calculations';
import { triggerHaptic } from '../utils/haptics';
import { isPreview, previewStore, previewOnlinePartners } from '../devPreview';

const STORAGE_KEY = 'meenmart_react_v1';
const DB_ROOT = 'meenmart/data';

/** Every collection is stored as `${DB_ROOT}/<name>/<itemId>`. */
const COLLECTIONS = ['tasks', 'expenses', 'revenues', 'capitals', 'worklogs', 'messages'];

const EMPTY_STORE = {
  tasks: [], expenses: [], revenues: [], capitals: [], worklogs: [], messages: [], activeShifts: {},
};

const PROOF_COLLECTION = { task: 'tasks', expense: 'expenses', work: 'worklogs' };

function toArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (val && typeof val === 'object') return Object.values(val).filter(Boolean);
  return [];
}

/** Oldest first; chat and ledgers both read better that way. */
function byCreatedAt(list) {
  return [...list].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export function dedupeById(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.filter((item) => {
    if (!item || !item.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function normalize(raw) {
  const num = (list, field) => list.map((it) => ({ ...it, [field]: Number(it[field] || 0) }));
  return {
    tasks:    byCreatedAt(dedupeById(toArray(raw?.tasks))),
    expenses: num(byCreatedAt(dedupeById(toArray(raw?.expenses))), 'amount'),
    revenues: num(byCreatedAt(dedupeById(toArray(raw?.revenues))), 'amount'),
    capitals: num(byCreatedAt(dedupeById(toArray(raw?.capitals))), 'amount'),
    worklogs: num(byCreatedAt(dedupeById(toArray(raw?.worklogs))), 'hours'),
    messages: byCreatedAt(dedupeById(toArray(raw?.messages))),
    activeShifts: raw?.activeShifts || {},
  };
}

/** Photos are large and already durable in the cloud; keeping them out of
 *  localStorage is what stops the 5MB quota from silently filling up. */
function withoutProofs(store) {
  const strip = (list) => (list || []).map(({ proof, ...rest }) => rest);
  return {
    ...store,
    tasks: strip(store.tasks),
    expenses: strip(store.expenses),
    worklogs: strip(store.worklogs),
    messages: strip(store.messages),
  };
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    // Corrupt cache — fall through to an empty store.
  }
  return null;
}

/** RTDB turns a JS array into keys "0","1","2", so legacy rows cannot be
 *  addressed by item id. The first client to see array-shaped data rewrites the
 *  node keyed by id; after that every write targets a single item. */
function needsKeyMigration(remote) {
  return COLLECTIONS.some((name) => Array.isArray(remote?.[name]));
}

function keyedBy(list) {
  const out = {};
  list.forEach((item) => { if (item?.id) out[item.id] = item; });
  return out;
}

export function useStore(activePartnerName = PARTNER_NAMES[0]) {
  const [store, setStore] = useState(() => (isPreview ? previewStore : loadLocal() || EMPTY_STORE));

  const [activeTab, setActiveTab] = useState('home');
  const [activeModal, setActiveModal] = useState(null);
  const [lightboxProof, setLightboxProof] = useState(null);
  const [toast, setToast] = useState(null);
  const [partnerFilter, setPartnerFilter] = useState(() => activePartnerName || PARTNER_NAMES[0]);
  const [prevPartnerName, setPrevPartnerName] = useState(activePartnerName);

  // Follow the logged-in partner when it changes (derived-state pattern).
  if (activePartnerName !== prevPartnerName) {
    setPrevPartnerName(activePartnerName);
    if (activePartnerName && activePartnerName !== 'all') setPartnerFilter(activePartnerName);
  }

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => Date.now());
  const [presenceMap, setPresenceMap] = useState({});
  const [profiles, setProfiles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('meenmart_profiles') || '{}'); } catch { return {}; }
  });

  const toastTimer = useRef(null);
  const didMigrate = useRef(false);
  // Lets an action inspect current data synchronously, before dispatching.
  const storeRef = useRef(store);
  storeRef.current = store;
  // Firebase reports its own socket state; the browser reports the network.
  const fbConnected = useRef(false);

  /* ── Connection + presence ─────────────────────────────────────── */
  useEffect(() => {
    if (isPreview) return;
    const connectedRef = ref(db, '.info/connected');
    const unsubConn = onValue(connectedRef, (snap) => {
      fbConnected.current = snap.val() === true;
      setIsOnline(fbConnected.current && navigator.onLine);

      if (fbConnected.current && activePartnerName) {
        const userStatusRef = ref(db, `presence/${activePartnerName}`);
        onDisconnect(userStatusRef).set({ state: 'offline', lastSeen: Date.now() }).catch(() => {});
        set(userStatusRef, { state: 'online', lastSeen: Date.now() }).catch(() => {});
      }
    });

    const syncNetwork = () => setIsOnline(fbConnected.current && navigator.onLine);
    window.addEventListener('online', syncNetwork);
    window.addEventListener('offline', syncNetwork);

    return () => {
      unsubConn();
      window.removeEventListener('online', syncNetwork);
      window.removeEventListener('offline', syncNetwork);
    };
  }, [activePartnerName]);

  useEffect(() => {
    if (!activePartnerName || !isOnline) return;
    const interval = setInterval(() => {
      set(ref(db, `presence/${activePartnerName}`), { state: 'online', lastSeen: Date.now() }).catch(() => {});
    }, 180000);
    return () => clearInterval(interval);
  }, [activePartnerName, isOnline]);

  useEffect(() => {
    if (isPreview) return;
    const unsub = onValue(ref(db, 'presence'), (snapshot) => {
      setPresenceMap(snapshot.val() || {});
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isPreview) return;
    const unsub = onValue(ref(db, 'profiles'), (snapshot) => {
      const val = snapshot.val();
      if (!val) return;
      setProfiles(val);
      try { localStorage.setItem('meenmart_profiles', JSON.stringify(val)); } catch { /* quota */ }
    });
    return () => unsub();
  }, []);

  const onlinePartners = useMemo(() => {
    if (isPreview) return previewOnlinePartners;
    const res = {};
    PARTNER_NAMES.forEach((name) => { res[name] = false; });
    if (activePartnerName) res[activePartnerName] = true;
    Object.entries(presenceMap).forEach(([name, data]) => {
      if (data?.state === 'online') res[name] = true;
    });
    return res;
  }, [presenceMap, activePartnerName]);

  /* ── Remote → local ────────────────────────────────────────────── */
  useEffect(() => {
    if (isPreview) return;
    const unsub = onValue(
      ref(db, DB_ROOT),
      (snapshot) => {
        const remote = snapshot.val();
        setLastSyncedAt(Date.now());
        const next = pruneExpiredProofs(normalize(remote));
        setStore(next);

        if (remote && !didMigrate.current && needsKeyMigration(remote)) {
          didMigrate.current = true;
          const payload = {};
          COLLECTIONS.forEach((name) => { payload[name] = keyedBy(next[name]); });
          update(ref(db, DB_ROOT), payload).catch((e) => {
            console.warn('Key migration skipped:', e.message);
          });
        }
      },
      (err) => {
        console.warn('Firebase sync error (offline fallback):', err.message);
        setIsOnline(false);
      }
    );
    return () => unsub();
  }, []);

  /* ── Local → localStorage (an effect, so no state updater has side effects) ── */
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutProofs(store)));
      } catch {
        // Quota exceeded — the cloud copy is authoritative, so skipping is safe.
      }
    }, 300);
    return () => clearTimeout(id);
  }, [store]);

  /* ── Targeted remote writes ────────────────────────────────────── */
  const failWrite = useCallback((e) => {
    console.warn('Firebase write failed:', e?.message);
    setIsOnline(false);
  }, []);

  const putItem = useCallback((collection, item) => {
    if (isPreview) return;
    set(ref(db, `${DB_ROOT}/${collection}/${item.id}`), item).catch(failWrite);
  }, [failWrite]);

  const patchItem = useCallback((collection, id, patch) => {
    if (isPreview) return;
    update(ref(db, `${DB_ROOT}/${collection}/${id}`), patch).catch(failWrite);
  }, [failWrite]);

  const dropItem = useCallback((collection, id) => {
    if (isPreview) return;
    remove(ref(db, `${DB_ROOT}/${collection}/${id}`)).catch(failWrite);
  }, [failWrite]);

  /** Optimistic local edit of a single collection. */
  const applyLocal = useCallback((collection, fn) => {
    setStore((prev) => ({ ...prev, [collection]: fn(prev[collection] || []) }));
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    triggerHaptic(type === 'warn' || type === 'error' ? 'warning' : 'success');
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* ── Tasks ─────────────────────────────────────────────────────── */
  const addTask = useCallback((task) => {
    const now = Date.now();
    const newTask = {
      id: generateId(), ...task, status: 'pending', createdAt: now,
      proof: task.proof || null,
      proofAddedAt: task.proof ? (task.proofAddedAt || now) : null,
    };
    applyLocal('tasks', (list) => [...list, newTask]);
    putItem('tasks', newTask);
    showToast('✅ Task added!');
  }, [applyLocal, putItem, showToast]);

  const completeTask = useCallback((id, status = 'completed') => {
    const patch = { status, completedAt: status === 'completed' ? Date.now() : null };
    applyLocal('tasks', (list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    patchItem('tasks', id, patch);
    showToast(status === 'completed' ? '🎉 Task completed!' : '↩️ Task marked pending');
  }, [applyLocal, patchItem, showToast]);

  const completeTaskWithProof = useCallback((id, proof) => {
    const now = Date.now();
    const existing = (storeRef.current.tasks || []).find((t) => t.id === id);
    const patch = {
      status: 'completed', completedAt: now,
      proof: proof || existing?.proof || null,
      proofAddedAt: proof ? now : (existing?.proofAddedAt ?? null),
    };
    applyLocal('tasks', (list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    patchItem('tasks', id, patch);
    showToast('🎉 Task completed with proof!');
  }, [applyLocal, patchItem, showToast]);

  /** Only the partner who assigned a task may delete it. The check reads current
   *  data synchronously, so the caller gets a truthful result. */
  const deleteTask = useCallback((id, requesterName = null) => {
    const target = (storeRef.current.tasks || []).find((t) => t.id === id);
    const assigner = target?.from || target?.createdBy;
    if (target && requesterName && assigner && assigner !== requesterName) {
      showToast(`⚠️ Only ${assigner} (who assigned this) can delete this task!`, 'warn');
      return false;
    }
    applyLocal('tasks', (list) => list.filter((t) => t.id !== id));
    dropItem('tasks', id);
    setCompletingTask((prev) => (prev?.id === id ? null : prev));
    showToast('🗑️ Task deleted');
    return true;
  }, [applyLocal, dropItem, showToast]);

  const addTaskComment = useCallback((taskId, comment) => {
    const target = (storeRef.current.tasks || []).find((t) => t.id === taskId);
    if (!target) return;
    const newComment = {
      id: generateId(),
      partner: comment.partner || 'Partner',
      text: comment.text,
      isProblem: !!comment.isProblem,
      createdAt: Date.now(),
    };
    const patch = {
      comments: [...(target.comments || []), newComment],
      hasProblem: comment.isProblem ? true : (target.hasProblem || false),
    };
    applyLocal('tasks', (list) => list.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    patchItem('tasks', taskId, patch);
    showToast(comment.isProblem ? '⚠️ Problem flagged on task' : '💬 Comment posted');
  }, [applyLocal, patchItem, showToast]);

  const toggleTaskProblem = useCallback((taskId, isProblem) => {
    applyLocal('tasks', (list) => list.map((t) => (t.id === taskId ? { ...t, hasProblem: isProblem } : t)));
    patchItem('tasks', taskId, { hasProblem: isProblem });
    showToast(isProblem ? '⚠️ Task marked with problem/blocker' : '✅ Problem marked resolved');
  }, [applyLocal, patchItem, showToast]);

  /* ── Worklogs ──────────────────────────────────────────────────── */
  const addWorklog = useCallback((log) => {
    const now = Date.now();
    const newLog = {
      id: generateId(), ...log, hours: Number(log.hours || 0), createdAt: now,
      proof: log.proof || null,
      proofAddedAt: log.proof ? (log.proofAddedAt || now) : null,
    };
    applyLocal('worklogs', (list) => [...list, newLog]);
    putItem('worklogs', newLog);
    showToast('⏱️ Shift log saved!');
  }, [applyLocal, putItem, showToast]);

  const deleteWorklog = useCallback((id, requesterName = null) => {
    const target = (storeRef.current.worklogs || []).find((w) => w.id === id);
    if (target && requesterName && target.partner && target.partner !== requesterName) {
      showToast(`⚠️ Idhu ${target.partner}-oda shift log! Avanga mattum dhaan delete panna mudiyum.`, 'warn');
      return false;
    }
    applyLocal('worklogs', (list) => list.filter((w) => w.id !== id));
    dropItem('worklogs', id);
    showToast('🗑️ Shift log deleted');
    return true;
  }, [applyLocal, dropItem, showToast]);

  /* ── Proofs & messages ─────────────────────────────────────────── */
  const addProof = useCallback((type, id, dataUrl) => {
    const collection = PROOF_COLLECTION[type];
    if (!collection) return;
    const patch = { proof: dataUrl, proofAddedAt: Date.now() };
    applyLocal(collection, (list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    patchItem(collection, id, patch);
    showToast('📸 Proof photo attached!');
  }, [applyLocal, patchItem, showToast]);

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
    applyLocal('messages', (list) => [...list, newMsg]);
    putItem('messages', newMsg);
  }, [applyLocal, putItem]);

  /* ── Shifts ────────────────────────────────────────────────────── */
  const toggleShift = useCallback((partnerName, forceIn = null) => {
    if (!partnerName) return;
    const isIn = !!storeRef.current.activeShifts?.[partnerName];
    const willBeIn = forceIn !== null ? forceIn : !isIn;
    const startedAt = Date.now();

    setStore((prev) => {
      const shifts = { ...(prev.activeShifts || {}) };
      if (willBeIn) shifts[partnerName] = startedAt;
      else delete shifts[partnerName];
      return { ...prev, activeShifts: shifts };
    });

    const shiftRef = ref(db, `${DB_ROOT}/activeShifts/${partnerName}`);
    (willBeIn ? set(shiftRef, startedAt) : remove(shiftRef)).catch(failWrite);
  }, [failWrite]);

  /* ── Profiles ──────────────────────────────────────────────────── */
  const updateProfilePhoto = useCallback((partnerName, avatarUrl) => {
    if (!partnerName) return;
    const nextData = { ...(profiles[partnerName] || {}), avatarUrl, updatedAt: Date.now() };
    set(ref(db, `profiles/${partnerName}`), nextData)
      .then(() => showToast('📸 Profile photo updated!'))
      .catch((e) => {
        console.warn('Profile photo write failed:', e?.message);
        showToast('⚠️ Photo saved on this device only — cloud sync failed.', 'warn');
      });
    setProfiles((prev) => {
      const updated = { ...prev, [partnerName]: nextData };
      try { localStorage.setItem('meenmart_profiles', JSON.stringify(updated)); } catch { /* quota */ }
      return updated;
    });
  }, [profiles, showToast]);

  /* ── Danger zone ───────────────────────────────────────────────── */
  const wipeAll = useCallback(() => {
    setStore(EMPTY_STORE);
    const payload = { activeShifts: null };
    COLLECTIONS.forEach((name) => { payload[name] = null; });
    update(ref(db, DB_ROOT), payload).catch(failWrite);
    showToast('🗑️ All data cleared');
  }, [failWrite, showToast]);

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
    onlinePartners, profiles, updateProfilePhoto,
    addTask, completeTask, completeTaskWithProof, deleteTask,
    addTaskComment, toggleTaskProblem,
    addWorklog, deleteWorklog,
    addProof, sendMessage,
    toggleShift, wipeAll,
  };
}
