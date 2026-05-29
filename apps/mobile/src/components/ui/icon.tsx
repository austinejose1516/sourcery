import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, type ColorToken } from '@sourcery/core';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorToken;
}

/** Thin wrapper over Ionicons so icon usage stays on our colour tokens. */
export function Icon({ name, size = 20, color = 'textPrimary' }: IconProps) {
  return <Ionicons name={name} size={size} color={colors[color]} />;
}
