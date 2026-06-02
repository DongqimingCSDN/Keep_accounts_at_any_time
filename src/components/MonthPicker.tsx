import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { useTheme } from '../store/ThemeContext';

interface MonthPickerProps {
  currentMonth: string;
  onChange: (month: string) => void;
}

export default function MonthPicker({ currentMonth, onChange }: MonthPickerProps) {
  const { colors } = useTheme();

  const current = dayjs(currentMonth + '-01');

  const handlePrev = () => {
    const prev = current.subtract(1, 'month');
    onChange(prev.format('YYYY-MM'));
  };

  const handleNext = () => {
    const next = current.add(1, 'month');
    onChange(next.format('YYYY-MM'));
  };

  const handleToday = () => {
    onChange(dayjs().format('YYYY-MM'));
  };

  const displayText = current.format('YYYY年MM月');

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
      <TouchableOpacity onPress={handlePrev} style={styles.arrowBtn} activeOpacity={0.7}>
        <Text style={[styles.arrowText, { color: colors.primary }]}>{'‹'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleToday} activeOpacity={0.7}>
        <Text style={[styles.monthText, { color: colors.text }]}>{displayText}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleNext} style={styles.arrowBtn} activeOpacity={0.7}>
        <Text style={[styles.arrowText, { color: colors.primary }]}>{'›'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  arrowBtn: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  arrowText: {
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 30,
  },
  monthText: {
    fontSize: 17,
    fontWeight: '600',
    marginHorizontal: 20,
    letterSpacing: 0.5,
  },
});
