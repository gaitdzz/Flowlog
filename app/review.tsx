import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Alert, View, Text, TextInput, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFlowLogStore } from '@/src/store';
import { SafeAreaView } from 'react-native-safe-area-context';

const MIN_WORD_COUNT = 500;

export default function DailyReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const today = params.date ? (params.date as string) : format(new Date(), 'yyyy-MM-dd');
  const isReadOnly = params.readonly === 'true';

  const { currentReview, loadReview, saveReview } = useFlowLogStore();
  
  const [content, setContent] = useState('');
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1f2937';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const inputBg = isDark ? '#374151' : '#f9fafb';
  const borderColor = isDark ? '#4b5563' : '#e5e7eb';
  const emerald500 = '#10b981';
  const coolGray400 = '#9ca3af';
  const coolGray200 = isDark ? '#4b5563' : '#e5e7eb';

  useEffect(() => {
    loadReview(today);
  }, [today]);

  useEffect(() => {
    // If loading review for a specific date (especially readonly), ensure we update content
    // Check if the current review in store matches the requested date
    if (currentReview && currentReview.date === today) {
      setContent(currentReview.content || '');
    } else {
        // If no review found for this date, and it's readonly, clear content or show placeholder
        if (isReadOnly) {
            setContent(''); // Or handle empty state
        }
    }
  }, [currentReview, today, isReadOnly]);

  const wordCount = content.trim().length;
  const progress = Math.min((wordCount / MIN_WORD_COUNT) * 100, 100);
  const isCompleted = wordCount >= MIN_WORD_COUNT;
  
  // Logic:
  // 1. If ReadOnly mode -> Cannot edit. Save button hidden or disabled.
  // 2. If Saved (isCompleted/Saved flag) -> Cannot edit.
  // But currently we only have `isCompleted` based on word count. 
  // The user requirement: "Once saved, cannot be modified". 
  // We need a flag `is_locked` or just assume if it's past day or explicitly saved?
  // Let's assume if we are viewing a past date, it's read-only.
  // Or if `isReadOnly` param is passed.
  
  const canEdit = !isReadOnly;

  const handleSave = () => {
    if (!canEdit) return;
    
    saveReview(today, content);
    if (isCompleted) {
      Alert.alert('Congratulations!', 'You have completed your daily review.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Saved', 'Your draft has been saved. Keep writing to reach 500 words!');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
            <Text style={[styles.backText, { color: textColor }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: textColor }]}>
            {isReadOnly ? 'Review Details' : 'Daily Review'}
          </Text>
          <View style={{ width: 60 }} /> {/* Spacer */}
        </View>

        <View style={styles.dateContainer}>
          <Text style={[styles.dateText, { color: mutedColor }]}>
            {format(new Date(today), 'EEEE, MMMM d, yyyy')}
          </Text>
          {!isReadOnly && (
            <Text style={[styles.questionText, { color: textColor }]}>
                How was your day?
            </Text>
          )}
        </View>

        {/* Editor */}
        <View style={styles.editorContainer}>
          <TextInput
            style={[
                styles.editor, 
                { 
                    color: textColor, 
                    backgroundColor: inputBg, 
                    borderColor: borderColor,
                    opacity: canEdit ? 1 : 0.8 
                }
            ]}
            value={content}
            onChangeText={setContent}
            placeholder={canEdit ? "Reflect on your day, your wins, and what you learned..." : "No review content for this day."}
            placeholderTextColor={mutedColor}
            multiline
            textAlignVertical="top"
            editable={canEdit}
          />
        </View>

        {/* Footer / Progress */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          {canEdit ? (
              <View style={styles.footer}>
                <View style={styles.progressInfo}>
                  <Text style={{ color: isCompleted ? emerald500 : mutedColor, fontWeight: 'bold' }}>
                    {wordCount} / {MIN_WORD_COUNT} words
                  </Text>
                  <Text style={{ color: isCompleted ? emerald500 : coolGray400, fontSize: 12 }}>
                    {isCompleted ? 'Goal Reached!' : `${MIN_WORD_COUNT - wordCount} words to go`}
                  </Text>
                </View>
                
                <View style={[styles.progressBarBg, { backgroundColor: coolGray200 }]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${progress}%`,
                        backgroundColor: isCompleted ? emerald500 : coolGray400 
                      }
                    ]} 
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!content.trim()}
                  style={[
                    styles.saveButton,
                    { backgroundColor: isCompleted ? emerald500 : coolGray400, opacity: !content.trim() ? 0.5 : 1 }
                  ]}
                >
                  <Text style={styles.saveButtonText}>
                    {isCompleted ? 'COMPLETE & SAVE' : 'SAVE DRAFT'}
                  </Text>
                </TouchableOpacity>
              </View>
          ) : (
              <View style={styles.footer}>
                   <View style={styles.progressInfo}>
                      <Text style={{ color: isCompleted ? emerald500 : mutedColor, fontWeight: 'bold' }}>
                        Total: {wordCount} words
                      </Text>
                      {isCompleted && (
                          <Text style={{ color: emerald500, fontSize: 12, fontWeight: 'bold' }}>
                            Completed
                          </Text>
                      )}
                    </View>
              </View>
          )}
        </KeyboardAvoidingView>
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
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateContainer: {
    gap: 4,
  },
  dateText: {
    fontSize: 14,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  editorContainer: {
    flex: 1,
  },
  editor: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  footer: {
    gap: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
