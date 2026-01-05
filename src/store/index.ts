import { create } from 'zustand';
import { addTimeline, getTimelinesByDate, upsertDailyReview, getDailyReview, initDatabase, getHeatmapStats, exportData, getLastTimeline, updateTimelineEndTime, getReviewsByDateRange, searchRecords, getTimelinesByDateRange, getFavoriteTags, addFavoriteTagRow, removeFavoriteTagRow, updateFavoriteTagColorRow, getSetting, setSetting } from '../db/database';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface Timeline {
  id: number;
  content: string;
  record_time: string;
  end_time?: string;
  mood?: string;
  tags?: string;
  created_at: string;
  type: string;
}

interface DailyReview {
  date: string;
  content: string;
  word_count: number;
  is_completed: number;
  updated_at: string;
}

interface HeatmapData {
  count: number;
  isCompleted: boolean;
}

interface GapAlert {
  lastRecord: Timeline;
  diffMinutes: number;
}

interface FavoriteTag {
  tag: string;
  color?: string | null;
}
interface FlowLogState {
  // State
  timelines: Timeline[];
  currentReview: DailyReview | null;
  heatmapData: Record<string, HeatmapData>;
  reviewsList: DailyReview[]; // For history view
  historyTimelines: Timeline[]; // For calendar day view
  monthlyTimelines: Timeline[]; // For stats/tag aggregation
  favoriteTags: FavoriteTag[];
  isLoading: boolean;
  error: string | null;
  gapAlert: GapAlert | null;
  streakCount: number;
  bestStreak: number;
  weekCompleted: number;
  weeklyGoal: number;
  monthlyGoal: number;
  achievementsHistory: { type: string; label: string; date: string }[];

  // Actions
  initApp: () => void;
  loadTimelines: (date: string) => void;
  loadHistoryTimelines: (date: string) => void;
  loadMonthlyTimelines: (startDate: string, endDate: string) => void;
  loadFavoriteTags: () => void;
  addFavoriteTag: (tag: string) => void;
  removeFavoriteTag: (tag: string) => void;
  updateFavoriteTagColor: (tag: string, color: string | null) => void;
  loadWeeklyGoal: () => void;
  setWeeklyGoal: (n: number) => void;
  loadMonthlyGoal: () => void;
  setMonthlyGoal: (n: number) => void;
  loadAchievementsHistory: () => void;
  addAchievementEntry: (type: string, label: string, date: string) => void;
  checkMonthlyGoal: () => void;
  addRecord: (content: string, date: Date, endTime?: Date, mood?: string, tags?: string[]) => void;
  updateRecordEndTime: (id: number, endTime: Date) => void;
  saveReview: (date: string, content: string) => void;
  loadReview: (date: string) => void;
  loadHeatmap: (startDate: string) => void;
  loadReviewsHistory: (startDate: string, endDate: string) => void;
  searchGlobal: (keyword: string) => Promise<void>;
  exportDataToFile: () => Promise<void>;
  exportMarkdownToFile: () => Promise<void>;
  importBackupFromJson: (text: string) => Promise<boolean>;
  exportAchievementsToFile: (items?: { type: string; label: string; date: string }[]) => Promise<void>;
  exportAchievementsMarkdownToFile: (items?: { type: string; label: string; date: string }[]) => Promise<void>;
  exportAchievementsSummaryMarkdownToFile: (items?: { type: string; label: string; date: string }[]) => Promise<void>;
  scheduleNotification: (intervalMinutes: number) => Promise<void>;
  checkGap: () => void;
  clearGapAlert: () => void;
  loadStreak: () => void;
  loadWeekProgress: () => void;
  
  // Search State
  searchResults: { timelines: any[], reviews: any[] } | null;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldSetBadge: false,
  }),
});

export const useFlowLogStore = create<FlowLogState>((set, get) => ({
  timelines: [],
  currentReview: null,
  heatmapData: {},
  reviewsList: [],
  historyTimelines: [],
  monthlyTimelines: [],
  favoriteTags: [],
  isLoading: false,
  error: null,
  gapAlert: null,
  searchResults: null,
  streakCount: 0,
  weekCompleted: 0,
  weeklyGoal: 7,
  monthlyGoal: 20,
  achievementsHistory: [],
  bestStreak: 0,

  initApp: () => {
    try {
      initDatabase();
      get().checkGap();
      get().loadStreak();
      get().loadWeekProgress();
      get().loadFavoriteTags();
      get().loadWeeklyGoal();
      get().loadMonthlyGoal();
      get().loadAchievementsHistory();
      get().checkMonthlyGoal();
      // Best streak refresh
      get().loadStreak();
      get().checkStreakAchievements();
    } catch (e) {
      set({ error: '初始化数据库失败' });
    }
  },

  checkGap: () => {
    try {
      const lastRecord = getLastTimeline() as Timeline | null;
      if (!lastRecord || lastRecord.end_time) return;

      const now = new Date();
      const lastTime = new Date(lastRecord.record_time);
      const diffMs = now.getTime() - lastTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      // If gap is > 2 hours (120 minutes), set alert
      if (diffMinutes > 120) {
        set({ gapAlert: { lastRecord, diffMinutes } });
      }
    } catch (e) {
      console.error('检查间隔失败:', e);
    }
  },

  clearGapAlert: () => set({ gapAlert: null }),

  loadTimelines: (date: string) => {
    set({ isLoading: true });
    try {
      const records = getTimelinesByDate(date) as Timeline[];
      set({ timelines: records, isLoading: false });
    } catch (e) {
      set({ error: '加载时间线失败', isLoading: false });
    }
  },

  loadHistoryTimelines: (date: string) => {
    set({ isLoading: true });
    try {
      const records = getTimelinesByDate(date) as Timeline[];
      set({ historyTimelines: records, isLoading: false });
    } catch (e) {
      set({ error: '加载历史时间线失败', isLoading: false });
    }
  },
  loadMonthlyTimelines: (startDate: string, endDate: string) => {
    set({ isLoading: true });
    try {
      const records = getTimelinesByDateRange(startDate, endDate) as Timeline[];
      set({ monthlyTimelines: records, isLoading: false });
    } catch (e) {
      set({ error: '加载月度时间线失败', isLoading: false });
    }
  },
  loadFavoriteTags: () => {
    try {
      const rows = getFavoriteTags() as any[];
      const tags = rows.map(r => ({ tag: r.tag as string, color: r.color as string | null }));
      set({ favoriteTags: tags });
    } catch (e) {
      set({ error: '加载收藏标签失败' });
    }
  },
  addFavoriteTag: (tag: string) => {
    try {
      let t = tag.trim();
      if (t.startsWith('#')) t = t.slice(1);
      t = t.replace(/[^A-Za-z0-9_-]/g, '').toLowerCase();
      if (!t) return false;
      const exists = get().favoriteTags.some(ft => ft.tag.toLowerCase() === t);
      if (exists) return false;
      addFavoriteTagRow(t, null);
      get().loadFavoriteTags();
      return true;
    } catch (e) {
      set({ error: '添加收藏标签失败' });
      return false;
    }
  },
  removeFavoriteTag: (tag: string) => {
    try {
      removeFavoriteTagRow(tag);
      get().loadFavoriteTags();
    } catch (e) {
      set({ error: '移除收藏标签失败' });
    }
  },
  updateFavoriteTagColor: (tag: string, color: string | null) => {
    try {
      updateFavoriteTagColorRow(tag, color);
      get().loadFavoriteTags();
    } catch (e) {
      set({ error: '更新收藏标签颜色失败' });
    }
  },
  loadWeeklyGoal: () => {
    try {
      const val = getSetting('weekly_goal');
      const n = val ? parseInt(val, 10) : 7;
      set({ weeklyGoal: isNaN(n) ? 7 : n });
    } catch (e) {
      set({ error: '加载周目标失败' });
    }
  },
  setWeeklyGoal: (n: number) => {
    try {
      const v = Math.max(1, Math.min(14, Math.floor(n)));
      setSetting('weekly_goal', String(v));
      set({ weeklyGoal: v });
    } catch (e) {
      set({ error: '设置周目标失败' });
    }
  },
  loadMonthlyGoal: () => {
    try {
      const val = getSetting('monthly_goal');
      const n = val ? parseInt(val, 10) : 20;
      set({ monthlyGoal: isNaN(n) ? 20 : n });
    } catch (e) {
      set({ error: '加载月目标失败' });
    }
  },
  setMonthlyGoal: (n: number) => {
    try {
      const v = Math.max(5, Math.min(30, Math.floor(n)));
      setSetting('monthly_goal', String(v));
      set({ monthlyGoal: v });
    } catch (e) {
      set({ error: '设置月目标失败' });
    }
  },

  addRecord: (content: string, date: Date, endTime?: Date, mood?: string, tags?: string[]) => {
    try {
      // Logic for auto-closing previous record
      const lastRecord = getLastTimeline() as Timeline | null;
      
      // If there is a last record, it has no end time, AND it's within 2 hours of this new record
      // Auto-close it with the new record's start time
      if (lastRecord && !lastRecord.end_time) {
        const lastTime = new Date(lastRecord.record_time);
        const diffMs = date.getTime() - lastTime.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes <= 120 && diffMinutes > 0) {
          // Auto close
          updateTimelineEndTime(lastRecord.id, date.toISOString());
        }
      }

      const recordTime = date.toISOString();
      const endTimeStr = endTime ? endTime.toISOString() : undefined;
      const tagsStr = tags && tags.length ? JSON.stringify(tags) : undefined;
      
      addTimeline(content, recordTime, endTimeStr, mood, tagsStr);
      
      // Reload timelines for the date of the record
      const dateStr = recordTime.split('T')[0];
      get().loadTimelines(dateStr);
      
      // Reload heatmap (since count changed)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      get().loadHeatmap(thirtyDaysAgo.toISOString().split('T')[0]);
    } catch (e) {
      set({ error: '添加记录失败' });
    }
  },

  updateRecordEndTime: (id: number, endTime: Date) => {
    try {
      updateTimelineEndTime(id, endTime.toISOString());
      
      // Reload timelines to reflect change
      // Ideally we should know the date of the record, but for now let's reload current selection if possible
      // or just rely on the user refreshing. 
      // A better way is to update the state locally:
      const timelines = get().timelines.map(t => 
        t.id === id ? { ...t, end_time: endTime.toISOString() } : t
      );
      set({ timelines });
      
    } catch (e) {
      set({ error: '更新记录结束时间失败' });
    }
  },

  saveReview: (date: string, content: string) => {
    try {
      const wordCount = content.trim().length;
      const isCompleted = wordCount >= 500;
      upsertDailyReview(date, content, wordCount, isCompleted);
      get().loadReview(date);
      get().loadStreak();
      get().loadWeekProgress();
      get().loadStreak();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      get().loadHeatmap(thirtyDaysAgo.toISOString().split('T')[0]);
    } catch (e) {
      set({ error: '保存复盘失败' });
    }
  },

  loadReview: (date: string) => {
    try {
      const review = getDailyReview(date) as DailyReview;
      set({ currentReview: review || null });
    } catch (e) {
      set({ error: '加载复盘失败' });
    }
  },

  loadHeatmap: (startDate: string) => {
    try {
      const { timelineResults, reviewResults } = getHeatmapStats(startDate);
      
      const data: Record<string, HeatmapData> = {};
      
      timelineResults.forEach((r: any) => {
        if (!data[r.date]) data[r.date] = { count: 0, isCompleted: false };
        data[r.date].count = r.count;
      });
      
      reviewResults.forEach((r: any) => {
        if (!data[r.date]) data[r.date] = { count: 0, isCompleted: false };
        data[r.date].isCompleted = !!r.is_completed;
      });

      // Merge with existing data instead of replacing
      set((state) => ({ 
        heatmapData: { ...state.heatmapData, ...data } 
      }));
    } catch (e) {
      set({ error: '加载热力图统计失败' });
    }
  },

  loadReviewsHistory: (startDate: string, endDate: string) => {
    set({ isLoading: true });
    try {
      const reviews = getReviewsByDateRange(startDate, endDate) as DailyReview[];
      set({ reviewsList: reviews, isLoading: false });
    } catch (e) {
      set({ error: '加载复盘历史失败', isLoading: false });
    }
  },

  searchGlobal: async (keyword: string) => {
    if (!keyword.trim()) {
      set({ searchResults: null });
      return;
    }
    set({ isLoading: true });
    try {
      const results = searchRecords(keyword);
      set({ searchResults: results, isLoading: false });
    } catch (e) {
      set({ error: '搜索记录失败', isLoading: false });
    }
  },
  loadStreak: () => {
    try {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 365);
      const reviews = getReviewsByDateRange(formatDate(start), formatDate(today)) as DailyReview[];
      // Current streak
      const map = new Map<string, DailyReview>();
      reviews.forEach(r => map.set(r.date, r));
      let streak = 0;
      let cursor = new Date(today);
      const todayStr = formatDate(today);
      const todayReview = map.get(todayStr);
      if (!(todayReview && todayReview.is_completed)) {
        cursor.setDate(cursor.getDate() - 1); // 以昨天为起点计算连续
      }
      while (true) {
        const ds = formatDate(cursor);
        const r = map.get(ds);
        if (r && r.is_completed) {
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
      // Best streak in the range
      const sorted = [...reviews].sort((a,b) => a.date.localeCompare(b.date));
      let best = 0;
      let current = 0;
      let prevDate: Date | null = null;
      for (const r of sorted) {
        if (!r.is_completed) {
          current = 0;
          prevDate = null;
          continue;
        }
        const d = new Date(r.date);
        if (prevDate) {
          const nextDay = new Date(prevDate);
          nextDay.setDate(prevDate.getDate() + 1);
          const same = formatDate(nextDay) === formatDate(d);
          current = same ? current + 1 : 1;
        } else {
          current = 1;
        }
        prevDate = d;
        if (current > best) best = current;
      }
      set({ streakCount: streak, bestStreak: best });
    } catch (e) {
      set({ error: '计算连续天数失败' });
    }
  },
  loadWeekProgress: () => {
    try {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const reviews = getReviewsByDateRange(formatDate(start), formatDate(end)) as DailyReview[];
      const count = reviews.filter(r => !!r.is_completed).length;
      set({ weekCompleted: count });
      const goal = get().weeklyGoal;
      const ds = formatDate(start) + '_weekly';
      if (count >= goal) {
        get().addAchievementEntry('weekly_goal', '达成周目标', ds);
      }
    } catch (e) {
      set({ error: '计算周进度失败' });
    }
  },

  exportDataToFile: async () => {
    try {
      const json = exportData();
      const fileName = `flowlog_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      if (Platform.OS === 'web') {
        // Web download shim
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, json);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (e) {
      set({ error: '导出数据失败' });
    }
  },
  exportMarkdownToFile: async () => {
    try {
      const json = exportData();
      const data = JSON.parse(json);
      const timelines = data.timelines as any[];
      const reviews = data.reviews as any[];
      const byDate: Record<string, { timelines: any[]; review?: any }> = {};
      timelines.forEach(t => {
        const d = t.record_time.slice(0, 10);
        if (!byDate[d]) byDate[d] = { timelines: [] };
        byDate[d].timelines.push(t);
      });
      reviews.forEach(r => {
        const d = r.date;
        if (!byDate[d]) byDate[d] = { timelines: [] };
        byDate[d].review = r;
      });
      const dates = Object.keys(byDate).sort().reverse();
      let md = `# 流刻导出\n\n`;
      dates.forEach(d => {
        md += `## ${d}\n\n`;
        const section = byDate[d];
        section.timelines.sort((a,b)=>a.record_time.localeCompare(b.record_time));
        section.timelines.forEach(t => {
          const start = new Date(t.record_time);
          const end = t.end_time ? new Date(t.end_time) : null;
          const hhmm = start.toISOString().slice(11,16);
          const endStr = end ? end.toISOString().slice(11,16) : '';
          const mood = t.mood ? ` ${t.mood}` : '';
          let tagsStr = '';
          try {
            const arr = t.tags ? JSON.parse(t.tags) : [];
            if (Array.isArray(arr) && arr.length) tagsStr = ' ' + arr.map((x:string)=>`#${x}`).join(' ');
          } catch {}
          md += `- ${hhmm}${endStr?`-${endStr}`:''}${mood} ${t.content}${tagsStr}\n`;
        });
        if (section.review) {
          md += `\n### 复盘\n\n`;
          md += `${section.review.content || ''}\n\n`;
        }
      });
      const fileName = `flowlog_markdown_${new Date().toISOString().split('T')[0]}.md`;
      if (Platform.OS === 'web') {
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, md);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (e) {
      set({ error: 'Failed to export markdown' });
    }
  },
  importBackupFromJson: async (text: string) => {
    try {
      const obj = JSON.parse(text);
      const timelines = Array.isArray(obj.timelines) ? obj.timelines : [];
      const reviews = Array.isArray(obj.reviews) ? obj.reviews : [];
      const { replaceAllData } = await import('../db/database');
      replaceAllData(timelines, reviews);
      const now = new Date();
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      get().loadMonthlyTimelines(formatDate(mStart), formatDate(mEnd));
      const todayStr = formatDate(now);
      get().loadTimelines(todayStr);
      get().loadReview(todayStr);
      const past = new Date();
      past.setDate(past.getDate() - 180);
      get().loadHeatmap(formatDate(past));
      get().loadStreak();
      get().loadWeekProgress();
      return true;
    } catch (e) {
      set({ error: 'Failed to import backup' });
      return false;
    }
  },
  exportAchievementsToFile: async (items?: { type: string; label: string; date: string }[]) => {
    try {
      const list = items && items.length ? items : (get().achievementsHistory || []);
      const header = 'date,type,label\n';
      const rows = list.map(a => `${a.date},${a.type},${a.label.replace(/"/g,'""')}`).join('\n');
      const csv = header + rows + '\n';
      const fileName = `flowlog_achievements_${new Date().toISOString().split('T')[0]}.csv`;
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (e) {
      set({ error: 'Failed to export achievements' });
    }
  },
  exportAchievementsMarkdownToFile: async (items?: { type: string; label: string; date: string }[]) => {
    try {
      const list = items && items.length ? items : (get().achievementsHistory || []);
      const groups: Record<string, { type: string; label: string; date: string }[]> = {};
      list.forEach(a => {
        if (!groups[a.type]) groups[a.type] = [];
        groups[a.type].push(a);
      });
      const order = ['streak', 'weekly_goal', 'monthly_goal'];
      let md = `# 流刻成就\n\n生成时间：${new Date().toISOString()}\n\n`;
      order.forEach(t => {
        const arr = groups[t] || [];
        if (!arr.length) return;
        const title = t === 'streak' ? '连续' : t === 'weekly_goal' ? '周目标' : '月目标';
        md += `## ${title}\n`;
        arr.sort((a,b) => a.date.localeCompare(b.date)).forEach(a => {
          md += `- ${a.date}: ${a.label}\n`;
        });
        md += `\n`;
      });
      const fileName = `flowlog_achievements_${new Date().toISOString().split('T')[0]}.md`;
      if (Platform.OS === 'web') {
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, md);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (e) {
      set({ error: '导出成就 Markdown 失败' });
    }
  },
  exportAchievementsSummaryMarkdownToFile: async (items?: { type: string; label: string; date: string }[]) => {
    try {
      const list = items && items.length ? items : (get().achievementsHistory || []);
      const total = list.length;
      const typeCount = list.reduce((acc: Record<string, number>, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {});
      const dates = list.map(a => {
        const s = (a.date || '').split('_')[0];
        const d = new Date(s);
        return d;
      }).filter(d => !isNaN(d.getTime()));
      const formatter = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const min = dates.length ? formatter(new Date(Math.min(...dates.map(d => d.getTime())))) : 'N/A';
      const max = dates.length ? formatter(new Date(Math.max(...dates.map(d => d.getTime())))) : 'N/A';
      let md = `# 成就摘要\n\n总计：${total}\n\n- 连续：${typeCount['streak'] || 0}\n- 周目标：${typeCount['weekly_goal'] || 0}\n- 月目标：${typeCount['monthly_goal'] || 0}\n\n范围：${min} ~ ${max}\n`;
      const fileName = `flowlog_achievements_summary_${new Date().toISOString().split('T')[0]}.md`;
      if (Platform.OS === 'web') {
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, md);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (e) {
      set({ error: '导出成就摘要失败' });
    }
  },
  loadAchievementsHistory: () => {
    try {
      const raw = getSetting('achievements_history');
      let arr: { type: string; label: string; date: string }[] = [];
      if (raw) {
        try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) arr = parsed; } catch {}
      }
      set({ achievementsHistory: arr });
    } catch (e) {
      set({ error: '加载成就历史失败' });
    }
  },
  addAchievementEntry: (type: string, label: string, date: string) => {
    try {
      const existing = get().achievementsHistory;
      const dup = existing.some(x => x.type === type && x.date === date);
      if (dup) return;
      const next = [...existing, { type, label, date }];
      setSetting('achievements_history', JSON.stringify(next));
      set({ achievementsHistory: next });
    } catch (e) {
      set({ error: '添加成就失败' });
    }
  },
  checkMonthlyGoal: () => {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const reviews = getReviewsByDateRange(formatDate(start), formatDate(end)) as DailyReview[];
      const completed = reviews.filter(r => !!r.is_completed).length;
      const goal = get().monthlyGoal;
      const ds = formatDate(start) + '_monthly';
      if (completed >= goal) {
        get().addAchievementEntry('monthly_goal', '达成月目标', ds);
      }
    } catch (e) {
      set({ error: 'Failed to check monthly goal' });
    }
  },
  checkStreakAchievements: () => {
    try {
      const best = get().bestStreak;
      const today = formatDate(new Date());
      if (best >= 7) get().addAchievementEntry('streak', '7天连续', today);
      if (best >= 30) get().addAchievementEntry('streak', '30天连续', today);
      if (best >= 100) get().addAchievementEntry('streak', '100天连续', today);
    } catch (e) {
      set({ error: 'Failed to check streak achievements' });
    }
  },
  

  scheduleNotification: async (intervalMinutes: number) => {
    if (Platform.OS === 'web') {
      console.log('Web 端通知在 MVP 中不完全支持');
      return;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('未授予通知权限');
        return;
      }

      await Notifications.cancelAllScheduledNotificationsAsync();

      if (intervalMinutes > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "时间提醒",
            body: "此刻在做什么？",
          },
          trigger: {
            seconds: intervalMinutes * 60,
            repeats: true,
          } as any, // Type cast to avoid TS issues with repeats
        });
      }
    } catch (e) {
      set({ error: '计划通知失败' });
    }
  }
}));
