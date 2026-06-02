import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import dayjs from 'dayjs';
import { Transaction, Category, FundAccount } from '../types';
import { useTheme } from '../store/ThemeContext';
import { FamilyMember } from '../services/familyService';

interface BillItemProps {
  transaction: Transaction;
  category: Category | undefined;
  currencySymbol: string;
  onDelete: (id: string) => void;
  onPress: (transaction: Transaction) => void;
  member?: FamilyMember;
  currentUserId?: string;
  showMember?: boolean;
  fundAccount?: FundAccount;
  toFundAccount?: FundAccount;
}

export default function BillItem({ transaction, category, currencySymbol, onDelete, onPress, member, currentUserId, showMember, fundAccount, toFundAccount }: BillItemProps) {
  const { colors } = useTheme();
  const isTransfer = transaction.type === 'transfer';
  const isExpense = transaction.type === 'expense';
  const amountPrefix = isTransfer ? '' : (isExpense ? '-' : '+');
  const amountColor = isTransfer ? colors.primary : (isExpense ? colors.error : colors.success);

  const isSelf = !transaction.userId || transaction.userId === currentUserId;
  const canEdit = isSelf;
  const memberName = member
    ? (transaction.userId === currentUserId ? '我' : member.displayName || member.email?.split('@')[0] || '成员')
    : (transaction.userId ? '未知成员' : '');

  const formatTime = (dateStr: string) => {
    if (dateStr && dateStr.length > 10) {
      return dayjs(dateStr).format('HH:mm');
    }
    return '';
  };

  const renderRightActions = () => {
    if (!canEdit) return null;
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        activeOpacity={0.8}
        onPress={() => {
          Alert.alert(
            '确认删除',
            '确定要删除这条记录吗？',
            [
              { text: '取消', style: 'cancel' },
              { text: '删除', style: 'destructive', onPress: () => onDelete(transaction.id) },
            ],
            { cancelable: true }
          );
        }}
      >
        <Text style={styles.deleteText}>删除</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      renderRightActions={canEdit ? renderRightActions : () => null}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface }]}
        activeOpacity={canEdit ? 0.7 : 1}
        onPress={() => canEdit && onPress(transaction)}
      >
        <View style={[styles.iconWrap, { backgroundColor: isTransfer ? (colors.primary + '18') : ((category?.color || colors.primary) + '18') }]}>
          <Text style={styles.icon}>{isTransfer ? '🔄' : (category?.icon || '📋')}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
            {isTransfer ? (transaction.note || '账户转账') : (transaction.note || category?.name || '未知分类')}
          </Text>
          <View style={styles.subtitleRow}>
            {isTransfer ? (
              <Text style={[styles.subtitleText, { color: colors.textTertiary }]}>
                {fundAccount?.icon || ''} {fundAccount?.name || ''} → {toFundAccount?.icon || ''} {toFundAccount?.name || ''}
              </Text>
            ) : (
              <>
                <Text style={[styles.subtitleText, { color: colors.textTertiary }]}>
                  {category?.name || '未知'}
                </Text>
                {fundAccount && (
                  <Text style={[styles.subtitleText, { color: colors.textTertiary }]}>
                    {' · '}{fundAccount.icon} {fundAccount.name}
                  </Text>
                )}
              </>
            )}
            {showMember && memberName ? (
              <Text style={[styles.subtitleText, { color: colors.primary }]}>
                {' · '}{memberName}
              </Text>
            ) : null}
            {/* DEBUG: 显示原始 date 字段 */}
            {/* <Text style={[styles.subtitleText, { color: colors.textTertiary }]}>
              {' · '}{transaction.date}
            </Text> */}
            {formatTime(transaction.date) ? (
              <Text style={[styles.subtitleText, { color: colors.textTertiary }]}>
                {' · '}{formatTime(transaction.date)}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountPrefix}{currencySymbol}{transaction.amount.toFixed(2)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
  },
  subtitleText: {
    fontSize: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: 0.3,
  },
  deleteAction: {
    backgroundColor: '#F53F3F',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 0,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
