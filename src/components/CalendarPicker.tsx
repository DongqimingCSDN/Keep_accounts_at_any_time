import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { useTheme } from '../store/ThemeContext';

interface Transaction {
  date: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
}

interface CalendarPickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  transactions?: Transaction[];
  currencySymbol?: string;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const CELL_PERCENT = `${100 / 7}%`;

export default function CalendarPicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  transactions = [],
  currencySymbol = '¥',
}: CalendarPickerProps) {
  const { colors } = useTheme();
  const [displayMonth, setDisplayMonth] = useState(dayjs(startDate).startOf('month'));

  const start = dayjs(startDate);
  const end = dayjs(endDate);

  const handlePrevMonth = () => {
    setDisplayMonth(prev => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setDisplayMonth(prev => prev.add(1, 'month'));
  };

  const handleDayPress = (day: dayjs.Dayjs) => {
    const dateStr = day.format('YYYY-MM-DD');
    if (!startDate || (startDate && endDate)) {
      onStartDateChange(dateStr);
      onEndDateChange('');
    } else {
      const s = dayjs(startDate);
      if (day.isBefore(s, 'day')) {
        onStartDateChange(dateStr);
        onEndDateChange(startDate);
      } else {
        onEndDateChange(dateStr);
      }
    }
  };

  const dailyNetMap = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type === 'transfer') return;
      const current = map.get(t.date) || 0;
      if (t.type === 'income') {
        map.set(t.date, current + t.amount);
      } else {
        map.set(t.date, current - t.amount);
      }
    });
    return map;
  }, [transactions]);

  const formatNetAmount = (amount: number) => {
    const abs = Math.abs(amount);
    if (abs >= 10000) {
      return `${(amount / 10000).toFixed(1)}w`;
    }
    if (abs >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    if (abs === 0) return '';
    return amount.toFixed(1);
  };

  const daysInMonth = displayMonth.daysInMonth();
  const firstDayOfWeek = displayMonth.day() === 0 ? 6 : displayMonth.day() - 1;

  const calendarDays = useMemo(() => {
    const days: (dayjs.Dayjs | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(displayMonth.date(d));
    }
    return days;
  }, [displayMonth, daysInMonth, firstDayOfWeek]);

  const isInRange = (day: dayjs.Dayjs) => {
    if (!startDate || !endDate) return false;
    const dayStr = day.format('YYYY-MM-DD');
    return dayStr > startDate && dayStr < endDate;
  };

  const isStartDate = (day: dayjs.Dayjs) => {
    return startDate && day.format('YYYY-MM-DD') === startDate;
  };

  const isEndDate = (day: dayjs.Dayjs) => {
    return endDate && day.format('YYYY-MM-DD') === endDate;
  };

  const isToday = (day: dayjs.Dayjs) => {
    return day.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
  };

  const selectionHint = !startDate
    ? '请选择开始日期'
    : !endDate
      ? '请选择结束日期'
      : `${start.format('M月D日')} - ${end.format('M月D日')}`;

  return (
    <View style={styles.container}>
      <Text style={[styles.hintText, { color: colors.primary }]}>{selectionHint}</Text>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn} activeOpacity={0.7}>
          <Text style={[styles.navArrow, { color: colors.primary }]}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {displayMonth.format('YYYY年M月')}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn} activeOpacity={0.7}>
          <Text style={[styles.navArrow, { color: colors.primary }]}>{'›'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map(d => (
          <View key={d} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: colors.textTertiary }]}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((day, idx) => {
          if (!day) {
            return <View key={`empty-${idx}`} style={styles.dayCell} />;
          }

          const inRange = isInRange(day);
          const isStart = isStartDate(day);
          const isEnd = isEndDate(day);
          const today = isToday(day);

          const dayKey = day.format('YYYY-MM-DD');
          const netAmount = dailyNetMap.get(dayKey) || 0;
          const netText = formatNetAmount(netAmount);

          let textStyle: any = { color: colors.text };

          if (isStart || isEnd) {
            textStyle = { color: '#FFFFFF' };
          } else if (inRange) {
            textStyle = { color: colors.primary };
          } else if (today) {
            textStyle = { color: colors.primary, fontWeight: '600' };
          }

          let netColor = colors.textTertiary;
          if (netAmount > 0) {
            netColor = isStart || isEnd ? 'rgba(255,255,255,0.8)' : colors.success;
          } else if (netAmount < 0) {
            netColor = isStart || isEnd ? 'rgba(255,255,255,0.8)' : colors.error;
          }

          return (
            <TouchableOpacity
              key={dayKey}
              style={[
                styles.dayCell,
                inRange && styles.dayCellRange,
                isStart && !isEnd && styles.dayCellStart,
                isEnd && !isStart && styles.dayCellEnd,
              ]}
              onPress={() => handleDayPress(day)}
              activeOpacity={0.7}
            >
              {inRange && (
                <View style={[styles.rangeBg, { backgroundColor: colors.primaryLight }]} />
              )}
              {(isStart || isEnd) ? (
                <View style={[styles.selectedCircle, { backgroundColor: colors.primary }]}>
                  <Text style={styles.selectedDayText}>{day.date()}</Text>
                </View>
              ) : (
                <Text style={[styles.dayText, textStyle]}>{day.date()}</Text>
              )}
              {netText !== '' && (
                <Text style={[styles.netText, { color: (isStart || isEnd) ? (netAmount > 0 ? colors.success : colors.error) : netColor }]} numberOfLines={1}>
                  {netAmount > 0 ? '+' : ''}{netText}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    width: '100%',
  },
  navBtn: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  navArrow: {
    fontSize: 24,
    fontWeight: '600',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    minWidth: 120,
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 4,
  },
  weekdayCell: {
    width: CELL_PERCENT,
    alignItems: 'center',
    paddingVertical: 4,
    paddingBottom: 2,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  dayCell: {
    width: CELL_PERCENT,
    height: 62,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  dayCellRange: {
    zIndex: 1,
  },
  dayCellStart: {
    zIndex: 2,
  },
  dayCellEnd: {
    zIndex: 2,
  },
  rangeBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: 0,
  },
  selectedCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  selectedDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  netText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 14,
    position: 'absolute',
    bottom: -1,
  },
});
