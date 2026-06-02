import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_SESSION_KEY = '@keep_accounts_auth_session';

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}

// 注册
export async function signUp(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split('@')[0],
      },
    },
  });

  if (error) throw new Error(error.message);
  return data.user;
}

// 登录
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  return data.user;
}

// 登出
export async function signOut() {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

// 获取当前用户
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email || '',
    displayName: user.user_metadata?.display_name,
  } as AuthUser;
}

// 获取当前 session
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// 监听认证状态变化
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
        displayName: session.user.user_metadata?.display_name,
      });
    } else {
      callback(null);
    }
  });
}
