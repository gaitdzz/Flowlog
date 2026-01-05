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
  const [activeSection, setActiveSection] = useState<'settings'|'data'|'goals'|'tags'>('settings');

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
            个人中心
          </Text>
        </View>
        <View style={styles.segmented}>
          {[
            { k: 'settings', label: '设置' },
            { k: 'data', label: '数据' },
            { k: 'goals', label: '目标与成就' },
            { k: 'tags', label: '收藏标签' },
          ].map(x => (
            <TouchableOpacity key={x.k} onPress={() => setActiveSection(x.k as any)} style={[styles.segmentBtn, activeSection===x.k && { backgroundColor: isDark ? '#374151' : 'white' }]}>
              <Text style={{ color: activeSection===x.k ? textColor : sectionTitleColor, fontWeight: activeSection===x.k ? 'bold' : 'normal' }}>{x.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reminders Section */}
        <View style={[styles.section, activeSection==='settings' ? undefined : { display: 'none' }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            提醒
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardContent}>
              <Text style={[styles.cardLabel, { color: textColor }]}>提醒我记录活动</Text>
              
              {/* Note: Picker on iOS/Android behaves differently. For MVP we use a simple row. */}
              {/* Actually, let's use a simple list of buttons for MVP robustness if Picker is not installed or buggy */}
              {/* But wait, I didn't install @react-native-picker/picker. */}
              {/* I should implement a simple custom selector or just buttons. */}
              
              <View style={styles.optionsGrid}>
                {[
                  { label: '关闭', value: '0' },
                  { label: '30分钟', value: '30' },
                  { label: '1小时', value: '60' },
                  { label: '2小时', value: '120' },
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
        <View style={[styles.section, activeSection==='data' ? undefined : { display: 'none' }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            数据
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardContent}>
              <View>
                <Text style={[styles.cardLabel, { color: textColor }]}>导出数据</Text>
                <Text style={[styles.cardDescription, { color: mutedColor }]}>
                  下载包含时间线与复盘内容的 JSON 文件。
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={async () => { await exportDataToFile(); Alert.alert('导出备份', '已生成并打开分享面板'); }}
              >
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>导出备份</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                onPress={async () => { await exportMarkdownToFile(); Alert.alert('导出 Markdown', '已生成并打开分享面板'); }}
              >
                <Ionicons name="document-text-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>导出 Markdown</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                onPress={() => setImportVisible(true)}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>导入备份（粘贴）</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
                onPress={async () => { await exportAchievementsToFile(filteredAchievements); Alert.alert('导出成就', '已生成并打开分享面板'); }}
              >
                <Ionicons name="trophy-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>导出成就</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#6366f1' }]}
                onPress={async () => { await exportAchievementsMarkdownToFile(filteredAchievements); Alert.alert('导出成就（MD）', '已生成并打开分享面板'); }}
              >
                <Ionicons name="document-text-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>导出成就（MD）</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                onPress={() => setExportPreviewVisible(true)}
              >
                <Ionicons name="eye-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>预览导出</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Achievements */}
        <View style={[styles.section, activeSection==='goals' ? undefined : { display: 'none' }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            成就
          </Text>
          <CategoryCard isDark={isDark}>
            <View style={[styles.cardContent, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#10b981' }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>连续 {streakCount}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f59e0b' }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>最佳 {bestStreak}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#3b82f6' }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>周 {weekCompleted}/{weeklyGoal}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#8b5cf6' }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>月 {monthlyCompleted}/{monthlyGoal}</Text>
                </View>
                <View style={{ marginLeft: 8 }}>
                  <ProgressRing size={prSize} thickness={prThickness} progress={weeklyGoal ? weekCompleted / weeklyGoal : 0} color="#3b82f6" label="周" textColor={textColor} />
                </View>
                <View style={{ marginLeft: 4 }}>
                  <ProgressRing size={prSize} thickness={prThickness} progress={monthlyGoal ? monthlyCompleted / monthlyGoal : 0} color="#8b5cf6" label="月" textColor={textColor} />
                </View>
              </View>
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: '7天连续', ok: bestStreak >= 7 },
                { label: '30天连续', ok: bestStreak >= 30 },
                { label: '100天连续', ok: bestStreak >= 100 },
                { label: '达成周目标', ok: weekCompleted >= weeklyGoal },
                { label: '达成月目标', ok: monthlyCompleted >= monthlyGoal },
              ].map(b => (
                <TouchableOpacity key={b.label} onPress={() => {
                  const descMap: Record<string, string> = {
                    '7天连续': '连续 7 天完成复盘',
                    '30天连续': '连续 30 天完成复盘',
                    '100天连续': '连续 100 天完成复盘',
                    '达成周目标': '本周达到设定的周目标',
                    '达成月目标': '本月达到设定的月目标',
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
              <Text style={[styles.cardLabel, { color: textColor }]}>粘贴 JSON</Text>
              <View style={{ borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db', borderRadius: 8, padding: 8, marginTop: 8 }}>
                <Text style={{ color: mutedColor, marginBottom: 4 }}>内容</Text>
                <TextInput
                  style={{ color: textColor, minHeight: 120 }}
                  multiline
                  value={importText}
                  onChangeText={setImportText}
                  placeholder="在此粘贴 JSON"
                  placeholderTextColor={mutedColor}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Button isDark={isDark} title="确认导入" icon="checkmark-circle" variant="success" onPress={async () => { 
                  const ok = await useFlowLogStore.getState().importBackupFromJson(importText); 
                  setImportVisible(false); 
                  setImportText(''); 
                  Alert.alert(ok ? '导入成功' : '导入失败', ok ? '备份数据已导入。' : '请检查 JSON 内容格式。');
                }} />
                <Button isDark={isDark} title="取消" icon="close-circle" variant="ghost" onPress={() => { setImportVisible(false); setImportText(''); }} />
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
                <Text style={styles.actionButtonText}>知道了</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {startPickerVisible && (
          <View style={styles.modalOverlay}>
            <View style={[styles.card, { backgroundColor: cardBg, width: '90%' }]}>
              <Text style={[styles.cardLabel, { color: textColor }]}>选择开始日期</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setPickerMonth(subMonths(pickerMonth, 1))}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
                    <Text style={{ color: textColor }}>上月</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPickerMonth(subMonths(pickerMonth, 1))}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'transparent' }}>
                    <Text style={{ color: textColor }}>{format(pickerMonth, 'yyyy-MM')}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPickerMonth(subMonths(pickerMonth, -1))}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
                    <Text style={{ color: textColor }}>下月</Text>
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
                <Text style={styles.actionButtonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {endPickerVisible && (
          <View style={styles.modalOverlay}>
            <View style={[styles.card, { backgroundColor: cardBg, width: '90%' }]}>
              <Text style={[styles.cardLabel, { color: textColor }]}>选择结束日期</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setPickerMonth(subMonths(pickerMonth, 1))}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
                    <Text style={{ color: textColor }}>上月</Text>
                  </View>
                </TouchableOpacity>
                <View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'transparent' }}>
                    <Text style={{ color: textColor }}>{format(pickerMonth, 'yyyy-MM')}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setPickerMonth(subMonths(pickerMonth, -1))}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
                    <Text style={{ color: textColor }}>下月</Text>
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
                <Text style={styles.actionButtonText}>应用范围</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#9ca3af', marginTop: 12 }]}
                onPress={() => setEndPickerVisible(false)}
              >
                <Ionicons name="close-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {exportPreviewVisible && (
          <View style={styles.modalOverlay}>
            <View style={[styles.card, { backgroundColor: cardBg, width: '90%' }]}>
              <Text style={[styles.cardLabel, { color: textColor }]}>导出预览</Text>
              <View style={{ maxHeight: 280 }}>
                {filteredAchievements.length === 0 ? (
                  <Text style={{ color: mutedColor }}>所选条件暂无条目</Text>
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
                    <Text style={{ color: textColor }}>总计：{total}</Text>
                    <Text style={{ color: textColor }}>连续：{typeCount['streak'] || 0} | 周目标：{typeCount['weekly_goal'] || 0} | 月目标：{typeCount['monthly_goal'] || 0}</Text>
                    <Text style={{ color: mutedColor }}>{min && max ? `${format(min, 'yyyy-MM-dd')} ~ ${format(max, 'yyyy-MM-dd')}` : '无日期范围'}</Text>
                  </View>
                );
              })()}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Button isDark={isDark} title="导出 CSV" icon="trophy-outline" variant="secondary" disabled={(achTime === 'custom' && !isCustomRangeValid) || filteredAchievements.length === 0} onPress={() => { exportAchievementsToFile(filteredAchievements); setExportPreviewVisible(false); }} />
                <Button isDark={isDark} title="导出 MD" icon="document-text-outline" variant="secondary" disabled={(achTime === 'custom' && !isCustomRangeValid) || filteredAchievements.length === 0} onPress={() => { exportAchievementsMarkdownToFile(filteredAchievements); setExportPreviewVisible(false); }} />
                <Button isDark={isDark} title="导出摘要" icon="list-outline" variant="success" disabled={(achTime === 'custom' && !isCustomRangeValid) || filteredAchievements.length === 0} onPress={() => { exportAchievementsSummaryMarkdownToFile(filteredAchievements); setExportPreviewVisible(false); }} />
                <Button isDark={isDark} title="取消" icon="close-circle" variant="ghost" onPress={() => setExportPreviewVisible(false)} />
              </View>
            </View>
          </View>
        )}
        
        {/* Top Tags */}
        <View style={[styles.section, activeSection==='tags' ? undefined : { display: 'none' }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            本月热门标签
          </Text>
          <CategoryCard isDark={isDark}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {topTags.length === 0 ? (
                <Text style={{ color: mutedColor }}>暂无标签</Text>
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
        <View style={[styles.section, activeSection==='goals' ? undefined : { display: 'none' }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            周目标
          </Text>
          <CategoryCard isDark={isDark}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[3,5,7,10,14].map(n => (
                <TouchableOpacity key={n} onPress={() => setWeeklyGoal(n)}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: weeklyGoal === n ? '#10b981' : 'transparent', borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db' }}>
                    <Text style={{ color: weeklyGoal === n ? 'white' : textColor }}>{n}/周</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </CategoryCard>
        </View>
        
        {/* Monthly Goal */}
        <View style={[styles.section, activeSection==='goals' ? undefined : { display: 'none' }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            月目标
          </Text>
          <CategoryCard isDark={isDark}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[10,15,20,25,30].map(n => (
                <TouchableOpacity key={n} onPress={() => setMonthlyGoal(n)}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: monthlyGoal === n ? '#8b5cf6' : 'transparent', borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db' }}>
                    <Text style={{ color: monthlyGoal === n ? 'white' : textColor }}>{n}/月</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </CategoryCard>
        </View>
        
        {/* Achievements History */}
        <View style={[styles.section, activeSection==='goals' ? undefined : { display: 'none' }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            成就历史
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {[
                { k: 'all', label: '全部' },
                { k: 'streak', label: '连续' },
                { k: 'weekly', label: '周目标' },
                { k: 'monthly', label: '月目标' },
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
                { k: 'all', label: '全部时间' },
                { k: 'week', label: '本周' },
                { k: 'this', label: '本月' },
                { k: 'last', label: '上月' },
                { k: 'last3', label: '近三月' },
                { k: 'custom', label: '自定义' },
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
                <Text style={{ color: textColor }}>重置筛选</Text>
              </View>
            </TouchableOpacity>
            {achTime === 'custom' && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1, borderWidth: 1, borderColor: isCustomRangeValid ? (isDark ? '#4b5563' : '#d1d5db') : '#ef4444', borderRadius: 8, paddingHorizontal: 8 }}>
                  <Text style={{ color: mutedColor, fontSize: 12, marginTop: 6 }}>开始 YYYY-MM-DD</Text>
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
                    <Text style={{ color: 'white' }}>选择</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCustomStart('')}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#ef4444' }}>
                    <Text style={{ color: 'white' }}>清除</Text>
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
                    <Text style={{ color: 'white' }}>交换</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1, borderWidth: 1, borderColor: isCustomRangeValid ? (isDark ? '#4b5563' : '#d1d5db') : '#ef4444', borderRadius: 8, paddingHorizontal: 8 }}>
                  <Text style={{ color: mutedColor, fontSize: 12, marginTop: 6 }}>结束 YYYY-MM-DD</Text>
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
                    <Text style={{ color: 'white' }}>选择</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCustomEnd('')}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#ef4444' }}>
                    <Text style={{ color: 'white' }}>清除</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            {achTime === 'custom' && !isCustomRangeValid && (
              <Text style={{ color: '#ef4444', marginBottom: 8 }}>日期范围无效</Text>
            )}
            {achievementsHistory.length === 0 ? (
              <Text style={{ color: mutedColor }}>尚未记录成就</Text>
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
        <View style={[styles.section, activeSection==='tags' ? undefined : { display: 'none' }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            收藏标签
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: newFavColor || '#e5e7eb' }}>
                  <Text style={{ color: textColor }}>{newFavTag ? `#${newFavTag}` : '新标签'}</Text>
                </View>
                <TextInput
                  style={{ color: textColor, borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db', borderRadius: 8, paddingHorizontal: 8, height: 36, minWidth: 120 }}
                  placeholder="标签"
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
                    <Text style={{ color: 'white' }}>添加</Text>
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
                    <Text style={{ color: 'white' }}>重置</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {favoriteTags.length === 0 ? (
                <Text style={{ color: mutedColor }}>长按上方标签加入收藏</Text>
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
                    <Text style={{ color: 'white' }}>重置</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* About */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: mutedColor }]}>流刻 v1.0.0（MVP）</Text>
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
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
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
