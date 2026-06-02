import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import SimplePieChart from '../components/SimplePieChart';
import SimpleLineChart from '../components/SimpleLineChart';
import CalendarPicker from '../components/CalendarPicker';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useApp } from '../store/AppContext';
import { useTheme } from '../store/ThemeContext';
import { CURRENCY_SYMBOLS } from '../constants/currency';

dayjs.extend(isoWeek);

const screenWidth = Dimensions.get('window').width;

type ViewMode = 'week' | 'month' | 'year' | 'custom';
type StatsScope = 'personal' | 'family';

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { state } = useApp();
  const { transactions, categories, settings, fundAccounts } = state;
  const currencySymbol = CURRENCY_SYMBOLS[settings.currency] || '¥';

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [pieScope, setPieScope] = useState<StatsScope>('personal');
  const [trendScope, setTrendScope] = useState<StatsScope>('personal');

  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [customEndDate, setCustomEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [appliedStartDate, setAppliedStartDate] = useState<string | null>(null);
  const [appliedEndDate, setAppliedEndDate] = useState<string | null>(null);

  const inFamily = !!state.activeFamilyId;
  const currentUserId = state.currentUser?.id;

  const goToPrev = () => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'week': return prev.subtract(1, 'week');
        case 'month': return prev.subtract(1, 'month');
        case 'year': return prev.subtract(1, 'year');
        default: return prev;
      }
    });
  };

  const goToNext = () => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'week': return prev.add(1, 'week');
        case 'month': return prev.add(1, 'month');
        case 'year': return prev.add(1, 'year');
        default: return prev;
      }
    });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'custom') {
      setCustomStartDate(appliedStartDate || dayjs().startOf('month').format('YYYY-MM-DD'));
      setCustomEndDate(appliedEndDate || dayjs().format('YYYY-MM-DD'));
      setCustomModalVisible(true);
      return;
    }
    setViewMode(mode);
    setAppliedStartDate(null);
    setAppliedEndDate(null);
  };

  const handleCustomApply = () => {
    if (!customStartDate || !customEndDate) return;
    const s = dayjs(customStartDate);
    const e = dayjs(customEndDate);
    if (!s.isValid() || !e.isValid()) return;
    if (s.isAfter(e)) return;
    setAppliedStartDate(customStartDate);
    setAppliedEndDate(customEndDate);
    setViewMode('custom');
    setCustomModalVisible(false);
  };

  const handleCustomCancel = () => {
    setCustomModalVisible(false);
  };

  const periodLabel = useMemo(() => {
    switch (viewMode) {
      case 'week': {
        const weekStart = currentDate.startOf('isoWeek');
        const weekEnd = currentDate.endOf('isoWeek');
        if (weekStart.isSame(weekEnd, 'month')) {
          return `${weekStart.format('M月D日')} - ${weekEnd.format('D日')}`;
        }
        return `${weekStart.format('M月D日')} - ${weekEnd.format('M月D日')}`;
      }
      case 'month':
        return currentDate.format('YYYY年M月');
      case 'year':
        return currentDate.format('YYYY年');
      case 'custom': {
        if (appliedStartDate && appliedEndDate) {
          const s = dayjs(appliedStartDate);
          const e = dayjs(appliedEndDate);
          if (s.isSame(e, 'month')) {
            return `${s.format('M月D日')} - ${e.format('D日')}`;
          }
          return `${s.format('M月D日')} - ${e.format('M月D日')}`;
        }
        return '自定义';
      }
      default:
        return '';
    }
  }, [viewMode, currentDate, appliedStartDate, appliedEndDate]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = dayjs(t.date);
      switch (viewMode) {
        case 'week':
          return tDate.isSame(currentDate, 'isoWeek') && tDate.isSame(currentDate, 'year');
        case 'month':
          return tDate.isSame(currentDate, 'month') && tDate.isSame(currentDate, 'year');
        case 'year':
          return tDate.isSame(currentDate, 'year');
        case 'custom': {
          if (!appliedStartDate || !appliedEndDate) return false;
          const tDay = tDate.format('YYYY-MM-DD');
          return tDay >= appliedStartDate && tDay <= appliedEndDate;
        }
        default:
          return false;
      }
    });
  }, [transactions, currentDate, viewMode, appliedStartDate, appliedEndDate]);

  const personalFilteredTx = useMemo(
    () => filteredTransactions.filter(t => !t.userId || t.userId === currentUserId),
    [filteredTransactions, currentUserId]
  );

  const familyFilteredTx = useMemo(
    () => filteredTransactions.filter(t => !!t.familyId),
    [filteredTransactions]
  );

  const getScopedTx = useCallback((scope: StatsScope) => {
    return scope === 'family' && inFamily ? familyFilteredTx : personalFilteredTx;
  }, [personalFilteredTx, familyFilteredTx, inFamily]);

  const personalIncome = useMemo(
    () => personalFilteredTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    [personalFilteredTx]
  );
  const personalExpense = useMemo(
    () => personalFilteredTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    [personalFilteredTx]
  );
  const personalBalance = personalIncome - personalExpense;

  const familyIncome = useMemo(
    () => familyFilteredTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    [familyFilteredTx]
  );
  const familyExpense = useMemo(
    () => familyFilteredTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    [familyFilteredTx]
  );
  const familyBalance = familyIncome - familyExpense;

  const pieData = useMemo(() => {
    const scopedTx = getScopedTx(pieScope);
    const expenseTransactions = scopedTx.filter(t => t.type === 'expense');
    if (expenseTransactions.length === 0) return [];

    const categoryMap = new Map<string, number>();
    expenseTransactions.forEach(t => {
      categoryMap.set(t.categoryId, (categoryMap.get(t.categoryId) || 0) + t.amount);
    });

    const result: { name: string; amount: number; color: string; legendFontColor: string; legendFontSize: number }[] = [];
    categoryMap.forEach((amount, categoryId) => {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        result.push({
          name: category.name,
          amount,
          color: category.color,
          legendFontColor: colors.text,
          legendFontSize: 12,
        });
      }
    });

    result.sort((a, b) => b.amount - a.amount);
    return result;
  }, [pieScope, getScopedTx, categories, colors.text]);

  const pieTotalExpense = useMemo(() => {
    const scopedTx = getScopedTx(pieScope);
    return scopedTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }, [pieScope, getScopedTx]);

  const piePercentages = useMemo(() => {
    if (pieTotalExpense === 0) return new Map<string, string>();
    const map = new Map<string, string>();
    pieData.forEach(item => {
      map.set(item.name, ((item.amount / pieTotalExpense) * 100).toFixed(1) + '%');
    });
    return map;
  }, [pieData, pieTotalExpense]);

  const fundAccountStats = useMemo(() => {
    if (fundAccounts.length === 0) return [];

    const map = new Map<string, { name: string; icon: string; color: string; income: number; expense: number }>();
    fundAccounts.forEach(acc => {
      map.set(acc.id, { name: acc.name, icon: acc.icon, color: acc.color, income: 0, expense: 0 });
    });

    personalFilteredTx.forEach(t => {
      const accId = t.fundAccountId;
      const entry = accId ? map.get(accId) : undefined;
      if (entry) {
        if (t.type === 'income') {
          entry.income += t.amount;
        } else {
          entry.expense += t.amount;
        }
      }
    });

    return [...map.values()]
      .map(v => ({ ...v, total: v.income + v.expense }))
      .sort((a, b) => b.total - a.total);
  }, [personalFilteredTx, fundAccounts]);

  const maxFundFlow = useMemo(() => {
    if (fundAccountStats.length === 0) return 1;
    return Math.max(...fundAccountStats.map(s => s.total), 1);
  }, [fundAccountStats]);

  const trendData = useMemo(() => {
    const labels: string[] = [];
    const incomeData: number[] = [];
    const expenseData: number[] = [];

    if (viewMode === 'week') {
      for (let i = 6; i >= 0; i--) {
        const day = currentDate.subtract(i, 'day');
        labels.push(day.format('ddd'));

        const scopedTx = trendScope === 'family' && inFamily ? familyFilteredTx : personalFilteredTx;
        const dayTransactions = scopedTx.filter(t => {
          const tDate = dayjs(t.date);
          return tDate.isSame(day, 'day');
        });

        incomeData.push(dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0));
        expenseData.push(dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));
      }
    } else if (viewMode === 'custom' && appliedStartDate && appliedEndDate) {
      const start = dayjs(appliedStartDate);
      const end = dayjs(appliedEndDate);
      const diffDays = end.diff(start, 'day');

      if (diffDays <= 14) {
        for (let i = 0; i <= diffDays; i++) {
          const day = start.add(i, 'day');
          labels.push(day.format('D日'));

          const scopedTx = trendScope === 'family' && inFamily ? familyFilteredTx : personalFilteredTx;
          const dayTransactions = scopedTx.filter(t => dayjs(t.date).isSame(day, 'day'));

          incomeData.push(dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0));
          expenseData.push(dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));
        }
      } else if (diffDays <= 90) {
        let cur = start.startOf('week');
        if (cur.isBefore(start)) cur = start;
        while (cur.isBefore(end) || cur.isSame(end, 'day')) {
          const weekEnd = cur.add(6, 'day').isAfter(end) ? end : cur.add(6, 'day');
          labels.push(`${cur.format('M/D')}`);

          const scopedTx = trendScope === 'family' && inFamily ? familyFilteredTx : personalFilteredTx;
          const weekTransactions = scopedTx.filter(t => {
            const tDate = dayjs(t.date);
            const tDay = tDate.format('YYYY-MM-DD');
            return tDay >= cur.format('YYYY-MM-DD') && tDay <= weekEnd.format('YYYY-MM-DD');
          });

          incomeData.push(weekTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0));
          expenseData.push(weekTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));

          cur = weekEnd.add(1, 'day');
        }
      } else {
        let cur = start.startOf('month');
        if (cur.isBefore(start)) cur = start;
        while (cur.isBefore(end) || cur.isSame(end, 'month')) {
          labels.push(cur.format('M月'));

          const monthEnd = cur.endOf('month').isAfter(end) ? end : cur.endOf('month');
          const scopedTx = trendScope === 'family' && inFamily ? familyFilteredTx : personalFilteredTx;
          const monthTransactions = scopedTx.filter(t => {
            const tDate = dayjs(t.date);
            const tDay = tDate.format('YYYY-MM-DD');
            return tDay >= cur.format('YYYY-MM-DD') && tDay <= monthEnd.format('YYYY-MM-DD');
          });

          incomeData.push(monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0));
          expenseData.push(monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));

          cur = cur.add(1, 'month');
        }
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const month = dayjs().subtract(i, 'month');
        labels.push(month.format('M月'));

        const scopedTx = trendScope === 'family' && inFamily ? familyFilteredTx : personalFilteredTx;
        const monthTransactions = scopedTx.filter(t => {
          const tDate = dayjs(t.date);
          return tDate.isSame(month, 'month') && tDate.isSame(month, 'year');
        });

        incomeData.push(monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0));
        expenseData.push(monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));
      }
    }

    return { labels, incomeData, expenseData };
  }, [trendScope, inFamily, personalFilteredTx, familyFilteredTx, viewMode, currentDate, appliedStartDate, appliedEndDate]);

  const hasData = filteredTransactions.length > 0;
  const hasExpenseData = pieData.length > 0;

  const viewModeButtons: { key: ViewMode; label: string }[] = [
    { key: 'week', label: '周' },
    { key: 'month', label: '月' },
    { key: 'year', label: '年' },
    { key: 'custom', label: '自定' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.periodRow}>
          {viewMode !== 'custom' ? (
            <>
              <TouchableOpacity onPress={goToPrev} style={styles.arrowButton}>
                <Text style={[styles.arrowText, { color: colors.primary }]}>{'‹'}</Text>
              </TouchableOpacity>
              <Text style={[styles.periodLabel, { color: colors.text }]}>{periodLabel}</Text>
              <TouchableOpacity onPress={goToNext} style={styles.arrowButton}>
                <Text style={[styles.arrowText, { color: colors.primary }]}>{'›'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.customPeriodBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => {
                setCustomStartDate(appliedStartDate || dayjs().startOf('month').format('YYYY-MM-DD'));
                setCustomEndDate(appliedEndDate || dayjs().format('YYYY-MM-DD'));
                setCustomModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodLabel, { color: colors.text }]}>{periodLabel}</Text>
              <Text style={[styles.customEditHint, { color: colors.primary }]}>修改</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.toggleRow, { backgroundColor: colors.surface }]}>
          {viewModeButtons.map(btn => (
            <TouchableOpacity
              key={btn.key}
              style={[
                styles.toggleButton,
                viewMode === btn.key && { backgroundColor: colors.primary },
              ]}
              onPress={() => handleViewModeChange(btn.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: viewMode === btn.key ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.overviewCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <View style={styles.overviewSection}>
          <View style={styles.overviewTagRow}>
            <View style={[styles.scopeTag, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.scopeTagText, { color: '#4CAF50' }]}>个人</Text>
            </View>
          </View>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>收入</Text>
              <Text style={[styles.overviewAmount, { color: colors.success }]}>
                {currencySymbol}{personalIncome.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>支出</Text>
              <Text style={[styles.overviewAmount, { color: colors.error }]}>
                {currencySymbol}{personalExpense.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>结余</Text>
              <Text style={[styles.overviewAmount, { color: personalBalance >= 0 ? colors.success : colors.error }]}>
                {currencySymbol}{Math.abs(personalBalance).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
        {inFamily && (
          <>
            <View style={[styles.overviewSeparator, { backgroundColor: colors.border }]} />
            <View style={styles.overviewSection}>
              <View style={styles.overviewTagRow}>
                <View style={[styles.scopeTag, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={[styles.scopeTagText, { color: '#1890FF' }]}>家庭</Text>
                </View>
              </View>
              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>收入</Text>
                  <Text style={[styles.overviewAmount, { color: colors.success }]}>
                    {currencySymbol}{familyIncome.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>支出</Text>
                  <Text style={[styles.overviewAmount, { color: colors.error }]}>
                    {currencySymbol}{familyExpense.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>结余</Text>
                  <Text style={[styles.overviewAmount, { color: familyBalance >= 0 ? colors.success : colors.error }]}>
                    {currencySymbol}{Math.abs(familyBalance).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>支出分类占比</Text>
          {inFamily && (
            <View style={[styles.scopeToggle, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.scopeToggleBtn, pieScope === 'personal' && { backgroundColor: '#4CAF50' }]}
                onPress={() => setPieScope('personal')}
              >
                <Text style={[styles.scopeToggleText, { color: pieScope === 'personal' ? '#FFF' : colors.textSecondary }]}>个人</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scopeToggleBtn, pieScope === 'family' && { backgroundColor: '#1890FF' }]}
                onPress={() => setPieScope('family')}
              >
                <Text style={[styles.scopeToggleText, { color: pieScope === 'family' ? '#FFF' : colors.textSecondary }]}>家庭</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {hasExpenseData ? (
          <>
            <SimplePieChart
              data={pieData}
              width={screenWidth - 48}
              height={220}
            />
            <View style={styles.legendContainer}>
              {pieData.map(item => (
                <View key={item.name} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.legendAmount, { color: colors.textSecondary }]}>
                    {currencySymbol}{item.amount.toFixed(2)}
                  </Text>
                  <Text style={[styles.legendPercent, { color: colors.primary }]}>
                    {piePercentages.get(item.name)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              暂无支出数据
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>资金账户收支</Text>
        </View>
        {fundAccountStats.length > 0 ? (
          <View style={styles.fundAccountList}>
            {fundAccountStats.map(stat => {
              const barWidth = Math.max((stat.total / maxFundFlow) * 100, 2);
              return (
                <View key={stat.name} style={styles.fundAccountRow}>
                  <Text style={styles.fundAccountIcon}>{stat.icon}</Text>
                  <View style={styles.fundAccountInfo}>
                    <View style={styles.fundAccountNameRow}>
                      <Text style={[styles.fundAccountName, { color: colors.text }]}>{stat.name}</Text>
                      <Text style={[styles.fundAccountTotal, { color: colors.textSecondary }]}>
                        {currencySymbol}{stat.total.toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.fundBarBg, { backgroundColor: colors.inputBackground }]}>
                      <View style={[styles.fundBarFill, { width: `${barWidth}%`, backgroundColor: stat.color }]} />
                    </View>
                    <View style={styles.fundAccountSubRow}>
                      {stat.income > 0 && (
                        <Text style={[styles.fundAccountSub, { color: colors.success }]}>
                          收 {currencySymbol}{stat.income.toFixed(2)}
                        </Text>
                      )}
                      {stat.expense > 0 && (
                        <Text style={[styles.fundAccountSub, { color: stat.income > 0 ? colors.error : colors.success }]}>
                          {stat.income > 0 ? ' · ' : ''}支 {currencySymbol}{stat.expense.toFixed(2)}
                        </Text>
                      )}
                      {stat.income === 0 && stat.expense === 0 && (
                        <Text style={[styles.fundAccountSub, { color: colors.textSecondary }]}>
                          本期无交易
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              暂无资金账户数据，请先在设置中添加资金账户
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>收支趋势</Text>
          {inFamily && (
            <View style={[styles.scopeToggle, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.scopeToggleBtn, trendScope === 'personal' && { backgroundColor: '#4CAF50' }]}
                onPress={() => setTrendScope('personal')}
              >
                <Text style={[styles.scopeToggleText, { color: trendScope === 'personal' ? '#FFF' : colors.textSecondary }]}>个人</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scopeToggleBtn, trendScope === 'family' && { backgroundColor: '#1890FF' }]}
                onPress={() => setTrendScope('family')}
              >
                <Text style={[styles.scopeToggleText, { color: trendScope === 'family' ? '#FFF' : colors.textSecondary }]}>家庭</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {hasData || trendData.incomeData.some(v => v > 0) || trendData.expenseData.some(v => v > 0) ? (
          <>
            <SimpleLineChart
              data={{
                labels: trendData.labels,
                datasets: [
                  { data: trendData.incomeData, color: colors.success, strokeWidth: 2 },
                  { data: trendData.expenseData, color: colors.error, strokeWidth: 2 },
                ],
              }}
              width={screenWidth - 48}
              height={220}
              color={colors.text}
              labelColor={colors.textSecondary}
              backgroundColor="transparent"
            />
            <View style={styles.legendRow}>
              <View style={styles.legendRowItem}>
                <View style={[styles.legendRowDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.legendRowText, { color: colors.textSecondary }]}>收入</Text>
              </View>
              <View style={styles.legendRowItem}>
                <View style={[styles.legendRowDot, { backgroundColor: colors.error }]} />
                <Text style={[styles.legendRowText, { color: colors.textSecondary }]}>支出</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              暂无趋势数据
            </Text>
          </View>
        )}
      </View>

      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCustomCancel}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCustomCancel}
        >
          <View style={[styles.modalPanel, { backgroundColor: colors.card, shadowColor: colors.shadow }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>自定义日期段</Text>

            <CalendarPicker
              startDate={customStartDate}
              endDate={customEndDate}
              onStartDateChange={setCustomStartDate}
              onEndDateChange={setCustomEndDate}
              transactions={personalFilteredTx.map(t => ({ date: t.date, type: t.type, amount: t.amount }))}
              currencySymbol={currencySymbol}
            />

            <View style={styles.quickDateRow}>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  setCustomStartDate(dayjs().startOf('week').format('YYYY-MM-DD'));
                  setCustomEndDate(dayjs().endOf('week').format('YYYY-MM-DD'));
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnText, { color: colors.text }]}>本周</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  setCustomStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
                  setCustomEndDate(dayjs().format('YYYY-MM-DD'));
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnText, { color: colors.text }]}>本月</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  setCustomStartDate(dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'));
                  setCustomEndDate(dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'));
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnText, { color: colors.text }]}>上月</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  setCustomStartDate(dayjs().startOf('year').format('YYYY-MM-DD'));
                  setCustomEndDate(dayjs().format('YYYY-MM-DD'));
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnText, { color: colors.text }]}>今年</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  setCustomStartDate(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
                  setCustomEndDate(dayjs().format('YYYY-MM-DD'));
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnText, { color: colors.text }]}>近30天</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  setCustomStartDate(dayjs().subtract(90, 'day').format('YYYY-MM-DD'));
                  setCustomEndDate(dayjs().format('YYYY-MM-DD'));
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnText, { color: colors.text }]}>近90天</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: colors.inputBackground }]}
                onPress={handleCustomCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalActionText, { color: colors.text }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: customStartDate && customEndDate ? colors.primary : colors.textTertiary }]}
                onPress={handleCustomApply}
                activeOpacity={0.7}
                disabled={!customStartDate || !customEndDate}
              >
                <Text style={[styles.modalActionText, { color: '#FFFFFF' }]}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  arrowButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  arrowText: {
    fontSize: 28,
    fontWeight: '600',
  },
  periodLabel: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    minWidth: 120,
  },
  customPeriodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  customEditHint: {
    fontSize: 13,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  toggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overviewCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewDivider: {
    width: 1,
    height: 36,
  },
  overviewLabel: {
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  overviewAmount: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scopeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    gap: 4,
  },
  scopeToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scopeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scopeTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scopeTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  overviewSection: {
    marginBottom: 4,
  },
  overviewTagRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  overviewSeparator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  legendContainer: {
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendName: {
    fontSize: 13,
    flex: 1,
  },
  legendAmount: {
    fontSize: 13,
    marginRight: 10,
  },
  legendPercent: {
    fontSize: 13,
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 24,
  },
  legendRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendRowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendRowText: {
    fontSize: 12,
  },
  emptyState: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  fundAccountList: {
    marginTop: 4,
  },
  fundAccountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  fundAccountIcon: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  fundAccountInfo: {
    flex: 1,
  },
  fundAccountNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fundAccountName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fundAccountTotal: {
    fontSize: 13,
    fontWeight: '600',
  },
  fundBarBg: {
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  fundBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  fundAccountSubRow: {
    flexDirection: 'row',
  },
  fundAccountSub: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPanel: {
    width: '92%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    elevation: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 20,
    justifyContent: 'center',
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
