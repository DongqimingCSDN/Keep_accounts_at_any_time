import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
} from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { parseTextBookkeeping, LLMProvider, ParsedTransaction } from '../services/llmService';
import dayjs from 'dayjs';
import { Transaction } from '../types';

interface EditableItem {
  type: 'expense' | 'income';
  amount: string;
  categoryId: string;
  fundAccountId: string;
  date: string;
  time: string;
  note: string;
}

function resolveCategoryId(name: string | undefined, categories: any[], type: 'expense' | 'income'): string {
  if (!name) return '';
  const match = categories.find(
    c => c.type === type && (c.name === name || c.name.includes(name) || name.includes(c.name))
  );
  return match ? match.id : '';
}

function resolveFundAccountId(name: string | undefined, fundAccounts: any[]): string {
  if (!name) return '';
  const match = fundAccounts.find(
    a => a.name === name || a.name.includes(name!) || name!.includes(a.name)
  );
  return match ? match.id : '';
}

export default function TextBookkeepingScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { state, addTransaction } = useApp();

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [editableList, setEditableList] = useState<EditableItem[]>([]);
  const [confirmedSet, setConfirmedSet] = useState<Set<number>>(new Set());
  const [batchSaving, setBatchSaving] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState(-1);
  const [pickerType, setPickerType] = useState<'category' | 'account'>('category');

  const llmProvider = (state.settings as any).llmProvider as LLMProvider || 'deepseek';
  const llmApiKey = (state.settings as any).llmApiKey as string || '';
  const llmBaseUrl = (state.settings as any).llmBaseUrl as string || '';
  const llmModel = (state.settings as any).llmModel as string || '';

  const expenseCategories = state.categories.filter(c => c.type === 'expense');
  const incomeCategories = state.categories.filter(c => c.type === 'income');

  const handleParse = async () => {
    if (!inputText.trim()) {
      Alert.alert('提示', '请输入记账描述');
      return;
    }

    if (!llmApiKey) {
      Alert.alert('提示', '请先在设置中配置 LLM API Key', [
        { text: '去设置', onPress: () => navigation.navigate('MainTabs', { screen: 'Settings', params: { screen: 'SmartAssistantSettings' } }) },
        { text: '取消' },
      ]);
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setEditableList([]);
    setConfirmedSet(new Set());

    try {
      const results = await parseTextBookkeeping(
        inputText.trim(),
        llmProvider,
        llmApiKey,
        llmBaseUrl || undefined,
        llmModel || undefined,
        {
          expenseCategories: expenseCategories.map(c => c.name),
          incomeCategories: incomeCategories.map(c => c.name),
          fundAccounts: state.fundAccounts.map(a => a.name),
        },
      );

      const now = dayjs();
      const editables: EditableItem[] = results.map(r => ({
        type: r.type,
        amount: r.amount.toString(),
        categoryId: resolveCategoryId(r.categoryName, state.categories, r.type),
        fundAccountId: resolveFundAccountId(r.fundAccountName, state.fundAccounts),
        date: r.date || now.format('YYYY-MM-DD'),
        time: r.time || now.format('HH:mm'),
        note: r.note || '',
      }));
      setEditableList(editables);
    } catch (err: any) {
      Alert.alert('解析失败', err.message || '请检查网络和API配置');
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof EditableItem>(index: number, key: K, value: EditableItem[K]) => {
    setEditableList(prev => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const openCategoryPicker = (index: number) => {
    setPickerTargetIndex(index);
    setPickerType('category');
    setPickerVisible(true);
  };

  const openAccountPicker = (index: number) => {
    setPickerTargetIndex(index);
    setPickerType('account');
    setPickerVisible(true);
  };

  const handleConfirmOne = async (index: number) => {
    const item = editableList[index];
    if (!item.categoryId) {
      Alert.alert('提示', '请先选择分类');
      return;
    }

    try {
      const transaction: Transaction = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
        type: item.type,
        amount: parseFloat(item.amount) || 0,
        categoryId: item.categoryId,
        date: `${item.date} ${item.time}`,
        note: item.note,
        accountType: state.activeFamilyId ? 'family' : 'personal',
        fundAccountId: item.fundAccountId || undefined,
        familyId: state.activeFamilyId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addTransaction(transaction);
      setConfirmedSet(prev => new Set(prev).add(index));
    } catch (err: any) {
      Alert.alert('保存失败', err.message);
    }
  };

  const handleConfirmAll = async () => {
    const unconfirmed = editableList
      .map((_, i) => i)
      .filter(i => !confirmedSet.has(i));

    if (unconfirmed.length === 0) {
      Alert.alert('提示', '所有交易已确认');
      return;
    }

    for (const index of unconfirmed) {
      const item = editableList[index];
      if (!item.categoryId) continue;

      try {
        const transaction: Transaction = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
          type: item.type,
          amount: parseFloat(item.amount) || 0,
          categoryId: item.categoryId,
          date: `${item.date} ${item.time}`,
          note: item.note,
          accountType: state.activeFamilyId ? 'family' : 'personal',
          fundAccountId: item.fundAccountId || undefined,
          familyId: state.activeFamilyId || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addTransaction(transaction);
        setConfirmedSet(prev => new Set(prev).add(index));
      } catch {}
    }

    const savedCount = unconfirmed.filter(i => confirmedSet.has(i)).length;
    if (savedCount > 0) {
      Alert.alert('保存成功', `已保存 ${savedCount} 笔交易`, [
        { text: '好的', onPress: handleReset },
      ]);
    }
  };

  const handleDeleteOne = (index: number) => {
    setEditableList(prev => prev.filter((_, i) => i !== index));
    setConfirmedSet(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const handleReset = () => {
    setInputText('');
    setEditableList([]);
    setConfirmedSet(new Set());
  };

  const EXAMPLES = [
    '微信支付今天午饭35元',
    '用支付宝打车花了28.5',
    '银行卡收到工资8000',
    '今天午饭35，打车28，买水果18',
    '微信付了午饭35和打车28，支付宝买水果68',
    '支付宝交话费50元',
  ];

  const allConfirmed = editableList.length > 0 && confirmedSet.size === editableList.length;

  const currentCategories = pickerTargetIndex >= 0
    ? (editableList[pickerTargetIndex]?.type === 'income' ? incomeCategories : expenseCategories)
    : expenseCategories;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>描述你的消费或收入</Text>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>支持一次描述多笔交易，如"午饭35，打车28"</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder='例如：今天午饭35，打车28，买水果18'
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            autoFocus
          />
          <View style={styles.inputActions}>
            <TouchableOpacity
              style={[styles.parseBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
              onPress={handleParse}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.parseBtnText}>智能解析</Text>
              )}
            </TouchableOpacity>
            {editableList.length > 0 && (
              <TouchableOpacity
                style={[styles.resetBtn, { borderColor: colors.border }]}
                onPress={handleReset}
                activeOpacity={0.7}
              >
                <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>重新输入</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!editableList.length && !loading && (
          <View style={styles.examplesSection}>
            <Text style={[styles.examplesTitle, { color: colors.textSecondary }]}>试试这样说：</Text>
            <View style={styles.examplesRow}>
              {EXAMPLES.map((ex, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.exampleChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setInputText(ex)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.exampleText, { color: colors.textSecondary }]}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {loading && (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>正在智能解析...</Text>
          </View>
        )}

        {editableList.length > 0 && !loading && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsHeaderTitle, { color: colors.text }]}>
                识别到 {editableList.length} 笔交易
              </Text>
              {!allConfirmed && editableList.length > 1 && (
                <TouchableOpacity
                  style={[styles.confirmAllBtn, { backgroundColor: colors.primary }]}
                  onPress={handleConfirmAll}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmAllBtnText}>全部确认记账</Text>
                </TouchableOpacity>
              )}
            </View>

            {editableList.map((item, index) => {
              const isConfirmed = confirmedSet.has(index);
              const category = state.categories.find(c => c.id === item.categoryId);
              const account = state.fundAccounts.find(a => a.id === item.fundAccountId);

              return (
                <View
                  key={index}
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor: isConfirmed ? colors.surface : colors.card,
                      borderColor: isConfirmed ? colors.success : 'transparent',
                      borderLeftWidth: isConfirmed ? 3 : 0,
                    },
                  ]}
                >
                  <View style={styles.resultCardHeader}>
                    <View style={styles.resultCardIndex}>
                      <Text style={[styles.resultCardIndexText, { color: colors.primary }]}>
                        {index + 1}
                      </Text>
                    </View>

                    {!isConfirmed ? (
                      <View style={styles.typeSwitchRow}>
                        <TouchableOpacity
                          style={[
                            styles.typeChip,
                            { backgroundColor: item.type === 'expense' ? colors.error + '18' : 'transparent', borderColor: item.type === 'expense' ? colors.error : 'transparent' },
                          ]}
                          onPress={() => updateField(index, 'type', 'expense')}
                          activeOpacity={0.6}
                        >
                          <Text style={[styles.typeChipText, { color: item.type === 'expense' ? colors.error : colors.textTertiary }]}>支出</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.typeChip,
                            { backgroundColor: item.type === 'income' ? colors.success + '18' : 'transparent', borderColor: item.type === 'income' ? colors.success : 'transparent' },
                          ]}
                          onPress={() => updateField(index, 'type', 'income')}
                          activeOpacity={0.6}
                        >
                          <Text style={[styles.typeChipText, { color: item.type === 'income' ? colors.success : colors.textTertiary }]}>收入</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={[styles.typeBadge, { backgroundColor: item.type === 'expense' ? colors.error + '18' : colors.success + '18' }]}>
                        <Text style={[styles.typeBadgeText, { color: item.type === 'expense' ? colors.error : colors.success }]}>
                          {item.type === 'expense' ? '支出' : '收入'}
                        </Text>
                      </View>
                    )}

                    {!isConfirmed ? (
                      <TextInput
                        style={[styles.amountInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                        value={item.amount}
                        onChangeText={(v) => updateField(index, 'amount', v.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        placeholder="金额"
                        placeholderTextColor={colors.placeholder}
                        includeFontPadding={false}
                        textAlignVertical="center"
                      />
                    ) : (
                      <Text style={[styles.resultCardAmount, { color: colors.text }]}>
                        ¥{parseFloat(item.amount || '0').toFixed(2)}
                      </Text>
                    )}

                    {isConfirmed ? (
                      <View style={[styles.confirmedBadge, { backgroundColor: colors.successLight }]}>
                        <Text style={[styles.confirmedBadgeText, { color: colors.success }]}>已确认</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteOne(index)}
                        activeOpacity={0.6}
                      >
                        <Text style={[styles.deleteBtnText, { color: colors.textTertiary }]}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.editFields}>
                    <View style={styles.editRow}>
                      <Text style={[styles.editLabel, { color: colors.textTertiary }]}>分类</Text>
                      {!isConfirmed ? (
                        <TouchableOpacity
                          style={[styles.editValueBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => openCategoryPicker(index)}
                          activeOpacity={0.6}
                        >
                          <Text style={[styles.editValueText, { color: category?.color || colors.primary }]}>
                            {category ? `${category.icon} ${category.name}` : '选择分类'}
                          </Text>
                          <Text style={[styles.dropdownArrow, { color: colors.textTertiary }]}>▾</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={[styles.editValueText, { color: colors.text }]}>
                          {category ? `${category.icon} ${category.name}` : '--'}
                        </Text>
                      )}
                    </View>

                    <View style={styles.editRow}>
                      <Text style={[styles.editLabel, { color: colors.textTertiary }]}>账户</Text>
                      {!isConfirmed ? (
                        <TouchableOpacity
                          style={[styles.editValueBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => openAccountPicker(index)}
                          activeOpacity={0.6}
                        >
                          <Text style={[styles.editValueText, { color: account?.color || colors.text }]}>
                            {account ? `${account.icon} ${account.name}` : '选择账户'}
                          </Text>
                          <Text style={[styles.dropdownArrow, { color: colors.textTertiary }]}>▾</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={[styles.editValueText, { color: colors.text }]}>
                          {account ? `${account.icon} ${account.name}` : '--'}
                        </Text>
                      )}
                    </View>

                    <View style={styles.editRow}>
                      <Text style={[styles.editLabel, { color: colors.textTertiary }]}>日期</Text>
                      {!isConfirmed ? (
                        <TextInput
                          style={[styles.editValueInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                          value={item.date}
                          onChangeText={(v) => updateField(index, 'date', v)}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={colors.placeholder}
                          includeFontPadding={false}
                        />
                      ) : (
                        <Text style={[styles.editValueText, { color: colors.text }]}>{item.date}</Text>
                      )}
                    </View>

                    <View style={styles.editRow}>
                      <Text style={[styles.editLabel, { color: colors.textTertiary }]}>时间</Text>
                      {!isConfirmed ? (
                        <TextInput
                          style={[styles.editValueInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                          value={item.time}
                          onChangeText={(v) => updateField(index, 'time', v)}
                          placeholder="HH:mm"
                          placeholderTextColor={colors.placeholder}
                          includeFontPadding={false}
                        />
                      ) : (
                        <Text style={[styles.editValueText, { color: colors.text }]}>{item.time}</Text>
                      )}
                    </View>

                    <View style={styles.editRow}>
                      <Text style={[styles.editLabel, { color: colors.textTertiary }]}>备注</Text>
                      {!isConfirmed ? (
                        <TextInput
                          style={[styles.editValueInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                          value={item.note}
                          onChangeText={(v) => updateField(index, 'note', v)}
                          placeholder="备注（选填）"
                          placeholderTextColor={colors.placeholder}
                          includeFontPadding={false}
                        />
                      ) : (
                        <Text style={[styles.editValueText, { color: colors.text }]}>{item.note || '--'}</Text>
                      )}
                    </View>
                  </View>

                  {!isConfirmed && (
                    <TouchableOpacity
                      style={[styles.confirmOneBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleConfirmOne(index)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.confirmOneBtnText}>确认并记账</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <Text style={[styles.bottomHint, { color: colors.textSecondary }]}>
              确认后直接保存，可在上方修改任何信息
            </Text>
          </View>
        )}

        {!llmApiKey && (
          <View style={[styles.warningCard, { backgroundColor: colors.error + '15' }]}>
            <Text style={[styles.warningTitle, { color: colors.error }]}>未配置 LLM API Key</Text>
            <Text style={[styles.warningDesc, { color: colors.textSecondary }]}>
              文字记账需要配置 LLM API Key 才能使用，支持 DeepSeek、通义千问、OpenAI 等
            </Text>
            <TouchableOpacity
              style={[styles.warningBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Settings', params: { screen: 'SmartAssistantSettings' } })}
              activeOpacity={0.7}
            >
              <Text style={styles.warningBtnText}>去配置</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={[styles.modalPanel, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {pickerType === 'category' ? '选择分类' : '选择账户'}
            </Text>

            {pickerType === 'category' ? (
              currentCategories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.pickerItem,
                    editableList[pickerTargetIndex]?.categoryId === cat.id && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => {
                    updateField(pickerTargetIndex, 'categoryId', cat.id);
                    setPickerVisible(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.pickerItemIcon}>{cat.icon}</Text>
                  <Text style={[styles.pickerItemName, { color: colors.text }]}>{cat.name}</Text>
                  {editableList[pickerTargetIndex]?.categoryId === cat.id && (
                    <Text style={[styles.pickerCheck, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              state.fundAccounts.map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.pickerItem,
                    editableList[pickerTargetIndex]?.fundAccountId === acc.id && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => {
                    updateField(pickerTargetIndex, 'fundAccountId', acc.id);
                    setPickerVisible(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.pickerItemIcon}>{acc.icon}</Text>
                  <Text style={[styles.pickerItemName, { color: colors.text }]}>{acc.name}</Text>
                  {editableList[pickerTargetIndex]?.fundAccountId === acc.id && (
                    <Text style={[styles.pickerCheck, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  inputSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  hintText: {
    fontSize: 12,
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  inputActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  parseBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  parseBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  examplesSection: { marginBottom: 16 },
  examplesTitle: { fontSize: 13, marginBottom: 8 },
  examplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  exampleText: { fontSize: 13 },
  loadingSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: { fontSize: 15, marginTop: 12 },
  resultsContainer: { marginBottom: 16 },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmAllBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmAllBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  resultCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultCardIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(91,108,247,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  resultCardIndexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeSwitchRow: {
    flexDirection: 'row',
    marginRight: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 8,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  resultCardAmount: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  confirmedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  deleteBtnText: {
    fontSize: 18,
    fontWeight: '500',
  },
  editFields: {
    paddingTop: 4,
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  editLabel: {
    fontSize: 14,
    width: 44,
  },
  editValueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 12,
  },
  editValueInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: 15,
    marginLeft: 12,
  },
  editValueText: {
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    marginLeft: 6,
  },
  confirmOneBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmOneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  warningCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  warningDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  warningBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
  },
  warningBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalPanel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 16,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    marginBottom: 4,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  pickerItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  pickerItemName: {
    flex: 1,
    fontSize: 15,
  },
  pickerCheck: {
    fontSize: 18,
    fontWeight: '700',
  },
});
