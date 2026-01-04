import React from 'react';
import { View } from 'react-native';
import { getTheme } from './theme';
type Props = { isDark?: boolean; style?: any; children?: React.ReactNode };
export const CategoryCard: React.FC<Props> = ({ isDark = false, style, children }) => {
  const t = getTheme(isDark);
  return <View style={[{ backgroundColor: t.card, borderRadius: 12, padding: 12 }, style]}>{children}</View>;
};
