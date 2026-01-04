import { parseTags } from './tags';

type MoodCounts = { happy: number; neutral: number; sad: number };
type MonthMetrics = { totalRecords: number; activeDays: number; completedDays: number; median: number; avg: number; days: string[] };
export const monthlyMoodAndTags = (monthlyTimelines: { mood?: string; tags?: string | null }[]): { moodCounts: MoodCounts; tagFreq: Map<string, number> } => {
  const moodCounts: MoodCounts = { happy: 0, neutral: 0, sad: 0 };
  const tagFreq: Map<string, number> = new Map();
  monthlyTimelines.forEach((t: any) => {
    if (t.mood && (moodCounts as any)[t.mood] !== undefined) (moodCounts as any)[t.mood] += 1;
    const arr = parseTags(t.tags);
    arr.forEach((tag: string) => tagFreq.set(tag, (tagFreq.get(tag) || 0) + 1));
  });
  return { moodCounts, tagFreq };
};

export const monthHeatmapMetrics = (heatmapData: Record<string, { count?: number; isCompleted?: boolean }>, monthDate: Date): MonthMetrics => {
  const y = monthDate.getFullYear();
  const m = String(monthDate.getMonth() + 1).padStart(2, '0');
  const endDate = new Date(y, monthDate.getMonth() + 1, 0);
  const days: string[] = [];
  for (let d = 1; d <= endDate.getDate(); d++) {
    const ds = `${y}-${m}-${String(d).padStart(2, '0')}`;
    days.push(ds);
  }
  let totalRecords = 0;
  let activeDays = 0;
  let completedDays = 0;
  days.forEach(ds => {
    const h = heatmapData[ds];
    if (h) {
      totalRecords += h.count || 0;
      if ((h.count || 0) > 0) activeDays += 1;
      if (h.isCompleted) completedDays += 1;
    }
  });
  const activeValues = days.map(ds => {
    const h = heatmapData[ds];
    return h ? h.count || 0 : 0;
  }).filter(v => v > 0);
  const median = activeValues.length ? [...activeValues].sort((a,b)=>a-b)[Math.floor(activeValues.length/2)] : 0;
  const avg = activeDays ? Math.round((totalRecords / activeDays) * 10) / 10 : 0;
  return { totalRecords, activeDays, completedDays, median, avg, days };
};
