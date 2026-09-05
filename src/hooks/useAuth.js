import { useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { partnerFromEmail, isAllowedEmail } from '../config/partners';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'signed-in' | 'signed-out' | 'forbidden'
  const [error, setError] = useState(null);

  // On mount: check if we're returning from a redirect sign-in
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          const email = result.user.email || '';
          if (!isAllowedEmail(email)) {
            setError(`${email} is not authorized. Contact Balaji.`);
            signOut(auth).catch(() => {});
          }
        }
      })
      .catch((err) => {
        if (err?.code && err.code !== 'auth/no-auth-event') {
          setError(err?.message || 'Sign-in failed');
        }
      });
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setPartner(null);
        setStatus('signed-out');
        return;
      }
      const email = fbUser.email || '';
      const matched = partnerFromEmail(email);
      if (!matched) {
        setError(`${email} is not authorized. Contact Balaji.`);
        setStatus('forbidden');
        await signOut(auth).catch(() => {});
        setUser(null);
        setPartner(null);
        return;
      }
      setUser({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
      });
      setPartner(matched);
      setStatus('signed-in');
      setError(null);
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      // Try popup first — snappier UX on desktop
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // Popup blocked / not supported → fall back to full-page redirect
      const fallbackCodes = [
        'auth/popup-blocked',
        'auth/popup-closed-by-user',
        'auth/operation-not-supported-in-this-environment',
        'auth/cancelled-popup-request',
      ];
      if (fallbackCodes.includes(err?.code)) {
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          // User dismissed popup — don't auto-redirect, just silently return
          return;
        }
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          setError(redirectErr?.message || 'Sign-in failed');
        }
      } else {
        setError(err?.message || 'Sign-in failed');
      }
    }
  }, []);

  const doSignOut = useCallback(async () => {
    await signOut(auth).catch(() => {});
  }, []);

  return { user, partner, status, error, signIn, signOut: doSignOut };
}
