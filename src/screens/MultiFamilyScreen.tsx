import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Share,
} from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import {
  createFamily,
  joinFamily,
  leaveFamily,
  getFamiliesForUser,
  getFamilyMembers,
  updateMemberDisplayName,
  updateFamilyName,
  removeFamilyMember,
  FamilyMember,
} from '../services/familyService';
import { getProfiles, UserProfile } from '../services/profileService';

export default function MultiFamilyScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { state, dispatch, setActiveFamily } = useApp();

  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const [editFamilyModalVisible, setEditFamilyModalVisible] = useState(false);
  const [editFamilyNameInput, setEditFamilyNameInput] = useState('');
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  // 创建/加入家庭
  const [showCreateJoin, setShowCreateJoin] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const activeFamily = state.userFamilies.find(f => f.id === state.activeFamilyId);
  const inFamily = !!activeFamily;
  const isOwner = activeFamily?.createdBy === state.currentUser?.id;

  // 加载家庭成员
  const loadMembers = async (familyId: string) => {
    try {
      const data = await getFamilyMembers(familyId);
      setMembers(data);
      const userIds = data.map(m => m.userId);
      if (userIds.length > 0) {
        try {
          const profiles = await getProfiles(userIds);
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach(p => { profileMap[p.id] = p; });
          setMemberProfiles(profileMap);
        } catch {
          setMemberProfiles({});
        }
      }
    } catch (err: any) {
      Alert.alert('加载失败', err.message);
    }
  };

  useEffect(() => {
    if (activeFamily) {
      loadMembers(activeFamily.id);
    }
  }, [activeFamily?.id]);

  // 修改家庭名称
  const handleSaveFamilyName = async () => {
    if (!editFamilyNameInput.trim()) {
      Alert.alert('提示', '家庭名称不能为空');
      return;
    }
    try {
      const updated = await updateFamilyName(activeFamily!.id, editFamilyNameInput.trim());
      const families = await getFamiliesForUser();
      dispatch({ type: 'SET_USER_FAMILIES', payload: families });
      dispatch({ type: 'SET_FAMILY', payload: updated });
      setEditFamilyModalVisible(false);
    } catch (err: any) {
      Alert.alert('修改失败', err.message);
    }
  };

  // 分享邀请码
  const handleShareInviteCode = () => {
    if (!activeFamily) return;
    Share.share({
      message: `邀请你加入家庭「${activeFamily.name}」！\n\n打开记账App，进入设置 → 家庭管理 → 加入家庭，输入邀请码：${activeFamily.inviteCode}\n\n即可加入一起记账`,
      title: '邀请加入家庭',
    });
  };

  // 离开家庭
  const handleLeaveFamily = () => {
    if (!activeFamily) return;
    Alert.alert(
      '确认离开',
      `确定要离开家庭 "${activeFamily.name}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveFamily(activeFamily.id);
              const families = await getFamiliesForUser();
              dispatch({ type: 'SET_USER_FAMILIES', payload: families });
              await setActiveFamily(null);
              setMembers([]);
              setMemberProfiles({});
            } catch (err: any) {
              Alert.alert('离开失败', err.message);
            }
          },
        },
      ]
    );
  };

  // 修改备注名
  const handleSaveDisplayName = async () => {
    if (!editMemberId || !activeFamily) return;
    try {
      await updateMemberDisplayName(editMemberId, editDisplayName.trim());
      await loadMembers(activeFamily.id);
      setEditMemberId(null);
      setEditDisplayName('');
    } catch (err: any) {
      Alert.alert('修改失败', err.message);
    }
  };

  // 删除成员
  const handleRemoveMember = (member: FamilyMember) => {
    Alert.alert(
      '确认删除',
      `确定要将成员 "${member.displayName || '该成员'}" 从家庭中移除吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFamilyMember(member.id);
              await loadMembers(activeFamily!.id);
            } catch (err: any) {
              Alert.alert('删除失败', err.message);
            }
          },
        },
      ]
    );
  };

  // 创建新家庭
  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('提示', '请输入家庭名称');
      return;
    }
    setLoading(true);
    try {
      const family = await createFamily(familyName.trim());
      const families = await getFamiliesForUser();
      dispatch({ type: 'SET_USER_FAMILIES', payload: families });
      await setActiveFamily(family.id);
      setShowCreateJoin(false);
      setFamilyName('');
    } catch (err: any) {
      Alert.alert('创建失败', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 加入家庭
  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('提示', '请输入邀请码');
      return;
    }
    setLoading(true);
    try {
      const family = await joinFamily(inviteCode.trim().toUpperCase());
      const families = await getFamiliesForUser();
      dispatch({ type: 'SET_USER_FAMILIES', payload: families });
      await setActiveFamily(family.id);
      setShowCreateJoin(false);
      setInviteCode('');
    } catch (err: any) {
      Alert.alert('加入失败', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============ 未加入家庭 ============
  if (!inFamily) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {showCreateJoin ? (
          <View style={styles.createJoinContainer}>
            <TouchableOpacity onPress={() => setShowCreateJoin(false)}>
              <Text style={[styles.backText, { color: colors.primary }]}>&larr; 返回</Text>
            </TouchableOpacity>

            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { color: colors.text }]}>创建家庭</Text>
              <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                创建家庭并获取邀请码，分享给家人加入
              </Text>
            </View>

            <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
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
              onPress={handleCreateFamily}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>{loading ? '创建中...' : '创建家庭'}</Text>
            </TouchableOpacity>

            <View style={styles.dividerWrap}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>或者</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>邀请码</Text>
              <TextInput
                style={[styles.input, { color: colors.text, letterSpacing: 4, fontSize: 20 }]}
                placeholder="请输入6位邀请码"
                placeholderTextColor={colors.placeholder}
                value={inviteCode}
                onChangeText={setInviteCode}
                maxLength={6}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
              onPress={handleJoinFamily}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>{loading ? '加入中...' : '加入家庭'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>暂未加入家庭</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              创建或加入一个家庭，与家人一起记账
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowCreateJoin(true)}
            >
              <Text style={styles.emptyBtnText}>创建或加入家庭</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 编辑家庭名称 Modal */}
        <Modal
          visible={editFamilyModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEditFamilyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>修改家庭名称</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="输入新的家庭名称"
                placeholderTextColor={colors.placeholder}
                value={editFamilyNameInput}
                onChangeText={setEditFamilyNameInput}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setEditFamilyModalVisible(false)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveFamilyName}
                >
                  <Text style={styles.modalBtnText}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ============ 已加入家庭 ============
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 家庭名称标题 */}
        <View style={styles.familyHeader}>
          <View style={styles.familyNameWrap}>
            <Text style={[styles.familyTitle, { color: colors.text }]}>{activeFamily.name}</Text>
            {isOwner && (
              <TouchableOpacity
                onPress={() => {
                  setEditFamilyNameInput(activeFamily.name);
                  setEditFamilyModalVisible(true);
                }}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.editBtn, { color: colors.primary }]}>编辑</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.inviteRow}>
            <Text style={[styles.inviteCode, { color: colors.textSecondary }]}>
              邀请码: {activeFamily.inviteCode}
            </Text>
            <TouchableOpacity onPress={handleShareInviteCode} activeOpacity={0.6}>
              <Text style={[styles.shareBtn, { color: colors.primary }]}>分享邀请码</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 家庭成员 */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>家庭成员 ({members.length})</Text>
          {members.map((member) => {
            const isSelf = member.userId === state.currentUser?.id;
            const isMemberOwner = member.role === 'owner';
            const profile = memberProfiles[member.userId];
            const memberAvatar = profile?.avatar;
            const memberName = member.displayName || profile?.displayName || '未知成员';

            return (
              <View key={member.id} style={[styles.memberItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.memberAvatar, { backgroundColor: colors.primaryLight }]}>
                  <Text style={styles.memberAvatarText}>
                    {memberAvatar || (memberName.charAt(0).toUpperCase())}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{memberName}</Text>
                    {isSelf && (
                      <View style={[styles.selfBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.selfBadgeText, { color: colors.primary }]}>我</Text>
                      </View>
                    )}
                    {isMemberOwner && (
                      <View style={styles.ownerBadge}>
                        <Text style={styles.ownerBadgeText}>创建者</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.memberSub, { color: colors.textSecondary }]}>
                    {member.email || `ID: ${member.userId.substring(0, 8)}...`}
                  </Text>
                </View>
                {isOwner && !isSelf && (
                  <TouchableOpacity
                    style={[styles.memberManageBtn, { borderColor: colors.border }]}
                    onPress={() => {
                      Alert.alert(
                        member.displayName || '成员管理',
                        '请选择操作',
                        [
                          {
                            text: '修改备注名',
                            onPress: () => {
                              setEditMemberId(member.id);
                              setEditDisplayName(member.displayName || '');
                            },
                          },
                          {
                            text: '移除成员',
                            style: 'destructive',
                            onPress: () => handleRemoveMember(member),
                          },
                          { text: '取消', style: 'cancel' },
                        ],
                        { cancelable: true }
                      );
                    }}
                  >
                    <Text style={[styles.memberManageBtnText, { color: colors.textSecondary }]}>
                      管理
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* 离开家庭 */}
        <TouchableOpacity
          style={[styles.leaveButton, { borderColor: colors.error }]}
          onPress={handleLeaveFamily}
          activeOpacity={0.7}
        >
          <Text style={[styles.leaveButtonText, { color: colors.error }]}>离开家庭</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 编辑家庭名称 Modal */}
      <Modal
        visible={editFamilyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditFamilyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>修改家庭名称</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="输入新的家庭名称"
              placeholderTextColor={colors.placeholder}
              value={editFamilyNameInput}
              onChangeText={setEditFamilyNameInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setEditFamilyModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveFamilyName}
              >
                <Text style={styles.modalBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 修改备注名弹窗 */}
      <Modal
        visible={editMemberId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditMemberId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>修改备注名</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="输入备注名"
              placeholderTextColor={colors.placeholder}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setEditMemberId(null)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveDisplayName}
              >
                <Text style={styles.modalBtnText}>保存</Text>
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
    padding: 16,
  },
  // 家庭头部
  familyHeader: {
    marginBottom: 20,
  },
  familyNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  familyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editBtn: {
    fontSize: 14,
    fontWeight: '500',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  inviteCode: {
    fontSize: 14,
  },
  shareBtn: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 卡片
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  // 成员
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
  },
  selfBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  selfBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ownerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E65100',
  },
  memberSub: {
    fontSize: 12,
    marginTop: 2,
  },
  memberManageBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  memberManageBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // 离开家庭
  leaveButton: {
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // 未加入家庭
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  emptyBtn: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // 创建/加入
  createJoinContainer: {
    flex: 1,
  },
  backText: {
    fontSize: 16,
    marginBottom: 20,
  },
  formHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
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
    marginBottom: 12,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    marginHorizontal: 12,
  },
  // 弹窗
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
