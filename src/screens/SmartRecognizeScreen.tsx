import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';
import { recognizeImage } from '../services/ocrService';
import { parseTransactionFromText, LLMProvider, ParsedTransaction } from '../services/llmService';
import dayjs from 'dayjs';

interface SmartRecognizeScreenProps {
  navigation: any;
  route: any;
}

export default function SmartRecognizeScreen({ navigation, route }: SmartRecognizeScreenProps) {
  const { colors } = useTheme();
  const { state } = useApp();
  const imageUri = route.params?.imageUri as string | undefined;

  const [step, setStep] = useState<'preview' | 'ocr' | 'parsing' | 'result'>(
    imageUri ? 'preview' : 'preview'
  );
  const [ocrText, setOcrText] = useState('');
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrExpanded, setOcrExpanded] = useState(false);

  const ocrApiKey = (state.settings as any).ocrApiKey as string || '';
  const ocrSecretKey = (state.settings as any).ocrSecretKey as string || '';
  const llmProvider = (state.settings as any).llmProvider as LLMProvider || 'deepseek';
  const llmApiKey = (state.settings as any).llmApiKey as string || '';
  const llmBaseUrl = (state.settings as any).llmBaseUrl as string || '';
  const llmModel = (state.settings as any).llmModel as string || '';

  const handleStartRecognize = async () => {
    if (!imageUri) {
      Alert.alert('提示', '未选择图片');
      return;
    }

    if (!ocrApiKey || !ocrSecretKey) {
      Alert.alert('提示', '请先在设置中配置百度 OCR API Key 和 Secret Key', [
        { text: '去设置', onPress: () => navigation.navigate('MainTabs', { screen: 'Settings', params: { screen: 'SmartAssistantSettings' } }) },
        { text: '取消' },
      ]);
      return;
    }

    setLoading(true);
    setStep('ocr');

    try {
      const ocrResult = await recognizeImage(imageUri, ocrApiKey, ocrSecretKey);
      setOcrText(ocrResult.text);

      if (!ocrResult.text.trim()) {
        Alert.alert('识别失败', '未能从图片中识别出文字，请选择更清晰的截图');
        setStep('preview');
        setLoading(false);
        return;
      }

      if (!llmApiKey) {
        Alert.alert('提示', '请先在设置中配置 LLM API Key', [
          { text: '去设置', onPress: () => navigation.navigate('MainTabs', { screen: 'Settings', params: { screen: 'SmartAssistantSettings' } }) },
          { text: '取消' },
        ]);
        setStep('preview');
        setLoading(false);
        return;
      }

      setStep('parsing');
      const expenseCategories = state.categories.filter(c => c.type === 'expense').map(c => c.name);
      const incomeCategories = state.categories.filter(c => c.type === 'income').map(c => c.name);
      const fundAccountNames = state.fundAccounts.map(a => a.name);

      const parsedResult = await parseTransactionFromText(
        ocrResult.text,
        llmProvider,
        llmApiKey,
        llmBaseUrl || undefined,
        llmModel || undefined,
        { expenseCategories, incomeCategories, fundAccounts: fundAccountNames },
      );
      setParsed(parsedResult);
      setStep('result');
    } catch (err: any) {
      Alert.alert('识别失败', err.message || '请检查网络和API配置');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndBook = () => {
    if (!parsed) return;

    let categoryId: string | null = null;
    if (parsed.categoryName) {
      const category = state.categories.find(
        c => c.name === parsed.categoryName || c.name.includes(parsed.categoryName!)
      );
      if (category) categoryId = category.id;
    }

    let fundAccountId: string | undefined;
    if (parsed.fundAccountName) {
      const account = state.fundAccounts.find(
        a => a.name === parsed.fundAccountName || a.name.includes(parsed.fundAccountName!)
      );
      if (account) fundAccountId = account.id;
    }

    let validDate = '';
    if (parsed.date && parsed.confidence.date >= 0.6) {
      const parsedDate = dayjs(parsed.date, ['YYYY-MM-DD', 'YYYY/MM/DD', 'MM-DD HH:mm', 'M/D']);
      if (parsedDate.isValid() && parsedDate.year() >= 2020 && parsedDate.year() <= 2030) {
        validDate = parsedDate.format('YYYY-MM-DD');
      }
    }
    if (!validDate) {
      validDate = dayjs().format('YYYY-MM-DD');
    }

    let validTime = '';
    if (parsed.time) {
      const parsedTime = dayjs(parsed.time, ['HH:mm', 'H:mm', 'HH:mm:ss']);
      if (parsedTime.isValid()) {
        validTime = parsedTime.format('HH:mm');
      }
    }
    if (!validTime) {
      validTime = dayjs().format('HH:mm');
    }

    navigation.replace('AddTransaction', {
      prefilled: {
        type: parsed.type,
        amount: parsed.amount.toString(),
        categoryId,
        fundAccountId,
        date: validDate,
        time: validTime,
        note: parsed.note || '',
      },
    });
  };

  const handleRetry = () => {
    setStep('preview');
    setOcrText('');
    setParsed(null);
    setOcrExpanded(false);
  };

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <View style={[styles.imageCard, { backgroundColor: colors.card }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
        ) : (
          <View style={[styles.noImagePlaceholder, { backgroundColor: colors.surface }]}>
            <Text style={styles.noImageIcon}>📷</Text>
            <Text style={[styles.noImageText, { color: colors.textSecondary }]}>未选择图片</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.recognizeBtn,
          { backgroundColor: loading ? colors.border : colors.primary },
          (!imageUri || loading) && styles.btnDisabled,
        ]}
        onPress={handleStartRecognize}
        disabled={loading || !imageUri}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={styles.recognizeBtnIcon}>🔍</Text>
            <Text style={styles.recognizeBtnText}>开始智能识别</Text>
          </>
        )}
      </TouchableOpacity>

      {(!ocrApiKey || !ocrSecretKey) && (
        <View style={[styles.warningBox, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={[styles.warningText, { color: '#E65100' }]}>请先配置百度 OCR API Key</Text>
        </View>
      )}
      {!llmApiKey && (
        <View style={[styles.warningBox, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={[styles.warningText, { color: '#E65100' }]}>请先配置 LLM API Key</Text>
        </View>
      )}
    </View>
  );

  const renderProgress = () => {
    const stepConfig = {
      ocr: { icon: '📝', title: 'OCR 文字识别', desc: '正在从图片中提取文字...' },
      parsing: { icon: '🧠', title: 'AI 智能解析', desc: '正在分析交易信息...' },
    };
    const config = stepConfig[step];

    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressCircle, { borderColor: colors.primary }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>

        <Text style={[styles.progressIcon]}>{config.icon}</Text>
        <Text style={[styles.progressTitle, { color: colors.text }]}>{config.title}</Text>
        <Text style={[styles.progressDesc, { color: colors.textSecondary }]}>{config.desc}</Text>

        {ocrText && step === 'parsing' && (
          <View style={[styles.ocrPreviewCard, { backgroundColor: colors.card }]}>
            <View style={styles.ocrHeader}>
              <Text style={styles.ocrHeaderIcon}>✅</Text>
              <Text style={[styles.ocrHeaderText, { color: colors.text }]}>OCR 识别完成</Text>
            </View>
            <View style={[styles.ocrContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.ocrContentText, { color: colors.text }]} numberOfLines={4}>{ocrText}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderResult = () => {
    if (!parsed) return null;

    const isExpense = parsed.type === 'expense';
    const lowConfidence = (val: number) => val < 0.6;

    const displayDate = (() => {
      if (parsed.date && parsed.confidence.date >= 0.6) {
        const d = dayjs(parsed.date, ['YYYY-MM-DD', 'YYYY/MM/DD', 'MM-DD', 'M/D']);
        if (d.isValid() && d.year() >= 2020 && d.year() <= 2030) {
          return d.format('YYYY-MM-DD');
        }
      }
      return dayjs().format('YYYY-MM-DD');
    })();

    const displayTime = (() => {
      if (parsed.time) {
        const t = dayjs(parsed.time, ['HH:mm', 'H:mm', 'HH:mm:ss']);
        if (t.isValid()) return t.format('HH:mm');
      }
      return '';
    })();

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultScrollContent}>
        <View style={[styles.resultContainer, { backgroundColor: colors.card }]}>
          {/* 头部：类型 + 金额 */}
          <View style={[styles.resultHeader, { borderBottomColor: colors.border }]}>
            <View style={[
              styles.typeBadge,
              { backgroundColor: isExpense ? '#FFEBEE' : '#E8F5E9' }
            ]}>
              <Text style={[
                styles.typeBadgeText,
                { color: isExpense ? '#C62828' : '#2E7D32' }
              ]}>
                {isExpense ? '支出' : '收入'}
              </Text>
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>识别金额</Text>
              <Text style={[
                styles.amountValue,
                { color: isExpense ? colors.error : colors.success }
              ]}>
                ¥{parsed.amount.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* 详情列表 */}
          <View style={styles.detailList}>
            <DetailRow
              label="分类"
              value={parsed.categoryName || '未识别'}
              isLowConf={lowConfidence(parsed.confidence.category)}
              icon="📂"
              colors={colors}
            />

            <DetailRow
              label="资金账户"
              value={parsed.fundAccountName || '未识别'}
              isLowConf={lowConfidence(parsed.confidence.fundAccount)}
              icon="💳"
              colors={colors}
            />

            <DetailRow
              label="日期时间"
              value={displayTime ? `${displayDate} ${displayTime}` : displayDate}
              isLowConf={!parsed.date || parsed.confidence.date < 0.6}
              icon="🕐"
              colors={colors}
            />

            <DetailRow
              label="备注"
              value={parsed.note || '--'}
              icon="📝"
              colors={colors}
              last
            />
          </View>

          {/* OCR 原文 */}
          <TouchableOpacity
            style={[styles.ocrExpandCard, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
            onPress={() => setOcrExpanded(!ocrExpanded)}
          >
            <View style={styles.ocrExpandHeader}>
              <Text style={styles.ocrExpandIcon}>📄</Text>
              <Text style={[styles.ocrExpandTitle, { color: colors.text }]}>OCR 原文</Text>
              <Text style={[styles.ocrExpandHint, { color: colors.primary }]}>
                {ocrExpanded ? '收起' : '展开'}
              </Text>
            </View>
            <Text
              style={[styles.ocrExpandText, { color: colors.textSecondary }]}
              numberOfLines={ocrExpanded ? 0 : 2}
            >
              {ocrText}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 操作按钮区 */}
        <View style={styles.actionArea}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            onPress={handleConfirmAndBook}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmBtnIcon}>✓</Text>
            <Text style={styles.confirmBtnText}>确认并记账</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.border }]}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnIcon}>↻</Text>
            <Text style={[styles.retryBtnText, { color: colors.textSecondary }]}>重新识别</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.bottomHint, { color: colors.textSecondary }]}>
          低置信度字段可在记账时修改
        </Text>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {step === 'preview' && renderPreview()}
      {(step === 'ocr' || step === 'parsing') && renderProgress()}
      {step === 'result' && renderResult()}
    </View>
  );
}

function DetailRow({
  label,
  value,
  icon,
  isLowConf,
  colors,
  last = false,
}: {
  label: string;
  value: string;
  icon: string;
  isLowConf?: boolean;
  colors: any;
  last?: boolean;
}) {
  return (
    <View style={[
      styles.detailRow,
      !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
    ]}>
      <View style={styles.detailLeft}>
        <Text style={styles.detailIcon}>{icon}</Text>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[
        styles.detailValue,
        { color: colors.text },
        isLowConf && styles.lowConfValue,
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // 预览页
  previewContainer: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  imageCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  previewImage: {
    width: '100%',
    height: 280,
  },
  noImagePlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  noImageText: {
    fontSize: 15,
  },
  recognizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    minWidth: 240,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  recognizeBtnIcon: {
    fontSize: 18,
  },
  recognizeBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  warningIcon: {
    fontSize: 14,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // 进度页
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressDesc: {
    fontSize: 14,
    marginBottom: 28,
  },
  ocrPreviewCard: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  ocrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  ocrHeaderIcon: {
    fontSize: 16,
  },
  ocrHeaderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ocrContent: {
    borderRadius: 8,
    padding: 12,
  },
  ocrContentText: {
    fontSize: 13,
    lineHeight: 20,
  },

  // 结果页
  resultScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  resultContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountSection: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  detailList: {
    padding: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    fontSize: 18,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  lowConfValue: {
    opacity: 0.55,
    fontStyle: 'italic',
  },
  ocrExpandCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
  },
  ocrExpandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ocrExpandIcon: {
    fontSize: 14,
  },
  ocrExpandTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  ocrExpandHint: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  ocrExpandText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // 操作按钮
  actionArea: {
    marginTop: 20,
    gap: 12,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmBtnIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    backgroundColor: 'transparent',
  },
  retryBtnIcon: {
    fontSize: 18,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  bottomHint: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
  },
});