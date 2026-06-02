import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { OCR_PROVIDER, testBaiduConnection } from '../services/ocrService';
import { LLM_PROVIDERS, LLMProvider } from '../services/llmService';

export default function SmartAssistantSettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { state, updateSettings } = useApp();

  const currentSettings = state.settings as any;

  const [ocrApiKey, setOcrApiKey] = useState(currentSettings.ocrApiKey || '');
  const [ocrSecretKey, setOcrSecretKey] = useState(currentSettings.ocrSecretKey || '');
  const [llmProvider, setLlmProvider] = useState<LLMProvider>(currentSettings.llmProvider || 'deepseek');
  const [llmApiKey, setLlmApiKey] = useState(currentSettings.llmApiKey || '');
  const [llmBaseUrl, setLlmBaseUrl] = useState(currentSettings.llmBaseUrl || '');
  const [llmModel, setLlmModel] = useState(currentSettings.llmModel || '');
  const [testingOcr, setTestingOcr] = useState(false);

  const handleTestOcr = async () => {
    if (!ocrApiKey.trim() || !ocrSecretKey.trim()) {
      Alert.alert('提示', '请先填写 API Key 和 Secret Key');
      return;
    }
    setTestingOcr(true);
    try {
      await testBaiduConnection(ocrApiKey.trim(), ocrSecretKey.trim());
      Alert.alert('连接成功', '百度 OCR 服务连接正常，API Key 和 Secret Key 有效');
    } catch (err: any) {
      Alert.alert('连接失败', err.message);
    } finally {
      setTestingOcr(false);
    }
  };

  const handleSave = () => {
    if (!ocrApiKey.trim() || !ocrSecretKey.trim()) {
      Alert.alert('提示', '请填写完整的百度 OCR API Key 和 Secret Key');
      return;
    }
    if (!llmApiKey.trim()) {
      Alert.alert('提示', '请填写 LLM API Key');
      return;
    }
    updateSettings({
      ocrApiKey,
      ocrSecretKey,
      llmProvider,
      llmApiKey,
      llmBaseUrl,
      llmModel,
    } as any);
    Alert.alert('保存成功', '智能助手配置已保存');
  };

  const renderLLMProviderSelector = () => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>LLM 供应商</Text>
      <View style={styles.providerRow}>
        {Object.entries(LLM_PROVIDERS).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.providerChip,
              {
                backgroundColor: llmProvider === key ? colors.primary : colors.surface,
                borderColor: llmProvider === key ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setLlmProvider(key as LLMProvider)}
          >
            <Text
              style={[
                styles.providerChipText,
                { color: llmProvider === key ? '#FFFFFF' : colors.text },
              ]}
            >
              {config.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* OCR 配置 */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>OCR 文字识别（百度）</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            {OCR_PROVIDER.apiKeyLabel}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={ocrApiKey}
            onChangeText={setOcrApiKey}
            placeholder="请输入百度 API Key"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            {OCR_PROVIDER.secretKeyLabel}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={ocrSecretKey}
            onChangeText={setOcrSecretKey}
            placeholder="请输入百度 Secret Key"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
            获取方式：访问 ai.baidu.com → OCR文字识别 → 创建应用
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.testBtn, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1, opacity: testingOcr ? 0.6 : 1 }]}
          onPress={handleTestOcr}
          disabled={testingOcr}
          activeOpacity={0.7}
        >
          {testingOcr ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={[styles.testBtnText, { color: colors.primary }]}>测试连接</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* LLM 配置 */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>LLM 智能解析</Text>

        {renderLLMProviderSelector()}

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            {LLM_PROVIDERS[llmProvider].apiKeyLabel}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={llmApiKey}
            onChangeText={setLlmApiKey}
            placeholder="请输入 API Key"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {llmProvider === 'custom' && (
          <>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>API Base URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={llmBaseUrl}
                onChangeText={setLlmBaseUrl}
                placeholder="https://api.example.com/v1"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>模型名称</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={llmModel}
                onChangeText={setLlmModel}
                placeholder="model-name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        {llmProvider !== 'custom' && (
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              默认模型: {LLM_PROVIDERS[llmProvider].defaultModel}
            </Text>
          </View>
        )}
      </View>

      {/* 隐私说明 */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>隐私说明</Text>
        <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
          • 图片仅用于文字识别，不会被上传存储{'\n'}
          • OCR 识别后的文本会发送给 LLM 进行结构化解析{'\n'}
          • API Key 仅保存在本地设备中{'\n'}
          • 所有数据传输均使用 HTTPS 加密
        </Text>
      </View>

      {/* 保存按钮 */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        activeOpacity={0.7}
      >
        <Text style={styles.saveBtnText}>保存配置</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  providerChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  privacyText: {
    fontSize: 13,
    lineHeight: 22,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  testBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  testBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});