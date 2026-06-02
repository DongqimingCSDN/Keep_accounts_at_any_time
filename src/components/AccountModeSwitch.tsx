import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';

export default function AccountModeSwitch() {
  const { colors } = useTheme();
  const { state, switchAccountMode, setActiveFamily } = useApp();
  const [showFamilyModal, setShowFamilyModal] = useState(false);

  const activeFamily = state.userFamilies.find(f => f.id === state.activeFamilyId);

  const handlePersonalMode = () => {
    switchAccountMode('personal');
  };

  const handleFamilyMode = () => {
    if (state.userFamilies.length === 0) {
      // 没有家庭，跳转到家庭管理
      // 这里需要导航，但由于组件层级限制，暂时只切换模式
      switchAccountMode('family');
    } else if (state.userFamilies.length === 1) {
      // 只有一个家庭，直接激活
      switchAccountMode('family');
    } else {
      // 多个家庭，显示选择弹窗
      setShowFamilyModal(true);
    }
  };

  const handleSelectFamily = async (familyId: string) => {
    await setActiveFamily(familyId);
    switchAccountMode('family', familyId);
    setShowFamilyModal(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.modeButton,
          state.accountMode === 'personal' && styles.activeButton,
          { backgroundColor: state.accountMode === 'personal' ? colors.primary : colors.surface }
        ]}
        onPress={handlePersonalMode}
      >
        <Text style={[styles.modeText, { color: state.accountMode === 'personal' ? '#FFFFFF' : colors.text }]}>
          个人
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.modeButton,
          state.accountMode === 'family' && styles.activeButton,
          { backgroundColor: state.accountMode === 'family' ? colors.primary : colors.surface }
        ]}
        onPress={handleFamilyMode}
        disabled={state.userFamilies.length === 0}
      >
        <Text style={[styles.modeText, { 
          color: state.accountMode === 'family' ? '#FFFFFF' : 
            (state.userFamilies.length > 0 ? colors.text : colors.placeholder) 
        }]}>
          家庭
        </Text>
      </TouchableOpacity>

      {/* 家庭选择弹窗 */}
      <Modal
        visible={showFamilyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFamilyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>选择家庭</Text>
            <ScrollView style={styles.familyList}>
              {state.userFamilies.map((family) => (
                <TouchableOpacity
                  key={family.id}
                  style={[
                    styles.familyItem,
                    { borderBottomColor: colors.border },
                    state.activeFamilyId === family.id && { backgroundColor: colors.primaryLight }
                  ]}
                  onPress={() => handleSelectFamily(family.id)}
                >
                  <Text style={[styles.familyName, { color: colors.text }]}>{family.name}</Text>
                  {state.activeFamilyId === family.id && (
                    <Text style={[styles.checkMark, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowFamilyModal(false)}
            >
              <Text style={[styles.closeButtonText, { color: colors.text }]}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeButton: {
    borderWidth: 0,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  familyList: {
    maxHeight: 200,
  },
  familyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  familyName: {
    fontSize: 14,
    flex: 1,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});