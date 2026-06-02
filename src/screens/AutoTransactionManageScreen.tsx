import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { AutoTransaction, AutoFrequency, TransactionType } from '../types';
import { CURRENCY_SYMBOLS } from '../constants/currency';

const FREQUENCY_LABELS: Record<AutoFrequency, string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
};

export default function AutoTransactionManageScreen() {
  const { colors } = useTheme();
  const {
    state,
    addAutoTransaction,
    updateAutoTransaction,
    deleteAutoTransaction,
    toggleAutoTransaction,
  } = useApp();
  const { autoTransactions, categories, fundAccounts, settings } = state;

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoTransaction | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [fundAccountId, setFundAccountId] = useState('');
  const [scope, setScope] = useState<'personal' | 'family'>('personal');
  const [frequency, setFrequency] = useState<AutoFrequency>('monthly');
  const [enabled, setEnabled] = useState(true);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);

  const currencySymbol = CURRENCY_SYMBOLS[settings.currency] || '¥';

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === type).sort((a, b) => a.order - b.order);
  }, [categories, type]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId);
  }, [categories, categoryId]);

  const selectedAccount = useMemo(() => {
    return fundAccounts.find((a) => a.id === fundAccountId);
  }, [fundAccounts, fundAccountId]);

  const handleAdd = () => {
    setEditingRule(null);
    setType('expense');
    setAmount('');
    setCategoryId('');
    setNote('');
    setFundAccountId('');
    setScope('personal');
    setFrequency('monthly');
    setEnabled(true);
    setEditModalVisible(true);
  };

  const handleEdit = (rule: AutoTransaction) => {
    setEditingRule(rule);
    setType(rule.type);
    setAmount(rule.amount.toString());
    setCategoryId(rule.categoryId);
    setNote(rule.note);
    setFundAccountId(rule.fundAccountId || '');
    setScope(rule.familyId ? 'family' : 'personal');
    setFrequency(rule.frequency);
    setEnabled(rule.enabled);
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }
    if (!categoryId) {
      Alert.alert('提示', '请选择分类');
      return;
    }

    try {
      const familyId = scope === 'family' ? state.activeFamilyId : undefined;
      if (scope === 'family' && !familyId) {
        Alert.alert('提示', '请先加入家庭才能创建家庭自动记账');
        return;
      }
      if (editingRule) {
        await updateAutoTransaction({
          ...editingRule,
          type,
          amount: amountNum,
          categoryId,
          note: note.trim(),
          fundAccountId: fundAccountId || undefined,
          familyId,
          frequency,
          enabled,
        });
      } else {
        const rule: AutoTransaction = {
          id: `auto_${Date.now()}`,
          type,
          amount: amountNum,
          categoryId,
          note: note.trim(),
          fundAccountId: fundAccountId || undefined,
          familyId,
          frequency,
          enabled,
          createdAt: new Date().toISOString(),
        };
        await addAutoTransaction(rule);
      }
      setEditModalVisible(false);
    } catch (e: any) {
      Alert.alert('保存失败', e.message || '请稍后重试');
    }
  };

  const handleDelete = (rule: AutoTransaction) => {
    Alert.alert('确认删除', `确定要删除自动记账「${rule.note || '未命名'}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => deleteAutoTransaction(rule.id),
      },
    ]);
  };

  const handleToggle = (id: string) => {
    toggleAutoTransaction(id);
  };

  const renderRule = ({ item }: { item: AutoTransaction }) => {
    const cat = categories.find((c) => c.id === item.categoryId);
    const account = fundAccounts.find((a) => a.id === item.fundAccountId);

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconWrap, { backgroundColor: (cat?.color || colors.primary) + '20' }]}>
              <Text style={styles.iconText}>{cat?.icon || '📋'}</Text>
            </View>
            <View style={styles.infoWrap}>
              <Text style={[styles.ruleName, { color: colors.text }]}>
                {item.note || cat?.name || '自动记账'}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {FREQUENCY_LABELS[item.frequency]}
                </Text>
                <Text style={[styles.metaText, { color: item.familyId ? colors.primary : colors.textSecondary }]}>
                  {' · '}{item.familyId ? '家庭' : '个人'}
                </Text>
                {account && (
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {' · '}{account.icon} {account.name}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text
              style={[
                styles.amountText,
                { color: item.type === 'expense' ? colors.error : colors.success },
              ]}
            >
              {item.type === 'expense' ? '-' : '+'}
              {currencySymbol}
              {item.amount.toFixed(2)}
            </Text>
            <Switch
              value={item.enabled}
              onValueChange={() => handleToggle(item.id)}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={item.enabled ? colors.primary : colors.textSecondary}
              style={styles.switch}
            />
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.border }]}
            onPress={() => handleEdit(item)}
          >
            <Text style={[styles.actionText, { color: colors.primary }]}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn, { borderColor: colors.error }]}
            onPress={() => handleDelete(item)}
          >
            <Text style={[styles.actionText, { color: colors.error }]}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCategoryItem = (cat: typeof categories[0]) => (
    <TouchableOpacity
      style={[
        styles.pickerItem,
        { borderBottomColor: colors.border },
        categoryId === cat.id && { backgroundColor: colors.primary + '15' },
      ]}
      onPress={() => {
        setCategoryId(cat.id);
        setCategoryPickerVisible(false);
      }}
    >
      <Text style={styles.pickerItemIcon}>{cat.icon}</Text>
      <Text style={[styles.pickerItemName, { color: colors.text }]}>{cat.name}</Text>
      {categoryId === cat.id && (
        <Text style={[styles.pickerCheck, { color: colors.primary }]}>✓</Text>
      )}
    </TouchableOpacity>
  );

  const renderAccountItem = (acc: typeof fundAccounts[0]) => (
    <TouchableOpacity
      style={[
        styles.pickerItem,
        { borderBottomColor: colors.border },
        fundAccountId === acc.id && { backgroundColor: colors.primary + '15' },
      ]}
      onPress={() => {
        setFundAccountId(acc.id);
        setAccountPickerVisible(false);
      }}
    >
      <Text style={styles.pickerItemIcon}>{acc.icon}</Text>
      <Text style={[styles.pickerItemName, { color: colors.text }]}>{acc.name}</Text>
      {fundAccountId === acc.id && (
        <Text style={[styles.pickerCheck, { color: colors.primary }]}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>自动记账规则</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={[styles.addBtnText, { color: colors.primary }]}>+ 添加</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={autoTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderRule}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🔄</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              暂无自动记账规则
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
              添加规则后，系统将按设定频率自动记账
            </Text>
          </View>
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
                {editingRule ? '编辑自动记账' : '添加自动记账'}
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>类型</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    type === 'expense' && { backgroundColor: colors.error + '20' },
                    { borderColor: type === 'expense' ? colors.error : colors.border },
                  ]}
                  onPress={() => {
                    setType('expense');
                    setCategoryId('');
                  }}
                >
                  <Text style={{ color: type === 'expense' ? colors.error : colors.textSecondary, fontWeight: '600' }}>
                    支出
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    type === 'income' && { backgroundColor: colors.success + '20' },
                    { borderColor: type === 'income' ? colors.success : colors.border },
                  ]}
                  onPress={() => {
                    setType('income');
                    setCategoryId('');
                  }}
                >
                  <Text style={{ color: type === 'income' ? colors.success : colors.textSecondary, fontWeight: '600' }}>
                    收入
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>作用域</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    scope === 'personal' && { backgroundColor: colors.primary + '20' },
                    { borderColor: scope === 'personal' ? colors.primary : colors.border },
                  ]}
                  onPress={() => setScope('personal')}
                >
                  <Text style={{ color: scope === 'personal' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
                    个人
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    scope === 'family' && { backgroundColor: colors.primary + '20' },
                    { borderColor: scope === 'family' ? colors.primary : colors.border },
                  ]}
                  onPress={() => {
                    if (!state.activeFamilyId) {
                      Alert.alert('提示', '请先加入家庭');
                      return;
                    }
                    setScope('family');
                  }}
                >
                  <Text style={{ color: scope === 'family' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
                    家庭
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>金额</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>频率</Text>
              <View style={styles.typeRow}>
                {(['daily', 'weekly', 'monthly'] as AutoFrequency[]).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.typeBtn,
                      frequency === f && { backgroundColor: colors.primary + '20' },
                      { borderColor: frequency === f ? colors.primary : colors.border },
                    ]}
                    onPress={() => setFrequency(f)}
                  >
                    <Text style={{ color: frequency === f ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
                      {FREQUENCY_LABELS[f]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>分类</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setCategoryPickerVisible(true)}
              >
                {selectedCategory ? (
                  <View style={styles.pickerBtnContent}>
                    <Text style={styles.pickerBtnIcon}>{selectedCategory.icon}</Text>
                    <Text style={[styles.pickerBtnText, { color: colors.text }]}>{selectedCategory.name}</Text>
                  </View>
                ) : (
                  <Text style={[styles.pickerBtnPlaceholder, { color: colors.textSecondary }]}>选择分类</Text>
                )}
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>资金账户（可选）</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setAccountPickerVisible(true)}
              >
                {selectedAccount ? (
                  <View style={styles.pickerBtnContent}>
                    <Text style={styles.pickerBtnIcon}>{selectedAccount.icon}</Text>
                    <Text style={[styles.pickerBtnText, { color: colors.text }]}>{selectedAccount.name}</Text>
                  </View>
                ) : (
                  <Text style={[styles.pickerBtnPlaceholder, { color: colors.textSecondary }]}>选择账户</Text>
                )}
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>备注</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={note}
                onChangeText={setNote}
                placeholder="例如：房租、工资"
                placeholderTextColor={colors.textSecondary}
                maxLength={30}
              />

              <View style={styles.enabledRow}>
                <Text style={[styles.fieldLabel, { color: colors.text, marginBottom: 0, marginTop: 0 }]}>启用</Text>
                <Switch
                  value={enabled}
                  onValueChange={setEnabled}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={enabled ? colors.primary : colors.textSecondary}
                />
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

      <Modal
        visible={categoryPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryPickerVisible(false)}
        >
          <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>选择分类</Text>
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderCategoryItem(item)}
              style={styles.pickerList}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={accountPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAccountPickerVisible(false)}
        >
          <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>选择账户</Text>
            <FlatList
              data={fundAccounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderAccountItem(item)}
              style={styles.pickerList}
            />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  infoWrap: {
    flex: 1,
  },
  ruleName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  switch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginLeft: 8,
  },
  deleteBtn: {},
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 14,
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
    maxHeight: '85%',
  },
  pickerModalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
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
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pickerBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  pickerBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerBtnIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  pickerBtnText: {
    fontSize: 15,
  },
  pickerBtnPlaceholder: {
    fontSize: 15,
  },
  enabledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  pickerItemName: {
    flex: 1,
    fontSize: 15,
  },
  pickerCheck: {
    fontSize: 18,
    fontWeight: '600',
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
