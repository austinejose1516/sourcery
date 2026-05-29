import { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
import { MotiView } from 'moti';

export interface FadeInUpProps {
  children: ReactNode;
  /** Stagger entrance by index — multiply by ~70ms for a pleasant cascade. */
  delay?: number;
  /** Vertical travel distance in px. */
  distance?: number;
  style?: ViewStyle;
}

/**
 * Subtle "rise + fade" entrance. Compose several with increasing `delay`
 * to stagger a screen's content into view.
 */
export function FadeInUp({ children, delay = 0, distance = 14, style }: FadeInUpProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: distance }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 420, delay }}
      style={style}>
      {children}
    </MotiView>
  );
}
