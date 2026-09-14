import React from 'react';
import { useAuth } from './hooks/useAuth';
import AuthGate from './components/AuthGate';
import AppShell from './AppShell';
import { isPreview, previewPartner } from './devPreview';

export default function App() {
  const { partner, status, error, signIn, signOut } = useAuth();

  // Dev-only design harness; compiled out of production builds.
  if (isPreview) {
    return <AppShell partner={previewPartner} onSignOut={() => {}} />;
  }

  if (status !== 'signed-in') {
    return <AuthGate status={status} error={error} onSignIn={signIn} />;
  }

  // Mount AppShell only after auth — this ensures useStore's Firebase
  // listener starts only when we have permission, avoiding the noisy
  // permission_denied console error on the sign-in screen.
  return <AppShell partner={partner} onSignOut={signOut} />;
}
