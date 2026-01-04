import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export function ProgressRing({
  size = 80,
  thickness = 8,
  progress = 0,
  color = '#10b981',
  trackColor = '#e5e7eb',
  label,
  textColor = '#111827',
}: {
  size?: number;
  thickness?: number;
  progress?: number; // 0..1
  color?: string;
  trackColor?: string;
  label?: string;
  textColor?: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = circumference * (1 - clamped);
  const cx = size / 2;
  const cy = size / 2;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={radius} stroke={trackColor} strokeWidth={thickness} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {label ? <Text style={{ color: textColor, fontSize: 12 }}>{label}</Text> : null}
        <Text style={{ color: textColor, fontWeight: 'bold' }}>{Math.round(clamped * 100)}%</Text>
      </View>
    </View>
  );
}
