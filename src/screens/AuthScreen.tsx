import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { signUp, signIn, AuthUser } from '../services/authService';

interface AuthScreenProps {
  onAuthSuccess: (user: AuthUser) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const { colors } = useTheme();
  const { login } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('提示', '请输入邮箱和密码');
      return;
    }
    if (!isLogin && !displayName.trim()) {
      Alert.alert('提示', '请输入昵称');
      return;
    }
    if (password.length < 6) {
      Alert.alert('提示', '密码至少6位');
      return;
    }

    setLoading(true);
    try {
      let user;
      if (isLogin) {
        const result = await signIn(email.trim(), password);
        user = {
          id: result.id,
          email: result.email || '',
          displayName: result.user_metadata?.display_name,
        } as AuthUser;
        await login(user);
        onAuthSuccess(user);
      } else {
        const result = await signUp(email.trim(), password, displayName.trim());
        if (!result) {
          Alert.alert(
            '注册成功',
            '验证邮件已发送到你的邮箱，请点击邮件中的链接完成注册后登录。',
            [{ text: '确定', onPress: () => setIsLogin(true) }]
          );
          return;
        }
        user = {
          id: result.id,
          email: result.email || '',
          displayName: displayName.trim(),
        } as AuthUser;
        await login(user);
        onAuthSuccess(user);
      }
    } catch (err: any) {
      const msg = err.message || '操作失败';
      if (msg.includes('Invalid login credentials')) {
        Alert.alert('登录失败', '邮箱或密码错误');
      } else if (msg.includes('already registered')) {
        Alert.alert('注册失败', '该邮箱已注册');
      } else {
        Alert.alert(isLogin ? '登录失败' : '注册失败', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Logo 区域 */}
        <View style={styles.header}>
          <Text style={styles.logo}>💰</Text>
          <Text style={[styles.appName, { color: colors.text }]}>家庭记账</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isLogin ? '登录你的账户' : '创建新账户'}
          </Text>
        </View>

        {/* 表单区域 */}
        <View style={styles.form}>
          {!isLogin && (
            <View style={[styles.inputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>昵称</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="请输入昵称"
                placeholderTextColor={colors.placeholder}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={[styles.inputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>邮箱</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="请输入邮箱"
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>密码</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="请输入密码（至少6位）"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={[styles.switchText, { color: colors.primary }]}>
              {isLogin ? '没有账户？点击注册' : '已有账户？点击登录'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    gap: 16,
  },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  switchBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    fontSize: 14,
  },
});
