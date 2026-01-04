import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

// Native DB Instance
// We use a simple variable instead of Platform.select to allow correct type inference in native
export const db = Platform.OS === 'web' ? null : SQLite.openDatabaseSync('flowlog.db');

export const initDatabase = () => {
  // Web implementation is handled in database.web.ts via aliasing
  // This file is strictly for NATIVE execution
  if (Platform.OS === 'web') {
    return;
  }

  try {
    db!.execSync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS timelines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        record_time TEXT NOT NULL,
        end_time TEXT,
        mood TEXT,
        tags TEXT,
        created_at TEXT NOT NULL,
        type TEXT DEFAULT 'normal'
      );

      CREATE TABLE IF NOT EXISTS daily_reviews (
        date TEXT PRIMARY KEY,
        content TEXT,
        word_count INTEGER DEFAULT 0,
        is_completed INTEGER DEFAULT 0,
        updated_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS favorite_tags (
        tag TEXT PRIMARY KEY,
        color TEXT
      );
      
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_timelines_record_time ON timelines(record_time);
      CREATE INDEX IF NOT EXISTS idx_reviews_date ON daily_reviews(date);
    `);
    
    // Migration: Add columns if they don't exist
    const tableInfo = db!.getAllSync('PRAGMA table_info(timelines)') as any[];
    const hasEndTime = tableInfo.some(col => col.name === 'end_time');
    const hasMood = tableInfo.some(col => col.name === 'mood');
    const hasTags = tableInfo.some(col => col.name === 'tags');
    
    if (!hasEndTime) {
      db!.execSync('ALTER TABLE timelines ADD COLUMN end_time TEXT');
      console.log('Migrated: Added end_time to timelines');
    }
    if (!hasMood) {
      db!.execSync('ALTER TABLE timelines ADD COLUMN mood TEXT');
      console.log('Migrated: Added mood to timelines');
    }
    if (!hasTags) {
      db!.execSync('ALTER TABLE timelines ADD COLUMN tags TEXT');
      console.log('Migrated: Added tags to timelines');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};

export const addTimeline = (content: string, recordTime: string, endTime?: string, mood?: string, tags?: string) => {
  const statement = db!.prepareSync(
    'INSERT INTO timelines (content, record_time, end_time, mood, tags, created_at, type) VALUES ($content, $recordTime, $endTime, $mood, $tags, $createdAt, $type)'
  );
  try {
    const result = statement.executeSync({
      $content: content,
      $recordTime: recordTime,
      $endTime: endTime || null,
      $mood: mood || null,
      $tags: tags || null,
      $createdAt: new Date().toISOString(),
      $type: 'normal'
    });
    return result.lastInsertRowId;
  } finally {
    statement.finalizeSync();
  }
};

export const updateTimelineEndTime = (id: number, endTime: string) => {
  const statement = db!.prepareSync(
    'UPDATE timelines SET end_time = $endTime WHERE id = $id'
  );
  try {
    return statement.executeSync({
      $id: id,
      $endTime: endTime
    }).changes;
  } finally {
    statement.finalizeSync();
  }
};

export const getLastTimeline = () => {
  const statement = db!.prepareSync(
    'SELECT * FROM timelines ORDER BY record_time DESC LIMIT 1'
  );
  try {
    return statement.executeSync().getFirstSync();
  } finally {
    statement.finalizeSync();
  }
};

export const getTimelinesByDate = (date: string) => {
  const statement = db!.prepareSync(
    'SELECT * FROM timelines WHERE record_time LIKE $date ORDER BY record_time DESC'
  );
  try {
    const result = statement.executeSync({ $date: `${date}%` });
    return result.getAllSync();
  } finally {
    statement.finalizeSync();
  }
};

export const upsertDailyReview = (date: string, content: string, wordCount: number, isCompleted: boolean) => {
  const statement = db!.prepareSync(`
    INSERT INTO daily_reviews (date, content, word_count, is_completed, updated_at)
    VALUES ($date, $content, $wordCount, $isCompleted, $updatedAt)
    ON CONFLICT(date) DO UPDATE SET
      content = excluded.content,
      word_count = excluded.word_count,
      is_completed = excluded.is_completed,
      updated_at = excluded.updated_at
  `);
  try {
    const result = statement.executeSync({
      $date: date,
      $content: content,
      $wordCount: wordCount,
      $isCompleted: isCompleted ? 1 : 0,
      $updatedAt: new Date().toISOString()
    });
    return result.changes;
  } finally {
    statement.finalizeSync();
  }
};

export const getDailyReview = (date: string) => {
  const statement = db!.prepareSync('SELECT * FROM daily_reviews WHERE date = $date');
  try {
    const result = statement.executeSync({ $date: date });
    return result.getFirstSync();
  } finally {
    statement.finalizeSync();
  }
};

export const getReviewsByDateRange = (startDate: string, endDate: string) => {
  const statement = db!.prepareSync(
    'SELECT * FROM daily_reviews WHERE date >= $startDate AND date <= $endDate ORDER BY date DESC'
  );
  try {
    const result = statement.executeSync({ $startDate: startDate, $endDate: endDate });
    return result.getAllSync();
  } finally {
    statement.finalizeSync();
  }
};

export const getTimelinesByDateRange = (startDate: string, endDate: string) => {
  const statement = db!.prepareSync(
    'SELECT * FROM timelines WHERE substr(record_time, 1, 10) >= $startDate AND substr(record_time, 1, 10) <= $endDate ORDER BY record_time DESC'
  );
  try {
    const result = statement.executeSync({ $startDate: startDate, $endDate: endDate });
    return result.getAllSync();
  } finally {
    statement.finalizeSync();
  }
};
export const getHeatmapStats = (startDate: string) => {
  // startDate format: YYYY-MM-DD
  // Query 1: Get daily counts from timelines
  const timelineStatement = db!.prepareSync(`
    SELECT substr(record_time, 1, 10) as date, count(*) as count 
    FROM timelines 
    WHERE record_time >= $startDate 
    GROUP BY date
  `);
  
  // Query 2: Get review completion status
  const reviewStatement = db!.prepareSync(`
    SELECT date, is_completed 
    FROM daily_reviews 
    WHERE date >= $startDate
  `);

  try {
    const timelineResults = timelineStatement.executeSync({ $startDate: startDate }).getAllSync() as { date: string, count: number }[];
    const reviewResults = reviewStatement.executeSync({ $startDate: startDate }).getAllSync() as { date: string, is_completed: number }[];

    return { timelineResults, reviewResults };
  } finally {
    timelineStatement.finalizeSync();
    reviewStatement.finalizeSync();
  }
};

export const searchRecords = (keyword: string) => {
  // Search timelines
  const timelineStatement = db!.prepareSync(`
    SELECT id, content, record_time, end_time, created_at, 'timeline' as type 
    FROM timelines 
    WHERE content LIKE $keyword 
    ORDER BY record_time DESC
  `);
  
  // Search reviews
  const reviewStatement = db!.prepareSync(`
    SELECT date, content, word_count, is_completed, updated_at, 'review' as type 
    FROM daily_reviews 
    WHERE content LIKE $keyword 
    ORDER BY date DESC
  `);

  try {
    const timelines = timelineStatement.executeSync({ $keyword: `%${keyword}%` }).getAllSync();
    const reviews = reviewStatement.executeSync({ $keyword: `%${keyword}%` }).getAllSync();
    return { timelines, reviews };
  } finally {
    timelineStatement.finalizeSync();
    reviewStatement.finalizeSync();
  }
};

export const exportData = () => {
  const timelines = db!.getAllSync('SELECT * FROM timelines');
  const reviews = db!.getAllSync('SELECT * FROM daily_reviews');
  
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    timelines,
    reviews
  }, null, 2);
};

export const replaceAllData = (timelines: any[], reviews: any[]) => {
  db!.execSync('DELETE FROM timelines; DELETE FROM daily_reviews;');
  const insertTimeline = db!.prepareSync('INSERT INTO timelines (id, content, record_time, end_time, mood, tags, created_at, type) VALUES ($id, $content, $record_time, $end_time, $mood, $tags, $created_at, $type)');
  const upsertReview = db!.prepareSync(`
    INSERT INTO daily_reviews (date, content, word_count, is_completed, updated_at)
    VALUES ($date, $content, $word_count, $is_completed, $updated_at)
    ON CONFLICT(date) DO UPDATE SET
      content = excluded.content,
      word_count = excluded.word_count,
      is_completed = excluded.is_completed,
      updated_at = excluded.updated_at
  `);
  try {
    timelines.forEach(t => {
      insertTimeline.executeSync({
        $id: t.id ?? null,
        $content: t.content ?? '',
        $record_time: t.record_time ?? new Date().toISOString(),
        $end_time: t.end_time ?? null,
        $mood: t.mood ?? null,
        $tags: t.tags ?? null,
        $created_at: t.created_at ?? new Date().toISOString(),
        $type: t.type ?? 'normal'
      });
    });
    reviews.forEach(r => {
      upsertReview.executeSync({
        $date: r.date,
        $content: r.content ?? '',
        $word_count: r.word_count ?? 0,
        $is_completed: r.is_completed ? 1 : 0,
        $updated_at: r.updated_at ?? new Date().toISOString()
      });
    });
  } finally {
    insertTimeline.finalizeSync();
    upsertReview.finalizeSync();
  }
};
export const getFavoriteTags = () => {
  const rows = db!.getAllSync('SELECT * FROM favorite_tags');
  return rows;
};

export const addFavoriteTagRow = (tag: string, color: string | null) => {
  const st = db!.prepareSync('INSERT OR REPLACE INTO favorite_tags (tag, color) VALUES ($tag, $color)');
  try {
    st.executeSync({ $tag: tag, $color: color });
  } finally {
    st.finalizeSync();
  }
};

export const removeFavoriteTagRow = (tag: string) => {
  const st = db!.prepareSync('DELETE FROM favorite_tags WHERE tag = $tag');
  try {
    st.executeSync({ $tag: tag });
  } finally {
    st.finalizeSync();
  }
};

export const updateFavoriteTagColorRow = (tag: string, color: string | null) => {
  const st = db!.prepareSync('UPDATE favorite_tags SET color = $color WHERE tag = $tag');
  try {
    st.executeSync({ $tag: tag, $color: color });
  } finally {
    st.finalizeSync();
  }
};
export const getSetting = (key: string): string | null => {
  const rows = db!.getAllSync('SELECT value FROM user_settings WHERE key = $key', { $key: key });
  if (rows.length) return rows[0].value as string;
  return null;
};
export const setSetting = (key: string, value: string) => {
  const st = db!.prepareSync('INSERT OR REPLACE INTO user_settings (key, value) VALUES ($key, $value)');
  try {
    st.executeSync({ $key: key, $value: value });
  } finally {
    st.finalizeSync();
  }
};
