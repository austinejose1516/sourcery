import { Redirect, Stack } from 'expo-router';

import { useAuthStatus } from '@/features/auth/hooks';

/** Gate: only signed-in users reach onboarding/home; everyone else returns to welcome. */
export default function ProtectedLayout() {
  const status = useAuthStatus();

  if (status === 'loading') return null;
  if (status === 'unauthenticated') return <Redirect href="/welcome" />;

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
