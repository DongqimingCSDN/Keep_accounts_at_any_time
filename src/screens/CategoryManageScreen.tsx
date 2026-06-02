import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { Category, TransactionType } from '../types';
import CategoryEditModal from '../components/CategoryEditModal';

export default function CategoryManageScreen() {
  const { colors } = useTheme();
  const { state, addCategory, updateCategory, deleteCategory } = useApp();
  const { categories, transactions } = state;

  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const filteredCategories = useMemo(() => {
    return categories
      .filter((c) => c.type === activeTab)
      .sort((a, b) => a.order - b.order);
  }, [categories, activeTab]);

  const maxOrder = useMemo(() => {
    const allOrders = categories.map((c) => c.order);
    return allOrders.length > 0 ? Math.max(...allOrders) : 0;
  }, [categories]);

  const hasRelatedTransactions = (categoryId: string): boolean => {
    return transactions.some((t) => t.categoryId === categoryId);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setEditModalVisible(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setEditModalVisible(true);
  };

  const handleDelete = (category: Category) => {
    if (!category.isCustom) return;

    if (hasRelatedTransactions(category.id)) {
      Alert.alert('无法删除', '该分类下存在关联的交易记录，不可删除');
      return;
    }

    Alert.alert('确认删除', `确定要删除分类「${category.name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => deleteCategory(category.id),
      },
    ]);
  };

  const handleSave = async (category: Category) => {
    if (editingCategory) {
      await updateCategory(category);
    } else {
      await addCategory(category);
    }
    setEditModalVisible(false);
    setEditingCategory(null);
  };

  const handleCloseModal = () => {
    setEditModalVisible(false);
    setEditingCategory(null);
  };

  const renderItem = ({ item }: { item: Category }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardLeft}>
        <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
          <Text style={styles.iconText}>{item.icon}</Text>
        </View>
        <View style={styles.nameWrap}>
          <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
          {!item.isCustom && (
            <Text style={[styles.presetTag, { color: colors.textSecondary }]}>预设</Text>
          )}
        </View>
      </View>
      <View style={styles.cardRight}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.border }]}
          onPress={() => handleEdit(item)}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>编辑</Text>
        </TouchableOpacity>
        {item.isCustom && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn, { borderColor: colors.error }]}
            onPress={() => handleDelete(item)}
          >
            <Text style={[styles.actionText, { color: colors.error }]}>删除</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 顶部Tab */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'expense' && { borderBottomColor: colors.primary },
          ]}
          onPress={() => setActiveTab('expense')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'expense' ? colors.primary : colors.textSecondary },
            ]}
          >
            支出
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'income' && { borderBottomColor: colors.primary },
          ]}
          onPress={() => setActiveTab('income')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'income' ? colors.primary : colors.textSecondary },
            ]}
          >
            收入
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={[styles.addBtnText, { color: colors.primary }]}>+ 添加</Text>
        </TouchableOpacity>
      </View>

      {/* 分类列表 */}
      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            暂无分类
          </Text>
        }
      />

      {/* 编辑弹窗 */}
      <CategoryEditModal
        visible={editModalVisible}
        category={editingCategory}
        type={activeTab}
        maxOrder={maxOrder}
        onSave={handleSave}
        onClose={handleCloseModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addBtn: {
    marginLeft: 'auto',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
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
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  presetTag: {
    fontSize: 12,
    marginLeft: 8,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  deleteBtn: {},
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
});
