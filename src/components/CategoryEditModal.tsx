import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { Category, TransactionType } from '../types';

const EMOJI_LIST = [
  '🍜', '🚗', '🛍️', '🎮', '🏠', '💊',
  '📚', '📱', '💰', '💼', '📈', '🧧',
  '📌', '✈️', '🎵', '👕', '☕', '🎂',
  '🐾', '🎁', '⚽', '🎨', '💡', '🔧',
  '🐶', '🐱',
];

const COLOR_LIST = [
  '#FF6B6B', '#4ECDC4', '#FF9F43', '#A29BFE',
  '#6C5CE7', '#FD79A8', '#00B894', '#FDCB6E',
  '#0984E3', '#E17055', '#636E72', '#2D3436',
];

interface CategoryEditModalProps {
  visible: boolean;
  category: Category | null;
  type: TransactionType;
  maxOrder: number;
  onSave: (category: Category) => void;
  onClose: () => void;
}

export default function CategoryEditModal({
  visible,
  category,
  type,
  maxOrder,
  onSave,
  onClose,
}: CategoryEditModalProps) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(EMOJI_LIST[0]);
  const [color, setColor] = useState(COLOR_LIST[0]);

  useEffect(() => {
    if (visible) {
      if (category) {
        setName(category.name);
        setIcon(category.icon);
        setColor(category.color);
      } else {
        setName('');
        setIcon(EMOJI_LIST[0]);
        setColor(COLOR_LIST[0]);
      }
    }
  }, [visible, category]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (category) {
      onSave({
        ...category,
        name: trimmedName,
        icon,
        color,
      });
    } else {
      onSave({
        id: 'custom_' + Date.now(),
        name: trimmedName,
        icon,
        color,
        type,
        isCustom: true,
        order: maxOrder + 1,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {category ? '编辑分类' : '添加分类'}
          </Text>

          {/* 名称输入 */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>名称</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="请输入分类名称"
            placeholderTextColor={colors.placeholder}
            maxLength={20}
          />

          {/* 图标选择 */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>图标</Text>
          <ScrollView style={styles.emojiScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.emojiGrid}>
              {EMOJI_LIST.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiItem,
                    {
                      borderColor: icon === emoji ? colors.primary : 'transparent',
                      backgroundColor: icon === emoji ? colors.primaryLight : 'transparent',
                    },
                  ]}
                  onPress={() => setIcon(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* 颜色选择 */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>颜色</Text>
          <View style={styles.colorGrid}>
            {COLOR_LIST.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorItem,
                  {
                    backgroundColor: c,
                    borderColor: color === c ? colors.text : 'transparent',
                  },
                ]}
                onPress={() => setColor(c)}
              >
                {color === c && (
                  <Text style={styles.colorCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* 按钮 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>确认</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '88%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  emojiScroll: {
    maxHeight: 140,
    marginBottom: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emojiItem: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 8,
    margin: 2,
  },
  emojiText: {
    fontSize: 24,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  colorItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderWidth: 3,
  },
  colorCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
