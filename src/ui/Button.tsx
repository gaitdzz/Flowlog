import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from './theme';
type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  disabled?: boolean;
  icon?: string;
  isDark?: boolean;
  style?: any;
};
export const Button: React.FC<Props> = ({ title, onPress, variant = 'primary', disabled, icon, isDark = false, style }) => {
  const t = getTheme(isDark);
  const bg = variant === 'primary' ? t.primary : variant === 'secondary' ? t.secondary : variant === 'success' ? t.success : variant === 'danger' ? t.danger : t.ghostBg;
  const color = variant === 'ghost' ? t.text : '#ffffff';
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.btn, { backgroundColor: disabled ? t.border : bg }, style]}>
      <View style={styles.row}>
        {!!icon && <Ionicons name={icon as any} size={20} color={color} />}
        <Text style={[styles.text, { color }]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontWeight: '600' },
});
