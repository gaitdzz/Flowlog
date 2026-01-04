export type AppTheme = {
  bg: string;
  text: string;
  muted: string;
  card: string;
  border: string;
  primary: string;
  secondary: string;
  success: string;
  danger: string;
  ghostBg: string;
};
export const getTheme = (isDark: boolean): AppTheme => ({
  bg: isDark ? '#1f2937' : '#ffffff',
  text: isDark ? '#ffffff' : '#1f2937',
  muted: isDark ? '#9ca3af' : '#6b7280',
  card: isDark ? '#374151' : '#f9fafb',
  border: isDark ? '#4b5563' : '#d1d5db',
  primary: '#3b82f6',
  secondary: '#6366f1',
  success: '#10b981',
  danger: '#ef4444',
  ghostBg: isDark ? '#1f2937' : '#e5e7eb',
});
