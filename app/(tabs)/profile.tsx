import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Switch, TextInput, Alert, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFlowLogStore } from '@/src/store';
import { format, startOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tagColor } from '@/src/utils/colors';
import { MonthlyHeatmap } from '@/components/MonthlyHeatmap';
import { ProgressRing } from '@/components/stats/ProgressRing';
import { Button } from '@/src/ui/Button';
import { Chip } from '@/src/ui/Chip';
import { CategoryCard } from '@/src/ui/CategoryCard';

export default function SettingsScreen() {
  const router = useRouter();
  const { exportDataToFile, exportMarkdownToFile, scheduleNotification, streakCount, bestStreak, weekCompleted, monthlyTimelines, loadMonthlyTimelines, favoriteTags, addFavoriteTag, removeFavoriteTag, updateFavoriteTagColor, weeklyGoal, setWeeklyGoal, monthlyGoal, setMonthlyGoal, heatmapData, loadHeatmap, achievementsHistory, exportAchievementsToFile, exportAchievementsMarkdownToFile, exportAchievementsSummaryMarkdownToFile } = useFlowLogStore();
  const [reminderInterval, setReminderInterval] = useState('0');
  const [topTags, setTopTags] = useState<string[]>([]);
  const [selectedFavTag, setSelectedFavTag] = useState<string | null>(null);
  const [newFavTag, setNewFavTag] = useState('');
  const [newFavColor, setNewFavColor] = useState<string | null>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [monthlyCompleted, setMonthlyCompleted] = useState(0);
  const [badgeInfo, setBadgeInfo] = useState<{ label: string; desc: string; ok: boolean } | null>(null);
  const [achFilter, setAchFilter] = useState<'all' | 'streak' | 'weekly' | 'monthly'>('all');
  const [achTime, setAchTime] = useState<'all' | 'this' | 'last' | 'last3' | 'week' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exportPreviewVisible, setExportPreviewVisible] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const prSize = screenWidth < 380 ? 56 : 64;
  const prThickness = screenWidth < 380 ? 7 : 8;
  const [startPickerVisible, setStartPickerVisible] = useState(false);
  const [endPickerVisible, setEndPickerVisible] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const filteredAchievements = React.useMemo(() => {
    const base = achievementsHistory
      .filter(a => achFilter === 'all' ? true : achFilter === 'streak' ? a.type === 'streak' : achFilter === 'weekly' ? a.type === 'weekly_goal' : a.type === 'monthly_goal')
      .filter(a => {
        if (achTime === 'all') return true;
        if (a.type === 'streak') return true;
        const s = (a.date || '').split('_')[0];
        const d = new Date(s);
        if (isNaN(d.getTime())) return true;
        const now = new Date();
        const thisStart = startOfMonth(now);
        const lastStart = startOfMonth(subMonths(now, 1));
        const last3Start = startOfMonth(subMonths(now, 3));
        if (achTime === 'this') return d >= thisStart;
        if (achTime === 'last') return d >= lastStart && d < thisStart;
        if (achTime === 'last3') return d >= last3Start;
        if (achTime === 'custom') {
          const sd = new Date(customStart);
          const ed = new Date(customEnd);
          if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return true;
          const sdn = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate());
          const edn = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate());
          return d >= sdn && d <= edn;
        }
        return true;
      });
    return base;
  }, [achievementsHistory, achFilter, achTime, customStart, customEnd]);
  const isCustomRangeValid = React.useMemo(() => {
    if (achTime !== 'custom') return true;
    const rx = /^\d{4}-\d{2}-\d{2}$/;
    if (!rx.test(customStart) || !rx.test(customEnd)) return false;
    const sd = new Date(customStart);
    const ed = new Date(customEnd);
    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return false;
    return sd.getTime() <= ed.getTime();
  }, [achTime, customStart, customEnd]);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1f2937';
  const sectionTitleColor = isDark ? '#9ca3af' : '#6b7280';
  const cardBg = isDark ? '#374151' : '#f9fafb';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';

  const handleReminderChange = (value: string) => {
    setReminderInterval(value);
    scheduleNotification(parseInt(value, 10));
  };
  
  React.useEffect(() => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    loadMonthlyTimelines(format(mStart, 'yyyy-MM-dd'), format(mEnd, 'yyyy-MM-dd'));
    loadHeatmap(format(mStart, 'yyyy-MM-dd'));
  }, []);
  
  React.useEffect(() => {
    const freq = new Map<string, number>();
    monthlyTimelines.forEach((t: any) => {
      try {
        const arr = t.tags ? JSON.parse(t.tags) : [];
        if (Array.isArray(arr)) arr.forEach((tag: string) => freq.set(tag, (freq.get(tag) || 0) + 1));
      } catch {}
    });
    const sorted = Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).map(([tag])=>tag).slice(0,10);
    setTopTags(sorted);
  }, [monthlyTimelines]);
  
  React.useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const endDate = new Date(y, now.getMonth() + 1, 0);
    let completed = 0;
    for (let d = 1; d <= endDate.getDate(); d++) {
      const ds = `${y}-${m}-${String(d).padStart(2, '0')}`;
      const h = (heatmapData as any)[ds];
      if (h && h.isCompleted) completed += 1;
    }
    setMonthlyCompleted(completed);
  }, [heatmapData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { justifyContent: 'center' }]}>
          <Text style={[styles.title, { color: textColor }]}>
            Profile
          </Text>
        </View>

        {/* Reminders Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            Reminders
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardContent}>
              <Text style={[styles.cardLabel, { color: textColor }]}>Remind me to log activity</Text>
              
              {/* Note: Picker on iOS/Android behaves differently. For MVP we use a simple row. */}
              {/* Actually, let's use a simple list of buttons for MVP robustness if Picker is not installed or buggy */}
              {/* But wait, I didn't install @react-native-picker/picker. */}
              {/* I should implement a simple custom selector or just buttons. */}
              
              <View style={styles.optionsGrid}>
                {[
                  { label: 'Off', value: '0' },
                  { label: '30m', value: '30' },
                  { label: '1h', value: '60' },
                  { label: '2h', value: '120' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleReminderChange(option.value)}
                    style={[
                      styles.optionButton,
                      { 
                        backgroundColor: reminderInterval === option.value ? '#10b981' : 'transparent',
                        borderColor: isDark ? '#4b5563' : '#d1d5db'
                      }
                    ]}
                  >
                    <Text style={{ 
                      color: reminderInterval === option.value ? 'white' : textColor,
                      fontWeight: reminderInterval === option.value ? 'bold' : 'normal'
                    }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            Data
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardContent}>
              <View>
                <Text style={[styles.cardLabel, { color: textColor }]}>Export Data</Text>
                <Text style={[styles.cardDescription, { color: mutedColor }]}>
                  Download a JSON file containing all your timelines and reviews.
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={exportDataToFile}
              >
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>Export Backup</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                onPress={exportMarkdownToFile}
              >
                <Ionicons name="document-text-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>Export Markdown</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                onPress={() => setImportVisible(true)}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>Import Backup (Paste)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
                onPress={() => {
                  exportAchievementsToFile(filteredAchievements);
                }}
              >
                <Ionicons name="trophy-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>Export Achievements</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#6366f1' }]}
                onPress={() => {
                  exportAchievementsMarkdownToFile(filteredAchievements);
                }}
              >
                <Ionicons name="document-text-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>Export Achievements (MD)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                onPress={() => setExportPreviewVisible(true)}
              >
                <Ionicons name="eye-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>Preview Export</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Achievements */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            Achievements
          </Text>
          <CategoryCard isDark={isDark}>
            <View style={[styles.cardContent, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#10b981' }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Streak {streakCount}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f59e0b' }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Best {bestStreak}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#3b82f6' }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Week {weekCompleted}/{weeklyGoal}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#8b5cf6' }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Month {monthlyCompleted}/{monthlyGoal}</Text>
                </View>
                <View style={{ marginLeft: 8 }}>
                  <ProgressRing size={prSize} thickness={prThickness} progress={weeklyGoal ? weekCompleted / weeklyGoal : 0} color="#3b82f6" label="Weekly" textColor={textColor} />
                </View>
                <View style={{ marginLeft: 4 }}>
                  <ProgressRing size={prSize} thickness={prThickness} progress={monthlyGoal ? monthlyCompleted / monthlyGoal : 0} color="#8b5cf6" label="Monthly" textColor={textColor} />
                </View>
              </View>
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: '7-Day Streak', ok: bestStreak >= 7 },
                { label: '30-Day Streak', ok: bestStreak >= 30 },
                { label: '100-Day Streak', ok: bestStreak >= 100 },
                { label: 'Weekly Goal Met', ok: weekCompleted >= weeklyGoal },
                { label: 'Monthly Goal Met', ok: monthlyCompleted >= monthlyGoal },
              ].map(b => (
                <TouchableOpacity key={b.label} onPress={() => {
                  const descMap: Record<string, string> = {
                    '7-Day Streak': '连续 7 天完成复盘',
                    '30-Day Streak': '连续 30 天完成复盘',
                    '100-Day Streak': '连续 100 天完成复盘',
                    'Weekly Goal Met': '本周达到设定的周目标',
                    'Monthly Goal Met': '本月达到设定的月目标',
                  };
                  setBadgeInfo({ label: b.label, desc: descMap[b.label], ok: b.ok });
                }}>
                  <Chip isDark={isDark} label={b.label} selected={b.ok} />
                </TouchableOpacity>
              ))}
            </View>
          </CategoryCard>
        </View>
        
        {importVisible && (
          <View style={styles.modalOverlay}>
            <CategoryCard isDark={isDark} style={{ width: '90%' }}>
              <Text style={[styles.cardLabel, { color: textColor }]}>Paste JSON</Text>
              <View style={{ borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db', borderRadius: 8, padding: 8, marginTop: 8 }}>
                <Text style={{ color: mutedColor, marginBottom: 4 }}>Content</Text>
                <TextInput
                  style={{ color: textColor, minHeight: 120 }}
                  multiline
                  value={importText}
                  onChangeText={setImportText}
                  placeholder="Paste JSON here"
                  placeholderTextColor={mutedColor}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Button isDark={isDark} title="Confirm Import" icon="checkmark-circle" variant="success" onPress={async () => { 
                  const ok = await useFlowLogStore.getState().importBackupFromJson(importText); 
                  setImportVisible(false); 
                  setImportText(''); 
                  Alert.alert(ok ? 'Import Successful' : 'Import Failed', ok ? 'Backup data has been imported.' : 'Please check the JSON content.');
                }} />
                <Button isDark={isDark} title="Cancel" icon="close-circle" variant="ghost" onPress={() => { setImportVisible(false); setImportText(''); }} />
              </View>
            </CategoryCard>
          </View>
        )}
        
        {!!badgeInfo && (
          <View style={styles.modalOverlay}>
            <View style={[styles.card, { backgroundColor: cardBg, width: '80%' }]}>
              <Text style={[styles.cardLabel, { color: textColor }]}>{badgeInfo.label}</Text>
              <Text style={{ color: badgeInfo.ok ? '#10b981' : mutedColor, marginTop: 8 }}>
                {badgeInfo.desc}
              </Text>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#10b981', marginTop: 12 }]}
                onPress={() => setBadgeInfo(null)}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {startPickerVisible && (
          <View style={styles.modalOverlay}>
            <View style={[styles.card, { backgroundColor: cardBg, width: '90%' }]}>
              <Text style={[styles.cardLabel, { color: textColor }]}>Pick Start Date</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setPickerMonth(subMonths(pickerMonth, 1))}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
                    <Text style={{ color: textColor }}>Prev</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPickerMonth(subMonths(pickerMonth, 1))}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'transparent' }}>
                    <Text style={{ color: textColor }}>{format(pickerMonth, 'yyyy-MM')}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPickerMonth(subMonths(pickerMonth, -1))}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
                    <Text style={{ color: textColor }}>Next</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <MonthlyHeatmap 
                month={pickerMonth} 
                data={heatmapData} 
                startDate={customStart ? new Date(customStart) : undefined}
                endDate={customEnd ? new Date(customEnd) : undefined}
                onDayPress={(day) => { setCustomStart(format(day, 'yyyy-MM-dd')); setAchTime('custom'); setPickerMonth(startOfMonth(day)); setStartPickerVisible(false); setEndPickerVisible(true); }} 
              />
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#9ca3af', marginTop: 12 }]}
                onPress={() => setStartPickerVisible(false)}
              >
                <Ionicons name="close-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {endPickerVisible && (
          <View style={styles.modalOverlay}>
            <View style={[styles.card, { backgroundColor: cardBg, width: '90%' }]}>
              <Text style={[styles.cardLabel, { color: textColor }]}>Pick End Date</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setPickerMonth(subMonths(pickerMonth, 1))}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
                    <Text style={{ color: textColor }}>Prev</Text>
                  </View>
                </TouchableOpacity>
                <View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'transparent' }}>
                    <Text style={{ color: textColor }}>{format(pickerMonth, 'yyyy-MM')}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setPickerMonth(subMonths(pickerMonth, -1))}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
                    <Text style={{ color: textColor }}>Next</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <MonthlyHeatmap 
                month={pickerMonth} 
                data={heatmapData} 
                startDate={customStart ? new Date(customStart) : undefined}
                endDate={customEnd ? new Date(customEnd) : undefined}
                onDayPress={(day) => { setCustomEnd(format(day, 'yyyy-MM-dd')); setAchTime('custom'); setEndPickerVisible(false); }} 
              />
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#10b981', marginTop: 8 }]}
                onPress={() => setEndPickerVisible(false)}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>Apply Range</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#9ca3af', marginTop: 12 }]}
                onPress={() => setEndPickerVisible(false)}
              >
                <Ionicons name="close-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {exportPreviewVisible && (
          <View style={styles.modalOverlay}>
            <View style={[styles.card, { backgroundColor: cardBg, width: '90%' }]}>
              <Text style={[styles.cardLabel, { color: textColor }]}>Export Preview</Text>
              <View style={{ maxHeight: 280 }}>
                {filteredAchievements.length === 0 ? (
                  <Text style={{ color: mutedColor }}>No items for selected filters</Text>
                ) : filteredAchievements
                  .slice(-40)
                  .reverse()
                  .map((a, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                      <Text style={{ color: textColor }}>{a.label}</Text>
                      <Text style={{ color: mutedColor }}>{a.date}</Text>
                    </View>
                  ))}
              }
              </View>
              {(() => {
                const total = filteredAchievements.length;
                const typeCount = filteredAchievements.reduce((acc: Record<string, number>, a) => {
                  acc[a.type] = (acc[a.type] || 0) + 1;
                  return acc;
                }, {});
                const dates = filteredAchievements.map(a => {
                  const s = (a.date || '').split('_')[0];
                  return new Date(s);
                }).filter(d => !isNaN(d.getTime()));
                const min = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
                const max = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
                return (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: textColor }}>Total: {total}</Text>
                    <Text style={{ color: textColor }}>Streak: {typeCount['streak'] || 0} | Weekly: {typeCount['weekly_goal'] || 0} | Monthly: {typeCount['monthly_goal'] || 0}</Text>
                    <Text style={{ color: mutedColor }}>{min && max ? `${format(min, 'yyyy-MM-dd')} ~ ${format(max, 'yyyy-MM-dd')}` : 'No date range'}</Text>
                  </View>
                );
              })()}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Button isDark={isDark} title="Export CSV" icon="trophy-outline" variant="secondary" disabled={(achTime === 'custom' && !isCustomRangeValid) || filteredAchievements.length === 0} onPress={() => { exportAchievementsToFile(filteredAchievements); setExportPreviewVisible(false); }} />
                <Button isDark={isDark} title="Export MD" icon="document-text-outline" variant="secondary" disabled={(achTime === 'custom' && !isCustomRangeValid) || filteredAchievements.length === 0} onPress={() => { exportAchievementsMarkdownToFile(filteredAchievements); setExportPreviewVisible(false); }} />
                <Button isDark={isDark} title="Export Summary" icon="list-outline" variant="success" disabled={(achTime === 'custom' && !isCustomRangeValid) || filteredAchievements.length === 0} onPress={() => { exportAchievementsSummaryMarkdownToFile(filteredAchievements); setExportPreviewVisible(false); }} />
                <Button isDark={isDark} title="Cancel" icon="close-circle" variant="ghost" onPress={() => setExportPreviewVisible(false)} />
              </View>
            </View>
          </View>
        )}
        
        {/* Top Tags */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            Top Tags (This Month)
          </Text>
          <CategoryCard isDark={isDark}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {topTags.length === 0 ? (
                <Text style={{ color: mutedColor }}>No tags yet</Text>
              ) : (
                topTags.map(tag => (
                  <TouchableOpacity key={tag} onLongPress={() => addFavoriteTag(tag)}>
                    <Chip isDark={isDark} label={`#${tag}`} color={tagColor(tag, isDark)} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </CategoryCard>
        </View>
        
        {/* Weekly Goal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            Weekly Goal
          </Text>
          <CategoryCard isDark={isDark}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[3,5,7,10,14].map(n => (
                <TouchableOpacity key={n} onPress={() => setWeeklyGoal(n)}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: weeklyGoal === n ? '#10b981' : 'transparent', borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db' }}>
                    <Text style={{ color: weeklyGoal === n ? 'white' : textColor }}>{n}/week</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </CategoryCard>
        </View>
        
        {/* Monthly Goal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            Monthly Goal
          </Text>
          <CategoryCard isDark={isDark}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[10,15,20,25,30].map(n => (
                <TouchableOpacity key={n} onPress={() => setMonthlyGoal(n)}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: monthlyGoal === n ? '#8b5cf6' : 'transparent', borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db' }}>
                    <Text style={{ color: monthlyGoal === n ? 'white' : textColor }}>{n}/month</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </CategoryCard>
        </View>
        
        {/* Achievements History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            Achievements History
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {[
                { k: 'all', label: 'All' },
                { k: 'streak', label: 'Streak' },
                { k: 'weekly', label: 'Weekly' },
                { k: 'monthly', label: 'Monthly' },
              ].map(x => (
                <TouchableOpacity key={x.k} onPress={() => setAchFilter(x.k as any)}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: achFilter === x.k ? '#10b981' : 'transparent', borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db' }}>
                    <Text style={{ color: achFilter === x.k ? 'white' : textColor }}>{x.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {[
                { k: 'all', label: 'All Time' },
                { k: 'week', label: 'This Week' },
                { k: 'this', label: 'This Month' },
                { k: 'last', label: 'Last Month' },
                { k: 'last3', label: 'Last 3 Months' },
                { k: 'custom', label: 'Custom' },
              ].map(x => (
                <TouchableOpacity key={x.k} onPress={() => setAchTime(x.k as any)}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: achTime === x.k ? '#3b82f6' : 'transparent', borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db' }}>
                    <Text style={{ color: achTime === x.k ? 'white' : textColor }}>{x.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => { setAchFilter('all'); setAchTime('all'); setCustomStart(''); setCustomEnd(''); }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#e5e7eb', alignSelf: 'flex-start' }}>
                <Text style={{ color: textColor }}>Reset Filters</Text>
              </View>
            </TouchableOpacity>
            {achTime === 'custom' && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1, borderWidth: 1, borderColor: isCustomRangeValid ? (isDark ? '#4b5563' : '#d1d5db') : '#ef4444', borderRadius: 8, paddingHorizontal: 8 }}>
                  <Text style={{ color: mutedColor, fontSize: 12, marginTop: 6 }}>Start YYYY-MM-DD</Text>
                  <TextInput
                    style={{ color: textColor, height: 40 }}
                    value={customStart}
                    onChangeText={setCustomStart}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={mutedColor}
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity onPress={() => { setPickerMonth(startOfMonth(new Date())); setStartPickerVisible(true); }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#3b82f6' }}>
                    <Text style={{ color: 'white' }}>Pick</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCustomStart('')}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#ef4444' }}>
                    <Text style={{ color: 'white' }}>Clear</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  if (customStart && customEnd) {
                    const s = new Date(customStart);
                    const e = new Date(customEnd);
                    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s > e) {
                      setCustomStart(customEnd);
                      setCustomEnd(customStart);
                    }
                  }
                }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f59e0b' }}>
                    <Text style={{ color: 'white' }}>Swap</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1, borderWidth: 1, borderColor: isCustomRangeValid ? (isDark ? '#4b5563' : '#d1d5db') : '#ef4444', borderRadius: 8, paddingHorizontal: 8 }}>
                  <Text style={{ color: mutedColor, fontSize: 12, marginTop: 6 }}>End YYYY-MM-DD</Text>
                  <TextInput
                    style={{ color: textColor, height: 40 }}
                    value={customEnd}
                    onChangeText={setCustomEnd}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={mutedColor}
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity onPress={() => { setPickerMonth(startOfMonth(new Date())); setEndPickerVisible(true); }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#8b5cf6' }}>
                    <Text style={{ color: 'white' }}>Pick</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCustomEnd('')}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#ef4444' }}>
                    <Text style={{ color: 'white' }}>Clear</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            {achTime === 'custom' && !isCustomRangeValid && (
              <Text style={{ color: '#ef4444', marginBottom: 8 }}>Invalid date range</Text>
            )}
            {achievementsHistory.length === 0 ? (
              <Text style={{ color: mutedColor }}>No achievements recorded yet</Text>
            ) : (
              achievementsHistory
                .filter(a => achFilter === 'all' ? true : achFilter === 'streak' ? a.type === 'streak' : achFilter === 'weekly' ? a.type === 'weekly_goal' : a.type === 'monthly_goal')
                .filter(a => {
                  if (achTime === 'all') return true;
                  if (a.type === 'streak') return true;
                  const base = (a.date || '').split('_')[0];
                  const d = new Date(base);
                  if (isNaN(d.getTime())) return true;
                  const now = new Date();
                  if (achTime === 'week') {
                    const ws = startOfWeek(now);
                    const we = endOfWeek(now);
                    return d >= ws && d <= we;
                  }
                  const thisStart = startOfMonth(now);
                  const lastStart = startOfMonth(subMonths(now, 1));
                  const last3Start = startOfMonth(subMonths(now, 3));
                  if (achTime === 'this') return d >= thisStart;
                  if (achTime === 'last') return d >= lastStart && d < thisStart;
                  return d >= last3Start;
                })
                .slice(-10)
                .reverse()
                .map((a, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={a.type === 'streak' ? 'flame' : a.type === 'weekly_goal' ? 'calendar' : 'calendar-outline'} size={16} color={textColor} />
                    <Text style={{ color: textColor }}>{a.label}</Text>
                  </View>
                  <Text style={{ color: mutedColor }}>{a.date}</Text>
                </View>
              ))
            )}
          </View>
        </View>
        
        {/* Favorite Tags */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            Favorite Tags
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: newFavColor || '#e5e7eb' }}>
                  <Text style={{ color: textColor }}>{newFavTag ? `#${newFavTag}` : 'New Tag'}</Text>
                </View>
                <TextInput
                  style={{ color: textColor, borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db', borderRadius: 8, paddingHorizontal: 8, height: 36, minWidth: 120 }}
                  placeholder="tag"
                  placeholderTextColor={mutedColor}
                  value={newFavTag}
                  onChangeText={setNewFavTag}
                />
                <TouchableOpacity onPress={() => { 
                  const ok = addFavoriteTag(newFavTag.trim()); 
                  if (ok) { 
                    updateFavoriteTagColor(newFavTag.trim(), newFavColor); 
                    setNewFavTag(''); 
                    setNewFavColor(null); 
                  } 
                }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#10b981' }}>
                    <Text style={{ color: 'white' }}>Add</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['#e5e7eb','#fde68a','#bfdbfe','#d1fae5','#fbcfe8','#e9d5ff','#374151','#7c2d12','#1f2937','#064e3b','#3b0764','#312e81'].map(c => (
                  <TouchableOpacity key={c} onPress={() => setNewFavColor(c)}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c }} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setNewFavColor(null)}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#ef4444' }}>
                    <Text style={{ color: 'white' }}>Reset</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {favoriteTags.length === 0 ? (
                <Text style={{ color: mutedColor }}>Long-press a tag above to add to favorites</Text>
              ) : (
                favoriteTags.map(ft => (
                  <TouchableOpacity key={ft.tag} onLongPress={() => removeFavoriteTag(ft.tag)} onPress={() => setSelectedFavTag(ft.tag)}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: ft.color || tagColor(ft.tag, isDark) }}>
                      <Text style={{ color: textColor }}>#{ft.tag}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
            {selectedFavTag && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {['#e5e7eb','#fde68a','#bfdbfe','#d1fae5','#fbcfe8','#e9d5ff','#374151','#7c2d12','#1f2937','#064e3b','#3b0764','#312e81'].map(c => (
                  <TouchableOpacity key={c} onPress={() => { updateFavoriteTagColor(selectedFavTag, c); setSelectedFavTag(null); }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c }} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => { updateFavoriteTagColor(selectedFavTag, null); setSelectedFavTag(null); }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#ef4444' }}>
                    <Text style={{ color: 'white' }}>Reset</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* About */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: mutedColor }]}>FlowLog v1.0.0 (MVP)</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    borderRadius: 8,
    padding: 16,
  },
  cardContent: {
    gap: 12,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981', // emerald.500
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
