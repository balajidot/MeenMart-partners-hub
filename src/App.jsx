import React from 'react';
import { useAuth } from './hooks/useAuth';
import AuthGate from './components/AuthGate';
import AppShell from './AppShell';

export default function App() {
  const { user, partner, status, error, signIn, signOut } = useAuth();

  if (status !== 'signed-in') {
    return <AuthGate status={status} error={error} onSignIn={signIn} />;
  }

  // Mount AppShell only after auth — this ensures useStore's Firebase
  // listener starts only when we have permission, avoiding the noisy
  // permission_denied console error on the sign-in screen.
  return <AppShell user={user} partner={partner} onSignOut={signOut} />;
}
