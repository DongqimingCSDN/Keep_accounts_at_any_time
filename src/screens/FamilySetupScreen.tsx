import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import dayjs from 'dayjs';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { createFamily, joinFamily, isUserInAnyFamily, Family } from '../services/familyService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../navigation/SettingsStack';

type Props = NativeStackScreenProps<SettingsStackParamList, 'FamilySetup'>;

export default function FamilySetupScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { setFamily, joinFamilyWithMigration } = useApp();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState('');

  // 加入家庭时的迁移相关
  const [migrationModalVisible, setMigrationModalVisible] = useState(false);
  const [migrationDate, setMigrationDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [pendingInviteCode, setPendingInviteCode] = useState('');

  const handleCreate = async () => {
    if (!familyName.trim()) {
      Alert.alert('提示', '请输入家庭名称');
      return;
    }
    setLoading(true);
    try {
      // 先检查是否已在家庭中
      const inFamily = await isUserInAnyFamily();
      if (inFamily) {
        Alert.alert('无法创建', '您已在一个家庭中，请先退出当前家庭才能创建新家庭');
        setLoading(false);
        return;
      }

      const family = await createFamily(familyName.trim());
      await setFamily(family);
      setCreatedCode(family.inviteCode);
    } catch (err: any) {
      Alert.alert('创建失败', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('提示', '请输入邀请码');
      return;
    }
    setLoading(true);
    try {
      // 先检查是否已在家庭中
      const inFamily = await isUserInAnyFamily();
      if (inFamily) {
        Alert.alert('无法加入', '您已在一个家庭中，请先退出当前家庭才能加入新家庭');
        setLoading(false);
        return;
      }

      // 显示迁移提示弹窗
      setPendingInviteCode(inviteCode.trim().toUpperCase());
      setMigrationDate(dayjs().format('YYYY-MM-DD'));
      setMigrationModalVisible(true);
    } catch (err: any) {
      Alert.alert('加入失败', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrationConfirm = async (migrate: boolean) => {
    setMigrationModalVisible(false);
    setLoading(true);
    try {
      const family = await joinFamilyWithMigration(
        pendingInviteCode,
        migrate ? migrationDate : undefined
      );
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('加入失败', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 选择模式
  if (mode === 'choose') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🏠</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>设置家庭</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            创建或加入一个家庭，开始共享记账
          </Text>
        </View>

        <View style={styles.options}>
          <TouchableOpacity
            style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={async () => {
              const inFamily = await isUserInAnyFamily();
              if (inFamily) {
                Alert.alert('无法创建', '您已在一个家庭中，请先退出当前家庭才能创建新家庭');
                return;
              }
              setMode('create');
            }}
          >
            <Text style={styles.optionIcon}>✨</Text>
            <Text style={[styles.optionTitle, { color: colors.text }]}>创建新家庭</Text>
            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
              创建家庭并获取邀请码，分享给家人加入
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setMode('join')}
          >
            <Text style={styles.optionIcon}>🤝</Text>
            <Text style={[styles.optionTitle, { color: colors.text }]}>加入已有家庭</Text>
            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
              输入家人分享的邀请码，加入他们的家庭
            </Text>
          </TouchableOpacity>
        </View>

        {/* 账单迁移提示弹窗 */}
        <Modal
          visible={migrationModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMigrationModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={styles.modalIcon}>📋</Text>
              <Text style={[styles.modalTitle, { color: colors.text }]}>迁移个人账单</Text>
              <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                加入家庭后，您可以将指定日期之后的个人账单迁移到家庭中，家庭成员均可查看。
              </Text>

              <View style={[styles.dateInputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Text style={[styles.dateInputLabel, { color: colors.textSecondary }]}>迁移此日期之后的账单</Text>
                <TextInput
                  style={[styles.dateInput, { color: colors.text }]}
                  value={migrationDate}
                  onChangeText={setMigrationDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.placeholder}
                  maxLength={10}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]}
                  onPress={() => handleMigrationConfirm(false)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>暂不迁移</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleMigrationConfirm(true)}
                >
                  <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>确认迁移</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // 创建家庭
  if (mode === 'create') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => setMode('choose')}>
            <Text style={[styles.backText, { color: colors.primary }]}>&larr; 返回</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.headerIcon}>✨</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>创建新家庭</Text>
          </View>

          {!createdCode ? (
            <View style={styles.form}>
              <View style={[styles.inputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>家庭名称</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="例如：我的小家"
                  placeholderTextColor={colors.placeholder}
                  value={familyName}
                  onChangeText={setFamilyName}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
                onPress={handleCreate}
                disabled={loading}
              >
                <Text style={styles.submitBtnText}>{loading ? '创建中...' : '创建家庭'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={[styles.successTitle, { color: colors.text }]}>家庭创建成功！</Text>
              <Text style={[styles.successHint, { color: colors.textSecondary }]}>
                将以下邀请码分享给家人，他们即可加入
              </Text>
              <View style={[styles.codeBox, { backgroundColor: colors.inputBackground, borderColor: colors.primary }]}>
                <Text style={[styles.codeText, { color: colors.primary }]}>{createdCode}</Text>
              </View>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.submitBtnText}>完成</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // 加入家庭
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => setMode('choose')}>
          <Text style={[styles.backText, { color: colors.primary }]}>&larr; 返回</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerIcon}>🤝</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>加入家庭</Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>邀请码</Text>
            <TextInput
              style={[styles.input, { color: colors.text, letterSpacing: 4, fontSize: 20 }]}
              placeholder="请输入6位邀请码"
              placeholderTextColor={colors.placeholder}
              value={inviteCode}
              onChangeText={setInviteCode}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
            onPress={handleJoin}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>{loading ? '加入中...' : '加入家庭'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 账单迁移提示弹窗（加入流程中复用） */}
      <Modal
        visible={migrationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMigrationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={styles.modalIcon}>📋</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>迁移个人账单</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              加入家庭后，您可以将指定日期之后的个人账单迁移到家庭中，家庭成员均可查看。
            </Text>

            <View style={[styles.dateInputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Text style={[styles.dateInputLabel, { color: colors.textSecondary }]}>迁移此日期之后的账单</Text>
              <TextInput
                style={[styles.dateInput, { color: colors.text }]}
                value={migrationDate}
                onChangeText={setMigrationDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
                maxLength={10}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => handleMigrationConfirm(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>暂不迁移</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleMigrationConfirm(true)}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>确认迁移</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  backText: {
    fontSize: 16,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    fontSize: 56,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  options: {
    gap: 16,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    padding: 0,
  },
  submitBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  successCard: {
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  successHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  codeBox: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 8,
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 6,
  },
  // 迁移弹窗样式
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
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  dateInputWrap: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  dateInputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateInput: {
    fontSize: 18,
    padding: 0,
    letterSpacing: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
