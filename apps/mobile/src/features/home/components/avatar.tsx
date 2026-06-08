import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@recipeer/core';

import { Text } from '@/components/ui';

export interface AvatarProps {
  uri: string | null;
  /** Falls back to this person's initial when there's no image. */
  name: string;
  size?: number;
}

/** Round profile image with an initial fallback. */
export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: radius.pill };
  if (uri) {
    return <Image source={uri} style={dimension} contentFit="cover" transition={200} />;
  }
  return (
    <View style={[dimension, styles.fallback]}>
      <Text variant="label" color="textSecondary">
        {name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
