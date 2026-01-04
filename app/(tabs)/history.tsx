import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, useColorScheme, TouchableOpacity, Text, ScrollView, TextInput, Keyboard } from 'react-native';
import { useFlowLogStore } from '@/src/store';
import { MonthlyHeatmap } from '@/components/MonthlyHeatmap';
import { startOfYear, endOfYear, subYears, eachYearOfInterval, format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { tagColor } from '@/src/utils/colors';
import { parseTags } from '@/src/utils/tags';
import { MoodDonut } from '@/components/stats/MoodDonut';
import { ProgressRing } from '@/components/stats/ProgressRing';
import { WeeklyTrend } from '@/components/stats/WeeklyTrend';
import { monthHeatmapMetrics, monthlyMoodAndTags } from '@/src/utils/stats';

type HistoryTab = 'Heatmap' | 'Reviews' | 'Stats';

export default function HistoryScreen() {
  const router = useRouter();
  const { 
    heatmapData, loadHeatmap, historyTimelines, loadHistoryTimelines,
    reviewsList, loadReviewsHistory, searchGlobal, searchResults,
    monthlyTimelines, loadMonthlyTimelines,
    streakCount, weekCompleted, weeklyGoal, monthlyGoal
  } = useFlowLogStore();
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [activeTab, setActiveTab] = useState<HistoryTab>('Heatmap');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Shared State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Heatmap State
  const [heatmapMonthDate, setHeatmapMonthDate] = useState(new Date()); // Tracks the 1st of the month being viewed
  const [selectedLogDate, setSelectedLogDate] = useState<Date | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Reviews State
  const [reviewsMonthDate, setReviewsMonthDate] = useState(new Date());

  // Colors
  const bgColor = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1f2937';
  const subTextColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const activeTabBg = isDark ? '#374151' : '#f3f4f6';
  const activeChipBg = isDark ? '#10b981' : '#059669';
  const inactiveChipBg = isDark ? '#374151' : '#f3f4f6';
  const cardBg = isDark ? '#374151' : '#f9fafb';
  const inputBg = isDark ? '#374151' : '#f3f4f6';

  // Load Data Effects
  useEffect(() => {
    // Load heatmap data (last 2 years)
    const start = subYears(startOfYear(new Date()), 2);
    loadHeatmap(format(start, 'yyyy-MM-dd'));
    const mStart = new Date(heatmapMonthDate.getFullYear(), heatmapMonthDate.getMonth(), 1);
    const mEnd = new Date(heatmapMonthDate.getFullYear(), heatmapMonthDate.getMonth() + 1, 0);
    loadMonthlyTimelines(format(mStart, 'yyyy-MM-dd'), format(mEnd, 'yyyy-MM-dd'));
  }, []);

  useEffect(() => {
    // Load reviews for selected year
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 0, 1));
    loadReviewsHistory(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
    
    // Sync month pickers to the selected year (default to Jan if year changed, or keep month if valid?)
    // Simplest: If year changes, reset month picker to Jan of that year, OR keep month but change year.
    setHeatmapMonthDate(prev => new Date(selectedYear, prev.getMonth(), 1));
    setReviewsMonthDate(prev => new Date(selectedYear, prev.getMonth(), 1));
  }, [selectedYear]);

  // Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchGlobal(searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Computed Data
  const years = useMemo(() => {
    const end = new Date();
    const start = subYears(end, 5);
    return eachYearOfInterval({ start, end }).reverse();
  }, []);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Filter reviews by selected month
  const filteredReviews = useMemo(() => {
    return reviewsList.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === reviewsMonthDate.getMonth() && d.getFullYear() === reviewsMonthDate.getFullYear();
    });
  }, [reviewsList, reviewsMonthDate]);

  const availableTags = useMemo(() => {
    const s = new Set<string>();
    historyTimelines.forEach((t: any) => {
      const arr = parseTags(t.tags);
      arr.forEach((tag: string) => s.add(tag));
    });
    return Array.from(s);
  }, [historyTimelines]);

  const filteredTimelines = useMemo(() => {
    return historyTimelines.filter((t: any) => {
      const moodOk = selectedMood ? t.mood === selectedMood : true;
      let tagOk = true;
      if (selectedTag) {
        const arr = parseTags(t.tags);
        tagOk = arr.includes(selectedTag);
      }
      return moodOk && tagOk;
    });
  }, [historyTimelines, selectedMood, selectedTag]);

  // Handlers
  const handleDayPress = (date: Date) => {
    setSelectedLogDate(date);
    loadHistoryTimelines(format(date, 'yyyy-MM-dd'));
  };

  const handleHeatmapMonthChange = (direction: 'prev' | 'next') => {
      setHeatmapMonthDate(prev => {
          const newDate = direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
          // Auto update selected year if we cross boundary
          if (newDate.getFullYear() !== selectedYear) {
              setSelectedYear(newDate.getFullYear());
          }
          const start = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
          const end = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
          loadMonthlyTimelines(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
          return newDate;
      });
  };

  const handleReviewsMonthChange = (direction: 'prev' | 'next') => {
      setReviewsMonthDate(prev => {
          const newDate = direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
          if (newDate.getFullYear() !== selectedYear) {
            setSelectedYear(newDate.getFullYear());
          }
          return newDate;
      });
  };

  // Renderers
  const renderYearSelector = () => (
    <FlatList 
        horizontal
        data={years}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 12 }}
        renderItem={({ item }) => {
            const year = item.getFullYear();
            const isSelected = year === selectedYear;
            return (
                <TouchableOpacity 
                    onPress={() => setSelectedYear(year)}
                    style={[
                        styles.yearChip, 
                        { backgroundColor: isSelected ? activeChipBg : inactiveChipBg }
                    ]}
                >
                    <Text style={{ color: isSelected ? 'white' : textColor, fontWeight: '600' }}>
                        {year}
                    </Text>
                </TouchableOpacity>
            )
        }}
    />
  );

  const renderMonthNavigator = (currentDate: Date, onPrev: () => void, onNext: () => void) => (
      <View style={styles.monthNav}>
          <TouchableOpacity onPress={onPrev} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.monthNavText, { color: textColor }]}>
              {currentDate.getFullYear() + '年' + (currentDate.getMonth() + 1) + '月'}
          </Text>
          <TouchableOpacity onPress={onNext} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={textColor} />
          </TouchableOpacity>
      </View>
  );

  const monthlyAgg = useMemo(() => monthlyMoodAndTags(monthlyTimelines), [monthlyTimelines]);
  
  const renderStatsView = () => {
    const y = heatmapMonthDate.getFullYear();
    const m = String(heatmapMonthDate.getMonth() + 1).padStart(2, '0');
    const startStr = `${y}-${m}-01`;
    const endDate = new Date(y, heatmapMonthDate.getMonth() + 1, 0);
    const days: string[] = [];
    for (let d = 1; d <= endDate.getDate(); d++) {
      const ds = `${y}-${m}-${String(d).padStart(2, '0')}`;
      days.push(ds);
    }
    const { totalRecords, activeDays, completedDays, median } = monthHeatmapMetrics(heatmapData, heatmapMonthDate);
    const monthlyCompleted = completedDays;
    const info = [
      { label: '记录总数', value: totalRecords },
      { label: '活跃天数', value: activeDays },
      { label: '完成复盘天数', value: completedDays },
      { label: '活跃日均记录', value: activeDays ? Math.round((totalRecords / activeDays) * 10) / 10 : 0 },
      { label: '活跃日中位数', value: median },
    ];
    const moodCounts = monthlyAgg.moodCounts;
    const tagFreq = monthlyAgg.tagFreq;
    const topTags = Array.from(tagFreq.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const moodTotal = moodCounts.happy + moodCounts.neutral + moodCounts.sad;
    const pct = (n: number) => moodTotal ? Math.round((n / moodTotal) * 100) : 0;
    return (
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#10b981' }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>连续 {streakCount}</Text>
          </View>
          <View style={{ marginLeft: 6 }}>
            <ProgressRing size={48} thickness={7} progress={weeklyGoal ? weekCompleted / weeklyGoal : 0} color="#3b82f6" label="周" textColor={textColor} />
          </View>
          <View style={{ marginLeft: 4 }}>
            <ProgressRing size={48} thickness={7} progress={monthlyGoal ? monthlyCompleted / monthlyGoal : 0} color="#8b5cf6" label="月" textColor={textColor} />
          </View>
        </View>
        {renderMonthNavigator(heatmapMonthDate, () => handleHeatmapMonthChange('prev'), () => handleHeatmapMonthChange('next'))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          {info.map(i => (
            <View key={i.label} style={{ flex: 1, marginRight: 8, padding: 12, borderWidth: 1, borderColor: borderColor, borderRadius: 12 }}>
              <Text style={{ color: textColor, fontSize: 12 }}>{i.label}</Text>
              <Text style={{ color: textColor, fontSize: 20, fontWeight: 'bold' }}>{i.value}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <View style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: borderColor, borderRadius: 12 }}>
            <Text style={{ color: textColor, fontWeight: 'bold', marginBottom: 8 }}>心情分布</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: textColor }}>🙂</Text>
                <Text style={{ color: textColor, fontWeight: 'bold' }}>{moodCounts.happy} ({pct(moodCounts.happy)}%)</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: textColor }}>😐</Text>
                <Text style={{ color: textColor, fontWeight: 'bold' }}>{moodCounts.neutral} ({pct(moodCounts.neutral)}%)</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: textColor }}>🙁</Text>
                <Text style={{ color: textColor, fontWeight: 'bold' }}>{moodCounts.sad} ({pct(moodCounts.sad)}%)</Text>
              </View>
            </View>
            <View style={{ height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 8, flexDirection: 'row' }}>
              {(() => {
                const total = moodCounts.happy + moodCounts.neutral + moodCounts.sad;
                const hp = total ? Math.round((moodCounts.happy / total) * 100) : 0;
                const np = total ? Math.round((moodCounts.neutral / total) * 100) : 0;
                const sp = total ? 100 - hp - np : 0;
                return (
                  <>
                    <View style={{ width: `${hp}%`, backgroundColor: '#10b981' }} />
                    <View style={{ width: `${np}%`, backgroundColor: '#f59e0b' }} />
                    <View style={{ width: `${sp}%`, backgroundColor: '#ef4444' }} />
                  </>
                );
              })()}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: textColor, fontSize: 10 }}>🙂</Text>
              <Text style={{ color: textColor, fontSize: 10 }}>😐</Text>
              <Text style={{ color: textColor, fontSize: 10 }}>🙁</Text>
            </View>
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <MoodDonut happy={moodCounts.happy} neutral={moodCounts.neutral} sad={moodCounts.sad} size={120} thickness={12} textColor={textColor} />
            </View>
          </View>
          <View style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: borderColor, borderRadius: 12 }}>
            <Text style={{ color: textColor, fontWeight: 'bold', marginBottom: 8 }}>热门标签</Text>
            {topTags.length === 0 ? (
              <Text style={{ color: subTextColor }}>无标签</Text>
            ) : (
              topTags.map(([tag, cnt]) => {
                const totalTagUse = Array.from(tagFreq.values()).reduce((a,b)=>a+b,0);
                const pc = totalTagUse ? Math.round((cnt / totalTagUse) * 100) : 0;
                return (
                <View key={tag} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: textColor }}>#{tag}</Text>
                  <Text style={{ color: textColor, fontWeight: 'bold' }}>{cnt} ({pc}%)</Text>
                </View>
              )})
            )}
          </View>
        </View>
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: textColor, fontWeight: 'bold', marginBottom: 8 }}>每周总计</Text>
          {(() => {
            const weekly: { label: string; sum: number }[] = [];
            let cursor = startOfWeek(new Date(y, heatmapMonthDate.getMonth(), 1));
            const endCursor = endOfWeek(new Date(y, heatmapMonthDate.getMonth() + 1, 0));
            let idx = 1;
            while (cursor <= endCursor) {
              const weekDays: Date[] = [];
              const wEnd = endOfWeek(cursor);
              let d = new Date(cursor);
              while (d <= wEnd) {
                weekDays.push(new Date(d));
                d.setDate(d.getDate() + 1);
              }
              const sum = weekDays.reduce((acc, day) => {
                const ds = format(day, 'yyyy-MM-dd');
                const h = heatmapData[ds];
                return acc + (h ? h.count || 0 : 0);
              }, 0);
              weekly.push({ label: `W${idx}`, sum });
              idx += 1;
              cursor = new Date(wEnd);
              cursor.setDate(cursor.getDate() + 1);
            }
            return weekly.map(w => {
              const barWidth = Math.min(220, w.sum * 12);
              return (
                <View key={w.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ width: 40, color: subTextColor }}>{w.label}</Text>
                  <View style={{ height: 10, width: barWidth, backgroundColor: '#34d399', borderRadius: 5 }} />
                  <Text style={{ marginLeft: 8, color: textColor }}>{w.sum}</Text>
                </View>
              );
            });
          })()}
          {(() => {
            const weeklySums: number[] = [];
            let cursor = startOfWeek(new Date(y, heatmapMonthDate.getMonth(), 1));
            const endCursor = endOfWeek(new Date(y, heatmapMonthDate.getMonth() + 1, 0));
            while (cursor <= endCursor) {
              const wEnd = endOfWeek(cursor);
              let d = new Date(cursor);
              let sum = 0;
              while (d <= wEnd) {
                const ds = format(d, 'yyyy-MM-dd');
                const h = heatmapData[ds];
                sum += h ? h.count || 0 : 0;
                d.setDate(d.getDate() + 1);
              }
              weeklySums.push(sum);
              cursor = new Date(wEnd);
              cursor.setDate(cursor.getDate() + 1);
            }
            return (
              <View style={{ marginTop: 8 }}>
                <WeeklyTrend data={weeklySums} width={240} height={80} />
              </View>
            );
          })()}
          <Text style={{ color: textColor, fontWeight: 'bold', marginTop: 12, marginBottom: 8 }}>最近14天</Text>
          {(() => {
            const today = new Date();
            const days14: { ds: string; v: number }[] = [];
            for (let i = 13; i >= 0; i--) {
              const d = new Date(today);
              d.setDate(today.getDate() - i);
              const ds = format(d, 'yyyy-MM-dd');
              const h = heatmapData[ds];
              days14.push({ ds, v: h ? h.count || 0 : 0 });
            }
            const maxV = Math.max(1, ...days14.map(x => x.v));
            return (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 40 }}>
                {days14.map((x, i) => {
                  const height = Math.max(4, Math.round((x.v / maxV) * 40));
                  return <View key={i} style={{ width: 6, height, backgroundColor: '#10b981', borderRadius: 3 }} />;
                })}
              </View>
            );
          })()}
          <Text style={{ color: textColor, fontWeight: 'bold', marginTop: 12, marginBottom: 8 }}>每日强度</Text>
          {days.map(ds => {
            const h = heatmapData[ds];
            const v = h ? h.count || 0 : 0;
            const barWidth = Math.min(200, v * 10);
            return (
              <View key={ds} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ width: 80, color: subTextColor }}>{ds.slice(-2)}</Text>
                <View style={{ height: 8, width: barWidth, backgroundColor: '#10b981', borderRadius: 4 }} />
              </View>
            );
          })}
        </View>
      </View>
    );
  };
  const renderHeatmapView = () => (
    <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity style={[styles.filterChip]} onPress={() => { setSelectedMood(null); setSelectedTag(null); }}>
                <Text style={{ color: textColor }}>重置筛选</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={[styles.filterChip, selectedMood==='happy' && styles.filterChipActive]} onPress={() => setSelectedMood(selectedMood==='happy'?null:'happy')}>
                    <Text style={{ color: textColor }}>🙂</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterChip, selectedMood==='neutral' && styles.filterChipActive]} onPress={() => setSelectedMood(selectedMood==='neutral'?null:'neutral')}>
                    <Text style={{ color: textColor }}>😐</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterChip, selectedMood==='sad' && styles.filterChipActive]} onPress={() => setSelectedMood(selectedMood==='sad'?null:'sad')}>
                    <Text style={{ color: textColor }}>🙁</Text>
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {availableTags.map(tag => (
                <TouchableOpacity 
                  key={tag} 
                  style={[styles.filterChip, selectedTag===tag && styles.filterChipActive]} 
                  onPress={() => setSelectedTag(selectedTag===tag?null:tag)}
                >
                  <Text style={{ color: textColor }}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
        </View>
        {/* Month Navigator for Heatmap */}
        {renderMonthNavigator(
            heatmapMonthDate, 
            () => handleHeatmapMonthChange('prev'), 
            () => handleHeatmapMonthChange('next')
        )}

        {/* Heatmap Area - Full Width, Single Month */}
        <View style={{ paddingHorizontal: 16 }}>
            <MonthlyHeatmap 
                month={heatmapMonthDate} // Use 'month' prop to trigger Classic View logic
                data={heatmapData} 
                size={12} // Will be overridden by dynamic calculation in component if fullWidth
                onDayPress={handleDayPress}
                fullWidth // Trigger full width logic
            />
        </View>
        
        {/* Selected Day Logs */}
        <View style={[styles.list, { flex: 1, marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
                {selectedLogDate ? (selectedLogDate.getFullYear() + '年' + (selectedLogDate.getMonth()+1) + '月' + selectedLogDate.getDate() + '日') : '选择某天查看记录'}
            </Text>
            
            {selectedLogDate && (
                <FlatList
                    data={filteredTimelines}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <Text style={{ color: subTextColor, marginTop: 12 }}>
                            当天无记录
                        </Text>
                    }
                    renderItem={({ item, index }) => {
                         const isLast = index === historyTimelines.length - 1;
                         return (
                            <View style={styles.logItem}>
                                <View style={styles.logTimeContainer}>
                                    {item.end_time && (
                                        <Text style={[styles.logTime, { color: subTextColor, fontSize: 10, marginBottom: 2 }]}>
                                            {format(new Date(item.end_time), 'HH:mm')}
                                        </Text>
                                    )}
                                    <Text style={[styles.logTime, { color: subTextColor, fontWeight: 'bold' }]}>
                                        {format(new Date(item.record_time), 'HH:mm')}
                                    </Text>
                                    <View style={[styles.timelineLine, { backgroundColor: borderColor }]} />
                                </View>
                                <View style={[styles.logContent, { paddingBottom: isLast ? 0 : 20 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                      {item.mood === 'happy' && <Text style={{ marginRight: 6 }}>🙂</Text>}
                                      {item.mood === 'neutral' && <Text style={{ marginRight: 6 }}>😐</Text>}
                                      {item.mood === 'sad' && <Text style={{ marginRight: 6 }}>🙁</Text>}
                                      <Text style={{ color: textColor, fontSize: 16 }}>{item.content}</Text>
                                    </View>
                                    {(() => {
                                      try {
                                        const arr = item.tags ? JSON.parse(item.tags) : [];
                                        if (Array.isArray(arr) && arr.length) {
                                          return (
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                              {arr.map((t: string) => (
                                                <View key={t} style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: tagColor(t, isDark) }}>
                                                  <Text style={{ color: textColor }}>#{t}</Text>
                                                </View>
                                              ))}
                                            </View>
                                          );
                                        }
                                      } catch {}
                                      return null;
                                    })()}
                                </View>
                            </View>
                         )
                    }}
                />
            )}
        </View>
    </View>
  );

  const renderReviewsView = () => (
    <>
        {/* Month Navigator for Reviews */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
             {renderMonthNavigator(
                reviewsMonthDate, 
                () => handleReviewsMonthChange('prev'), 
                () => handleReviewsMonthChange('next')
            )}
        </View>

        <FlatList
            data={filteredReviews}
            keyExtractor={(item) => item.date}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <Ionicons name="document-text-outline" size={48} color={subTextColor} />
                    <Text style={{ color: subTextColor, marginTop: 12 }}>本月暂无复盘</Text>
                </View>
            }
            renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => router.push({ pathname: "/review", params: { date: item.date, readonly: 'true' } })}
                  activeOpacity={0.7}
                >
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.dateText, { color: textColor }]}>
                                {format(new Date(item.date), 'MMM d, yyyy')}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: item.is_completed ? (isDark ? '#064e3b' : '#d1fae5') : (isDark ? '#881337' : '#ffe4e6') }]}>
                                <Text style={{ fontSize: 10, color: item.is_completed ? (isDark ? '#34d399' : '#059669') : (isDark ? '#fda4af' : '#e11d48') }}>
                                    {item.word_count} words
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.contentText, { color: textColor }]} numberOfLines={4}>
                            {item.content}
                        </Text>
                    </View>
                </TouchableOpacity>
            )}
        />
    </>
  );

  const renderSearchResults = () => {
      if (!searchResults) return null;
      
      const sTags = (() => {
        const set = new Set<string>();
        searchResults.timelines.forEach((t: any) => {
          try {
            const arr = t.tags ? JSON.parse(t.tags) : [];
            if (Array.isArray(arr)) arr.forEach((tag: string) => set.add(tag));
          } catch {}
        });
        return Array.from(set);
      })();
      const filteredTimelines = searchResults.timelines.filter((t: any) => {
        const moodOk = selectedMood ? t.mood === selectedMood : true;
        let tagOk = true;
        if (selectedTag) {
          try {
            const arr = t.tags ? JSON.parse(t.tags) : [];
            tagOk = Array.isArray(arr) && arr.includes(selectedTag);
          } catch {
            tagOk = false;
          }
        }
        return moodOk && tagOk;
      });
      return (
          <ScrollView style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <TouchableOpacity style={[styles.filterChip]} onPress={() => { setSelectedMood(null); setSelectedTag(null); }}>
                  <Text style={{ color: textColor }}>Reset Filters</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity style={[styles.filterChip, selectedMood==='happy' && styles.filterChipActive]} onPress={() => setSelectedMood(selectedMood==='happy'?null:'happy')}>
                    <Text style={{ color: textColor }}>🙂</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.filterChip, selectedMood==='neutral' && styles.filterChipActive]} onPress={() => setSelectedMood(selectedMood==='neutral'?null:'neutral')}>
                    <Text style={{ color: textColor }}>😐</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.filterChip, selectedMood==='sad' && styles.filterChipActive]} onPress={() => setSelectedMood(selectedMood==='sad'?null:'sad')}>
                    <Text style={{ color: textColor }}>🙁</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {sTags.map(tag => (
                    <TouchableOpacity key={tag} style={[styles.filterChip, selectedTag===tag && styles.filterChipActive]} onPress={() => setSelectedTag(selectedTag===tag?null:tag)}>
                      <Text style={{ color: textColor }}>#{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <Text style={[styles.sectionTitle, { color: textColor }]}>时间线（{searchResults.timelines.length}）</Text>
              {filteredTimelines.map((item: any) => (
                  <View key={`t-${item.id}`} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                      <Text style={{ color: subTextColor, fontSize: 12, marginBottom: 4 }}>
                          {format(new Date(item.record_time), 'yyyy-MM-dd HH:mm')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        {item.mood === 'happy' && <Text style={{ marginRight: 6 }}>🙂</Text>}
                        {item.mood === 'neutral' && <Text style={{ marginRight: 6 }}>😐</Text>}
                        {item.mood === 'sad' && <Text style={{ marginRight: 6 }}>🙁</Text>}
                        <Text style={{ color: textColor }}>{item.content}</Text>
                      </View>
                      {(() => {
                        try {
                          const arr = item.tags ? JSON.parse(item.tags) : [];
                          if (Array.isArray(arr) && arr.length) {
                            return (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {arr.map((t: string) => (
                                  <View key={t} style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: tagColor(t, isDark) }}>
                                    <Text style={{ color: textColor }}>#{t}</Text>
                                  </View>
                                ))}
                              </View>
                            );
                          }
                        } catch {}
                        return null;
                      })()}
                  </View>
              ))}

              <Text style={[styles.sectionTitle, { color: textColor, marginTop: 24 }]}>复盘（{searchResults.reviews.length}）</Text>
              {searchResults.reviews.map((item: any) => (
                  <TouchableOpacity 
                    key={`r-${item.date}`}
                    onPress={() => router.push({ pathname: "/review", params: { date: item.date, readonly: 'true' } })}
                  >
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                        <Text style={{ color: subTextColor, fontSize: 12, marginBottom: 4 }}>
                            {format(new Date(item.date), 'yyyy-MM-dd')}
                        </Text>
                        <Text style={{ color: textColor }} numberOfLines={2}>{item.content}</Text>
                    </View>
                  </TouchableOpacity>
              ))}
              
              <View style={{ height: 40 }} />
          </ScrollView>
      )
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: inputBg }]}>
            <Ionicons name="search" size={20} color={subTextColor} style={{ marginRight: 8 }} />
            <TextInput 
                placeholder="搜索历史..." 
                placeholderTextColor={subTextColor}
                style={{ flex: 1, color: textColor, height: '100%' }}
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={subTextColor} />
                </TouchableOpacity>
            )}
        </View>

        {/* Segmented Control - Only show if not searching */}
        {!searchQuery && (
            <View style={[styles.segmentedControl, { marginTop: 12 }]}>
                <TouchableOpacity 
                    style={[styles.segmentBtn, activeTab === 'Heatmap' && { backgroundColor: isDark ? '#374151' : 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 }]}
                    onPress={() => setActiveTab('Heatmap')}
                >
                    <Text style={{ color: textColor, fontWeight: activeTab === 'Heatmap' ? 'bold' : 'normal' }}>热力图</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.segmentBtn, activeTab === 'Reviews' && { backgroundColor: isDark ? '#374151' : 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 }]}
                    onPress={() => setActiveTab('Reviews')}
                >
                    <Text style={{ color: textColor, fontWeight: activeTab === 'Reviews' ? 'bold' : 'normal' }}>复盘</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.segmentBtn, activeTab === 'Stats' && { backgroundColor: isDark ? '#374151' : 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 }]}
                    onPress={() => setActiveTab('Stats')}
                >
                    <Text style={{ color: textColor, fontWeight: activeTab === 'Stats' ? 'bold' : 'normal' }}>统计</Text>
                </TouchableOpacity>
            </View>
        )}
      </View>

      {/* Content */}
      {searchQuery ? (
          renderSearchResults()
      ) : (
          <>
            <View style={{ paddingVertical: 12 }}>
                {renderYearSelector()}
            </View>
            {activeTab === 'Heatmap' ? renderHeatmapView() : activeTab === 'Reviews' ? renderReviewsView() : renderStatsView()}
          </>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      height: 40,
      borderRadius: 20,
      paddingHorizontal: 12,
  },
  segmentedControl: {
      flexDirection: 'row',
      backgroundColor: '#f3f4f6', // default light gray
      borderRadius: 8,
      padding: 4,
      width: '100%',
  },
  segmentBtn: {
      flex: 1,
      paddingVertical: 6,
      alignItems: 'center',
      borderRadius: 6,
  },
  yearChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
  },
  monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center', // Center it or flex-start? User said "left top but under year". 
      // Let's keep it consistent: center or space-between. 
      // User said "Reviews... in the top left but under the year switch".
      // But for Heatmap "above the heatmap".
      // Let's use left aligned for consistency if requested, but center usually looks better for nav.
      // I'll stick to center for now as it's standard mobile UI pattern.
      marginBottom: 12,
      gap: 16,
  },
  navBtn: {
      padding: 4,
  },
  monthNavText: {
      fontSize: 16,
      fontWeight: 'bold',
      width: 140, // Fixed width to prevent jumping
      textAlign: 'center',
  },
  list: {
      paddingHorizontal: 16,
      paddingBottom: 24,
  },
  filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#e5e7eb',
  },
  filterChipActive: {
      backgroundColor: '#d1fae5',
      borderColor: '#10b981',
  },
  card: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
  },
  dateText: {
      fontWeight: 'bold',
      fontSize: 16,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
  },
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
  },
  contentText: {
      fontSize: 14,
      lineHeight: 20,
  },
  emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
  },
  logItem: {
      flexDirection: 'row',
  },
  logTimeContainer: {
      width: 50,
      alignItems: 'flex-end',
      paddingRight: 12,
      position: 'relative',
  },
  logTime: {
      fontSize: 12,
  },
  timelineLine: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 2,
  },
  logContent: {
      flex: 1,
      paddingLeft: 12,
  },
});
