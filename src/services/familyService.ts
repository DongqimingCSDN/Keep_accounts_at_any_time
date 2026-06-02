import { supabase } from '../lib/supabase';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants/categories';

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
  displayName?: string;
  email?: string;
}

// 检查用户是否已在某个家庭中
export async function isUserInAnyFamily(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('family_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

// 同步默认分类到 Supabase，返回 localId → supabaseId 的映射
async function seedDefaultCategories(familyId: string): Promise<void> {
  const allCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];

  for (const cat of allCategories) {
    // 为每个家庭生成唯一的分类ID，避免冲突
    const uniqueCategoryId = `${familyId}_${cat.id}`;
    await supabase
      .from('categories')
      .insert({
        id: uniqueCategoryId,
        family_id: familyId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        is_custom: cat.isCustom,
        order: cat.order,
      });
  }
}

// 创建家庭（同时创建默认分类）
export async function createFamily(name: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 检查用户是否已在某个家庭中
  const alreadyInFamily = await isUserInAnyFamily();
  if (alreadyInFamily) {
    throw new Error('您已在一个家庭中，请先退出当前家庭才能创建新家庭');
  }

  // 创建家庭
  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({ name, created_by: user.id })
    .select()
    .single();

  if (familyError) {
    console.error('创建家庭失败:', familyError);
    throw new Error(`创建家庭失败: ${familyError.message}`);
  }

  // 创建者自动加入家庭为 owner
  const { data: memberData, error: memberError } = await supabase
    .from('family_members')
    .insert({
      family_id: family.id,
      user_id: user.id,
      role: 'owner',
    })
    .select()
    .single();

  if (memberError) {
    console.error('添加家庭成员失败:', memberError);
    throw new Error(`添加家庭成员失败: ${memberError.message}`);
  }

  // 同步默认分类
  try {
    await seedDefaultCategories(family.id);
  } catch (categoryError: any) {
    console.error('同步默认分类失败:', categoryError);
    // 如果分类同步失败，回滚家庭创建
    try {
      await supabase
        .from('families')
        .delete()
        .eq('id', family.id);
    } catch (rollbackError) {
      console.error('回滚家庭创建失败:', rollbackError);
    }
    throw new Error(`同步默认分类失败: ${categoryError.message || categoryError}`);
  }

  return {
    id: family.id,
    name: family.name,
    inviteCode: family.invite_code,
    createdBy: family.created_by,
    createdAt: family.created_at,
  } as Family;
}

// 通过邀请码加入家庭
export async function joinFamily(inviteCode: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 检查用户是否已在某个家庭中
  const alreadyInFamily = await isUserInAnyFamily();
  if (alreadyInFamily) {
    throw new Error('您已在一个家庭中，请先退出当前家庭才能加入新家庭');
  }

  // 查找家庭
  const { data: family, error: findError } = await supabase
    .from('families')
    .select()
    .eq('invite_code', inviteCode)
    .single();

  if (findError || !family) {
    console.error('查找家庭失败:', findError);
    throw new Error('邀请码无效，未找到对应家庭');
  }

  // 检查是否已加入
  const { data: existing } = await supabase
    .from('family_members')
    .select()
    .eq('family_id', family.id)
    .eq('user_id', user.id)
    .single();

  if (existing) throw new Error('你已经在这个家庭中了');

  // 加入家庭
  const { error: joinError } = await supabase
    .from('family_members')
    .insert({
      family_id: family.id,
      user_id: user.id,
      role: 'member',
    });

  if (joinError) {
    console.error('加入家庭失败:', joinError);
    throw new Error(`加入家庭失败: ${joinError.message}`);
  }

  return {
    id: family.id,
    name: family.name,
    inviteCode: family.invite_code,
    createdBy: family.created_by,
    createdAt: family.created_at,
  } as Family;
}

// 获取用户所在的家庭（单个，用于兼容性）
export async function getUserFamily() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .single();

  if (!member) return null;

  const { data: family } = await supabase
    .from('families')
    .select()
    .eq('id', member.family_id)
    .single();

  if (!family) return null;

  return {
    id: family.id,
    name: family.name,
    inviteCode: family.invite_code,
    createdBy: family.created_by,
    createdAt: family.created_at,
  } as Family;
}

// 获取用户的所有家庭
export async function getFamiliesForUser(): Promise<Family[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 获取用户所属的所有家庭成员记录
  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id);

  if (membersError || !members || members.length === 0) return [];

  // 获取所有家庭信息
  const familyIds = members.map(m => m.family_id);
  const { data: families, error: familiesError } = await supabase
    .from('families')
    .select('*')
    .in('id', familyIds);

  if (familiesError || !families) return [];

  return families.map(family => ({
    id: family.id,
    name: family.name,
    inviteCode: family.invite_code,
    createdBy: family.created_by,
    createdAt: family.created_at,
  })) as Family[];
}

// 获取家庭成员列表（含用户名）
export async function getFamilyMembers(familyId: string) {
  const { data, error } = await supabase
    .from('family_members')
    .select(`
      id,
      family_id,
      user_id,
      role,
      joined_at,
      display_name
    `)
    .eq('family_id', familyId)
    .order('joined_at', { ascending: true });

  if (error) throw new Error(error.message);

  // 获取所有成员的用户信息
  const members = (data || []).map((m: any) => ({
    id: m.id,
    familyId: m.family_id,
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    displayName: m.display_name || undefined,
  })) as FamilyMember[];

  // 补充用户显示名（仅当 display_name 为空时）
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    for (const member of members) {
      if (member.displayName) continue; // 已有备注名，跳过
      
      if (member.userId === currentUser?.id) {
        member.displayName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || '我';
        member.email = currentUser.email || '';
      }
    }
    
    // 对于其他成员，尝试从 profiles 获取
    const otherMembers = members.filter(m => !m.displayName);
    if (otherMembers.length > 0) {
      const otherUserIds = otherMembers.map(m => m.userId);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', otherUserIds);
      
      if (profiles && profiles.length > 0) {
        for (const member of otherMembers) {
          const profile = profiles.find((p: any) => p.id === member.userId);
          if (profile) {
            member.displayName = profile.display_name || profile.email?.split('@')[0] || '成员';
            member.email = profile.email || '';
          }
        }
      }
      
      // 对于没有获取到信息的成员，使用默认名称
      for (const member of otherMembers) {
        if (!member.displayName) {
          member.displayName = `成员${member.userId.substring(0, 4)}`;
        }
      }
    }
  } catch (e) {
    // 获取用户名失败，使用默认名称
    for (const member of members) {
      if (!member.displayName) {
        member.displayName = `成员${member.userId.substring(0, 4)}`;
      }
    }
  }

  return members;
}

// 更新成员备注名称（仅 owner 可操作）
export async function updateMemberDisplayName(memberId: string, displayName: string) {
  const { data, error } = await supabase
    .from('family_members')
    .update({ display_name: displayName })
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    console.error('更新成员备注名失败:', error);
    throw new Error('更新备注名失败，仅家庭创建者可操作');
  }

  return {
    id: data.id,
    familyId: data.family_id,
    userId: data.user_id,
    role: data.role,
    joinedAt: data.joined_at,
    displayName: data.display_name || undefined,
  } as FamilyMember;
}

// 删除家庭成员（仅 owner 可操作）
export async function removeFamilyMember(memberId: string) {
  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('删除家庭成员失败:', error);
    throw new Error('删除成员失败，仅家庭创建者可操作');
  }
}

// 将个人账单迁移到家庭（加入家庭时调用）
export async function migratePersonalTransactionsToFamily(
  familyId: string,
  afterDate: string // YYYY-MM-DD，此日期之后的个人账单迁移到家庭
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 获取用户的个人账单（本地存储中的，通过 DataService 查询 Supabase 中无 family_id 的）
  // 这里我们更新 Supabase 中该用户没有 family_id 且日期在 afterDate 之后的交易
  const { data: transactions, error: fetchError } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id)
    .is('family_id', null)
    .gte('date', afterDate)
    .eq('is_private', false);

  if (fetchError) {
    console.error('查询可迁移交易失败:', fetchError);
    return 0;
  }

  if (!transactions || transactions.length === 0) return 0;

  // 批量更新 family_id
  const { error: updateError } = await supabase
    .from('transactions')
    .update({ family_id: familyId, account_type: 'family' })
    .in('id', transactions.map(t => t.id));

  if (updateError) {
    console.error('迁移交易失败:', updateError);
    throw new Error('迁移个人账单到家庭失败');
  }

  return transactions.length;
}

// 离开家庭（保留自己的账单为个人账单，删除他人账单的本地引用）
export async function leaveFamily(familyId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 检查是否是最后一个 owner，如果是则不能离开
  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', user.id)
    .single();

  if (membersError) {
    console.error('获取成员信息失败:', membersError);
    if (membersError.code === 'PGRST116') {
      throw new Error('您不是该家庭的成员');
    }
    throw new Error('获取成员信息失败，请重试');
  }

  if (!members) {
    throw new Error('您不是该家庭的成员');
  }

  if (members.role === 'owner') {
    // 检查是否有其他成员
    const { data: otherMembers, error: otherError } = await supabase
      .from('family_members')
      .select('id', { count: 'exact' })
      .eq('family_id', familyId)
      .neq('user_id', user.id);

    if (otherError) {
      console.error('检查其他成员失败:', otherError);
      throw new Error('无法检查家庭成员状态');
    }

    if (otherMembers && otherMembers.length > 0) {
      throw new Error('作为家庭创建者，您需要先将创建者权限转移给其他成员，或者删除整个家庭');
    }
    // 如果没有其他成员，可以直接删除家庭成员记录（这会自动删除家庭）
  }

  try {
    // 将自己的家庭账单转回个人账单（移除 family_id）
    await supabase
      .from('transactions')
      .update({ family_id: null, account_type: 'personal' })
      .eq('family_id', familyId)
      .eq('user_id', user.id)
      .eq('is_private', false);

    // 删除其他成员的交易记录
    await supabase
      .from('transactions')
      .delete()
      .eq('family_id', familyId)
      .neq('user_id', user.id);

    // 删除用户的分类记录（如果是自定义分类）
    await supabase
      .from('categories')
      .delete()
      .eq('family_id', familyId)
      .eq('is_custom', true);

    // 删除家庭预算
    await supabase
      .from('budgets')
      .delete()
      .eq('family_id', familyId);

    // 最后删除家庭成员记录
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('family_id', familyId)
      .eq('user_id', user.id);

    if (error) {
      console.error('离开家庭失败:', error);
      throw new Error(`离开家庭失败: ${error.message}`);
    }
  } catch (deleteError: any) {
    console.error('删除数据失败:', deleteError);
    throw new Error(`离开家庭失败: ${deleteError.message || deleteError}`);
  }
}

// 更新家庭名称（仅 owner 可操作）
export async function updateFamilyName(familyId: string, name: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 检查是否是 owner
  const { data: member, error: memberError } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !member) {
    throw new Error('您不是该家庭的成员');
  }

  if (member.role !== 'owner') {
    throw new Error('仅家庭创建者可以修改家庭名称');
  }

  const { data, error } = await supabase
    .from('families')
    .update({ name })
    .eq('id', familyId)
    .select()
    .single();

  if (error) {
    console.error('更新家庭名称失败:', error);
    throw new Error('更新家庭名称失败');
  }

  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    createdBy: data.created_by,
    createdAt: data.created_at,
  } as Family;
}
