import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, Pressable, Dimensions, ScrollView } from 'react-native';
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, endOfMonth, isSameDay, isSameMonth } from 'date-fns';

interface MonthlyHeatmapProps {
  month?: Date; 
  startDate?: Date;
  endDate?: Date;
  data: Record<string, { count: number; isCompleted: boolean }>;
  compact?: boolean;
  size?: number; // Size of each cell
  onDayPress?: (date: Date) => void;
  fullWidth?: boolean;
}

export const MonthlyHeatmap = ({ month, startDate: propStart, endDate: propEnd, data, compact = false, size = 12, onDayPress, fullWidth = false }: MonthlyHeatmapProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Colors
  const emptyColor = isDark ? '#374151' : '#f3f4f6'; 
  const level1Color = isDark ? '#065f46' : '#a7f3d0'; 
  const level2Color = isDark ? '#059669' : '#34d399'; 
  const level3Color = isDark ? '#34d399' : '#059669'; 
  const todayBorderColor = isDark ? '#60a5fa' : '#3b82f6'; 

  const getColor = (dateStr: string) => {
    const dayData = data[dateStr];
    if (!dayData) return emptyColor;

    if (dayData.isCompleted) return level3Color;
    if (dayData.count > 5) return level2Color;
    if (dayData.count > 0) return level1Color;
    
    return emptyColor;
  };

  // ----------------------------------------------------------------------
  // GitHub Style Logic (Full Width / Custom Range)
  // ----------------------------------------------------------------------
  if (fullWidth || (propStart && propEnd)) {
    const blockSize = 12; 
    const blockGap = 3;
    const weekWidth = blockSize + blockGap;
    
    let startDate: Date;
    let endDate: Date;

    if (propStart && propEnd) {
        // Custom range mode (e.g. for History view)
        startDate = startOfWeek(propStart); // Align to Sunday/Monday
        endDate = endOfWeek(propEnd);
    } else {
        // Auto full-width mode (e.g. for Home view)
        const screenWidth = Dimensions.get('window').width;
        const padding = 32;
        const availableWidth = screenWidth - padding;
        const numWeeks = Math.floor(availableWidth / weekWidth);
        
        const today = new Date();
        endDate = endOfWeek(today); 
        startDate = subDays(endDate, (numWeeks * 7) - 1); 
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    days.forEach(day => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    return (
        <View style={styles.container}>
            <View style={[styles.githubGrid, { gap: blockGap }]}>
                {weeks.map((week, wIndex) => (
                    <View key={wIndex} style={[styles.githubColumn, { gap: blockGap }]}>
                        {week.map((day, dIndex) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const color = getColor(dateStr);
                            const isToday = isSameDay(day, new Date());
                            
                            return (
                                <Pressable
                                    key={dateStr}
                                    onPress={() => onDayPress && onDayPress(day)}
                                    style={({ pressed }) => [
                                        styles.cell,
                                        {
                                            backgroundColor: color,
                                            width: blockSize,
                                            height: blockSize,
                                            opacity: pressed ? 0.7 : 1,
                                        },
                                        isToday && { borderWidth: 1, borderColor: todayBorderColor }
                                    ]}
                                />
                            );
                        })}
                    </View>
                ))}
            </View>
            <View style={styles.legendContainer}>
                {['Mon', '', 'Wed', '', 'Fri', '', ''].map((label, i) => (
                     <Text key={i} style={{ fontSize: 9, color: '#9ca3af', position: 'absolute', top: i * (blockSize + blockGap), left: -24 }}>
                         {label}
                     </Text>
                ))}
            </View>
        </View>
    );
  }

  // ----------------------------------------------------------------------
  // Classic Calendar Logic (Month View)
  // ----------------------------------------------------------------------
  const targetMonth = month || new Date();
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weeksArray: Date[][] = [];
  let currentWeek: Date[] = [];
  
  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeksArray.push(currentWeek);
      currentWeek = [];
    }
  });

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  // Dynamic calculation for full width Month View
  const calculatedSize = useMemo(() => {
    if (!fullWidth && !compact) return size; // Respect size prop if not auto-full-width
    // But if we are in "Classic Calendar" mode and user wants full width (History Heatmap View)
    // We should expand gaps.
    
    // Actually, user said "width fill but not extend". 
    // This implies 7 columns should take up the width.
    const screenWidth = Dimensions.get('window').width;
    const padding = 32;
    const availableWidth = screenWidth - padding;
    // 7 columns.
    // If we want gaps, say 4px gap * 6 gaps = 24px.
    // (Width - 24) / 7 = size.
    const gapTotal = 6 * 4;
    return Math.floor((availableWidth - gapTotal) / 7);
  }, [fullWidth, size, compact]);

  const finalSize = (fullWidth && !compact) ? calculatedSize : size; 
  const gap = (fullWidth && !compact) ? 4 : 4; // Keep gap consistent?
  
  // If calculated size is huge (e.g. tablet), cap it? 
  // For mobile, width ~360 -> (360-32-24)/7 = 43px per cell. That's big.
  // User asked for "original size like 8 or 10, then width fill".
  // This means the GAP should increase, not the size.
  
  // Let's re-read: "width fill full" but "size like 8 or 10".
  // This means we need dynamic gap.
  const dynamicGap = useMemo(() => {
      if (!(fullWidth && !compact)) return 4;
      
      const screenWidth = Dimensions.get('window').width;
      const padding = 32;
      const availableWidth = screenWidth - padding;
      const targetSize = 14; // Fixed small size
      const totalCellWidth = targetSize * 7;
      const remainingSpace = availableWidth - totalCellWidth;
      return Math.floor(remainingSpace / 6);
  }, [fullWidth, compact]);

  const actualSize = (fullWidth && !compact) ? 14 : size;
  const actualGap = (fullWidth && !compact) ? dynamicGap : gap;

  const fontSize = Math.max(10, actualSize - 4);

  return (
    <View style={styles.container}>
      {!compact && (
        <Text style={[styles.monthTitle, { color: isDark ? '#e5e7eb' : '#374151' }]}>
          {format(targetMonth, 'MMMM yyyy')}
        </Text>
      )}
      
      <View style={[styles.grid, { gap: actualGap }]}>
        {/* Header Row */}
        <View style={styles.row}>
          {weekDays.map((d, i) => (
            <View key={i} style={[styles.headerCell, { width: actualSize, height: actualSize }]}>
              <Text style={[styles.headerText, { fontSize }]}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Weeks */}
        {weeksArray.map((week, wIndex) => (
          <View key={wIndex} style={styles.row}>
            {week.map((day, dIndex) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, targetMonth);
              const color = getColor(dateStr);
              const isToday = isSameDay(day, new Date());

              return (
                <Pressable 
                  key={dateStr}
                  onPress={() => onDayPress && onDayPress(day)}
                  style={({ pressed }) => [
                    styles.cell, 
                    { 
                        backgroundColor: isCurrentMonth ? color : 'transparent',
                        width: actualSize,
                        height: actualSize,
                        opacity: pressed ? 0.7 : 1,
                    },
                    isToday && { borderWidth: 2, borderColor: todayBorderColor },
                    (propStart && !propEnd && isSameDay(day, propStart)) && { borderWidth: 2, borderColor: todayBorderColor },
                    (propStart && !propEnd && day >= propStart) && { borderWidth: 1, borderColor: todayBorderColor },
                    (propStart && propEnd && day >= propStart && day <= propEnd) && { borderWidth: 2, borderColor: todayBorderColor }
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  grid: {
    // width: '100%', // Month view doesn't need full width forced
  },
  row: {
    flexDirection: 'row',
  },
  headerCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    color: '#9ca3af',
  },
  cell: {
    borderRadius: 2,
  },
  // GitHub Style Styles
  githubGrid: {
      flexDirection: 'row',
      alignItems: 'flex-end', // Align bottom
  },
  githubColumn: {
      flexDirection: 'column',
  },
  legendContainer: {
      position: 'absolute',
      left: 16,
      top: 16,
      height: '100%',
  }
});
