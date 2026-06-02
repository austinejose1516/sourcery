import { Redirect } from 'expo-router';

import { useAuthStatus } from '@/features/auth/hooks';

/** Entry route: sends the user to the app or the welcome flow based on session. */
export default function Index() {
  const status = useAuthStatus();

  if (status === 'loading') return null; // splash is still visible
  return <Redirect href={status === 'authenticated' ? '/home' : '/welcome'} />;
}
