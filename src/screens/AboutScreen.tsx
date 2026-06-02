import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../store/ThemeContext';

export default function AboutScreen() {
  const { colors } = useTheme();

  const techStack = [
    { name: 'React Native', desc: '跨平台移动应用框架' },
    { name: 'Expo', desc: 'React Native 开发平台' },
    { name: 'React Navigation', desc: '导航与路由管理' },
    { name: 'AsyncStorage', desc: '本地数据持久化' },
    { name: 'TypeScript', desc: '类型安全的 JavaScript' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.appName, { color: colors.primary }]}>随手记账</Text>
        <Text style={[styles.version, { color: colors.textSecondary }]}>版本 1.0.0</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          一款简洁高效的记账应用，帮助您随时随地记录收支，轻松管理个人财务。
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>技术栈</Text>
        {techStack.map((tech, index) => (
          <View key={tech.name}>
            <View style={styles.techRow}>
              <Text style={[styles.techName, { color: colors.text }]}>{tech.name}</Text>
              <Text style={[styles.techDesc, { color: colors.textSecondary }]}>{tech.desc}</Text>
            </View>
            {index < techStack.length - 1 && (
              <View style={[styles.techDivider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  techRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  techName: {
    fontSize: 15,
    fontWeight: '500',
  },
  techDesc: {
    fontSize: 13,
  },
  techDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
