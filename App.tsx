import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/store/ThemeContext';
import { AppProvider, useApp } from './src/store/AppContext';
import TabNavigator, { navigationRef } from './src/navigation/TabNavigator';
import AuthScreen from './src/screens/AuthScreen';
import FloatingAssistant from './src/components/FloatingAssistant';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator, Text, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { isSupabaseConfigured } from './src/lib/supabase';
import { AuthUser } from './src/services/authService';

function AppContent() {
  const { colors, isDark } = useTheme();
  const { state } = useApp();
  const supabaseReady = isSupabaseConfigured();

  // 截屏识别：打开图片选择器，然后跳转到智能识别页面
  const handleScreenshotRecognize = async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const imageUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        navigationRef.current?.navigate('SmartRecognize', {
          imageUri,
        });
      }
    } catch (err: any) {
      Alert.alert('提示', '请先安装 expo-image-picker: npm install expo-image-picker');
    }
  };

  // 快速记账
  const handleQuickBook = () => {
    navigationRef.current?.navigate('AddTransaction', {});
  };

  // 文字记账
  const handleTextBookkeeping = () => {
    navigationRef.current?.navigate('TextBookkeeping', {});
  };

  // 加载中
  if (state.isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} translucent={false} />
        <Text style={styles.loadingIcon}>💰</Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  // Supabase 未配置 → 直接进入离线模式主页面（个人记账）
  if (!supabaseReady) {
    return (
      <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} translucent={false} />
        <TabNavigator />
        {state.settings.showAssistant && (
          <FloatingAssistant
            onScreenshotRecognize={handleScreenshotRecognize}
            onQuickBook={handleQuickBook}
            onTextBookkeeping={handleTextBookkeeping}
          />
        )}
      </GestureHandlerRootView>
    );
  }

  // Supabase 已配置 → 需要登录（但不强制家庭设置）

  // 未登录 → 显示登录/注册页面
  if (!state.currentUser) {
    return (
      <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} translucent={false} />
        <AuthScreen onAuthSuccess={(_user: AuthUser) => {}} />
      </GestureHandlerRootView>
    );
  }

  // 已登录 → 显示主页面（默认个人记账，可在设置中切换到家庭记账）
  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent={false} />
      <TabNavigator />
      {state.settings.showAssistant && (
        <FloatingAssistant
          onScreenshotRecognize={handleScreenshotRecognize}
          onQuickBook={handleQuickBook}
          onTextBookkeeping={handleTextBookkeeping}
        />
      )}
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    fontSize: 64,
  },
});
