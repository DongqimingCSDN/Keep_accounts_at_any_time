import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { AVATAR_OPTIONS } from '../services/profileService';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { state, updateUserProfile } = useApp();
  const [displayName, setDisplayName] = useState(state.userProfile?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(state.userProfile?.avatar || '');
  const [saving, setSaving] = useState(false);

  const currentAvatar = selectedAvatar || '😊';

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('提示', '请输入昵称');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        avatar: selectedAvatar,
      });
      Alert.alert('成功', '资料已更新');
    } catch (err: any) {
      Alert.alert('保存失败', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 头像预览 */}
      <View style={styles.avatarPreviewSection}>
        <View style={[styles.avatarPreviewCircle, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.avatarPreviewText}>{currentAvatar}</Text>
        </View>
        <Text style={[styles.avatarPreviewName, { color: colors.text }]}>
          {displayName || '未设置昵称'}
        </Text>
        {state.currentUser && (
          <Text style={[styles.avatarPreviewEmail, { color: colors.textSecondary }]}>
            {state.currentUser.email}
          </Text>
        )}
      </View>

      {/* 昵称输入 */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>昵称</Text>
        <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
          <TextInput
            style={[styles.nameInput, { color: colors.text }]}
            placeholder="请输入昵称"
            placeholderTextColor={colors.placeholder}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={20}
          />
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {displayName.length}/20
          </Text>
        </View>
      </View>

      {/* 头像选择 */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>选择头像</Text>
        <View style={styles.avatarGrid}>
          {AVATAR_OPTIONS.map((avatar) => (
            <TouchableOpacity
              key={avatar}
              style={[
                styles.avatarItem,
                selectedAvatar === avatar && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedAvatar(avatar)}
            >
              <Text style={styles.avatarItemText}>{avatar}</Text>
              {selectedAvatar === avatar && (
                <View style={[styles.avatarCheck, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarCheckText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 保存按钮 */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? '保存中...' : '保存'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 头像预览
  avatarPreviewSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarPreviewCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarPreviewText: {
    fontSize: 40,
  },
  avatarPreviewName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  avatarPreviewEmail: {
    fontSize: 14,
  },
  // 区块
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  // 昵称输入
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  charCount: {
    fontSize: 12,
    marginLeft: 8,
  },
  // 头像网格
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  avatarItem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  avatarItemText: {
    fontSize: 28,
  },
  avatarCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCheckText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // 保存按钮
  saveBtn: {
    marginHorizontal: 16,
    marginBottom: 32,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
