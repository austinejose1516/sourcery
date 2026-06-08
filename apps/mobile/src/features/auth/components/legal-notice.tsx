import { Linking } from 'react-native';

import { Text } from '@/components/ui';

const TERMS_URL = 'https://recipeer.app/terms';
const PRIVACY_URL = 'https://recipeer.app/privacy';

/** "By continuing you agree to …" with tappable terms / privacy links. */
export function LegalNotice() {
  return (
    <Text variant="micro" color="textSecondary">
      By continuing you agree to ReciPeer&apos;s{' '}
      <Text variant="micro" color="primary" onPress={() => Linking.openURL(TERMS_URL)}>
        terms
      </Text>{' '}
      and{' '}
      <Text variant="micro" color="primary" onPress={() => Linking.openURL(PRIVACY_URL)}>
        privacy notice
      </Text>
      .
    </Text>
  );
}
