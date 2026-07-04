import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as NotificationsTypes from 'expo-notifications';

const REMINDER_STORAGE_KEY = '@keep_accounts_reminder';

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:mm 格式，默认 "20:00"
}

const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  time: '20:00',
};

// Android 通知渠道 ID
const CHANNEL_ID = 'bookkeeping-reminder';

// 每日提醒通知 ID
const DAILY_REMINDER_ID = 'daily-bookkeeping-reminder';

// ============ Expo Go 检测 ============

// SDK 53 起，Expo Go 移除了 expo-notifications 的推送功能
// 在 Expo Go 中运行时，连 import 本身都会触发错误，必须动态加载
const isExpoGo = Constants.appOwnership === 'expo';

// 懒加载 expo-notifications，仅在非 Expo Go 环境中才真正导入
let _Notifications: typeof NotificationsTypes | null = null;
let _loadFailed = false;

async function getNotifications(): Promise<typeof NotificationsTypes | null> {
  if (isExpoGo) return null;
  if (_loadFailed) return null;
  if (_Notifications) return _Notifications;
  try {
    _Notifications = await import('expo-notifications');
    return _Notifications;
  } catch {
    _loadFailed = true;
    return null;
  }
}

// ============ 通知配置 ============

let _handlerInitialized = false;

async function initNotificationHandler(): Promise<void> {
  if (_handlerInitialized) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  _handlerInitialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ============ 权限管理 ============

async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Android 需要创建通知渠道
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '记账提醒',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5B6CF7',
      sound: 'default',
    });
  }

  return true;
}

// ============ 提醒调度 ============

async function scheduleDailyReminder(time: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await initNotificationHandler();

  await cancelAllReminders();

  const [hours, minutes] = time.split(':').map(Number);

  const trigger: NotificationsTypes.DailyTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: hours,
    minute: minutes,
  };

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: '记账提醒',
      body: '别忘了记录今天的收支哦！坚持记账，掌握财务状况。',
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger,
  });
}

async function cancelAllReminders(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {
    // 忽略取消失败
  }
}

// ============ 读取/保存提醒设置 ============

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const data = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
    return data ? { ...DEFAULT_REMINDER, ...JSON.parse(data) } : DEFAULT_REMINDER;
  } catch {
    return DEFAULT_REMINDER;
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
}

// ============ 一键启用/禁用/更新 ============

export async function applyReminder(settings: ReminderSettings): Promise<void> {
  await saveReminderSettings(settings);

  if (settings.enabled) {
    const hasPermission = await requestNotificationPermissions();
    if (hasPermission) {
      await scheduleDailyReminder(settings.time);
    }
  } else {
    await cancelAllReminders();
  }
}

// ============ 启动时恢复提醒 ============

export async function restoreReminderOnStartup(): Promise<void> {
  if (isExpoGo) return;

  const settings = await getReminderSettings();
  if (settings.enabled) {
    const hasPermission = await requestNotificationPermissions();
    if (hasPermission) {
      await scheduleDailyReminder(settings.time);
    }
  }
}

// 导出 isExpoGo 供 UI 层判断是否显示提示
export { isExpoGo };