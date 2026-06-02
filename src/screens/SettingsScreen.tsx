import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import dayjs from 'dayjs';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { CURRENCY_OPTIONS, CURRENCY_SYMBOLS } from '../constants/currency';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import * as StorageService from '../utils/StorageService';
import * as DataService from '../services/dataService';
import { getProfiles } from '../services/profileService';
import { getFamilyMembers } from '../services/familyService';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../navigation/SettingsStack';
import type { ExportEntry } from '../utils/StorageService';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsMain'>;

export default function SettingsScreen({ navigation }: Props) {
  const { colors, isDark, setTheme } = useTheme();
  const { state, updateSettings, refreshData, logout } = useApp();
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 导出选项
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  const currentCurrency = state.settings.currency;
  const currentCurrencyName = CURRENCY_OPTIONS.find((c) => c.code === currentCurrency)?.name ?? currentCurrency;

  const handleCurrencySelect = async (code: 'CNY' | 'USD' | 'EUR' | 'JPY') => {
    setCurrencyModalVisible(false);
    await updateSettings({ currency: code });
  };

  const handleDarkModeToggle = async (value: boolean) => {
    setTheme(value ? 'dark' : 'light');
    await updateSettings({ theme: value ? 'dark' : 'light' });
  };

  const handleOpenExportModal = () => {
    // 初始化选择：默认选中"个人"
    const initial = new Set<string>(['personal']);
    setSelectedEntities(initial);
    setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
    setEndDate(dayjs().format('YYYY-MM-DD'));
    setExportModalVisible(true);
  };

  const toggleEntity = (key: string) => {
    setSelectedEntities(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDoExport = async () => {
    if (exporting) return;

    // 验证选择
    if (selectedEntities.size === 0) {
      Alert.alert('提示', '请至少选择一个数据来源（个人或家庭）');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('提示', '请选择导出日期范围');
      return;
    }
    if (startDate > endDate) {
      Alert.alert('提示', '开始日期不能晚于结束日期');
      return;
    }

    setExportModalVisible(false);
    setExporting(true);

    try {
      const allEntries: ExportEntry[] = [];
      const localCategories = await StorageService.getCategories();

      // 构建默认分类的 名称→名称 映射（兜底用）
      const defaultCatNameMap = new Map(DEFAULT_CATEGORIES.map(c => [c.name, c.name]));

      // 个人数据
      if (selectedEntities.has('personal')) {
        const personalTx = (await StorageService.getTransactions())
          .filter(t => {
            const tDate = t.date.length > 10 ? t.date.substring(0, 10) : t.date;
            if (tDate < startDate || tDate > endDate) return false;
            return true;
          });
        const cats = localCategories.length > 0 ? localCategories : DEFAULT_CATEGORIES;
        const catMap = new Map(cats.map(c => [c.id, c.name]));
        // 额外加入默认分类名称兜底
        DEFAULT_CATEGORIES.forEach(c => { if (!catMap.has(c.id)) catMap.set(c.id, c.name); });
        
        for (const t of personalTx) {
          let catName = catMap.get(t.categoryId) || '';
          if (!catName && t.categoryId) {
            catName = defaultCatNameMap.get(t.categoryId) || '未分类';
          }
          allEntries.push({
            date: t.date,
            type: t.type === 'expense' ? '支出' : '收入',
            category: catName,
            amount: t.amount,
            note: t.note,
            source: '个人',
            recorder: state.userProfile?.displayName || state.currentUser?.displayName || '我',
          });
        }
      }

      // 家庭数据
      if (state.isOnline && state.currentUser) {
        const familyIds = Array.from(selectedEntities).filter(id => id !== 'personal');
        if (familyIds.length > 0) {
          for (const fid of familyIds) {
            const family = state.userFamilies.find(f => f.id === fid);
            if (!family) continue;

            const tx = await DataService.fetchTransactions(fid);
            const filtered = tx.filter(t => {
              const tDate = t.date.length > 10 ? t.date.substring(0, 10) : t.date;
              return tDate >= startDate && tDate <= endDate;
            });

            // 优先使用已加载的家庭分类（state.categories 在家庭模式下就是当前家庭的分类）
            // 再从数据库获取，最后用默认分类兜底
            let famCats: typeof state.categories = [];
            
            // 尝试1：如果当前激活的就是这个家庭，直接用 state.categories
            if (state.activeFamilyId === fid && state.isOnline && state.categories.length > 0) {
              famCats = state.categories;
            }
            
            // 尝试2：从数据库获取
            if (famCats.length === 0) {
              try {
                famCats = await DataService.fetchCategories(fid);
              } catch {
                // 数据库获取失败，继续尝试其他方式
              }
            }

            // 构建分类映射表：ID → 名称
            const catMap = new Map<string, string>();
            famCats.forEach(c => catMap.set(c.id, c.name));
            
            // 兜底3：加入默认分类（按ID和按名称都加）
            DEFAULT_CATEGORIES.forEach(c => {
              if (!catMap.has(c.id)) catMap.set(c.id, c.name);
              if (!defaultCatNameMap.has(c.name)) defaultCatNameMap.set(c.name, c.name);
            });

            // 获取该家庭成员资料用于记账人标识
            let memberProfiles: Record<string, string> = {};
            try {
              const members = await getFamilyMembers(fid);
              const userIds = [...new Set(members.map((m: any) => m.userId))];
              if (userIds.length > 0) {
                const profiles = await getProfiles(userIds);
                profiles.forEach(p => { memberProfiles[p.id] = p.displayName; });
              }
            } catch {
            }

            for (const t of filtered) {
              let catName = catMap.get(t.categoryId) || '';
              // 如果ID没匹配到，尝试把 categoryId 当作分类名查找
              if (!catName && t.categoryId) {
                catName = defaultCatNameMap.get(t.categoryId) || '未分类';
              }

              const recorderName = memberProfiles[t.userId || ''] ||
                state.userProfile?.displayName ||
                state.currentUser?.displayName ||
                '未知';

              allEntries.push({
                date: t.date,
                type: t.type === 'expense' ? '支出' : '收入',
                category: catName,
                amount: t.amount,
                note: t.note,
                source: family.name || fid,
                recorder: recorderName,
              });
            }
          }
        }
      }

      if (allEntries.length === 0) {
        Alert.alert('提示', '该时间段内没有交易记录');
        return;
      }

      // 按日期排序
      allEntries.sort((a, b) => a.date.localeCompare(b.date));

      const base64 = await StorageService.exportToExcel(allEntries);
      const fileUri = FileSystem.documentDirectory + 'transactions.xlsx';
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(fileUri);
    } catch (e: any) {
      Alert.alert('导出失败', e.message || '导出数据时出现错误，请重试。');
    } finally {
      setExporting(false);
    }
  };

  const handleClearData = () => {
    Alert.alert('确认清空', '此操作将删除所有数据且不可恢复，确定要继续吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          await StorageService.clearAllData();
          await refreshData();
        },
      },
    ]);
  };

  const renderArrow = () => (
    <Text style={[styles.arrow, { color: colors.textSecondary }]}>{'›'}</Text>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.pageTitle, { color: colors.text }]}>设置</Text>

      {/* 个人资料卡片（仅登录用户显示） */}
      {state.currentUser && (
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.6}
        >
          <View style={[styles.profileAvatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.profileAvatarText}>
              {state.userProfile?.avatar || '😊'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {state.userProfile?.displayName || state.currentUser.displayName || '未设置昵称'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
              {state.currentUser.email}
            </Text>
          </View>
          {renderArrow()}
        </TouchableOpacity>
      )}

      {/* 通用设置 */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>通用</Text>

        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => setCurrencyModalVisible(true)}
          activeOpacity={0.6}
        >
          <Text style={[styles.itemLabel, { color: colors.text }]}>货币单位</Text>
          <View style={styles.itemRight}>
            <Text style={[styles.itemValue, { color: colors.textSecondary }]}>
              {currentCurrencyName}（{CURRENCY_SYMBOLS[currentCurrency]}）
            </Text>
            {renderArrow()}
          </View>
        </TouchableOpacity>

        <View style={[styles.item, { borderBottomColor: colors.border }]}>
          <Text style={[styles.itemLabel, { color: colors.text }]}>深色模式</Text>
          <Switch
            value={isDark}
            onValueChange={handleDarkModeToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.item, { borderBottomColor: colors.border }]}>
          <Text style={[styles.itemLabel, { color: colors.text }]}>记账助手</Text>
          <Switch
            value={state.settings.showAssistant || false}
            onValueChange={(value) => updateSettings({ showAssistant: value })}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {state.settings.showAssistant && (
          <TouchableOpacity
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate('SmartAssistantSettings')}
            activeOpacity={0.6}
          >
            <Text style={[styles.itemLabel, { color: colors.text }]}>智能助手设置</Text>
            <View style={styles.itemRight}>
              <Text style={[styles.itemValue, { color: colors.textSecondary }]}>OCR / LLM 配置</Text>
              <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* 数据管理 */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>数据管理</Text>

        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('CategoryManage')}
          activeOpacity={0.6}
        >
          <Text style={[styles.itemLabel, { color: colors.text }]}>分类管理</Text>
          <View style={styles.itemRight}>
            {renderArrow()}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('AccountManage')}
          activeOpacity={0.6}
        >
          <Text style={[styles.itemLabel, { color: colors.text }]}>资金管理</Text>
          <View style={styles.itemRight}>
            {renderArrow()}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('AutoTransactionManage')}
          activeOpacity={0.6}
        >
          <Text style={[styles.itemLabel, { color: colors.text }]}>自动记账</Text>
          <View style={styles.itemRight}>
            <Text style={[styles.itemValue, { color: colors.textSecondary }]}>
              {state.autoTransactions.filter((r) => r.enabled).length} 条规则
            </Text>
            {renderArrow()}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('Budget')}
          activeOpacity={0.6}
        >
          <Text style={[styles.itemLabel, { color: colors.text }]}>预算管理</Text>
          <View style={styles.itemRight}>
            {renderArrow()}
          </View>
        </TouchableOpacity>

        {/* 多家庭管理（仅当 Supabase 配置时显示） */}
        {state.currentUser && (
          <TouchableOpacity
            style={[styles.item]}
            onPress={() => navigation.navigate('MultiFamily')}
            activeOpacity={0.6}
          >
            <Text style={[styles.itemLabel, { color: colors.text }]}>家庭管理</Text>
            <View style={styles.itemRight}>
              <Text style={[styles.itemValue, { color: colors.textSecondary }]}>
                {state.userFamilies.length} 个家庭
              </Text>
              {renderArrow()}
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={handleOpenExportModal}
          activeOpacity={0.6}
          disabled={exporting}
        >
          <Text style={[styles.itemLabel, { color: exporting ? colors.textSecondary : colors.text }]}>
            {exporting ? '导出中...' : '导出数据'}
          </Text>
          <View style={styles.itemRight}>
            {renderArrow()}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item]}
          onPress={handleClearData}
          activeOpacity={0.6}
        >
          <Text style={[styles.itemLabel, { color: colors.error }]}>清空数据</Text>
          <View style={styles.itemRight}>
            {renderArrow()}
          </View>
        </TouchableOpacity>
      </View>

      {/* 其他 */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>其他</Text>

        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('About')}
          activeOpacity={0.6}
        >
          <Text style={[styles.itemLabel, { color: colors.text }]}>关于</Text>
          <View style={styles.itemRight}>
            {renderArrow()}
          </View>
        </TouchableOpacity>
      </View>

      {/* 账户（在线模式） */}
      {state.isOnline && state.currentUser && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>账户</Text>

          <View style={[styles.item, { borderBottomColor: colors.border }]}>
            <Text style={[styles.itemLabel, { color: colors.text }]}>邮箱</Text>
            <Text style={[styles.itemValue, { color: colors.textSecondary }]}>
              {state.currentUser.email}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.item]}
            onPress={() => {
              Alert.alert('确认登出', '确定要退出登录吗？', [
                { text: '取消', style: 'cancel' },
                { text: '确定', style: 'destructive', onPress: logout },
              ]);
            }}
            activeOpacity={0.6}
          >
            <Text style={[styles.itemLabel, { color: colors.error }]}>退出登录</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 导出数据 Modal */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setExportModalVisible(false)}
        >
          <ScrollView
            style={[styles.exportModalContent, { backgroundColor: colors.card }]}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity activeOpacity={1}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>导出数据</Text>

              {/* 选择数据来源 */}
              <Text style={[styles.exportLabel, { color: colors.textSecondary }]}>选择数据来源</Text>

              {/* 个人 */}
              <TouchableOpacity
                style={[
                  styles.entityOption,
                  selectedEntities.has('personal') && { backgroundColor: colors.primaryLight },
                  { borderColor: colors.border },
                ]}
                onPress={() => toggleEntity('personal')}
                activeOpacity={0.6}
              >
                <Text style={[styles.entityOptionText, {
                  color: selectedEntities.has('personal') ? colors.primary : colors.text,
                  fontWeight: selectedEntities.has('personal') ? '600' : '400',
                }]}>
                  👤 个人
                </Text>
                {selectedEntities.has('personal') && (
                  <Text style={[styles.modalCheck, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>

              {/* 家庭列表 */}
              {state.userFamilies.map(family => (
                <TouchableOpacity
                  key={family.id}
                  style={[
                    styles.entityOption,
                    selectedEntities.has(family.id) && { backgroundColor: colors.primaryLight },
                    { borderColor: colors.border },
                  ]}
                  onPress={() => toggleEntity(family.id)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.entityOptionText, {
                    color: selectedEntities.has(family.id) ? colors.primary : colors.text,
                    fontWeight: selectedEntities.has(family.id) ? '600' : '400',
                  }]}>
                    👨‍👩‍👧 {family.name}
                  </Text>
                  {selectedEntities.has(family.id) && (
                    <Text style={[styles.modalCheck, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}

              {state.userFamilies.length === 0 && (
                <Text style={[styles.exportHint, { color: colors.textSecondary }]}>
                  暂无家庭数据
                </Text>
              )}

              {/* 选择日期范围 */}
              <Text style={[styles.exportLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                选择日期范围
              </Text>

              <View style={styles.dateRow}>
                <View style={styles.dateFieldWrap}>
                  <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>开始日期</Text>
                  <TextInput
                    style={[styles.dateInput, {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    }]}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <Text style={[styles.dateSep, { color: colors.textSecondary }]}>—</Text>
                <View style={styles.dateFieldWrap}>
                  <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>结束日期</Text>
                  <TextInput
                    style={[styles.dateInput, {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    }]}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              {/* 快捷时间段 */}
              <View style={styles.quickDateRow}>
                {[
                  { label: '本月', start: dayjs().startOf('month'), end: dayjs() },
                  { label: '上月', start: dayjs().subtract(1, 'month').startOf('month'), end: dayjs().subtract(1, 'month').endOf('month') },
                  { label: '近3月', start: dayjs().subtract(2, 'month').startOf('month'), end: dayjs() },
                  { label: '今年', start: dayjs().startOf('year'), end: dayjs() },
                ].map(preset => (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.presetBtn, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                    onPress={() => {
                      setStartDate(preset.start.format('YYYY-MM-DD'));
                      setEndDate(preset.end.format('YYYY-MM-DD'));
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.presetBtnText, { color: colors.primary }]}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 导出按钮 */}
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: colors.primary }]}
                onPress={handleDoExport}
                activeOpacity={0.7}
              >
                <Text style={styles.exportBtnText}>开始导出</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </Modal>

      {/* 货币选择 Modal */}
      <Modal
        visible={currencyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCurrencyModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>选择货币单位</Text>
            {CURRENCY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.code}
                style={[
                  styles.modalOption,
                  option.code === currentCurrency && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => handleCurrencySelect(option.code as 'CNY' | 'USD' | 'EUR' | 'JPY')}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: option.code === currentCurrency ? colors.primary : colors.text },
                  ]}
                >
                  {option.name}（{option.symbol}）
                </Text>
                {option.code === currentCurrency && (
                  <Text style={[styles.modalCheck, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileAvatarText: {
    fontSize: 26,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 3,
  },
  profileEmail: {
    fontSize: 13,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 13,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemLabel: {
    fontSize: 16,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemValue: {
    fontSize: 14,
    marginRight: 6,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalCheck: {
    fontSize: 16,
    fontWeight: '600',
  },
  exportModalContent: {
    maxHeight: '80%',
    width: '88%',
    borderRadius: 20,
  },
  exportLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  entityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  entityOptionText: {
    fontSize: 16,
  },
  exportHint: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  dateFieldWrap: {
    flex: 1,
  },
  dateFieldLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlign: 'center',
  },
  dateSep: {
    fontSize: 16,
    marginHorizontal: 10,
    paddingBottom: 10,
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  presetBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  presetBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  exportBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
