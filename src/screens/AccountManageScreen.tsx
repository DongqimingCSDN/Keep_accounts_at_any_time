import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NestableDraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { FundAccount } from '../types';
import { CURRENCY_SYMBOLS } from '../constants/currency';

const ICON_OPTIONS = ['💬', '🔵', '💵', '🏦', '💳', '👛', '💰', '🏧', '📱', '🏠'];
const COLOR_OPTIONS = ['#07C160', '#1677FF', '#F5A623', '#6C5CE7', '#FF6B6B', '#00B894', '#E17055', '#636E72'];

export default function AccountManageScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { state, addFundAccount, updateFundAccount, deleteFundAccount, reorderFundAccounts } = useApp();
  const { fundAccounts, transactions, settings } = state;

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FundAccount | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💰');
  const [color, setColor] = useState('#07C160');
  const [balance, setBalance] = useState('');

  const sortedAccounts = useMemo(() => {
    return [...fundAccounts].sort((a, b) => a.order - b.order);
  }, [fundAccounts]);

  const totalBalance = useMemo(() => {
    return fundAccounts.reduce((sum, a) => sum + a.balance, 0);
  }, [fundAccounts]);

  const currencySymbol = CURRENCY_SYMBOLS[settings.currency] || '¥';

  const hasRelatedTransactions = (accountId: string): boolean => {
    return transactions.some((t) => t.fundAccountId === accountId);
  };

  const handleAdd = () => {
    setEditingAccount(null);
    setName('');
    setIcon('💰');
    setColor('#07C160');
    setBalance('');
    setEditModalVisible(true);
  };

  const handleEdit = (account: FundAccount) => {
    setEditingAccount(account);
    setName(account.name);
    setIcon(account.icon);
    setColor(account.color);
    setBalance(account.balance.toString());
    setEditModalVisible(true);
  };

  const handleDelete = (account: FundAccount) => {
    if (hasRelatedTransactions(account.id)) {
      Alert.alert('无法删除', '该账户下存在关联的交易记录，不可删除');
      return;
    }
    Alert.alert('确认删除', `确定要删除账户「${account.name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => deleteFundAccount(account.id),
      },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入账户名称');
      return;
    }

    const balanceNum = parseFloat(balance) || 0;
    const maxOrder = fundAccounts.length > 0 ? Math.max(...fundAccounts.map(a => a.order)) : 0;

    try {
      if (editingAccount) {
        await updateFundAccount({
          ...editingAccount,
          name: name.trim(),
          icon,
          color,
          balance: balanceNum,
        });
      } else {
        const account: FundAccount = {
          id: `fund_${Date.now()}`,
          name: name.trim(),
          icon,
          color,
          balance: balanceNum,
          order: maxOrder + 1,
          isDefault: false,
        };
        await addFundAccount(account);
      }
      setEditModalVisible(false);
    } catch (e: any) {
      Alert.alert('保存失败', e.message || '请稍后重试');
    }
  };

  const handleDragEnd = ({ data }: { data: FundAccount[] }) => {
    reorderFundAccounts(data);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<FundAccount>) => (
    <ScaleDecorator>
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        activeOpacity={0.9}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          isActive && styles.cardActive,
        ]}
      >
        <View style={styles.cardLeft}>
          <View style={styles.dragHandle}>
            <Text style={[styles.dragHandleIcon, { color: colors.textSecondary }]}>⠿</Text>
          </View>
          <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
            <Text style={styles.iconText}>{item.icon}</Text>
          </View>
          <View style={styles.nameWrap}>
            <Text style={[styles.accountName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.balanceText, { color: item.balance >= 0 ? colors.success : colors.error }]}>
              {currencySymbol}{item.balance.toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.border }]}
            onPress={() => handleEdit(item)}
          >
            <Text style={[styles.actionText, { color: colors.primary }]}>编辑</Text>
          </TouchableOpacity>
          {!item.isDefault && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn, { borderColor: colors.error }]}
              onPress={() => handleDelete(item)}
            >
              <Text style={[styles.actionText, { color: colors.error }]}>删除</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </ScaleDecorator>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.summaryLabel}>总资产</Text>
        <Text style={styles.summaryAmount}>
          {currencySymbol}{totalBalance.toFixed(2)}
        </Text>
      </View>

      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>账户列表</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Transfer')}>
            <Text style={[styles.addBtnText, { color: colors.primary }]}>转账</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={[styles.addBtnText, { color: colors.primary }]}>+ 添加</Text>
          </TouchableOpacity>
        </View>
      </View>

      <NestableDraggableFlatList
        data={sortedAccounts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            暂无账户，点击右上角添加
          </Text>
        }
      />

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity activeOpacity={1}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingAccount ? '编辑账户' : '添加账户'}
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>账户名称</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="例如：微信、支付宝"
                placeholderTextColor={colors.textSecondary}
                maxLength={20}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>当前余额</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={balance}
                onChangeText={setBalance}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>图标</Text>
              <View style={styles.iconRow}>
                {ICON_OPTIONS.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconOption, icon === ic && { backgroundColor: colors.primaryLight }]}
                    onPress={() => setIcon(ic)}
                  >
                    <Text style={styles.iconOptionText}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>颜色</Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorOptionSelected]}
                    onPress={() => setColor(c)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>保存</Text>
              </TouchableOpacity>
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
  summaryCard: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHint: {
    fontSize: 12,
    marginRight: 8,
  },
  addBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardActive: {
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dragHandle: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  dragHandleIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  nameWrap: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  deleteBtn: {},
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '88%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 4,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOptionText: {
    fontSize: 22,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#333',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
