import React, { lazy, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthGate from './components/AuthGate';
import { isPreview, previewPartner } from './devPreview';

// Deferred so the sign-in screen never downloads the Realtime Database SDK,
// the store, or any tab — none of it is reachable until a partner is in.
const AppShell = lazy(() => import('./AppShell'));

export default function App() {
  const { partner, status, error, signIn, signOut } = useAuth();

  // Dev-only design harness; compiled out of production builds.
  if (isPreview) {
    return (
      <Suspense fallback={<AuthGate status="loading" />}>
        <AppShell partner={previewPartner} onSignOut={() => {}} />
      </Suspense>
    );
  }

  if (status !== 'signed-in') {
    return <AuthGate status={status} error={error} onSignIn={signIn} />;
  }

  // Mount AppShell only after auth — this ensures useStore's Firebase
  // listener starts only when we have permission, avoiding the noisy
  // permission_denied console error on the sign-in screen.
  return (
    <Suspense fallback={<AuthGate status="loading" />}>
      <AppShell partner={partner} onSignOut={signOut} />
    </Suspense>
  );
}
