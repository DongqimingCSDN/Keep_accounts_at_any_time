// 交易类型
export type TransactionType = 'expense' | 'income' | 'transfer';

// 记账模式（仅用于兼容旧数据，新逻辑不再区分 personal/family 切换）
export type AccountType = 'personal' | 'family';

// 预算作用域
export type BudgetScope = 'personal' | 'family';

// 资金账户（储户）
export interface FundAccount {
  id: string;
  name: string;
  icon: string; // emoji
  color: string; // 十六进制颜色
  balance: number; // 当前余额
  order: number;
  isDefault: boolean; // 是否预设账户
}

// 交易记录
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD or YYYY-MM-DD HH:mm
  note: string;
  accountType: AccountType; // 兼容旧字段
  fundAccountId?: string; // 关联的资金账户ID（转出账户）
  toFundAccountId?: string; // 转入资金账户ID（仅转账类型）
  familyId?: string; // 所属家庭ID（有值=家庭可见，无值=仅个人）
  userId?: string; // 记账人ID
  createdAt: string; // ISO datetime string
  updatedAt: string;
}

// 分类
export interface Category {
  id: string;
  name: string;
  icon: string; // emoji 字符
  color: string; // 十六进制颜色
  type: TransactionType;
  isCustom: boolean; // 是否用户自定义
  order: number; // 排序
}

// 预算
export interface Budget {
  id: string;
  month: string; // YYYY-MM
  amount: number;
  categoryId?: string; // 分类ID，空表示总预算
  scope: BudgetScope; // personal 或 family
  familyId?: string; // 家庭预算关联的家庭ID
  userId?: string; // 个人预算关联的用户ID
}

export type AutoFrequency = 'daily' | 'weekly' | 'monthly';

export interface AutoTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  note: string;
  fundAccountId?: string;
  familyId?: string;
  frequency: AutoFrequency;
  enabled: boolean;
  lastExecutedDate?: string;
  createdAt: string;
}

// 设置
export interface AppSettings {
  currency: 'CNY' | 'USD' | 'EUR' | 'JPY';
  theme: 'light' | 'dark' | 'system';
  showAssistant?: boolean;
}

// 货币符号映射
export interface CurrencySymbol {
  CNY: '¥';
  USD: '$';
  EUR: '€';
  JPY: '¥';
}
