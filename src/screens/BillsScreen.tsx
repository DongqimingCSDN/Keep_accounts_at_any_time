import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import dayjs from 'dayjs';
import { useApp } from '../store/AppContext';
import { useTheme } from '../store/ThemeContext';
import { CURRENCY_SYMBOLS } from '../constants/currency';
import { Transaction } from '../types';
import MonthPicker from '../components/MonthPicker';
import BillGroup from '../components/BillGroup';
import { getFamilyMembers, FamilyMember } from '../services/familyService';

interface DateGroup {
  date: string;
  transactions: Transaction[];
}

const { width: screenWidth } = Dimensions.get('window');

export default function BillsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { state, deleteTransaction } = useApp();
  const { categories, settings, familyMembers, currentUser, fundAccounts, activeFamilyId } = state;

  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [txFilter, setTxFilter] = useState<string>('all');
  const [familyMemberList, setFamilyMemberList] = useState<FamilyMember[]>([]);
  const dateScrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    if (activeFamilyId) {
      getFamilyMembers(activeFamilyId).then(setFamilyMemberList).catch(() => {});
    } else {
      setFamilyMemberList([]);
    }
  }, [activeFamilyId]);

  const currencySymbol = CURRENCY_SYMBOLS[settings.currency] || '¥';

  const monthDays = useMemo(() => {
    const start = dayjs(currentMonth + '-01');
    const count = start.daysInMonth();
    const today = dayjs().format('YYYY-MM-DD');
    const days: { date: string; day: number; isToday: boolean; weekday: string }[] = [];
    const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
    for (let d = 1; d <= count; d++) {
      const date = start.date(d);
      days.push({
        date: date.format('YYYY-MM-DD'),
        day: d,
        isToday: date.format('YYYY-MM-DD') === today,
        weekday: weekdayLabels[date.day()],
      });
    }
    return days;
  }, [currentMonth]);

  React.useEffect(() => {
    if (selectedDate && !selectedDate.startsWith(currentMonth)) {
      setSelectedDate(null);
    }
  }, [currentMonth]);

  const monthTransactions = useMemo(() => {
    let txs = state.transactions.filter((t) => dayjs(t.date).format('YYYY-MM') === currentMonth);
    if (txFilter !== 'all') {
      txs = txs.filter((t) => t.userId === txFilter);
    }
    return txs;
  }, [state.transactions, currentMonth, txFilter]);

  const filteredTransactions = useMemo(() => {
    let txs = monthTransactions;
    if (selectedDate) {
      txs = txs.filter((t) => {
        const tDate = t.date.length > 10 ? t.date.substring(0, 10) : t.date;
        return tDate === selectedDate;
      });
    }
    if (selectedCategoryIds.size === 0) return txs;
    return txs.filter((t) => selectedCategoryIds.has(t.categoryId));
  }, [monthTransactions, selectedDate, selectedCategoryIds]);

  const dateGroups: DateGroup[] = useMemo(() => {
    const grouped = new Map<string, Transaction[]>();
    const sorted = [...filteredTransactions].sort(
      (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
    );
    for (const t of sorted) {
      const dateKey = t.date.length > 10 ? t.date.substring(0, 10) : t.date;
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(t);
    }
    const sortedDates = [...grouped.keys()].sort(
      (a, b) => dayjs(b).valueOf() - dayjs(a).valueOf()
    );
    return sortedDates.map((date) => ({
      date,
      transactions: grouped.get(date)!,
    }));
  }, [filteredTransactions]);

  const selectedDaySummary = useMemo(() => {
    if (!selectedDate) return null;
    const dayTxs = monthTransactions.filter((t) => {
      const tDate = t.date.length > 10 ? t.date.substring(0, 10) : t.date;
      return tDate === selectedDate;
    });
    const expense = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    return { expense, income, net: income - expense };
  }, [monthTransactions, selectedDate]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteTransaction(id);
    },
    [deleteTransaction]
  );

  const handleEdit = useCallback(
    (transaction: Transaction) => {
      navigation.navigate('AddTransaction', { transactionId: transaction.id });
    },
    [navigation]
  );

  const toggleCategoryFilter = (categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const clearFilter = () => {
    setSelectedCategoryIds(new Set());
    setFilterVisible(false);
  };

  const applyFilter = () => {
    setFilterVisible(false);
  };

  const handleMonthChange = (month: string) => {
    setCurrentMonth(month);
    setSelectedDate(null);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate((prev) => (prev === date ? null : date));
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {selectedDate ? '当天暂无账单记录' : '当月暂无账单记录'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MonthPicker currentMonth={currentMonth} onChange={handleMonthChange} />

      <View style={[styles.dateRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <ScrollView
          ref={dateScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.dateChip,
              !selectedDate && { backgroundColor: colors.primary },
            ]}
            onPress={() => setSelectedDate(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateChipDay, { color: !selectedDate ? '#FFF' : colors.text }]}>全</Text>
            <Text style={[styles.dateChipWeekday, { color: !selectedDate ? 'rgba(255,255,255,0.8)' : colors.textTertiary }]}>部</Text>
          </TouchableOpacity>
          {monthDays.map((d) => {
            const isSelected = selectedDate === d.date;
            const hasTx = monthTransactions.some((t) => {
              const tDate = t.date.length > 10 ? t.date.substring(0, 10) : t.date;
              return tDate === d.date;
            });
            return (
              <TouchableOpacity
                key={d.date}
                style={[
                  styles.dateChip,
                  isSelected && { backgroundColor: colors.primary },
                  d.isToday && !isSelected && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => handleDateSelect(d.date)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateChipDay,
                    { color: isSelected ? '#FFF' : d.isToday ? colors.primary : colors.text },
                  ]}
                >
                  {d.day}
                </Text>
                <Text
                  style={[
                    styles.dateChipWeekday,
                    {
                      color: isSelected
                        ? 'rgba(255,255,255,0.8)'
                        : d.isToday
                          ? colors.primary
                          : colors.textTertiary,
                    },
                  ]}
                >
                  {d.weekday}
                </Text>
                {hasTx && !isSelected && (
                  <View style={[styles.dateDot, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {selectedDate && selectedDaySummary && (
        <View style={[styles.daySummary, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Text style={[styles.daySummaryTitle, { color: colors.text }]}>
            {dayjs(selectedDate).format('M月D日 dddd')}
          </Text>
          <View style={styles.daySummaryRow}>
            <View style={styles.daySummaryItem}>
              <Text style={[styles.daySummaryLabel, { color: colors.textSecondary }]}>支出</Text>
              <Text style={[styles.daySummaryAmount, { color: colors.error }]}>
                {currencySymbol}{selectedDaySummary.expense.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.daySummaryDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.daySummaryItem}>
              <Text style={[styles.daySummaryLabel, { color: colors.textSecondary }]}>收入</Text>
              <Text style={[styles.daySummaryAmount, { color: colors.success }]}>
                {currencySymbol}{selectedDaySummary.income.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.daySummaryDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.daySummaryItem}>
              <Text style={[styles.daySummaryLabel, { color: colors.textSecondary }]}>结余</Text>
              <Text style={[styles.daySummaryAmount, { color: selectedDaySummary.net >= 0 ? colors.success : colors.error }]}>
                {currencySymbol}{selectedDaySummary.net.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.filterBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: colors.primaryLight }]}
          onPress={() => setFilterVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterBtnText, { color: colors.primary }]}>
            {selectedCategoryIds.size > 0
              ? `已选 ${selectedCategoryIds.size} 个分类`
              : '按分类筛选'}
          </Text>
        </TouchableOpacity>
        {selectedCategoryIds.size > 0 && (
          <TouchableOpacity onPress={clearFilter} activeOpacity={0.7}>
            <Text style={[styles.clearBtn, { color: colors.primary }]}>清除</Text>
          </TouchableOpacity>
        )}
      </View>

      {activeFamilyId && familyMemberList.length > 0 && (
        <View style={[styles.memberFilterBar, { backgroundColor: colors.surface }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberFilterScroll}>
            <TouchableOpacity
              style={[styles.memberChip, txFilter === 'all' && { backgroundColor: colors.primary }]}
              onPress={() => setTxFilter('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.memberChipText, { color: txFilter === 'all' ? '#FFF' : colors.textSecondary }]}>全部</Text>
            </TouchableOpacity>
            {familyMemberList.map((m) => {
              const isActive = txFilter === m.userId;
              const isMe = m.userId === currentUser?.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberChip, isActive && { backgroundColor: isMe ? '#4CAF50' : '#1890FF' }]}
                  onPress={() => setTxFilter(m.userId)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.memberChipText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                    {isMe ? '我' : (m.displayName || m.email?.substring(0, 6) || '成员')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={dateGroups}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <BillGroup
            date={item.date}
            transactions={item.transactions}
            categories={categories}
            currencySymbol={currencySymbol}
            onDelete={handleDelete}
            onEdit={handleEdit}
            familyMembers={familyMembers}
            currentUserId={currentUser?.id}
            showMember={!!activeFamilyId}
            fundAccounts={fundAccounts}
          />
        )}
        contentContainerStyle={dateGroups.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
      />

      <Modal visible={filterVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>选择分类</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedCategoryIds.has(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => toggleCategoryFilter(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoryIcon}>{item.icon}</Text>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
                    {isSelected && <Text style={[styles.checkMark, { color: colors.primary }]}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
            <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={clearFilter}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>清除</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={applyFilter}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
    alignItems: 'center',
  },
  dateChip: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 12,
    position: 'relative',
  },
  dateChipDay: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateChipWeekday: {
    fontSize: 10,
    marginTop: 1,
  },
  dateDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 3,
  },
  daySummary: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  daySummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  daySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daySummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  daySummaryLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  daySummaryAmount: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  daySummaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearBtn: {
    fontSize: 13,
    fontWeight: '500',
  },
  memberFilterBar: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  memberFilterScroll: {
    gap: 8,
    alignItems: 'center',
  },
  memberChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  memberChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 18,
    paddingHorizontal: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
  },
  checkMark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
