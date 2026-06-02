import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { Transaction, Category, FundAccount } from '../types';
import { useTheme } from '../store/ThemeContext';
import { FamilyMember } from '../services/familyService';
import BillItem from './BillItem';

interface BillGroupProps {
  date: string;
  transactions: Transaction[];
  categories: Category[];
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  familyMembers?: FamilyMember[];
  currentUserId?: string;
  showMember?: boolean;
  fundAccounts?: FundAccount[];
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function BillGroup({ date, transactions, categories, currencySymbol, onDelete, onEdit, familyMembers, currentUserId, showMember, fundAccounts }: BillGroupProps) {
  const { colors } = useTheme();

  const d = dayjs(date);
  const dateLabel = `${d.format('MM月DD日')} 星期${WEEKDAYS[d.day()]}`;

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const getCategory = (categoryId: string) => categories.find((c) => c.id === categoryId);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.dateText, { color: colors.text }]}>{dateLabel}</Text>
        <View style={styles.summary}>
          {totalExpense > 0 && (
            <Text style={[styles.summaryText, { color: colors.error }]}>
              支出 {currencySymbol}{totalExpense.toFixed(2)}
            </Text>
          )}
          {totalIncome > 0 && (
            <Text style={[styles.summaryText, { color: colors.success }]}>
              收入 {currencySymbol}{totalIncome.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
      {transactions.map((transaction) => (
        <BillItem
          key={transaction.id}
          transaction={transaction}
          category={getCategory(transaction.categoryId)}
          currencySymbol={currencySymbol}
          onDelete={onDelete}
          onPress={onEdit}
          member={familyMembers?.find(m => m.userId === transaction.userId)}
          currentUserId={currentUserId}
          showMember={showMember}
          fundAccount={fundAccounts?.find(a => a.id === transaction.fundAccountId)}
          toFundAccount={transaction.toFundAccountId ? fundAccounts?.find(a => a.id === transaction.toFundAccountId) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  summary: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
