// ==========================================
// 🔥 MEENMART PARTNERS HUB - FIREBASE & AUTH SERVICE
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { firebaseConfig, PARTNERS, PARTNER_EMAILS } from './config.js';
import { state } from './state.js';
import { renderPartnerAvatar } from './utils.js';

// Init Firebase Services with Multi-Tab IndexedDB Offline Persistence
export const app = initializeApp(firebaseConfig);

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  firestoreInstance = getFirestore(app);
}
export const db = firestoreInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Re-export Firestore & Auth utilities for components
export {
  collection, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, onSnapshot, query, orderBy,
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut
};

// UI Avatar Updates
export function updateHeaderAvatar() {
  const topAv = document.getElementById('currentPartnerAvatar');
  if (topAv && state.currentPartner) {
    topAv.innerHTML = renderPartnerAvatar(state.currentPartner, 'w-6 h-6', 'rounded-lg');
  }
  const adminBadge = document.getElementById('partnerAdminBadge');
  if (adminBadge) {
    if (state.currentPartner === 'Balaji') {
      adminBadge.classList.remove('hidden');
    } else {
      adminBadge.classList.add('hidden');
    }
  }
}

export function updateLoginAvatars() {
  ['Balaji', 'Nagoor', 'JP'].forEach(p => {
    const el = document.getElementById(`loginAvatar-${p}`);
    if (el) {
      if (PARTNERS[p] && PARTNERS[p].photoUrl) {
        el.innerHTML = `<img src="${PARTNERS[p].photoUrl}" class="w-full h-full object-cover" alt="${p}" />`;
      } else {
        el.innerText = (PARTNERS[p] && PARTNERS[p].avatar) || '👤';
      }
    }
  });
}

export function updatePartnerCardAvatars() {
  ['Balaji', 'Nagoor', 'JP'].forEach(p => {
    const el = document.getElementById(`cardAvatar-${p}`);
    if (el) {
      el.innerHTML = renderPartnerAvatar(p, 'w-8 h-8', 'rounded-xl');
    }
  });
}

// Google Sign In
export async function handleGoogleSignIn() {
  const btn = document.getElementById('btnAuthSignIn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-base"></i> <span>Logging in...</span>`;
  }
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    alert("Google Login error: " + err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-brands fa-google text-rose-500 text-base"></i> <span>Google Login</span>`;
    }
  }
}

// Google Sign Out
export async function handleSignOut() {
  if (confirm("Are you sure you want to sign out?")) {
    await signOut(auth);
  }
}

// Setup Auth Observer
export function setupAuthObserver(onAuthenticated) {
  onAuthStateChanged(auth, (user) => {
    state.currentUser = user;
    const gate = document.getElementById('authGateSection');
    const appContainer = document.getElementById('appContainer');
    const alertBox = document.getElementById('unauthorizedAlert');
    const btn = document.getElementById('btnAuthSignIn');

    if (user) {
      const email = (user.email || '').toLowerCase().trim();
      const matchedPartner = PARTNER_EMAILS[email];

      if (matchedPartner) {
        state.currentPartner = matchedPartner;
        if (gate) gate.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');

        const partnerNameEl = document.getElementById('currentPartnerName');
        if (partnerNameEl && PARTNERS[matchedPartner]) {
          partnerNameEl.innerText = PARTNERS[matchedPartner].name;
        }
        updateHeaderAvatar();

        if (typeof onAuthenticated === 'function') {
          onAuthenticated(matchedPartner, user);
        }
      } else {
        if (gate) gate.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        if (alertBox) alertBox.classList.remove('hidden');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-brands fa-google text-rose-500 text-base"></i> <span>Google Login</span>`;
        }
      }
    } else {
      if (gate) gate.classList.remove('hidden');
      if (appContainer) appContainer.classList.add('hidden');
      if (alertBox) alertBox.classList.add('hidden');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-brands fa-google text-rose-500 text-base"></i> <span>Google Login</span>`;
      }
    }
  });
}

// Expose handlers on window for HTML onclick
if (typeof window !== 'undefined') {
  window.handleGoogleSignIn = handleGoogleSignIn;
  window.handleSignOut = handleSignOut;
  window.updateHeaderAvatar = updateHeaderAvatar;
  window.updateLoginAvatars = updateLoginAvatars;
  window.updatePartnerCardAvatars = updatePartnerCardAvatars;
}

