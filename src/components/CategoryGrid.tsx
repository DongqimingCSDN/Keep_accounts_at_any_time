import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Category } from '../types';
import { useTheme } from '../store/ThemeContext';

interface CategoryGridProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function CategoryGrid({ categories, selectedId, onSelect }: CategoryGridProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {categories.map((category) => {
        const isSelected = category.id === selectedId;
        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.item,
              {
                backgroundColor: isSelected ? colors.primary + '15' : colors.inputBackground,
                borderColor: isSelected ? colors.primary : 'transparent',
              },
            ]}
            onPress={() => onSelect(category.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: (isSelected ? colors.primary : colors.textSecondary) + '12' }]}>
              <Text style={styles.icon}>{category.icon}</Text>
            </View>
            <Text
              style={[
                styles.name,
                { color: isSelected ? colors.primary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    fontSize: 22,
  },
  name: {
    fontSize: 11,
    fontWeight: '500',
  },
});
