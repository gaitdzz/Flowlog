import { monthlyMoodAndTags, monthHeatmapMetrics } from './stats';

const monthlyTimelines = [
  { mood: 'happy', tags: JSON.stringify(['work','focus']) },
  { mood: 'neutral', tags: JSON.stringify(['work']) },
  { mood: 'sad', tags: JSON.stringify(['break']) },
  { mood: 'happy', tags: JSON.stringify(['focus','gym']) },
];

const agg = monthlyMoodAndTags(monthlyTimelines as any[]);
console.log('mood', agg.moodCounts);
console.log('tags', Array.from(agg.tagFreq.entries()));

const heatmapData: Record<string, any> = {
  '2026-01-01': { count: 2, isCompleted: true },
  '2026-01-02': { count: 0, isCompleted: false },
  '2026-01-03': { count: 3, isCompleted: true },
};
const metrics = monthHeatmapMetrics(heatmapData, new Date('2026-01-01'));
console.log('metrics', metrics);
