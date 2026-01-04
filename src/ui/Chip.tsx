import React from 'react';
import { View, Text } from 'react-native';
import { getTheme } from './theme';
type Props = { label: string; selected?: boolean; count?: number; color?: string; isDark?: boolean; style?: any };
export const Chip: React.FC<Props> = ({ label, selected, count, color, isDark = false, style }) => {
  const t = getTheme(isDark);
  const bg = selected ? t.success : color || t.ghostBg;
  const text = selected ? '#ffffff' : t.text;
  return (
    <View style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: bg }, style]}>
      <Text style={{ color: text, fontWeight: '600' }}>{label}{typeof count === 'number' ? ` ${count}` : ''}</Text>
    </View>
  );
};
