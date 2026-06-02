import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../store/ThemeContext';

interface NumberKeyboardProps {
  onInput: (value: string) => void;
  onConfirm: () => void;
  onBackspace: () => void;
  currentValue: string;
  disabled?: boolean;
}

const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
];

export default function NumberKeyboard({ onInput, onConfirm, onBackspace, currentValue, disabled }: NumberKeyboardProps) {
  const { colors } = useTheme();

  const handleKeyPress = (key: string) => {
    if (key === '⌫') {
      onBackspace();
      return;
    }

    if (key === '.') {
      if (currentValue.includes('.')) return;
      onInput(currentValue === '' ? '0.' : '.');
      return;
    }

    if (currentValue.includes('.')) {
      const decimalPart = currentValue.split('.')[1];
      if (decimalPart && decimalPart.length >= 2) return;
    }

    onInput(currentValue + key);
  };

  const renderKey = (key: string) => {
    const isDelete = key === '⌫';

    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.key,
          {
            backgroundColor: colors.card,
          },
        ]}
        onPress={() => handleKeyPress(key)}
        activeOpacity={0.5}
      >
        <Text
          style={[
            styles.keyText,
            {
              color: isDelete ? colors.error : colors.text,
            },
          ]}
        >
          {key}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => renderKey(key))}
        </View>
      ))}
      <TouchableOpacity
        style={[styles.confirmButton, { backgroundColor: disabled ? colors.border : colors.primary, shadowColor: colors.shadow }]}
        onPress={onConfirm}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text style={[styles.confirmText, disabled && { opacity: 0.5 }]}>{disabled ? '保存中...' : '确认'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  key: {
    flex: 1,
    height: 50,
    marginHorizontal: 4,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '500',
  },
  confirmButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
