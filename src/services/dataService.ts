import { supabase } from '../lib/supabase';
import { Transaction, Category, Budget, FundAccount, AutoTransaction } from '../types';

// ============================================
// 交易 CRUD
// ============================================

export async function fetchTransactions(familyId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select()
    .eq('family_id', familyId)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(mapTransactionFromDb);
}

export async function addTransaction(familyId: string, transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      family_id: familyId,
      user_id: user.id,
      category_id: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      note: transaction.note || '',
      account_type: transaction.accountType || 'family',
      fund_account_id: transaction.fundAccountId || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapTransactionFromDb(data);
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
  const updateData: any = {};
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.note !== undefined) updateData.note = updates.note;
  if (updates.fundAccountId !== undefined) updateData.fund_account_id = updates.fundAccountId || null;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapTransactionFromDb(data);
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ============================================
// 个人交易 CRUD（按 user_id，无 family_id）
// ============================================

export async function fetchPersonalTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select()
    .eq('user_id', userId)
    .is('family_id', null)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapTransactionFromDb);
}

export async function addPersonalTransaction(userId: string, transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      category_id: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      note: transaction.note || '',
      account_type: 'personal',
      fund_account_id: transaction.fundAccountId || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapTransactionFromDb(data);
}

// ============================================
// 分类 CRUD
// ============================================

export async function fetchCategories(familyId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select()
    .eq('family_id', familyId)
    .order('order', { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map(mapCategoryFromDb);
}

export async function addCategory(familyId: string, category: Omit<Category, 'id'>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      family_id: familyId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      is_custom: category.isCustom,
      order: category.order,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapCategoryFromDb(data);
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.icon !== undefined) updateData.icon = updates.icon;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.isCustom !== undefined) updateData.is_custom = updates.isCustom;
  if (updates.order !== undefined) updateData.order = updates.order;

  const { data, error } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapCategoryFromDb(data);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ============================================
// 个人分类 CRUD（按 user_id，无 family_id）
// ============================================

export async function fetchPersonalCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select()
    .eq('user_id', userId)
    .is('family_id', null)
    .order('order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map(mapCategoryFromDb);
}

export async function addPersonalCategory(userId: string, category: Omit<Category, 'id'>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      is_custom: category.isCustom,
      order: category.order,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapCategoryFromDb(data);
}

// ============================================
// 预算 CRUD
// ============================================

export async function fetchBudgets(familyId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select()
    .eq('family_id', familyId);

  if (error) throw new Error(error.message);

  return (data || []).map(mapBudgetFromDb);
}

export async function fetchPersonalBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select()
    .eq('user_id', userId)
    .is('family_id', null);

  if (error) throw new Error(error.message);

  return (data || []).map(mapBudgetFromDb);
}

export async function setBudget(familyId: string, month: string, amount: number, categoryId?: string): Promise<Budget> {
  const upsertData: any = {
    family_id: familyId,
    month,
    amount,
  };
  if (categoryId) {
    upsertData.category_id = categoryId;
  }

  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      upsertData,
      { onConflict: 'family_id,month,category_id' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapBudgetFromDb(data);
}

export async function setPersonalBudget(userId: string, month: string, amount: number, categoryId?: string): Promise<Budget> {
  const upsertData: any = {
    user_id: userId,
    month,
    amount,
  };
  if (categoryId) {
    upsertData.category_id = categoryId;
  }

  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      upsertData,
      { onConflict: 'user_id,month,category_id' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapBudgetFromDb(data);
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ============================================
// 实时订阅
// ============================================

export function subscribeTransactions(familyId: string, onChange: () => void) {
  const channel = supabase
    .channel(`transactions-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => {
        console.log('[Realtime] Transaction change:', payload.eventType, payload.new?.id);
        onChange();
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Transactions subscription status:', status);
    });
  return channel;
}

export function subscribeCategories(familyId: string, onChange: () => void) {
  return supabase
    .channel('categories-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'categories',
        filter: `family_id=eq.${familyId}`,
      },
      () => onChange()
    )
    .subscribe();
}

export function subscribeBudgets(familyId: string, onChange: () => void) {
  return supabase
    .channel('budgets-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'budgets',
        filter: `family_id=eq.${familyId}`,
      },
      () => onChange()
    )
    .subscribe();
}

export function subscribeFundAccounts(userId: string, onChange: () => void) {
  return supabase
    .channel('fund-accounts-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'fund_accounts',
        filter: `user_id=eq.${userId}`,
      },
      () => onChange()
    )
    .subscribe();
}


export function unsubscribeAll() {
  return supabase.removeAllChannels();
}

// ============================================
// 自动记账规则 CRUD（按 user_id，个人数据）
// ============================================

function mapAutoTransactionFromDb(row: any): AutoTransaction {
  return {
    id: row.id,
    type: row.type,
    amount: parseFloat(row.amount) || 0,
    categoryId: row.category_id,
    note: row.note || '',
    fundAccountId: row.fund_account_id || undefined,
    familyId: row.family_id || undefined,
    frequency: row.frequency,
    enabled: row.enabled,
    lastExecutedDate: row.last_executed_date || undefined,
    createdAt: row.created_at,
  };
}

export async function fetchAutoTransactions(userId: string): Promise<AutoTransaction[]> {
  const { data, error } = await supabase
    .from('auto_transactions')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map(mapAutoTransactionFromDb);
}

export async function addAutoTransaction(userId: string, rule: AutoTransaction): Promise<AutoTransaction> {
  const { data, error } = await supabase
    .from('auto_transactions')
    .insert({
      user_id: userId,
      type: rule.type,
      amount: rule.amount,
      category_id: rule.categoryId,
      note: rule.note,
      fund_account_id: rule.fundAccountId || null,
      family_id: rule.familyId || null,
      frequency: rule.frequency,
      enabled: rule.enabled,
      last_executed_date: rule.lastExecutedDate || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapAutoTransactionFromDb(data);
}

export async function updateAutoTransaction(id: string, updates: Partial<AutoTransaction>): Promise<AutoTransaction> {
  const updateData: any = {};
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
  if (updates.note !== undefined) updateData.note = updates.note;
  if (updates.fundAccountId !== undefined) updateData.fund_account_id = updates.fundAccountId || null;
  if (updates.familyId !== undefined) updateData.family_id = updates.familyId || null;
  if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
  if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
  if (updates.lastExecutedDate !== undefined) updateData.last_executed_date = updates.lastExecutedDate || null;

  const { data, error } = await supabase
    .from('auto_transactions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapAutoTransactionFromDb(data);
}

export async function deleteAutoTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('auto_transactions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export function subscribeAutoTransactions(userId: string, onChange: () => void) {
  return supabase
    .channel('auto-transactions-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'auto_transactions',
        filter: `user_id=eq.${userId}`,
      },
      () => onChange()
    )
    .subscribe();
}

// ============================================
// 数据映射：数据库字段 → 应用类型
// ============================================

function mapTransactionFromDb(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: parseFloat(row.amount),
    categoryId: row.category_id || '',
    date: row.date,
    note: row.note || '',
    accountType: (row.account_type as 'personal' | 'family') || 'family',
    fundAccountId: row.fund_account_id || undefined,
    familyId: row.family_id || undefined,
    userId: row.user_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function mapCategoryFromDb(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type,
    isCustom: row.is_custom,
    order: row.order,
  };
}

function mapBudgetFromDb(row: any): Budget {
  return {
    id: row.id,
    month: row.month,
    amount: parseFloat(row.amount),
    categoryId: row.category_id || undefined,
    scope: row.family_id ? 'family' : 'personal',
    familyId: row.family_id || undefined,
    userId: row.user_id || undefined,
  };
}

function mapFundAccountFromDb(row: any): FundAccount {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    balance: parseFloat(row.balance) || 0,
    order: row.order,
    isDefault: row.is_default,
  };
}

// ============================================
// 资金账户 CRUD（按 user_id，个人数据）
// ============================================

export async function fetchFundAccounts(userId: string): Promise<FundAccount[]> {
  const { data, error } = await supabase
    .from('fund_accounts')
    .select()
    .eq('user_id', userId)
    .order('order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map(mapFundAccountFromDb);
}

export async function addFundAccount(userId: string, account: FundAccount): Promise<FundAccount> {
  const { data, error } = await supabase
    .from('fund_accounts')
    .insert({
      user_id: userId,
      name: account.name,
      icon: account.icon,
      color: account.color,
      balance: account.balance,
      order: account.order,
      is_default: account.isDefault,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapFundAccountFromDb(data);
}

// ============================================
// 用户设置 CRUD
// ============================================

export async function fetchUserSettings(userId: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select()
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return data;
}

export async function saveUserSettings(userId: string, settings: Record<string, any>): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      currency: settings.currency || 'CNY',
      theme: settings.theme || 'system',
      show_assistant: settings.showAssistant || false,
      llm_provider: settings.llmProvider || null,
      llm_api_key: settings.llmApiKey || null,
      llm_base_url: settings.llmBaseUrl || null,
      llm_model: settings.llmModel || null,
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateFundAccount(id: string, updates: Partial<FundAccount>): Promise<FundAccount> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.icon !== undefined) updateData.icon = updates.icon;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.balance !== undefined) updateData.balance = updates.balance;
  if (updates.order !== undefined) updateData.order = updates.order;

  const { data, error } = await supabase
    .from('fund_accounts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapFundAccountFromDb(data);
}

export async function deleteFundAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('fund_accounts')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function updateFundAccountBalance(id: string, delta: number): Promise<FundAccount> {
  // 使用 RPC 或直接更新
  const { data: account, error: fetchError } = await supabase
    .from('fund_accounts')
    .select('balance')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const newBalance = (parseFloat(account.balance) || 0) + delta;
  const { data, error } = await supabase
    .from('fund_accounts')
    .update({ balance: newBalance })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapFundAccountFromDb(data);
}
