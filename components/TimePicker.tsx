import React from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface TimePickerProps {
  value: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
}

export const TimePicker = ({ value, onChange }: TimePickerProps) => {
  return (
    <DateTimePicker
      value={value}
      mode="time"
      is24Hour={true}
      display="default"
      onChange={onChange}
    />
  );
};
