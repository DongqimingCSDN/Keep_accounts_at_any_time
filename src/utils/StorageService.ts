import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category, Budget, AppSettings, AccountType, FundAccount, AutoTransaction } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_FUND_ACCOUNTS } from '../constants/categories';
import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  TRANSACTIONS: '@keep_accounts_transactions',
  CATEGORIES: '@keep_accounts_categories',
  BUDGETS: '@keep_accounts_budgets',
  FUND_ACCOUNTS: '@keep_accounts_fund_accounts',
  SETTINGS: '@keep_accounts_settings',
  ACCOUNT_MODE: '@keep_accounts_account_mode',
  ACTIVE_FAMILY_ID: '@keep_accounts_active_family_id',
  AUTO_TRANSACTIONS: '@keep_accounts_auto_transactions',
};

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'CNY',
  theme: 'system',
  showAssistant: false,
};

// ============ Transactions ============

export async function getTransactions(): Promise<Transaction[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  try {
    const transactions = await getTransactions();
    // 确保交易有 accountType 字段
    const transactionWithAccountType: Transaction = {
      ...transaction,
      accountType: transaction.accountType || 'personal',
    };
    transactions.push(transactionWithAccountType);
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch {
    // Silently fail
  }
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  try {
    const transactions = await getTransactions();
    const index = transactions.findIndex((t) => t.id === transaction.id);
    if (index !== -1) {
      transactions[index] = transaction;
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }
  } catch {
    // Silently fail
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    const transactions = await getTransactions();
    const filtered = transactions.filter((t) => t.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(filtered));
  } catch {
    // Silently fail
  }
}

export async function setTransactions(transactions: Transaction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch {
    // Silently fail
  }
}

// ============ Categories ============

export async function getCategories(): Promise<Category[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (data) {
      return JSON.parse(data);
    }
    // 没有自定义分类时返回预设分类
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function addCategory(category: Category): Promise<void> {
  try {
    const categories = await getCategories();
    categories.push(category);
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch {
    // Silently fail
  }
}

export async function updateCategory(category: Category): Promise<void> {
  try {
    const categories = await getCategories();
    const index = categories.findIndex((c) => c.id === category.id);
    if (index !== -1) {
      categories[index] = category;
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    }
  } catch {
    // Silently fail
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    const categories = await getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));
  } catch {
    // Silently fail
  }
}

export async function setCategories(categories: Category[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch {
    // Silently fail
  }
}

// ============ Budgets ============

export async function getBudgets(): Promise<Budget[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BUDGETS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getBudgetByMonth(month: string, categoryId?: string): Promise<Budget | undefined> {
  try {
    const budgets = await getBudgets();
    return budgets.find((b) => b.month === month && (b.categoryId || undefined) === (categoryId || undefined));
  } catch {
    return undefined;
  }
}

export async function setBudget(budget: Budget): Promise<void> {
  try {
    const budgets = await getBudgets();
    const key = budget.categoryId || '';
    const index = budgets.findIndex((b) => b.month === budget.month && (b.categoryId || '') === key);
    if (index !== -1) {
      budgets[index] = budget;
    } else {
      budgets.push(budget);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  } catch {
    // Silently fail
  }
}

export async function deleteBudget(id: string): Promise<void> {
  try {
    const budgets = await getBudgets();
    const filtered = budgets.filter((b) => b.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(filtered));
  } catch {
    // Silently fail
  }
}

// ============ Settings ============

// ============ Fund Accounts ============

export async function getFundAccounts(): Promise<FundAccount[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FUND_ACCOUNTS);
    if (data) {
      return JSON.parse(data);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.FUND_ACCOUNTS, JSON.stringify(DEFAULT_FUND_ACCOUNTS));
    return DEFAULT_FUND_ACCOUNTS;
  } catch {
    return DEFAULT_FUND_ACCOUNTS;
  }
}

export async function setFundAccounts(accounts: FundAccount[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FUND_ACCOUNTS, JSON.stringify(accounts));
  } catch {}
}

export async function addFundAccount(account: FundAccount): Promise<void> {
  try {
    const accounts = await getFundAccounts();
    accounts.push(account);
    await AsyncStorage.setItem(STORAGE_KEYS.FUND_ACCOUNTS, JSON.stringify(accounts));
  } catch {
    // Silently fail
  }
}

export async function updateFundAccount(account: FundAccount): Promise<void> {
  try {
    const accounts = await getFundAccounts();
    const index = accounts.findIndex((a) => a.id === account.id);
    if (index !== -1) {
      accounts[index] = account;
      await AsyncStorage.setItem(STORAGE_KEYS.FUND_ACCOUNTS, JSON.stringify(accounts));
    }
  } catch {
    // Silently fail
  }
}

export async function deleteFundAccount(id: string): Promise<void> {
  try {
    const accounts = await getFundAccounts();
    const filtered = accounts.filter((a) => a.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.FUND_ACCOUNTS, JSON.stringify(filtered));
  } catch {
    // Silently fail
  }
}

export async function updateFundAccountBalance(id: string, delta: number): Promise<void> {
  try {
    const accounts = await getFundAccounts();
    const index = accounts.findIndex((a) => a.id === id);
    if (index !== -1) {
      accounts[index].balance += delta;
      await AsyncStorage.setItem(STORAGE_KEYS.FUND_ACCOUNTS, JSON.stringify(accounts));
    }
  } catch {
    // Silently fail
  }
}

// ============ Settings ============

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  } catch {
    // Silently fail
  }
}

// ============ Auto Transactions ============

export async function getAutoTransactions(): Promise<AutoTransaction[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function setAutoTransactions(rules: AutoTransaction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTO_TRANSACTIONS, JSON.stringify(rules));
  } catch {}
}

export async function addAutoTransaction(rule: AutoTransaction): Promise<void> {
  try {
    const rules = await getAutoTransactions();
    rules.push(rule);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTO_TRANSACTIONS, JSON.stringify(rules));
  } catch {}
}

export async function updateAutoTransaction(rule: AutoTransaction): Promise<void> {
  try {
    const rules = await getAutoTransactions();
    const index = rules.findIndex((r) => r.id === rule.id);
    if (index !== -1) {
      rules[index] = rule;
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_TRANSACTIONS, JSON.stringify(rules));
    }
  } catch {}
}

export async function deleteAutoTransaction(id: string): Promise<void> {
  try {
    const rules = await getAutoTransactions();
    const filtered = rules.filter((r) => r.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTO_TRANSACTIONS, JSON.stringify(filtered));
  } catch {}
}

// ============ Utilities ============

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TRANSACTIONS,
      STORAGE_KEYS.CATEGORIES,
      STORAGE_KEYS.BUDGETS,
      STORAGE_KEYS.SETTINGS,
    ]);
  } catch {
    // Silently fail
  }
}

export interface ExportEntry {
  date: string;
  type: string;
  category: string;
  amount: number;
  note: string;
  source: string;    // '个人' 或家庭名称
  recorder: string;  // 记账人名称
}

export async function exportToExcel(entries: ExportEntry[]): Promise<string> {
  const wb = XLSX.utils.book_new();
  const mappedEntries = entries.map(e => ({
    '日期': e.date,
    '类型': e.type,
    '分类': e.category,
    '金额': e.amount,
    '备注': e.note,
    '来源': e.source,
    '记账人': e.recorder,
  }));
  const ws = XLSX.utils.json_to_sheet(mappedEntries);

  // 设置列宽
  ws['!cols'] = [
    { wch: 12 }, // 日期
    { wch: 6 },  // 类型
    { wch: 10 }, // 分类
    { wch: 12 }, // 金额
    { wch: 20 }, // 备注
    { wch: 14 }, // 来源
    { wch: 14 }, // 记账人
  ];

  XLSX.utils.book_append_sheet(wb, ws, '交易记录');

  // 导出为 base64 字符串
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  return wbout;
}

// ============ Account Mode ============

export async function getAccountMode(): Promise<AccountType> {
  try {
    const mode = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_MODE);
    return (mode === 'family' ? 'family' : 'personal') as AccountType;
  } catch {
    return 'personal';
  }
}

export async function setAccountMode(mode: AccountType): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNT_MODE, mode);
  } catch {
    // Silently fail
  }
}

// ============ Active Family ID ============

export async function getActiveFamilyId(): Promise<string | null> {
  try {
    const familyId = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_FAMILY_ID);
    return familyId || null;
  } catch {
    return null;
  }
}

export async function setActiveFamilyId(familyId: string | null): Promise<void> {
  try {
    if (familyId) {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_FAMILY_ID, familyId);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_FAMILY_ID);
    }
  } catch {
    // Silently fail
  }
}

export { STORAGE_KEYS, DEFAULT_SETTINGS };
