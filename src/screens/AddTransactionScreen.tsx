import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Keyboard,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/TabNavigator';
import dayjs from 'dayjs';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { TransactionType, Transaction } from '../types';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants/categories';
import { CURRENCY_SYMBOLS } from '../constants/currency';
import CategoryGrid from '../components/CategoryGrid';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransaction'>;

export default function AddTransactionScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { state, addTransaction, updateTransaction } = useApp();
  const [saving, setSaving] = useState(false);

  const transactionId = route.params?.transactionId;
  const prefilled = route.params?.prefilled;
  const isEdit = !!transactionId;

  const [type, setType] = useState<TransactionType>(prefilled?.type || 'expense');
  const [amount, setAmount] = useState(prefilled?.amount ? String(prefilled.amount) : '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(prefilled?.categoryId || null);
  const [selectedFundAccountId, setSelectedFundAccountId] = useState<string | null>(prefilled?.fundAccountId || null);
  const [date, setDate] = useState(() => {
    if (prefilled?.date) {
      const d = dayjs(prefilled.date, ['YYYY-MM-DD', 'YYYY/MM/DD', 'MM-DD', 'M/D']);
      if (d.isValid()) return d.format('YYYY-MM-DD');
    }
    return dayjs().format('YYYY-MM-DD');
  });
  const [time, setTime] = useState(() => {
    if (prefilled?.time && prefilled.time.trim() !== '') {
      const t = dayjs(prefilled.time, ['HH:mm', 'H:mm', 'HH:mm:ss']);
      if (t.isValid()) return t.format('HH:mm');
    }
    return dayjs().format('HH:mm');
  });
  const [note, setNote] = useState(prefilled?.note || '');

  useEffect(() => {
    if (transactionId) {
      const existing = state.transactions.find((t) => t.id === transactionId);
      if (existing) {
        setType(existing.type);
        setAmount(existing.amount.toString());
        setSelectedCategoryId(existing.categoryId);
        setSelectedFundAccountId(existing.fundAccountId || null);
        const dt = dayjs(existing.date);
        setDate(dt.format('YYYY-MM-DD'));
        setTime(existing.date.length > 10 ? dt.format('HH:mm') : dayjs().format('HH:mm'));
        setNote(existing.note);
      }
    }
  }, [transactionId, state.transactions]);

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? '编辑' : '记一笔',
    });
  }, [isEdit, navigation]);

  const categories = state.categories.length > 0
    ? state.categories.filter(c => c.type === type)
    : (type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES);

  const handleTypeChange = useCallback(
    (newType: TransactionType) => {
      if (newType !== type) {
        setType(newType);
        setSelectedCategoryId(null);
      }
    },
    [type]
  );

  const handleAmountChange = (text: string) => {
    if (text === '') {
      setAmount('');
      return;
    }
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(text)) {
      setAmount(text);
    }
  };

  const handleConfirm = useCallback(() => {
    if (saving) return;
    Keyboard.dismiss();

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount === 0) {
      Alert.alert('提示', '请输入有效的金额');
      return;
    }
    if (numAmount < 0) {
      Alert.alert('提示', '金额不能为负数');
      return;
    }
    if (numAmount > 99999999) {
      Alert.alert('提示', '金额过大，请检查输入');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('提示', '请选择分类');
      return;
    }

    if (!selectedFundAccountId) {
      Alert.alert('提示', '请选择资金账户');
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const fullDate = `${date} ${time}`;

    if (isEdit && transactionId) {
      const existing = state.transactions.find((t) => t.id === transactionId);
      const transaction: Transaction = {
        id: transactionId,
        type,
        amount: numAmount,
        categoryId: selectedCategoryId,
        date: fullDate,
        note,
        accountType: state.activeFamilyId ? 'family' : 'personal',
        fundAccountId: selectedFundAccountId || undefined,
        familyId: state.activeFamilyId || undefined,
        userId: existing?.userId || state.currentUser?.id,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      updateTransaction(transaction).then(() => {
        Alert.alert('提示', '修改成功', [{ text: '确定', onPress: () => navigation.goBack() }]);
      }).catch((err) => {
        Alert.alert('修改失败', err.message || '请检查网络连接后重试');
        setSaving(false);
      });
    } else {
      const transaction: Transaction = {
        id: Date.now().toString(),
        type,
        amount: numAmount,
        categoryId: selectedCategoryId,
        date: fullDate,
        note,
        accountType: state.activeFamilyId ? 'family' : 'personal',
        fundAccountId: selectedFundAccountId || undefined,
        familyId: state.activeFamilyId || undefined,
        userId: state.currentUser?.id,
        createdAt: now,
        updatedAt: now,
      };
      addTransaction(transaction).then(() => {
        Alert.alert('提示', '保存成功', [{ text: '确定', onPress: () => navigation.goBack() }]);
      }).catch((err) => {
        Alert.alert('保存失败', err.message || '请检查网络连接后重试');
        setSaving(false);
      });
    }
  }, [saving, amount, selectedCategoryId, selectedFundAccountId, type, date, time, note, isEdit, transactionId, state.transactions, addTransaction, updateTransaction, navigation]);

  const currencySymbol = CURRENCY_SYMBOLS[state.settings.currency] || '¥';

  const handleDateChange = (delta: number) => {
    setDate(dayjs(date).add(delta, 'day').format('YYYY-MM-DD'));
  };

  const handleTimeChange = (delta: number) => {
    const [h, m] = time.split(':').map(Number);
    let totalMin = h * 60 + m + delta;
    if (totalMin < 0) totalMin = 0;
    if (totalMin >= 1440) totalMin = 1430;
    const newH = Math.floor(totalMin / 60) % 24;
    const newM = totalMin % 60;
    setTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.typeSwitchContainer}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'expense' && { backgroundColor: colors.error },
              type !== 'expense' && { backgroundColor: colors.inputBackground },
            ]}
            onPress={() => handleTypeChange('expense')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeButtonText, { color: type === 'expense' ? '#FFFFFF' : colors.textSecondary }]}>
              支出
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'income' && { backgroundColor: colors.success },
              type !== 'income' && { backgroundColor: colors.inputBackground },
            ]}
            onPress={() => handleTypeChange('income')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeButtonText, { color: type === 'income' ? '#FFFFFF' : colors.textSecondary }]}>
              收入
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.amountContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Text style={[styles.currencySymbol, { color: colors.text }]}>{currencySymbol}</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.text }]}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            maxLength={12}
            selectTextOnFocus
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>分类</Text>
          <CategoryGrid
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            资金账户（{type === 'expense' ? '从' : '到'}）*
          </Text>
          <View style={styles.fundAccountRow}>
            {state.fundAccounts.map(account => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.fundAccountChip,
                  {
                    backgroundColor: selectedFundAccountId === account.id ? account.color + '18' : colors.inputBackground,
                    borderColor: selectedFundAccountId === account.id ? account.color : 'transparent',
                  },
                ]}
                onPress={() => setSelectedFundAccountId(
                  selectedFundAccountId === account.id ? null : account.id
                )}
                activeOpacity={0.6}
              >
                <Text style={styles.fundAccountIcon}>{account.icon}</Text>
                <Text style={[
                  styles.fundAccountName,
                  { color: selectedFundAccountId === account.id ? account.color : colors.text },
                ]}>
                  {account.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.dateRow, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <TouchableOpacity onPress={() => handleDateChange(-1)} style={styles.dateArrow}>
            <Text style={[styles.dateArrowText, { color: colors.primary }]}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={[styles.dateText, { color: colors.text }]}>{date}</Text>
          <TouchableOpacity onPress={() => handleDateChange(1)} style={styles.dateArrow}>
            <Text style={[styles.dateArrowText, { color: colors.primary }]}>{'›'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.dateRow, { backgroundColor: colors.card, marginTop: 8, shadowColor: colors.shadow }]}>
          <TouchableOpacity onPress={() => handleTimeChange(-30)} style={styles.dateArrow}>
            <Text style={[styles.dateArrowText, { color: colors.primary }]}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={[styles.dateText, { color: colors.text }]}>{time}</Text>
          <TouchableOpacity onPress={() => handleTimeChange(30)} style={styles.dateArrow}>
            <Text style={[styles.dateArrowText, { color: colors.primary }]}>{'›'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.noteContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <TextInput
            style={[styles.noteInput, { color: colors.text }]}
            placeholder="添加备注..."
            placeholderTextColor={colors.textTertiary}
            value={note}
            onChangeText={setNote}
            maxLength={100}
          />
        </View>
      </ScrollView>

      <View style={[styles.confirmContainer, { backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: saving ? colors.border : colors.primary, shadowColor: colors.shadow }]}
          onPress={handleConfirm}
          activeOpacity={0.7}
          disabled={saving}
        >
          <Text style={[styles.confirmText, saving && { opacity: 0.5 }]}>
            {saving ? '保存中...' : '确认'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  typeSwitchContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    paddingVertical: 4,
    letterSpacing: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  dateArrow: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  dateArrowText: {
    fontSize: 22,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },
  noteContainer: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  noteInput: {
    fontSize: 15,
    minHeight: 40,
  },
  fundAccountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fundAccountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  fundAccountIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  fundAccountName: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
