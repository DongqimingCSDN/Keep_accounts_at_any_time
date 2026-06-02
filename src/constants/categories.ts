import { Category, FundAccount } from '../types';

export const DEFAULT_FUND_ACCOUNTS: FundAccount[] = [
  { id: 'fund_wechat', name: '微信', icon: '💬', color: '#07C160', balance: 0, order: 0, isDefault: true },
  { id: 'fund_alipay', name: '支付宝', icon: '🔵', color: '#1677FF', balance: 0, order: 1, isDefault: true },
  { id: 'fund_cash', name: '现金', icon: '💵', color: '#F5A623', balance: 0, order: 2, isDefault: true },
  { id: 'fund_bank', name: '银行卡', icon: '🏦', color: '#6C5CE7', balance: 0, order: 3, isDefault: true },
];

export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: 'expense_food', name: '餐饮', icon: '🍜', color: '#FF6B6B', type: 'expense', isCustom: false, order: 0 },
  { id: 'expense_transport', name: '交通', icon: '🚗', color: '#4ECDC4', type: 'expense', isCustom: false, order: 1 },
  { id: 'expense_shopping', name: '购物', icon: '🛍️', color: '#FF9F43', type: 'expense', isCustom: false, order: 2 },
  { id: 'expense_entertainment', name: '娱乐', icon: '🎮', color: '#A29BFE', type: 'expense', isCustom: false, order: 3 },
  { id: 'expense_housing', name: '居住', icon: '🏠', color: '#6C5CE7', type: 'expense', isCustom: false, order: 4 },
  { id: 'expense_medical', name: '医疗', icon: '💊', color: '#FD79A8', type: 'expense', isCustom: false, order: 5 },
  { id: 'expense_education', name: '教育', icon: '📚', color: '#00B894', type: 'expense', isCustom: false, order: 6 },
  { id: 'expense_communication', name: '通讯', icon: '📱', color: '#FDCB6E', type: 'expense', isCustom: false, order: 7 },
  { id: 'expense_other', name: '其他', icon: '📌', color: '#636E72', type: 'expense', isCustom: false, order: 8 },
];

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { id: 'income_salary', name: '工资', icon: '💰', color: '#00B894', type: 'income', isCustom: false, order: 0 },
  { id: 'income_parttime', name: '兼职', icon: '💼', color: '#0984E3', type: 'income', isCustom: false, order: 1 },
  { id: 'income_investment', name: '投资', icon: '📈', color: '#6C5CE7', type: 'income', isCustom: false, order: 2 },
  { id: 'income_redpacket', name: '红包', icon: '🧧', color: '#E17055', type: 'income', isCustom: false, order: 3 },
  { id: 'income_other', name: '其他', icon: '📌', color: '#636E72', type: 'income', isCustom: false, order: 4 },
];

export const DEFAULT_CATEGORIES: Category[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];
