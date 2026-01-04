// Web implementation using localStorage to mock SQLite
import { Platform } from 'react-native';

const STORAGE_KEY = 'flowlog_web_db_v1';

interface DBState {
  timelines: any[];
  daily_reviews: any[];
}

const getDB = (): DBState => {
  if (Platform.OS !== 'web') return { timelines: [], daily_reviews: [] };
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { timelines: [], daily_reviews: [] };
};

const saveDB = (data: DBState) => {
  if (Platform.OS !== 'web') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const initDatabase = () => {
  console.log('Web Database initialized');
};

export const addTimeline = (content: string, recordTime: string, endTime?: string) => {
  const db = getDB();
  const newId = db.timelines.length > 0 ? Math.max(...db.timelines.map(t => t.id)) + 1 : 1;
  const newRecord = {
    id: newId,
    content,
    record_time: recordTime,
    end_time: endTime || null,
    created_at: new Date().toISOString(),
    type: 'normal'
  };
  db.timelines.push(newRecord);
  saveDB(db);
  return newId;
};

export const updateTimelineEndTime = (id: number, endTime: string) => {
  const db = getDB();
  const index = db.timelines.findIndex(t => t.id === id);
  if (index !== -1) {
    db.timelines[index].end_time = endTime;
    saveDB(db);
    return 1;
  }
  return 0;
};

export const getLastTimeline = () => {
  const db = getDB();
  if (db.timelines.length === 0) return null;
  // Sort by record_time desc
  return db.timelines.sort((a, b) => new Date(b.record_time).getTime() - new Date(a.record_time).getTime())[0];
};

export const getTimelinesByDate = (date: string) => {
  const db = getDB();
  return db.timelines
    .filter(t => t.record_time.startsWith(date))
    .sort((a, b) => new Date(b.record_time).getTime() - new Date(a.record_time).getTime());
};

export const upsertDailyReview = (date: string, content: string, wordCount: number, isCompleted: boolean) => {
  const db = getDB();
  const index = db.daily_reviews.findIndex(r => r.date === date);
  const review = {
    date,
    content,
    word_count: wordCount,
    is_completed: isCompleted ? 1 : 0,
    updated_at: new Date().toISOString()
  };
  
  if (index >= 0) {
    db.daily_reviews[index] = review;
  } else {
    db.daily_reviews.push(review);
  }
  saveDB(db);
  return 1;
};

export const getDailyReview = (date: string) => {
  const db = getDB();
  return db.daily_reviews.find(r => r.date === date);
};

export const getReviewsByDateRange = (startDate: string, endDate: string) => {
  const db = getDB();
  return db.daily_reviews
    .filter(r => r.date >= startDate && r.date <= endDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getHeatmapStats = (startDate: string) => {
  const db = getDB();
  
  // Count timelines per day
  const timelineCounts: Record<string, number> = {};
  db.timelines.forEach(t => {
    if (t.record_time >= startDate) {
      const day = t.record_time.split('T')[0];
      timelineCounts[day] = (timelineCounts[day] || 0) + 1;
    }
  });

  const timelineResults = Object.entries(timelineCounts).map(([date, count]) => ({ date, count }));
  
  const reviewResults = db.daily_reviews
    .filter(r => r.date >= startDate)
    .map(r => ({ date: r.date, is_completed: r.is_completed }));

  return { timelineResults, reviewResults };
};

export const exportData = () => {
  const db = getDB();
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    ...db
  }, null, 2);
};
