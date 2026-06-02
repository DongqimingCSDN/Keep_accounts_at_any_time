import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import dayjs from 'dayjs';
import { useApp } from '../store/AppContext';
import { useTheme } from '../store/ThemeContext';
import { CURRENCY_SYMBOLS } from '../constants/currency';
import { Budget, Category, BudgetScope } from '../types';

export default function BudgetScreen() {
  const { state, setBudget, deleteBudget } = useApp();
  const { colors } = useTheme();
  const currentMonth = dayjs().format('YYYY-MM');
  const currentMonthDisplay = dayjs().format('YYYY年MM月');
  const currencySymbol = CURRENCY_SYMBOLS[state.settings.currency] || '¥';

  // 预算作用域：personal 或 family
  const [budgetScope, setBudgetScope] = useState<BudgetScope>(
    state.activeFamilyId ? 'family' : 'personal'
  );

  // 预算输入弹窗
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const budgetInputRef = useRef<TextInput>(null);

  // 当月预算列表（按 scope 过滤）
  const monthBudgets = useMemo(
    () => state.budgets.filter(
      (b) => b.month === currentMonth && (b.scope || 'personal') === budgetScope
    ),
    [state.budgets, currentMonth, budgetScope]
  );

  // 总预算（无 categoryId 的预算）
  const totalBudget = useMemo(
    () => monthBudgets.find((b) => !b.categoryId),
    [monthBudgets]
  );

  // 分类预算
  const categoryBudgets = useMemo(
    () => monthBudgets.filter((b) => b.categoryId),
    [monthBudgets]
  );

  // 当月支出交易（个人预算只算自己的，家庭预算算所有家庭成员的）
  const monthExpenses = useMemo(() => {
    const currentUserId = state.currentUser?.id;
    return state.transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      if (!t.date.startsWith(currentMonth)) return false;
      if (budgetScope === 'personal') {
        // 个人预算：仅自己的支出（无论是否在家庭中）
        return !t.userId || t.userId === currentUserId;
      }
      // 家庭预算：有 familyId 的支出（所有家庭成员）
      return !!t.familyId;
    });
  }, [state.transactions, currentMonth, budgetScope, state.currentUser?.id]);

  // 当月总支出
  const totalSpent = useMemo(
    () => monthExpenses.reduce((sum, t) => sum + t.amount, 0),
    [monthExpenses]
  );

  // 按分类汇总支出
  const categoryExpenses = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });
    return map;
  }, [monthExpenses]);

  // 支出分类列表
  const expenseCategories = useMemo(
    () => state.categories.filter((c) => c.type === 'expense'),
    [state.categories]
  );

  // 分类预算详情
  const categoryBudgetDetails = useMemo(() => {
    return expenseCategories.map((cat) => {
      const budget = categoryBudgets.find((b) => b.categoryId === cat.id);
      const spent = categoryExpenses[cat.id] || 0;
      const budgetAmount = budget?.amount || 0;
      const spentPercentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

      return {
        category: cat,
        budget,
        budgetAmount,
        spent,
        spentPercentage: Math.min(spentPercentage, 100),
        hasBudget: !!budget,
      };
    }).filter((item) => item.hasBudget || item.spent > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [expenseCategories, categoryBudgets, categoryExpenses]);

  // 分类预算总额
  const categoryBudgetTotal = useMemo(
    () => categoryBudgetDetails.reduce((sum, item) => sum + item.budgetAmount, 0),
    [categoryBudgetDetails]
  );

  // 有效总预算
  const effectiveTotalBudget = totalBudget?.amount || categoryBudgetTotal;

  // 总预算进度
  const totalSpentPercentage = effectiveTotalBudget > 0 ? (totalSpent / effectiveTotalBudget) * 100 : 0;
  const totalDisplayPercentage = Math.min(totalSpentPercentage, 100);
  const totalRemaining = effectiveTotalBudget - totalSpent;

  // 进度条动画
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: totalDisplayPercentage,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [totalDisplayPercentage]);

  // 进度条颜色
  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return colors.error;
    if (percentage >= 80) return '#FA8C16';
    return colors.success;
  };

  const progressColor = getProgressColor(totalSpentPercentage);

  // 预算状态文字
  const budgetStatus = useMemo(() => {
    if (effectiveTotalBudget <= 0) {
      return { text: '未设置预算', color: colors.textSecondary };
    }
    if (totalSpentPercentage > 100) {
      return { text: `已超支！超出 ${currencySymbol}${(totalSpent - effectiveTotalBudget).toFixed(2)}`, color: colors.error };
    }
    if (totalSpentPercentage >= 80) {
      return { text: '预算紧张', color: '#FA8C16' };
    }
    return { text: '预算充裕', color: colors.success };
  }, [totalSpentPercentage, totalSpent, effectiveTotalBudget, currencySymbol, colors]);

  // 打开设置预算弹窗
  const handleOpenBudgetModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      const existing = categoryBudgets.find((b) => b.categoryId === category.id);
      setBudgetInput(existing ? String(existing.amount) : '');
    } else {
      setEditingCategory(null);
      setBudgetInput(totalBudget ? String(totalBudget.amount) : '');
    }
    setBudgetModalVisible(true);
  };

  // 确认设置预算
  const handleBudgetConfirm = () => {
    const amount = parseFloat(budgetInput || '0');
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('提示', '请输入有效的预算金额');
      return;
    }

    if (editingCategory) {
      const otherCategoryTotal = categoryBudgets
        .filter((b) => b.categoryId !== editingCategory.id)
        .reduce((sum, b) => sum + b.amount, 0);
      const newCategoryTotal = otherCategoryTotal + amount;
      if (totalBudget && newCategoryTotal > totalBudget.amount) {
        Alert.alert(
          '超出总预算',
          `分类预算合计 ${currencySymbol}${newCategoryTotal.toFixed(2)} 将超过总预算 ${currencySymbol}${totalBudget.amount.toFixed(2)}，请调整金额`,
        );
        return;
      }
    } else {
      if (categoryBudgetTotal > amount) {
        Alert.alert(
          '低于分类预算',
          `当前分类预算合计 ${currencySymbol}${categoryBudgetTotal.toFixed(2)} 已超过新设总预算 ${currencySymbol}${amount.toFixed(2)}，请先减少分类预算或提高总预算`,
        );
        return;
      }
    }

    const budget: Budget = {
      id: editingCategory
        ? `budget_${budgetScope}_${currentMonth}_${editingCategory.id}`
        : `budget_${budgetScope}_${currentMonth}`,
      month: currentMonth,
      amount,
      categoryId: editingCategory?.id,
      scope: budgetScope,
      familyId: budgetScope === 'family' ? (state.activeFamilyId || undefined) : undefined,
    };
    setBudget(budget);
    setBudgetModalVisible(false);
  };

  // 删除预算
  const handleDeleteBudget = (budget: Budget, categoryName?: string) => {
    Alert.alert(
      '确认删除',
      `确定要删除${categoryName ? `「${categoryName}」的` : '总'}预算吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            deleteBudget(budget.id);
          },
        },
      ]
    );
  };

  // 进度条宽度动画值
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const hasAnyBudget = effectiveTotalBudget > 0;

  // 当前上下文名称
  const currentContextName = budgetScope === 'personal' ? '个人' : (state.currentFamily?.name || '家庭');

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.contentContainer}
      >
        {/* 月份标题 */}
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {currentMonthDisplay}
        </Text>

        {/* 预算作用域选择器：个人/家庭 */}
        <View style={[styles.contextSelector, { backgroundColor: colors.inputBackground }]}>
          <TouchableOpacity
            style={[
              styles.contextTab,
              budgetScope === 'personal' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setBudgetScope('personal')}
          >
            <Text style={[
              styles.contextTabText,
              { color: budgetScope === 'personal' ? '#FFFFFF' : colors.textSecondary },
            ]}>
              个人
            </Text>
          </TouchableOpacity>
          {state.activeFamilyId && (
            <TouchableOpacity
              style={[
                styles.contextTab,
                budgetScope === 'family' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setBudgetScope('family')}
            >
              <Text
                style={[
                  styles.contextTabText,
                  { color: budgetScope === 'family' ? '#FFFFFF' : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {state.currentFamily?.name || '家庭'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!hasAnyBudget ? (
          /* 未设置预算 - 引导设置界面 */
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              还未设置{currentContextName}本月预算
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              可设置总预算，也可为每个分类单独设置预算
            </Text>
            <TouchableOpacity
              style={[styles.setBudgetButton, { backgroundColor: colors.primary }]}
              onPress={() => handleOpenBudgetModal()}
            >
              <Text style={styles.setBudgetButtonText}>设置总预算</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 总预算进度卡片 */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {currentContextName}总预算进度
                </Text>
                <View style={styles.cardHeaderRight}>
                  {!totalBudget && categoryBudgetTotal > 0 && (
                    <Text style={[styles.autoLabel, { color: colors.textSecondary }]}>
                      分类合计
                    </Text>
                  )}
                  <TouchableOpacity onPress={() => handleOpenBudgetModal()}>
                    <Text style={[styles.editButton, { color: colors.primary }]}>
                      {totalBudget ? '编辑' : '设置总预算'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 金额展示 */}
              <View style={styles.amountRow}>
                <View style={styles.amountItem}>
                  <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                    已花费
                  </Text>
                  <Text style={[styles.amountValue, { color: colors.text }]}>
                    {currencySymbol}{totalSpent.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.amountDivider} />
                <View style={styles.amountItem}>
                  <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                    预算
                  </Text>
                  <Text style={[styles.amountValue, { color: colors.text }]}>
                    {currencySymbol}{effectiveTotalBudget.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* 进度条 */}
              <View style={[styles.progressBarBg, { backgroundColor: colors.inputBackground }]}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressWidth,
                      backgroundColor: progressColor,
                    },
                  ]}
                />
              </View>

              {/* 百分比与剩余 */}
              <View style={styles.progressInfo}>
                <Text style={[styles.percentageText, { color: progressColor }]}>
                  {totalSpentPercentage.toFixed(1)}%
                </Text>
                <Text style={[styles.remainingText, { color: colors.textSecondary }]}>
                  {totalRemaining >= 0
                    ? `剩余 ${currencySymbol}${totalRemaining.toFixed(2)}`
                    : `超支 ${currencySymbol}${Math.abs(totalRemaining).toFixed(2)}`}
                </Text>
              </View>

              {/* 状态提示 */}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: budgetStatus.color + '18' },
                ]}
              >
                <Text style={[styles.statusText, { color: budgetStatus.color }]}>
                  {budgetStatus.text}
                </Text>
              </View>
            </View>

            {/* 分类预算卡片 */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  分类预算
                </Text>
                <TouchableOpacity onPress={() => setShowCategoryPicker(true)}>
                  <Text style={[styles.editButton, { color: colors.primary }]}>
                    + 添加
                  </Text>
                </TouchableOpacity>
              </View>

              {categoryBudgetDetails.length > 0 ? (
                categoryBudgetDetails.map((item) => {
                  const catProgressColor = getProgressColor(item.spentPercentage);
                  return (
                    <View key={item.category.id} style={styles.categoryItem}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryIcon}>{item.category.icon}</Text>
                        <Text style={[styles.categoryName, { color: colors.text }]}>
                          {item.category.name}
                        </Text>
                        {item.hasBudget ? (
                          <TouchableOpacity
                            onPress={() => handleOpenBudgetModal(item.category)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={[styles.categoryBudgetAmount, { color: colors.text }]}>
                              {currencySymbol}{item.spent.toFixed(2)} / {currencySymbol}{item.budgetAmount.toFixed(2)}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity onPress={() => handleOpenBudgetModal(item.category)}>
                            <Text style={[styles.setCategoryBudget, { color: colors.primary }]}>
                              设置预算
                            </Text>
                          </TouchableOpacity>
                        )}
                        {item.hasBudget && (
                          <TouchableOpacity
                            onPress={() => handleDeleteBudget(item.budget!, item.category.name)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.categoryDeleteBtn}
                          >
                            <Text style={[styles.categoryDeleteText, { color: colors.textSecondary }]}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {item.hasBudget && (
                        <View style={styles.categoryBarRow}>
                          <View
                            style={[styles.categoryBarBg, { backgroundColor: colors.inputBackground }]}
                          >
                            <View
                              style={[
                                styles.categoryBarFill,
                                {
                                  width: `${item.spentPercentage}%`,
                                  backgroundColor: catProgressColor,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>
                            {item.spentPercentage.toFixed(0)}%
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.noCategoryBudget}>
                  <Text style={[styles.noCategoryBudgetText, { color: colors.textSecondary }]}>
                    暂未设置分类预算，点击右上角添加
                  </Text>
                </View>
              )}
            </View>

          </>
        )}
      </ScrollView>

      {/* 预算输入弹窗 */}
      <Modal
        visible={budgetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingCategory ? `设置「${editingCategory.name}」预算` : '设置总预算'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              请输入{currentMonthDisplay}{editingCategory ? `「${editingCategory.name}」` : ''}的{currentContextName}预算金额
            </Text>
            <TextInput
              ref={budgetInputRef}
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="请输入预算金额"
              placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad"
              value={budgetInput}
              onChangeText={setBudgetInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              {editingCategory && categoryBudgets.some((b) => b.categoryId === editingCategory.id) && (
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.error + '18' }]}
                  onPress={() => {
                    const existing = categoryBudgets.find((b) => b.categoryId === editingCategory.id);
                    if (existing) {
                      deleteBudget(existing.id);
                      setBudgetModalVisible(false);
                    }
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: colors.error }]}>删除</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => setBudgetModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleBudgetConfirm}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 分类选择弹窗 */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '70%' }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>选择分类</Text>
            <ScrollView style={styles.categoryPickerList}>
              {expenseCategories
                .filter((cat) => !categoryBudgets.some((b) => b.categoryId === cat.id))
                .map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryPickerItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setShowCategoryPicker(false);
                      handleOpenBudgetModal(cat);
                    }}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              {expenseCategories.filter((cat) => !categoryBudgets.some((b) => b.categoryId === cat.id)).length === 0 && (
                <Text style={[styles.noCategoryBudgetText, { color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 }]}>
                  所有分类都已设置预算
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.inputBackground, marginTop: 8 }]}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={[styles.modalBtnText, { color: colors.text }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
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
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  contextSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  contextTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  contextTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  setBudgetButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  setBudgetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoLabel: {
    fontSize: 12,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  amountDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 13,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoryItem: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    flex: 1,
  },
  categoryBudgetAmount: {
    fontSize: 13,
  },
  setCategoryBudget: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoryDeleteBtn: {
    marginLeft: 4,
    padding: 4,
  },
  categoryDeleteText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercent: {
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
  noCategoryBudget: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noCategoryBudgetText: {
    fontSize: 14,
  },
  categoryPickerList: {
    maxHeight: 300,
  },
  categoryPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unbudgetedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
