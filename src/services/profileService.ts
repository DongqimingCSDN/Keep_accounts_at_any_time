import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  displayName: string;
  avatar: string; // emoji 或图片URL
  email: string;
}

// 预设头像列表（emoji）
export const AVATAR_OPTIONS = [
  '😊', '😎', '🤓', '😺', '🐶', '🦊', '🐼', '🦁',
  '🐸', '🐵', '🦄', '🐧', '🐝', '🦋', '🐙', '🐳',
  '🌸', '🌻', '🍀', '⭐', '🌙', '🔥', '💎', '🎯',
];

// 获取当前用户资料
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select()
    .eq('id', user.id)
    .single();

  if (error) {
    // 如果资料不存在，创建一个
    if (error.code === 'PGRST116') {
      return await createProfile(
        user.user_metadata?.display_name || user.email?.split('@')[0] || '用户',
        '',
        user.email || ''
      );
    }
    return null;
  }

  return {
    id: data.id,
    displayName: data.display_name || '',
    avatar: data.avatar || '',
    email: data.email || '',
  };
}

// 获取指定用户的资料
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select()
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    displayName: data.display_name || '',
    avatar: data.avatar || '',
    email: data.email || '',
  };
}

// 批量获取用户资料
export async function getProfiles(userIds: string[]): Promise<UserProfile[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select()
    .in('id', userIds);

  if (error || !data) return [];

  return data.map((p: any) => ({
    id: p.id,
    displayName: p.display_name || '',
    avatar: p.avatar || '',
    email: p.email || '',
  }));
}

// 创建用户资料
export async function createProfile(
  displayName: string,
  avatar: string,
  email: string
): Promise<UserProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      display_name: displayName,
      avatar,
      email,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    displayName: data.display_name || '',
    avatar: data.avatar || '',
    email: data.email || '',
  };
}

// 更新用户资料
export async function updateProfile(
  updates: { displayName?: string; avatar?: string }
): Promise<UserProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const updateData: any = { updated_at: new Date().toISOString() };
  if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
  if (updates.avatar !== undefined) updateData.avatar = updates.avatar;

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 同步更新 auth user_metadata 中的 display_name
  if (updates.displayName !== undefined) {
    await supabase.auth.updateUser({
      data: { display_name: updates.displayName },
    });
  }

  return {
    id: data.id,
    displayName: data.display_name || '',
    avatar: data.avatar || '',
    email: data.email || '',
  };
}
