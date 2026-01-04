import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const toRad = (deg: number) => (deg * Math.PI) / 180;
const arcPath = (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => {
  const start = { x: cx + r * Math.cos(toRad(startDeg)), y: cy + r * Math.sin(toRad(startDeg)) };
  const end = { x: cx + r * Math.cos(toRad(endDeg)), y: cy + r * Math.sin(toRad(endDeg)) };
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

export function MoodDonut({
  happy,
  neutral,
  sad,
  size = 120,
  thickness = 12,
  colors = { happy: '#10b981', neutral: '#f59e0b', sad: '#ef4444' },
  textColor = '#111827',
}: {
  happy: number;
  neutral: number;
  sad: number;
  size?: number;
  thickness?: number;
  colors?: { happy: string; neutral: string; sad: string };
  textColor?: string;
}) {
  const total = Math.max(0, happy + neutral + sad);
  const hp = total ? (happy / total) * 360 : 0;
  const np = total ? (neutral / total) * 360 : 0;
  const sp = total ? (sad / total) * 360 : 0;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const segments = [
    { start: 0, end: hp, color: colors.happy },
    { start: hp, end: hp + np, color: colors.neutral },
    { start: hp + np, end: hp + np + sp, color: colors.sad },
  ].filter(seg => seg.end > seg.start);
  const top = total ? Math.max(happy, neutral, sad) : 0;
  const pctTop = total ? Math.round((top / total) * 100) : 0;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke="#e5e7eb" strokeWidth={thickness} fill="none" />
        {segments.map((seg, i) => (
          <Path key={i} d={arcPath(cx, cy, r, seg.start - 90, seg.end - 90)} stroke={seg.color} strokeWidth={thickness} fill="none" strokeLinecap="round" />
        ))}
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Text style={{ color: textColor, fontWeight: 'bold' }}>{pctTop}%</Text>
      </View>
    </View>
  );
}
