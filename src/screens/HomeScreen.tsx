import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  FlatList,
  LayoutAnimation,
} from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { CURRENCY_SYMBOLS } from '../constants/currency';
import dayjs from 'dayjs';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { state, deleteTransaction } = useApp();
  const currencySymbol = CURRENCY_SYMBOLS[state.settings.currency] || '¥';
  const currentUserId = state.currentUser?.id;
  const inFamily = !!state.activeFamilyId;

  const [txFilter, setTxFilter] = useState<string>('all');

  const personalBudgetAnim = useRef(new Animated.Value(0)).current;
  const familyBudgetAnim = useRef(new Animated.Value(0)).current;

  const currentMonth = dayjs().format('YYYY-MM');
  const today = dayjs().format('YYYY-MM-DD');

  const personalMonthTx = useMemo(
    () =>
      state.transactions.filter(
        (t) => t.date.startsWith(currentMonth) && t.type !== undefined && (!t.userId || t.userId === currentUserId)
      ),
    [state.transactions, currentMonth, currentUserId]
  );

  const personalTodayTx = useMemo(
    () =>
      state.transactions.filter(
        (t) => t.date.startsWith(today) && (!t.userId || t.userId === currentUserId)
      ),
    [state.transactions, today, currentUserId]
  );

  const personalMonthIncome = personalMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const personalMonthExpense = personalMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const personalTodayIncome = personalTodayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const personalTodayExpense = personalTodayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const familyMonthTx = useMemo(
    () =>
      state.transactions.filter(
        (t) => t.date.startsWith(currentMonth) && !!t.familyId
      ),
    [state.transactions, currentMonth]
  );

  const familyTodayTx = useMemo(
    () =>
      state.transactions.filter(
        (t) => t.date.startsWith(today) && !!t.familyId
      ),
    [state.transactions, today]
  );

  const familyMonthIncome = familyMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const familyMonthExpense = familyMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const familyTodayIncome = familyTodayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const familyTodayExpense = familyTodayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const personalBudgets = useMemo(
    () => state.budgets.filter((b) => b.month === currentMonth && (b.scope || 'personal') === 'personal'),
    [state.budgets, currentMonth]
  );
  const familyBudgets = useMemo(
    () => state.budgets.filter((b) => b.month === currentMonth && (b.scope || 'personal') === 'family'),
    [state.budgets, currentMonth]
  );

  const personalTotalBudget = personalBudgets.find((b) => !b.categoryId)?.amount || personalBudgets.filter((b) => b.categoryId).reduce((s, b) => s + b.amount, 0);
  const familyTotalBudget = familyBudgets.find((b) => !b.categoryId)?.amount || familyBudgets.filter((b) => b.categoryId).reduce((s, b) => s + b.amount, 0);

  const personalBudgetPct = personalTotalBudget > 0 ? Math.min((personalMonthExpense / personalTotalBudget) * 100, 100) : 0;
  const familyBudgetPct = familyTotalBudget > 0 ? Math.min((familyMonthExpense / familyTotalBudget) * 100, 100) : 0;

  useEffect(() => {
    Animated.timing(personalBudgetAnim, { toValue: personalBudgetPct, duration: 600, useNativeDriver: false }).start();
  }, [personalBudgetPct]);
  useEffect(() => {
    Animated.timing(familyBudgetAnim, { toValue: familyBudgetPct, duration: 600, useNativeDriver: false }).start();
  }, [familyBudgetPct]);

  const filteredRecentTx = useMemo(() => {
    let txs = state.transactions.filter((t) => {
      const tDate = t.date.length > 10 ? t.date.substring(0, 10) : t.date;
      return tDate === today;
    });
    if (txFilter !== 'all') {
      txs = txs.filter((t) => t.userId === txFilter);
    }
    return txs
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
      .slice(0, 8);
  }, [state.transactions, txFilter, today]);

  const filterOptions = useMemo(() => {
    const opts: { key: string; label: string }[] = [{ key: 'all', label: '全部' }];
    if (inFamily) {
      state.familyMembers.forEach((m) => {
        const isMe = m.userId === currentUserId;
        opts.push({ key: m.userId, label: isMe ? '我' : (m.displayName || '成员') });
      });
    }
    return opts;
  }, [inFamily, state.familyMembers, currentUserId]);

  const getCategoryById = (id: string) => state.categories.find((c) => c.id === id);
  const getFundAccountById = (id?: string) => id ? state.fundAccounts.find((a) => a.id === id) : undefined;
  const formatAmount = (amount: number) => amount.toFixed(2);
  const formatTransactionTime = (dateStr: string) =>
    dateStr.length > 10 ? dayjs(dateStr).format('HH:mm') : '';

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return colors.error;
    if (pct >= 80) return colors.warning;
    return colors.success;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBar}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>我的账本</Text>
          <Text style={[styles.headerDate, { color: colors.textSecondary }]}>{dayjs().format('M月D日 dddd')}</Text>
        </View>

        <View style={[styles.overviewCard, { shadowColor: colors.shadow }]}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.overviewGradient}
          >
            <Text style={styles.overviewLabel}>当月收支概览</Text>

            <View style={styles.overviewSection}>
              <View style={styles.tagPersonal}>
                <Text style={styles.tagText}>个人</Text>
              </View>
              <View style={styles.overviewData}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewSubLabel}>收入</Text>
                  <Text style={styles.overviewAmount} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{formatAmount(personalMonthIncome)}</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewSubLabel}>支出</Text>
                  <Text style={styles.overviewAmount} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{formatAmount(personalMonthExpense)}</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewSubLabel}>结余</Text>
                  <Text style={[styles.overviewAmount, personalMonthIncome - personalMonthExpense < 0 && styles.negativeBalance]} numberOfLines={1} adjustsFontSizeToFit>
                    {currencySymbol}{formatAmount(personalMonthIncome - personalMonthExpense)}
                  </Text>
                </View>
              </View>
            </View>

            {inFamily && (
              <View style={[styles.overviewSection, styles.overviewSectionSecond]}>
                <View style={styles.tagFamily}>
                  <Text style={styles.tagText}>{state.currentFamily?.name || '家庭'}</Text>
                </View>
                <View style={styles.overviewData}>
                  <View style={styles.overviewItem}>
                    <Text style={styles.overviewSubLabel}>收入</Text>
                    <Text style={styles.overviewAmount} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{formatAmount(familyMonthIncome)}</Text>
                  </View>
                  <View style={styles.overviewDivider} />
                  <View style={styles.overviewItem}>
                    <Text style={styles.overviewSubLabel}>支出</Text>
                    <Text style={styles.overviewAmount} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{formatAmount(familyMonthExpense)}</Text>
                  </View>
                  <View style={styles.overviewDivider} />
                  <View style={styles.overviewItem}>
                    <Text style={styles.overviewSubLabel}>结余</Text>
                    <Text style={[styles.overviewAmount, familyMonthIncome - familyMonthExpense < 0 && styles.negativeBalance]} numberOfLines={1} adjustsFontSizeToFit>
                      {currencySymbol}{formatAmount(familyMonthIncome - familyMonthExpense)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </LinearGradient>
        </View>

        <View style={[styles.todayCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>今日收支</Text>
          <View style={styles.todaySection}>
            <View style={styles.todayTagWrap}>
              <View style={[styles.tagSmall, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.tagTextSmall, { color: colors.success }]}>个人</Text>
              </View>
            </View>
            <View style={styles.todayRow}>
              <View style={styles.todayItem}>
                <Text style={[styles.todayLabel, { color: colors.textSecondary }]}>支出</Text>
                <Text style={[styles.todayAmount, { color: colors.error }]}>{currencySymbol}{formatAmount(personalTodayExpense)}</Text>
              </View>
              <View style={styles.todayItem}>
                <Text style={[styles.todayLabel, { color: colors.textSecondary }]}>收入</Text>
                <Text style={[styles.todayAmount, { color: colors.success }]}>{currencySymbol}{formatAmount(personalTodayIncome)}</Text>
              </View>
            </View>
          </View>
          {inFamily && (
            <View style={[styles.todaySection, styles.todaySectionSecond]}>
              <View style={styles.todayTagWrap}>
                <View style={[styles.tagSmall, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.tagTextSmall, { color: colors.primary }]} numberOfLines={1}>{state.currentFamily?.name || '家庭'}</Text>
                </View>
              </View>
              <View style={styles.todayRow}>
                <View style={styles.todayItem}>
                  <Text style={[styles.todayLabel, { color: colors.textSecondary }]}>支出</Text>
                  <Text style={[styles.todayAmount, { color: colors.error }]}>{currencySymbol}{formatAmount(familyTodayExpense)}</Text>
                </View>
                <View style={styles.todayItem}>
                  <Text style={[styles.todayLabel, { color: colors.textSecondary }]}>收入</Text>
                  <Text style={[styles.todayAmount, { color: colors.success }]}>{currencySymbol}{formatAmount(familyTodayIncome)}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>预算使用进度</Text>

          <View style={styles.budgetSection}>
            <View style={styles.budgetRow}>
              <View style={[styles.tagSmall, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.tagTextSmall, { color: colors.success }]}>个人</Text>
              </View>
              {personalTotalBudget > 0 ? (
                <Text style={[styles.budgetPercent, { color: getProgressColor(personalBudgetPct) }]}>
                  {personalBudgetPct.toFixed(0)}%
                </Text>
              ) : (
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
                  <Text style={[styles.budgetSetHint, { color: colors.primary }]}>设置预算 ›</Text>
                </TouchableOpacity>
              )}
            </View>
            {personalTotalBudget > 0 ? (
              <>
                <View style={[styles.progressBarBg, { backgroundColor: colors.inputBackground }]}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      {
                        width: personalBudgetAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                        backgroundColor: getProgressColor(personalBudgetPct),
                      },
                    ]}
                  />
                </View>
                <View style={styles.budgetFooter}>
                  <Text style={[styles.budgetInfo, { color: colors.textSecondary }]}>
                    已支出 {currencySymbol}{formatAmount(personalMonthExpense)} / {currencySymbol}{formatAmount(personalTotalBudget)}
                  </Text>
                  <Text style={[styles.budgetRemaining, { color: personalMonthExpense > personalTotalBudget ? colors.error : colors.success }]}>
                    {personalMonthExpense > personalTotalBudget
                      ? `超支 ${currencySymbol}${formatAmount(personalMonthExpense - personalTotalBudget)}`
                      : `剩余 ${currencySymbol}${formatAmount(personalTotalBudget - personalMonthExpense)}`}
                  </Text>
                </View>
              </>
            ) : (
              <View style={[styles.budgetEmpty, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.budgetEmptyText, { color: colors.textTertiary }]}>暂未设置个人预算</Text>
              </View>
            )}
          </View>

          {inFamily && (
            <View style={[styles.budgetSection, styles.budgetSectionSecond]}>
              <View style={styles.budgetRow}>
                <View style={[styles.tagSmall, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.tagTextSmall, { color: colors.primary }]} numberOfLines={1}>{state.currentFamily?.name || '家庭'}</Text>
                </View>
                {familyTotalBudget > 0 ? (
                  <Text style={[styles.budgetPercent, { color: getProgressColor(familyBudgetPct) }]}>
                    {familyBudgetPct.toFixed(0)}%
                  </Text>
                ) : (
                  <TouchableOpacity onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
                    <Text style={[styles.budgetSetHint, { color: colors.primary }]}>设置预算 ›</Text>
                  </TouchableOpacity>
                )}
              </View>
              {familyTotalBudget > 0 ? (
                <>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.inputBackground }]}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: familyBudgetAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                          backgroundColor: getProgressColor(familyBudgetPct),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.budgetFooter}>
                    <Text style={[styles.budgetInfo, { color: colors.textSecondary }]}>
                      已支出 {currencySymbol}{formatAmount(familyMonthExpense)} / {currencySymbol}{formatAmount(familyTotalBudget)}
                    </Text>
                    <Text style={[styles.budgetRemaining, { color: familyMonthExpense > familyTotalBudget ? colors.error : colors.success }]}>
                      {familyMonthExpense > familyTotalBudget
                        ? `超支 ${currencySymbol}${formatAmount(familyMonthExpense - familyTotalBudget)}`
                        : `剩余 ${currencySymbol}${formatAmount(familyTotalBudget - familyMonthExpense)}`}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={[styles.budgetEmpty, { backgroundColor: colors.inputBackground }]}>
                  <Text style={[styles.budgetEmptyText, { color: colors.textTertiary }]}>暂未设置家庭预算</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <View style={styles.recentHeader}>
            <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>最近交易</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Bills')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>查看全部</Text>
            </TouchableOpacity>
          </View>

          {inFamily && filterOptions.length > 2 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {filterOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.filterChip,
                    { backgroundColor: txFilter === opt.key ? colors.primary : colors.inputBackground },
                  ]}
                  onPress={() => {
                    LayoutAnimation.easeInEaseOut();
                    setTxFilter(opt.key);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: txFilter === opt.key ? '#FFFFFF' : colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {filteredRecentTx.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无交易记录</Text>
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>点击右下角按钮开始记账</Text>
            </View>
          ) : (
            filteredRecentTx.map((transaction) => {
              const category = getCategoryById(transaction.categoryId);
              const fundAccount = getFundAccountById(transaction.fundAccountId);
              const toFundAccount = transaction.toFundAccountId ? getFundAccountById(transaction.toFundAccountId) : null;
              const isTransfer = transaction.type === 'transfer';
              const isExpense = transaction.type === 'expense';
              return (
                <TouchableOpacity
                  key={transaction.id}
                  style={[styles.transactionItem, { borderBottomColor: colors.borderLight }]}
                  activeOpacity={0.7}
                  onLongPress={() => {
                    if (transaction.userId && transaction.userId !== currentUserId) {
                      Alert.alert('提示', '只能编辑或删除自己记录的账单');
                      return;
                    }
                    Alert.alert('操作', '请选择操作', [
                      {
                        text: '编辑',
                        onPress: () => {
                          const parentNav = navigation.getParent();
                          parentNav
                            ? parentNav.navigate('AddTransaction', { transactionId: transaction.id })
                            : navigation.navigate('AddTransaction', { transactionId: transaction.id });
                        },
                      },
                      {
                        text: '删除',
                        style: 'destructive',
                        onPress: () => {
                          Alert.alert('确认删除', '确定要删除这条记录吗？', [
                            { text: '取消', style: 'cancel' },
                            { text: '删除', style: 'destructive', onPress: () => deleteTransaction(transaction.id) },
                          ]);
                        },
                      },
                      { text: '取消', style: 'cancel' },
                    ]);
                  }}
                  onPress={() => {
                    if (transaction.userId && transaction.userId !== currentUserId) {
                      return;
                    }
                    const parentNav = navigation.getParent();
                    parentNav
                      ? parentNav.navigate('AddTransaction', { transactionId: transaction.id })
                      : navigation.navigate('AddTransaction', { transactionId: transaction.id });
                  }}
                >
                  <View style={[styles.transactionIconWrap, { backgroundColor: isTransfer ? (colors.primaryLight || '#E8F0FE') + '18' : (category?.color || colors.primaryLight) + '18' }]}>
                    <Text style={styles.transactionIcon}>{isTransfer ? '🔄' : (category?.icon || '📝')}</Text>
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionName, { color: colors.text }]}>
                      {isTransfer ? (transaction.note || '账户转账') : (transaction.note || category?.name || '未分类')}
                    </Text>
                    <Text style={[styles.transactionSub, { color: colors.textTertiary }]}>
                      {isTransfer
                        ? `${fundAccount?.icon || ''} ${fundAccount?.name || ''} → ${toFundAccount?.icon || ''} ${toFundAccount?.name || ''}`
                        : `${category?.name || '未分类'}${fundAccount ? ` · ${fundAccount.icon} ${fundAccount.name}` : ''}`
                      }
                      {formatTransactionTime(transaction.date) ? ` · ${formatTransactionTime(transaction.date)}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.transactionAmount, { color: isTransfer ? colors.primary : (isExpense ? colors.error : colors.success) }]}>
                    {isTransfer ? '' : (isExpense ? '-' : '+')}{currencySymbol}{formatAmount(transaction.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          const parentNav = navigation.getParent();
          parentNav
            ? parentNav.navigate('AddTransaction', {})
            : navigation.navigate('AddTransaction', {});
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerDate: {
    fontSize: 14,
    fontWeight: '400',
  },
  overviewCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  overviewGradient: {
    padding: 24,
  },
  overviewLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
    letterSpacing: 1,
  },
  overviewSection: {
    marginBottom: 4,
  },
  overviewSectionSecond: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  tagPersonal: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  tagFamily: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  overviewData: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewSubLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginBottom: 4,
  },
  overviewAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  overviewDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  negativeBalance: {
    color: 'rgba(255,200,200,0.9)',
  },
  todayCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  todaySection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todaySectionSecond: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  todayTagWrap: {
    marginRight: 14,
  },
  tagSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagTextSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  todayRow: {
    flex: 1,
    flexDirection: 'row',
  },
  todayItem: {
    flex: 1,
  },
  todayLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  todayAmount: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  budgetSection: {},
  budgetSectionSecond: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetPercent: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  budgetInfo: {
    fontSize: 12,
  },
  budgetRemaining: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetSetHint: {
    fontSize: 13,
    fontWeight: '500',
  },
  budgetEmpty: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  budgetEmptyText: {
    fontSize: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  transactionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIcon: {
    fontSize: 22,
  },
  transactionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
  },
  transactionSub: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: 0.3,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
    marginTop: -2,
  },
});
