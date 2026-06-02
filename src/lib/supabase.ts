import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase 配置
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// 判断是否已配置 Supabase
export const isSupabaseConfigured = (): boolean => {
  return (
    SUPABASE_URL.length > 0 &&
    !SUPABASE_URL.includes('YOUR_') &&
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_ANON_KEY.length > 0 &&
    !SUPABASE_ANON_KEY.includes('YOUR_')
  );
};

// 只有配置了有效的 Supabase 凭据才创建客户端
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase 未配置');
    }
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: AsyncStorage,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return _supabase;
}

// 兼容旧代码的导出（懒初始化）
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!isSupabaseConfigured()) return undefined;
    const client = getSupabase();
    return (client as any)[prop];
  },
});
