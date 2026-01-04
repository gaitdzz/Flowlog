import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, View, Text, TextInput, useColorScheme, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth } from 'date-fns';
import { useFlowLogStore } from '@/src/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MonthlyHeatmap } from '@/components/MonthlyHeatmap';
import { TimePicker } from '@/components/TimePicker';
import { tagColor } from '@/src/utils/colors';
import { parseTags } from '@/src/utils/tags';
import { ProgressRing } from '@/components/stats/ProgressRing';
import { Chip } from '@/src/ui/Chip';
import { Button } from '@/src/ui/Button';

export default function HomeScreen() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Time Picker States
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [mood, setMood] = useState<string | undefined>(undefined);
  const [activeTagIndex, setActiveTagIndex] = useState(0);

  // Gap Alert Modal State
  const [showGapModal, setShowGapModal] = useState(false);
  const [gapEndTime, setGapEndTime] = useState(new Date());
  const [showGapTimePicker, setShowGapTimePicker] = useState(false);

  const { timelines, loadTimelines, addRecord, currentReview, loadReview, loadHeatmap, heatmapData, gapAlert, updateRecordEndTime, clearGapAlert, streakCount, loadStreak, weekCompleted, loadWeekProgress, monthlyTimelines, loadMonthlyTimelines, bestStreak, favoriteTags, weeklyGoal, monthlyGoal } = useFlowLogStore();
  const flatListRef = useRef<FlatList>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? '#1f2937' : '#ffffff'; // coolGray.800 : white
  const textColor = isDark ? '#ffffff' : '#1f2937'; // white : coolGray.800
  const timeColor = isDark ? '#9ca3af' : '#6b7280'; // coolGray.400 : coolGray.500
  const warningBg = isDark ? '#881337' : '#ffe4e6'; // rose.900 : rose.100
  const warningText = isDark ? '#fda4af' : '#e11d48'; // rose.300 : rose.600
  const emerald100 = isDark ? '#064e3b' : '#d1fae5'; // emerald.900 : emerald.100
  const emerald500 = isDark ? '#10b981' : '#10b981';
  const emerald600 = isDark ? '#34d399' : '#059669'; // emerald.400 : emerald.600
  const emerald700 = isDark ? '#6ee7b7' : '#047857'; // emerald.300 : emerald.700
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const [monthlyCompleted, setMonthlyCompleted] = useState(0);
  const screenWidth = Dimensions.get('window').width;
  const ringSize = screenWidth < 360 ? 32 : 40;
  const ringThickness = screenWidth < 360 ? 5 : 6;
  const getTagFrequencyEntries = useCallback(() => {
    const freq = new Map<string, number>();
    monthlyTimelines.forEach((t: any) => {
      const arr = parseTags(t.tags);
      arr.forEach((tag: string) => freq.set(tag, (freq.get(tag) || 0) + 1));
    });
    return Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]);
  }, [monthlyTimelines]);
  const getFilteredSuggestions = useCallback(() => {
    const entries = getTagFrequencyEntries();
    const m = (inputText.match(/#([\w-]*)$/) || [])[1] || '';
    return m ? entries.filter(([t]) => t.startsWith(m)).slice(0,6) : entries.slice(0,6);
  }, [getTagFrequencyEntries, inputText]);
  useEffect(() => {
    setActiveTagIndex(0);
  }, [inputText]);

  useEffect(() => {
    loadTimelines(format(selectedDate, 'yyyy-MM-dd'));
    loadStreak();
    loadWeekProgress();
    const mStart = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1);
    const mEnd = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0);
    loadMonthlyTimelines(format(mStart, 'yyyy-MM-dd'), format(mEnd, 'yyyy-MM-dd'));
  }, [selectedDate]);

  useEffect(() => {
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

  useEffect(() => {
    if (gapAlert) {
      setGapEndTime(new Date()); // Default to now
      setShowGapModal(true);
    }
  }, [gapAlert]);

  useFocusEffect(
    React.useCallback(() => {
      const todayStr = format(selectedDate, 'yyyy-MM-dd');
      loadReview(todayStr);
      
      // Load current month heatmap AND previous months for full context
      // Load last 6 months to ensure "Github-style" graph has data
      const now = new Date();
      for (let i = 0; i < 6; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          loadHeatmap(format(d, 'yyyy-MM-dd'));
      }
    }, [selectedDate])
  );

  const isReviewComplete = (currentReview?.word_count || 0) >= 500;

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    // Always use current system time as start time
    const now = new Date();
    // But keep the selected date (user might be viewing a different day?)
    // Actually, PRD says "auto select current time". If user is on a past day, adding a record "now" implies it's for today.
    // However, if user navigated to yesterday, they might want to backfill.
    // The prompt says "Start time is based on current system time and cannot be adjusted".
    // This strongly implies we should use `new Date()` for the record timestamp.
    
    const finalDate = new Date(); // Use system time

    let finalEndDate: Date | undefined = undefined;
    if (endDate) {
        // If end date is set, combine it with today's date
        finalEndDate = new Date();
        finalEndDate.setHours(endDate.getHours());
        finalEndDate.setMinutes(endDate.getMinutes());
        finalEndDate.setSeconds(endDate.getSeconds());
    }

    const tags = Array.from(new Set((inputText.match(/#([\\w-]+)/g) || []).map(t => t.replace('#',''))));
    addRecord(inputText, finalDate, finalEndDate, mood, tags);
    setInputText('');
    setMood(undefined);
    
    // Reset end date
    setEndDate(undefined);
    
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  };

  const onEndTimeChange = (event: any, selected: Date | undefined) => {
    setShowEndDatePicker(false);
    if (selected) {
      setEndDate(selected);
    }
  };

  const handleGapConfirm = () => {
    if (gapAlert) {
      updateRecordEndTime(gapAlert.lastRecord.id, gapEndTime);
      clearGapAlert();
      setShowGapModal(false);
    }
  };

  const renderItem = useCallback(({ item, index }: { item: any, index: number }) => {
    const isLast = index === timelines.length - 1;
    
    return (
      <View style={styles.itemContainer}>
        {/* Left Timeline Line */}
        <View style={[styles.timelineLeft, { borderRightColor: borderColor }]}>
          {/* End Time (Top) */}
          {item.end_time && (
            <Text style={[styles.endTimeText, { color: timeColor }]}>
              {format(new Date(item.end_time), 'HH:mm')}
            </Text>
          )}
          
          {/* Start Time (Bottom) */}
          <Text style={[styles.timeText, { color: timeColor, marginTop: item.end_time ? 4 : 0 }]}>
            {format(new Date(item.record_time), 'HH:mm')}
          </Text>
          
          <View style={[styles.timelineDot, { backgroundColor: emerald500, borderColor: isDark ? '#1f2937' : 'white' }]} />
        </View>

        {/* Right Content */}
        <View style={[styles.contentBox, { paddingBottom: isLast ? 0 : 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            {item.mood === 'happy' && <Text style={{ marginRight: 6 }}>🙂</Text>}
            {item.mood === 'neutral' && <Text style={{ marginRight: 6 }}>😐</Text>}
            {item.mood === 'sad' && <Text style={{ marginRight: 6 }}>🙁</Text>}
            <Text style={[styles.contentText, { color: textColor }]}>{item.content}</Text>
          </View>
          {(() => {
            const arr = parseTags(item.tags);
            if (arr.length) {
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
            return null;
          })()}
        </View>
      </View>
    );
  }, [timelines, isDark, textColor, timeColor, emerald500, borderColor]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View>
            <Text style={[styles.headerTitle, { color: textColor, fontSize: 18 }]}>
              {format(currentTime, 'MMM d')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: timeColor }]}>
              {format(currentTime, 'HH:mm')}
            </Text>
          </View>
          
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor }}>
            FlowLog
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Chip isDark={isDark} selected label={`Streak ${streakCount}`} />
            <Chip isDark={isDark} label={`Week ${weekCompleted}/${weeklyGoal}`} color="#3b82f6" />
            <Chip isDark={isDark} label={`Month ${monthlyCompleted}/${monthlyGoal}`} color="#8b5cf6" />
            <Chip isDark={isDark} label={`Best ${bestStreak}`} color="#f59e0b" />
            <View style={{ marginLeft: 6 }}>
              <ProgressRing size={ringSize} thickness={ringThickness} progress={weeklyGoal ? weekCompleted / weeklyGoal : 0} color="#3b82f6" label="W" textColor={textColor} />
            </View>
            <View style={{ marginLeft: 2 }}>
              <ProgressRing size={ringSize} thickness={ringThickness} progress={monthlyGoal ? monthlyCompleted / monthlyGoal : 0} color="#8b5cf6" label="M" textColor={textColor} />
            </View>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={timelines}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          initialNumToRender={10}
          windowSize={10}
          removeClippedSubviews
          getItemLayout={(data, index) => ({ length: 100, offset: 100 * index, index })}
          contentContainerStyle={{ paddingBottom: 100 }} // Space for input area
          ListHeaderComponent={
            <View>
              {/* Warning Banner - Only if incomplete */}
              {!isReviewComplete && (
                <TouchableOpacity onPress={() => router.push('/review')} style={{ margin: 16, marginBottom: 0 }}>
                  <View style={[styles.warningBanner, { backgroundColor: warningBg }]}>
                    <View style={styles.warningContent}>
                      <Ionicons name="alert-circle" size={20} color={warningText} />
                      <Text style={[styles.warningText, { color: warningText }]}>
                        Daily review incomplete (500 words)
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={warningText} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Monthly Heatmap - Full Width */}
              <View style={styles.heatmapContainer}>
                <MonthlyHeatmap
                  month={selectedDate}
                  data={heatmapData}
                  compact
                  fullWidth
                  onDayPress={(day) => setSelectedDate(new Date(day))}
                />
              </View>
              
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
            </View>
          }
        />

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={[styles.inputContainerWrapper, { backgroundColor: bgColor, borderTopColor: borderColor }]}
        >
          <View style={styles.inputContainer}>
            {favoriteTags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                {favoriteTags.slice(0,8).map(ft => (
                  <TouchableOpacity key={ft.tag} onPress={() => {
                    const base = inputText.trim();
                    const insert = base.length ? base + ' #' + ft.tag : '#' + ft.tag;
                    setInputText(insert + ' ');
                  }}>
                    <Chip isDark={isDark} label={`#${ft.tag}`} color={ft.color || tagColor(ft.tag, isDark)} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={[styles.inputField, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}>
               <Button isDark={isDark} title={endDate ? format(endDate, 'HH:mm') : 'End'} icon="stop-circle-outline" variant="ghost" onPress={() => setShowEndDatePicker(true)} />
              <View style={styles.moodRow}>
                <TouchableOpacity onPress={() => setMood('happy')}>
                  <Chip isDark={isDark} label="🙂" selected={mood==='happy'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMood('neutral')}>
                  <Chip isDark={isDark} label="😐" selected={mood==='neutral'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMood('sad')}>
                  <Chip isDark={isDark} label="🙁" selected={mood==='sad'} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="What are you doing now?"
                placeholderTextColor="#9ca3af"
                value={inputText}
                onChangeText={setInputText}
                onKeyPress={({ nativeEvent }) => {
                  const k = (nativeEvent as any).key;
                  if (k === 'ArrowLeft') {
                    setActiveTagIndex(i => Math.max(0, i - 1));
                  } else if (k === 'ArrowRight') {
                    const len = getFilteredSuggestions().length;
                    setActiveTagIndex(i => Math.min(len - 1, i + 1));
                  }
                }}
                onSubmitEditing={() => {
                  const m = (inputText.match(/#([\w-]*)$/) || [])[1] || '';
                  const suggestions = getFilteredSuggestions();
                  if (m && suggestions.length > 0) {
                    const tag = suggestions[Math.min(activeTagIndex, suggestions.length-1)][0];
                    const base = inputText.replace(/#([\w-]*)$/, `#${tag}`);
                    setInputText(base.endsWith(' ') ? base : base + ' ');
                  } else {
                    handleSend();
                  }
                }}
                returnKeyType="send"
              />
            </View>
            {(() => {
              const entries = getFilteredSuggestions();
              const match = (inputText.match(/#([\w-]*)$/) || [])[1] || '';
              if (!entries.length) return null;
              return (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, alignItems: 'center' }}>
                  {entries.map(([tag, count], idx) => (
                    <TouchableOpacity key={tag} onPress={() => {
                      const base = inputText.replace(/#([\w-]*)$/, `#${tag}`);
                      setInputText(base.endsWith(' ') ? base : base + ' ');
                    }}>
                      <Chip isDark={isDark} label={`#${tag}`} count={count as any} selected={idx === activeTagIndex} />
                    </TouchableOpacity>
                  ))}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity onPress={() => setActiveTagIndex(i => Math.max(0, i - 1))}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }}>
                        <Ionicons name="chevron-back-outline" size={16} color={timeColor} />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTagIndex(i => Math.min(entries.length - 1, i + 1))}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }}>
                        <Ionicons name="chevron-forward-outline" size={16} color={timeColor} />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
            <Button isDark={isDark} title="Send" icon="arrow-up" variant="success" onPress={handleSend} disabled={!inputText.trim()} style={{ alignSelf: 'flex-end' }} />
          </View>
          
          {/* Modal Wrapper for End Time Picker to ensure it can be closed */}
          <Modal
            visible={showEndDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowEndDatePicker(false)}
          >
             <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: isDark ? '#1f2937' : 'white', width: '90%' }]}>
                   <Text style={[styles.modalTitle, { color: textColor }]}>Select End Time</Text>
                   <TimePicker
                      value={endDate || new Date()}
                      onChange={onEndTimeChange}
                   />
                   <TouchableOpacity 
                      style={[styles.modalConfirmButton, { backgroundColor: '#ef4444', marginTop: 12 }]}
                      onPress={() => setShowEndDatePicker(false)}
                   >
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
                   </TouchableOpacity>
                </View>
             </View>
          </Modal>

        </KeyboardAvoidingView>

        {/* Gap Alert Modal */}
        <Modal
            visible={showGapModal}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: isDark ? '#1f2937' : 'white' }]}>
                    <Text style={[styles.modalTitle, { color: textColor }]}>
                        Long Break Detected
                    </Text>
                    <Text style={[styles.modalText, { color: timeColor }]}>
                        It's been {gapAlert?.diffMinutes ? Math.floor(gapAlert.diffMinutes / 60) : 0} hours since your last record:
                    </Text>
                    <Text style={[styles.modalRecord, { color: textColor }]}>
                        "{gapAlert?.lastRecord.content}"
                    </Text>
                    <Text style={[styles.modalText, { color: timeColor }]}>
                        Please confirm when this activity ended:
                    </Text>
                    
                    <TouchableOpacity 
                        style={[styles.modalTimeButton, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}
                        onPress={() => setShowGapTimePicker(true)}
                    >
                        <Text style={{ color: textColor, fontSize: 18 }}>
                            {format(gapEndTime, 'HH:mm')}
                        </Text>
                    </TouchableOpacity>

                    {showGapTimePicker && (
                         <Modal
                            visible={showGapTimePicker}
                            transparent={true}
                            animationType="slide"
                         >
                            <View style={styles.modalOverlay}>
                                <View style={[styles.modalContent, { backgroundColor: isDark ? '#1f2937' : 'white' }]}>
                                    <TimePicker 
                                        value={gapEndTime}
                                        onChange={(e, date) => {
                                            setShowGapTimePicker(false);
                                            if(date) setGapEndTime(date);
                                        }}
                                    />
                                     <TouchableOpacity 
                                        style={[styles.modalConfirmButton, { backgroundColor: '#10b981', marginTop: 12 }]}
                                        onPress={() => setShowGapTimePicker(false)}
                                    >
                                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                         </Modal>
                    )}

                    <TouchableOpacity 
                        style={[styles.modalConfirmButton, { backgroundColor: '#10b981' }]}
                        onPress={handleGapConfirm}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Confirm End Time</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  warningBanner: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    fontWeight: '500',
  },
  heatmapContainer: {
    marginBottom: 8,
    alignItems: 'center', // Center the smaller heatmap
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  timelineLeft: {
    width: 60,
    alignItems: 'flex-end',
    paddingRight: 16,
    borderRightWidth: 2,
    position: 'relative',
    justifyContent: 'center', // Align content vertically
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    right: -6, 
    top: '50%', // Center dot vertically relative to item height? Or keep at top?
    // User said "linear upwards", usually dots are at the "timestamp".
    // If we swap start/end, the dot should probably represent the "start" or the "event".
    // Let's keep it aligned with the Start Time text which is now at the bottom.
    // So top needs to be calculated or aligned with text.
    top: 20, // Approximate alignment with bottom text
    borderWidth: 2,
    zIndex: 10,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  endTimeText: {
    fontSize: 10,
    marginBottom: 2, // Space between end time (top) and start time (bottom)
  },
  contentBox: {
    flex: 1,
    paddingLeft: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainerWrapper: {
    borderTopWidth: 1,
  },
  inputContainer: {
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    paddingLeft: 12,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
    marginRight: 8,
  },
  moodBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalRecord: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 12,
    textAlign: 'center',
  },
  modalTimeButton: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  modalConfirmButton: {
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
});
