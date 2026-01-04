import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';

export function WeeklyTrend({
  data,
  width = 240,
  height = 80,
  color = '#34d399',
  gridColor = '#e5e7eb',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  gridColor?: string;
}) {
  const n = Math.max(1, data.length);
  const maxV = Math.max(1, ...data);
  const stepX = width / (n - 1 || 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - (v / maxV) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={0} y1={height} x2={width} y2={height} stroke={gridColor} strokeWidth={1} />
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2} />
      </Svg>
    </View>
  );
}
