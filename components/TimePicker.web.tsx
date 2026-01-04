import React from 'react';
import { View } from 'react-native';

interface TimePickerProps {
  value: Date;
  onChange: (event: any, date?: Date) => void;
}

export const TimePicker = ({ value, onChange }: TimePickerProps) => {
  const onChangeWeb = (e: any) => {
    const timeStr = e.target.value; // "14:30"
    if (!timeStr) return;
    const [hours, minutes] = timeStr.split(':');
    const newDate = new Date(value);
    newDate.setHours(parseInt(hours, 10));
    newDate.setMinutes(parseInt(minutes, 10));
    onChange({ type: 'set' }, newDate);
  };

  // Convert date to HH:mm for input value
  const hours = value.getHours().toString().padStart(2, '0');
  const minutes = value.getMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}`;

  return (
    <View style={{ marginVertical: 8 }}>
      {/* @ts-ignore - input is valid in web */}
      <input
        type="time"
        value={timeString}
        onChange={onChangeWeb}
        style={{
          fontSize: '16px',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid #ccc',
        }}
      />
    </View>
  );
};
