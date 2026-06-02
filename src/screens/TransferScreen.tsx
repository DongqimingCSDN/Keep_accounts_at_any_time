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
} from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { FundAccount } from '../types';
import { CURRENCY_SYMBOLS } from '../constants/currency';

export default function TransferScreen() {
  const { colors } = useTheme();
  const { state, transferFundAccount } = useApp();
  const { fundAccounts, settings } = state;

  const currencySymbol = CURRENCY_SYMBOLS[settings.currency] || '¥';

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [fromPickerVisible, setFromPickerVisible] = useState(false);
  const [toPickerVisible, setToPickerVisible] = useState(false);

  const fromAccount = useMemo(() => fundAccounts.find((a) => a.id === fromAccountId), [fundAccounts, fromAccountId]);
  const toAccount = useMemo(() => fundAccounts.find((a) => a.id === toAccountId), [fundAccounts, toAccountId]);

  const handleTransfer = async () => {
    const amountNum = parseFloat(amount);
    if (!fromAccountId) {
      Alert.alert('提示', '请选择转出账户');
      return;
    }
    if (!toAccountId) {
      Alert.alert('提示', '请选择转入账户');
      return;
    }
    if (fromAccountId === toAccountId) {
      Alert.alert('提示', '转出和转入账户不能相同');
      return;
    }
    if (!amountNum || amountNum <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }
    if (fromAccount && amountNum > fromAccount.balance) {
      Alert.alert('提示', '转出账户余额不足');
      return;
    }

    try {
      await transferFundAccount(fromAccountId, toAccountId, amountNum, note.trim());
      Alert.alert('成功', '转账完成', [
        {
          text: '确定',
          onPress: () => {
            setAmount('');
            setNote('');
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('转账失败', e.message || '请稍后重试');
    }
  };

  const handleSwap = () => {
    const temp = fromAccountId;
    setFromAccountId(toAccountId);
    setToAccountId(temp);
  };

  const renderAccountItem = (account: FundAccount, isSelected: boolean, onSelect: (id: string) => void) => (
    <TouchableOpacity
      style={[
        styles.pickerItem,
        { borderBottomColor: colors.border },
        isSelected && { backgroundColor: colors.primary + '15' },
      ]}
      onPress={() => onSelect(account.id)}
    >
      <Text style={styles.pickerItemIcon}>{account.icon}</Text>
      <View style={styles.pickerItemInfo}>
        <Text style={[styles.pickerItemName, { color: colors.text }]}>{account.name}</Text>
        <Text style={[styles.pickerItemBalance, { color: account.balance >= 0 ? colors.success : colors.error }]}>
          {currencySymbol}{account.balance.toFixed(2)}
        </Text>
      </View>
      {isSelected && (
        <Text style={[styles.pickerCheck, { color: colors.primary }]}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>转出账户</Text>
        <TouchableOpacity
          style={[styles.accountBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setFromPickerVisible(true)}
        >
          {fromAccount ? (
            <View style={styles.accountBtnContent}>
              <Text style={styles.accountBtnIcon}>{fromAccount.icon}</Text>
              <Text style={[styles.accountBtnName, { color: colors.text }]}>{fromAccount.name}</Text>
              <Text style={[styles.accountBtnBalance, { color: colors.textSecondary }]}>
                {currencySymbol}{fromAccount.balance.toFixed(2)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.accountBtnPlaceholder, { color: colors.textSecondary }]}>选择转出账户</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.swapBtn} onPress={handleSwap} activeOpacity={0.7}>
          <View style={[styles.swapIconWrap, { backgroundColor: colors.primary }]}>
            <Text style={styles.swapIcon}>⇅</Text>
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>转入账户</Text>
        <TouchableOpacity
          style={[styles.accountBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setToPickerVisible(true)}
        >
          {toAccount ? (
            <View style={styles.accountBtnContent}>
              <Text style={styles.accountBtnIcon}>{toAccount.icon}</Text>
              <Text style={[styles.accountBtnName, { color: colors.text }]}>{toAccount.name}</Text>
              <Text style={[styles.accountBtnBalance, { color: colors.textSecondary }]}>
                {currencySymbol}{toAccount.balance.toFixed(2)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.accountBtnPlaceholder, { color: colors.textSecondary }]}>选择转入账户</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>转账金额</Text>
        <View style={[styles.amountRow, { borderColor: colors.border }]}>
          <Text style={[styles.amountSymbol, { color: colors.text }]}>{currencySymbol}</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.text }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>备注</Text>
        <TextInput
          style={[styles.noteInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={note}
          onChangeText={setNote}
          placeholder="例如：提现到银行卡"
          placeholderTextColor={colors.textSecondary}
          maxLength={30}
        />

        <TouchableOpacity
          style={[styles.transferBtn, { backgroundColor: colors.primary }]}
          onPress={handleTransfer}
          activeOpacity={0.7}
        >
          <Text style={styles.transferBtnText}>确认转账</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={fromPickerVisible} transparent animationType="fade" onRequestClose={() => setFromPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFromPickerVisible(false)}>
          <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>选择转出账户</Text>
            <FlatList
              data={fundAccounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderAccountItem(item, item.id === fromAccountId, (id) => { setFromAccountId(id); setFromPickerVisible(false); })}
              style={styles.pickerList}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={toPickerVisible} transparent animationType="fade" onRequestClose={() => setToPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setToPickerVisible(false)}>
          <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>选择转入账户</Text>
            <FlatList
              data={fundAccounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderAccountItem(item, item.id === toAccountId, (id) => { setToAccountId(id); setToPickerVisible(false); })}
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
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  accountBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  accountBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountBtnIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  accountBtnName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  accountBtnBalance: {
    fontSize: 14,
  },
  accountBtnPlaceholder: {
    fontSize: 16,
  },
  swapBtn: {
    alignItems: 'center',
    marginVertical: 4,
  },
  swapIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    marginBottom: 16,
    paddingBottom: 8,
  },
  amountSymbol: {
    fontSize: 28,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
    padding: 0,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 20,
  },
  transferBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  transferBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 22,
    marginRight: 10,
  },
  pickerItemInfo: {
    flex: 1,
  },
  pickerItemName: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerItemBalance: {
    fontSize: 13,
    marginTop: 2,
  },
  pickerCheck: {
    fontSize: 18,
    fontWeight: '600',
  },
});
