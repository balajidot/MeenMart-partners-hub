import { useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { partnerFromEmail, isAllowedEmail } from '../config/partners';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'signed-in' | 'signed-out' | 'forbidden'
  const [error, setError] = useState(null);

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
        // Not on allowlist — sign them out and surface a clean error.
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
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user?.email || '';
      if (!isAllowedEmail(email)) {
        setError(`${email} is not authorized. Contact Balaji.`);
        await signOut(auth).catch(() => {});
      }
    } catch (err) {
      // popup-closed-by-user is expected, don't surface it
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError(err?.message || 'Sign-in failed');
      }
    }
  }, []);

  const doSignOut = useCallback(async () => {
    await signOut(auth).catch(() => {});
  }, []);

  return { user, partner, status, error, signIn, signOut: doSignOut };
}
