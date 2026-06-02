import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Transaction, Category, Budget, AppSettings, AccountType, FundAccount, BudgetScope, AutoTransaction } from '../types';
import * as StorageService from '../utils/StorageService';
import * as DataService from '../services/dataService';
import { getCurrentUser, onAuthStateChange, AuthUser } from '../services/authService';
import { getFamilyMembers, Family, FamilyMember, getFamiliesForUser, migratePersonalTransactionsToFamily } from '../services/familyService';
import { getCurrentProfile, UserProfile } from '../services/profileService';
import { DEFAULT_CATEGORIES, DEFAULT_FUND_ACCOUNTS } from '../constants/categories';
import { isSupabaseConfigured } from '../lib/supabase';

// ============ State ============

interface AppState {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  fundAccounts: FundAccount[];
  autoTransactions: AutoTransaction[];
  settings: AppSettings;
  isLoading: boolean;
  isOnline: boolean;
  currentUser: AuthUser | null;
  currentFamily: Family | null;
  userFamilies: Family[];
  activeFamilyId: string | null;
  familyMembers: FamilyMember[];
  userProfile: UserProfile | null;
}

const initialState: AppState = {
  transactions: [],
  categories: [],
  budgets: [],
  fundAccounts: [],
  autoTransactions: [],
  settings: { currency: 'CNY', theme: 'system' },
  isLoading: true,
  isOnline: false,
  currentUser: null,
  currentFamily: null,
  userFamilies: [],
  activeFamilyId: null,
  familyMembers: [],
  userProfile: null,
};

// ============ Actions ============

type AppAction =
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'SET_BUDGETS'; payload: Budget[] }
  | { type: 'SET_BUDGET'; payload: Budget }
  | { type: 'DELETE_BUDGET'; payload: string }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_USER'; payload: AuthUser | null }
  | { type: 'SET_FAMILY'; payload: Family | null }
  | { type: 'SET_USER_FAMILIES'; payload: Family[] }
  | { type: 'SET_ACTIVE_FAMILY'; payload: string | null }
  | { type: 'SET_FAMILY_MEMBERS'; payload: FamilyMember[] }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_FUND_ACCOUNTS'; payload: FundAccount[] }
  | { type: 'ADD_FUND_ACCOUNT'; payload: FundAccount }
  | { type: 'UPDATE_FUND_ACCOUNT'; payload: FundAccount }
  | { type: 'DELETE_FUND_ACCOUNT'; payload: string }
  | { type: 'SET_AUTO_TRANSACTIONS'; payload: AutoTransaction[] }
  | { type: 'ADD_AUTO_TRANSACTION'; payload: AutoTransaction }
  | { type: 'UPDATE_AUTO_TRANSACTION'; payload: AutoTransaction }
  | { type: 'DELETE_AUTO_TRANSACTION'; payload: string };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
      };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
      };
    case 'SET_BUDGETS':
      return { ...state, budgets: action.payload };
    case 'SET_BUDGET': {
      const key = action.payload.categoryId || '';
      const scope = action.payload.scope || 'personal';
      const index = state.budgets.findIndex((b) =>
        b.month === action.payload.month &&
        (b.categoryId || '') === key &&
        (b.scope || 'personal') === scope
      );
      if (index !== -1) {
        const updated = [...state.budgets];
        updated[index] = action.payload;
        return { ...state, budgets: updated };
      }
      return { ...state, budgets: [...state.budgets, action.payload] };
    }
    case 'DELETE_BUDGET':
      return { ...state, budgets: state.budgets.filter((b) => b.id !== action.payload) };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_FAMILY':
      return { ...state, currentFamily: action.payload };
    case 'SET_USER_FAMILIES':
      return { ...state, userFamilies: action.payload };
    case 'SET_ACTIVE_FAMILY':
      return { ...state, activeFamilyId: action.payload };
    case 'SET_FAMILY_MEMBERS':
      return { ...state, familyMembers: action.payload };
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };
    case 'SET_FUND_ACCOUNTS':
      return { ...state, fundAccounts: action.payload };
    case 'ADD_FUND_ACCOUNT':
      return { ...state, fundAccounts: [...state.fundAccounts, action.payload] };
    case 'UPDATE_FUND_ACCOUNT':
      return {
        ...state,
        fundAccounts: state.fundAccounts.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'DELETE_FUND_ACCOUNT':
      return {
        ...state,
        fundAccounts: state.fundAccounts.filter((a) => a.id !== action.payload),
      };
    case 'SET_AUTO_TRANSACTIONS':
      return { ...state, autoTransactions: action.payload };
    case 'ADD_AUTO_TRANSACTION':
      return { ...state, autoTransactions: [...state.autoTransactions, action.payload] };
    case 'UPDATE_AUTO_TRANSACTION':
      return {
        ...state,
        autoTransactions: state.autoTransactions.map((r) =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'DELETE_AUTO_TRANSACTION':
      return {
        ...state,
        autoTransactions: state.autoTransactions.filter((r) => r.id !== action.payload),
      };
    default:
      return state;
  }
}

// ============ Context ============

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  refreshData: () => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  login: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  setFamily: (family: Family) => Promise<void>;
  setActiveFamily: (familyId: string | null) => Promise<void>;
  updateUserProfile: (updates: { displayName?: string; avatar?: string }) => Promise<void>;
  addFundAccount: (account: FundAccount) => Promise<void>;
  updateFundAccount: (account: FundAccount) => Promise<void>;
  deleteFundAccount: (id: string) => Promise<void>;
  reorderFundAccounts: (accounts: FundAccount[]) => Promise<void>;
  addAutoTransaction: (rule: AutoTransaction) => Promise<void>;
  updateAutoTransaction: (rule: AutoTransaction) => Promise<void>;
  deleteAutoTransaction: (id: string) => Promise<void>;
  toggleAutoTransaction: (id: string) => Promise<void>;
  executeAutoTransactions: () => Promise<void>;
  transferFundAccount: (fromAccountId: string, toAccountId: string, amount: number, note: string) => Promise<void>;
  joinFamilyWithMigration: (inviteCode: string, migrateAfterDate?: string) => Promise<Family>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============ Provider ============

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const subscriptionsRef = useRef<any[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    loadInitialData();
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = onAuthStateChange(async (user) => {
        dispatch({ type: 'SET_USER', payload: user });
        if (!user) {
          dispatch({ type: 'SET_FAMILY', payload: null });
          dispatch({ type: 'SET_USER_FAMILIES', payload: [] });
          dispatch({ type: 'SET_ACTIVE_FAMILY', payload: null });
          dispatch({ type: 'SET_ONLINE', payload: false });
          cleanupSubscriptions();
        } else {
          try {
            const profile = await getCurrentProfile();
            dispatch({ type: 'SET_USER_PROFILE', payload: profile });
          } catch {}

          const families = await getFamiliesForUser();
          dispatch({ type: 'SET_USER_FAMILIES', payload: families });

          const activeFamilyId = await StorageService.getActiveFamilyId();
          const currentFamily = families.find(f => f.id === activeFamilyId) || families[0] || null;
          dispatch({ type: 'SET_ACTIVE_FAMILY', payload: currentFamily?.id || null });
          dispatch({ type: 'SET_FAMILY', payload: currentFamily });

          if (currentFamily) {
            await loadOnlineData(currentFamily.id);
          } else {
            await loadPersonalOnlineData(user.id);
          }
        }
      });

      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && state.activeFamilyId) {
          loadOnlineData(state.activeFamilyId);
        }
      };
      const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

      return () => {
        subscription.unsubscribe();
        cleanupSubscriptions();
        appStateSubscription.remove();
      };
    }
  }, []);

  const hasExecutedAutoRef = useRef(false);
  useEffect(() => {
    if (!state.isLoading && !hasExecutedAutoRef.current && state.autoTransactions.length > 0) {
      hasExecutedAutoRef.current = true;
      executeAutoTransactions();
    }
  }, [state.isLoading]);

  const cleanupSubscriptions = () => {
    subscriptionsRef.current.forEach((sub) => sub?.unsubscribe?.());
    subscriptionsRef.current = [];
    DataService.unsubscribeAll();
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const loadInitialData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // 先加载本地数据
      const [transactions, categories, budgets, fundAccounts, settings, autoTransactions] = await Promise.all([
        StorageService.getTransactions(),
        StorageService.getCategories(),
        StorageService.getBudgets(),
        StorageService.getFundAccounts(),
        StorageService.getSettings(),
        StorageService.getAutoTransactions(),
      ]);
      dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
      // 兼容旧预算数据
      const migratedBudgets = budgets.map((b: any) => ({
        ...b,
        scope: b.scope || 'personal',
      }));
      dispatch({ type: 'SET_BUDGETS', payload: migratedBudgets });
      dispatch({ type: 'SET_FUND_ACCOUNTS', payload: fundAccounts });
      dispatch({ type: 'SET_AUTO_TRANSACTIONS', payload: autoTransactions });
      dispatch({ type: 'SET_SETTINGS', payload: settings });

      // 检查是否已登录
      if (isSupabaseConfigured()) {
        const user = await getCurrentUser();
        if (user) {
          dispatch({ type: 'SET_USER', payload: user });
          
          try {
            const profile = await getCurrentProfile();
            dispatch({ type: 'SET_USER_PROFILE', payload: profile });
          } catch {}
          
          const families = await getFamiliesForUser();
          dispatch({ type: 'SET_USER_FAMILIES', payload: families });
          
          const activeFamilyId = await StorageService.getActiveFamilyId();
          dispatch({ type: 'SET_ACTIVE_FAMILY', payload: activeFamilyId });
          
          const currentFamily = families.find(f => f.id === activeFamilyId) || families[0] || null;
          dispatch({ type: 'SET_FAMILY', payload: currentFamily });
          
          if (currentFamily) {
            await loadOnlineData(currentFamily.id);
          } else {
            await loadPersonalOnlineData(user.id);
          }
        }
      }
    } catch {
      // Use default state on error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadOnlineData = async (familyId: string) => {
    try {
      const [transactions, categories, budgets, members] = await Promise.all([
        DataService.fetchTransactions(familyId),
        DataService.fetchCategories(familyId),
        DataService.fetchBudgets(familyId),
        getFamilyMembers(familyId),
      ]);
      const onlineTxIds = new Set(transactions.map((t: Transaction) => t.id));
      const localNotInOnline = stateRef.current.transactions.filter(t => t.familyId && !onlineTxIds.has(t.id));
      const mergedTransactions = [...localNotInOnline, ...transactions];
      dispatch({ type: 'SET_TRANSACTIONS', payload: mergedTransactions });
      dispatch({ type: 'SET_CATEGORIES', payload: categories.length > 0 ? categories : DEFAULT_CATEGORIES });
      const migratedBudgets = budgets.map((b: any) => ({
        ...b,
        scope: b.scope || 'family',
        familyId: b.familyId || familyId,
      }));
      const localPersonalBudgets = stateRef.current.budgets.filter((b) => (b.scope || 'personal') === 'personal');
      const onlineBudgetIds = new Set(migratedBudgets.map((b: Budget) => b.id));
      const keptLocalBudgets = localPersonalBudgets.filter((b) => !onlineBudgetIds.has(b.id));
      dispatch({ type: 'SET_BUDGETS', payload: [...keptLocalBudgets, ...migratedBudgets] });
      const fundAccounts = state.currentUser
        ? await DataService.fetchFundAccounts(state.currentUser.id).catch(() => null)
        : null;
      dispatch({ type: 'SET_FUND_ACCOUNTS', payload: fundAccounts && fundAccounts.length > 0 ? fundAccounts : await StorageService.getFundAccounts() });
      if (state.currentUser) {
        try {
          const autoRules = await DataService.fetchAutoTransactions(state.currentUser.id);
          dispatch({ type: 'SET_AUTO_TRANSACTIONS', payload: autoRules });
          await StorageService.setAutoTransactions(autoRules);
        } catch {
          const autoRules = await StorageService.getAutoTransactions();
          dispatch({ type: 'SET_AUTO_TRANSACTIONS', payload: autoRules });
        }
      }
      dispatch({ type: 'SET_FAMILY_MEMBERS', payload: members });
      dispatch({ type: 'SET_ONLINE', payload: true });

      setupRealtimeSubscriptions(familyId);
    } catch {
      dispatch({ type: 'SET_CATEGORIES', payload: DEFAULT_CATEGORIES });
      dispatch({ type: 'SET_FUND_ACCOUNTS', payload: DEFAULT_FUND_ACCOUNTS });
      dispatch({ type: 'SET_ONLINE', payload: false });
    }
  };

  const setupRealtimeSubscriptions = (familyId: string) => {
    cleanupSubscriptions();
    const onTransactionChange = () => DataService.fetchTransactions(familyId).then((data) => {
      const onlineTxIds = new Set(data.map((t: Transaction) => t.id));
      const localNotInOnline = stateRef.current.transactions.filter(t => t.familyId && !onlineTxIds.has(t.id));
      dispatch({ type: 'SET_TRANSACTIONS', payload: [...localNotInOnline, ...data] });
    });
    const onCategoryChange = () => DataService.fetchCategories(familyId).then((data) => dispatch({ type: 'SET_CATEGORIES', payload: data }));
    const onBudgetChange = () => DataService.fetchBudgets(familyId).then((data) => {
      const migrated = data.map((b: any) => ({ ...b, scope: b.scope || 'family', familyId: b.familyId || familyId }));
      const localPersonalBudgets = stateRef.current.budgets.filter((b) => (b.scope || 'personal') === 'personal');
      const onlineBudgetIds = new Set(migrated.map((b: Budget) => b.id));
      const keptLocalBudgets = localPersonalBudgets.filter((b) => !onlineBudgetIds.has(b.id));
      dispatch({ type: 'SET_BUDGETS', payload: [...keptLocalBudgets, ...migrated] });
    });

    const sub1 = DataService.subscribeTransactions(familyId, onTransactionChange);
    const sub2 = DataService.subscribeCategories(familyId, onCategoryChange);
    const sub3 = DataService.subscribeBudgets(familyId, onBudgetChange);
    
    subscriptionsRef.current.push(sub1, sub2, sub3);

    if (state.currentUser) {
      const onFundAccountChange = () => DataService.fetchFundAccounts(state.currentUser!.id).then((data) => {
        if (data.length > 0) {
          dispatch({ type: 'SET_FUND_ACCOUNTS', payload: data });
          StorageService.setFundAccounts(data);
        }
      });
      const sub4 = DataService.subscribeFundAccounts(state.currentUser.id, onFundAccountChange);
      subscriptionsRef.current.push(sub4);
    }

    // 轮询作为 Realtime 的后备方案，每 30 秒刷新一次
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      DataService.fetchTransactions(familyId).then((data) => {
        const localPersonalTx = stateRef.current.transactions.filter(t => !t.familyId);
        const onlineTxIds = new Set(data.map((t: Transaction) => t.id));
        const keptLocalTx = localPersonalTx.filter(t => !onlineTxIds.has(t.id));
        dispatch({ type: 'SET_TRANSACTIONS', payload: [...keptLocalTx, ...data] });
      }).catch(() => {});
    }, 30000);
  };

  const loadPersonalOnlineData = async (userId: string) => {
    try {
      const [personalBudgets, fundAccounts, autoRules, personalTransactions, personalCategories, userSettings] = await Promise.all([
        DataService.fetchPersonalBudgets(userId).catch(() => []),
        DataService.fetchFundAccounts(userId).catch(() => null),
        DataService.fetchAutoTransactions(userId).catch(() => []),
        DataService.fetchPersonalTransactions(userId).catch(() => []),
        DataService.fetchPersonalCategories(userId).catch(() => []),
        DataService.fetchUserSettings(userId).catch(() => null),
      ]);
      if (personalTransactions.length > 0) {
        const localTxIds = new Set(personalTransactions.map((t: Transaction) => t.id));
        const keptLocalTx = stateRef.current.transactions.filter(t => !t.familyId && !localTxIds.has(t.id));
        dispatch({ type: 'SET_TRANSACTIONS', payload: [...keptLocalTx, ...personalTransactions] });
        await StorageService.setTransactions([...keptLocalTx, ...personalTransactions]);
      }
      if (personalCategories.length > 0) {
        dispatch({ type: 'SET_CATEGORIES', payload: personalCategories });
        await StorageService.setCategories(personalCategories);
      }
      if (personalBudgets.length > 0) {
        const onlineBudgetIds = new Set(personalBudgets.map((b: Budget) => b.id));
        const localPersonalNotOnline = stateRef.current.budgets.filter((b) => b.scope === 'personal' && !onlineBudgetIds.has(b.id));
        const familyBudgets = stateRef.current.budgets.filter((b) => b.scope === 'family');
        dispatch({ type: 'SET_BUDGETS', payload: [...localPersonalNotOnline, ...personalBudgets, ...familyBudgets] });
      }
      if (fundAccounts && fundAccounts.length > 0) {
        dispatch({ type: 'SET_FUND_ACCOUNTS', payload: fundAccounts });
      }
      if (autoRules.length > 0) {
        dispatch({ type: 'SET_AUTO_TRANSACTIONS', payload: autoRules });
        await StorageService.setAutoTransactions(autoRules);
      }
      if (userSettings) {
        const mapped: AppSettings = {
          currency: userSettings.currency || 'CNY',
          theme: userSettings.theme || 'system',
          showAssistant: userSettings.show_assistant || false,
        };
        if (userSettings.llm_provider) (mapped as any).llmProvider = userSettings.llm_provider;
        if (userSettings.llm_api_key) (mapped as any).llmApiKey = userSettings.llm_api_key;
        if (userSettings.llm_base_url) (mapped as any).llmBaseUrl = userSettings.llm_base_url;
        if (userSettings.llm_model) (mapped as any).llmModel = userSettings.llm_model;
        dispatch({ type: 'SET_SETTINGS', payload: mapped });
        await StorageService.updateSettings(mapped);
      }
    } catch {}
  };

  const refreshData = useCallback(async () => {
    if (state.activeFamilyId) {
      await loadOnlineData(state.activeFamilyId);
    } else {
      if (state.currentUser) {
        await loadPersonalOnlineData(state.currentUser.id);
      }
      const [transactions, categories, budgets, fundAccounts] = await Promise.all([
        StorageService.getTransactions(),
        StorageService.getCategories(),
        StorageService.getBudgets(),
        StorageService.getFundAccounts(),
      ]);
      dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
      dispatch({ type: 'SET_BUDGETS', payload: budgets.map((b: any) => ({ ...b, scope: b.scope || 'personal' })) });
      dispatch({ type: 'SET_FUND_ACCOUNTS', payload: fundAccounts });
    }
  }, [state.activeFamilyId, state.currentUser]);

  // ============ 交易操作 ============

  const addTransaction = useCallback(async (transaction: Transaction) => {
    if (state.activeFamilyId) {
      try {
        const result = await DataService.addTransaction(state.activeFamilyId, {
          type: transaction.type,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          date: transaction.date,
          note: transaction.note,
          accountType: 'family',
          fundAccountId: transaction.fundAccountId,
        });
        dispatch({ type: 'ADD_TRANSACTION', payload: result });
        await StorageService.addTransaction(result);
      } catch {
        const localTransaction: Transaction = { ...transaction, accountType: 'family', familyId: state.activeFamilyId };
        await StorageService.addTransaction(localTransaction);
        dispatch({ type: 'ADD_TRANSACTION', payload: localTransaction });
      }
    } else if (state.currentUser) {
      try {
        const result = await DataService.addPersonalTransaction(state.currentUser.id, {
          type: transaction.type,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          date: transaction.date,
          note: transaction.note,
          accountType: 'personal',
          fundAccountId: transaction.fundAccountId,
        });
        dispatch({ type: 'ADD_TRANSACTION', payload: result });
        await StorageService.addTransaction(result);
      } catch {
        const localTransaction: Transaction = { ...transaction, accountType: 'personal' };
        await StorageService.addTransaction(localTransaction);
        dispatch({ type: 'ADD_TRANSACTION', payload: localTransaction });
      }
    } else {
      const localTransaction: Transaction = {
        ...transaction,
        accountType: 'personal',
        familyId: state.activeFamilyId || undefined,
      };
      await StorageService.addTransaction(localTransaction);
      dispatch({ type: 'ADD_TRANSACTION', payload: localTransaction });
    }
    if (transaction.fundAccountId) {
      const delta = transaction.type === 'income' ? transaction.amount : -transaction.amount;
      if (state.currentUser) {
        try {
          const updated = await DataService.updateFundAccountBalance(transaction.fundAccountId, delta);
          dispatch({ type: 'UPDATE_FUND_ACCOUNT', payload: updated });
          await StorageService.updateFundAccount(updated);
        } catch {}
      }
      await StorageService.updateFundAccountBalance(transaction.fundAccountId, delta);
      const accounts = await StorageService.getFundAccounts();
      dispatch({ type: 'SET_FUND_ACCOUNTS', payload: accounts });
    }
  }, [state.activeFamilyId, state.currentUser]);

  const updateTransaction = useCallback(async (transaction: Transaction) => {
    const oldTransaction = state.transactions.find(t => t.id === transaction.id);

    if (state.activeFamilyId && transaction.familyId) {
      try {
        const result = await DataService.updateTransaction(transaction.id, transaction);
        dispatch({ type: 'UPDATE_TRANSACTION', payload: result });
        await StorageService.updateTransaction(result);
      } catch {
        await StorageService.updateTransaction(transaction);
        dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
      }
    } else if (state.currentUser && !transaction.familyId) {
      try {
        const result = await DataService.updateTransaction(transaction.id, transaction);
        dispatch({ type: 'UPDATE_TRANSACTION', payload: result });
        await StorageService.updateTransaction(result);
      } catch {
        await StorageService.updateTransaction(transaction);
        dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
      }
    } else {
      const localTransaction: Transaction = {
        ...transaction,
        accountType: 'personal',
        familyId: transaction.familyId || undefined,
      };
      await StorageService.updateTransaction(localTransaction);
      dispatch({ type: 'UPDATE_TRANSACTION', payload: localTransaction });
    }
    if (oldTransaction?.fundAccountId) {
      const oldDelta = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
      if (state.currentUser) {
        try { await DataService.updateFundAccountBalance(oldTransaction.fundAccountId, oldDelta); } catch {}
      }
      await StorageService.updateFundAccountBalance(oldTransaction.fundAccountId, oldDelta);
    }
    if (transaction.fundAccountId) {
      const newDelta = transaction.type === 'income' ? transaction.amount : -transaction.amount;
      if (state.currentUser) {
        try { await DataService.updateFundAccountBalance(transaction.fundAccountId, newDelta); } catch {}
      }
      await StorageService.updateFundAccountBalance(transaction.fundAccountId, newDelta);
    }
    const accounts = await StorageService.getFundAccounts();
    dispatch({ type: 'SET_FUND_ACCOUNTS', payload: accounts });
  }, [state.activeFamilyId, state.transactions, state.currentUser]);

  const deleteTransaction = useCallback(async (id: string) => {
    const oldTransaction = state.transactions.find(t => t.id === id);

    if (oldTransaction?.familyId && state.activeFamilyId) {
      await DataService.deleteTransaction(id);
    } else if (state.currentUser && !oldTransaction?.familyId) {
      try { await DataService.deleteTransaction(id); } catch {}
      await StorageService.deleteTransaction(id);
    } else {
      await StorageService.deleteTransaction(id);
    }
    if (oldTransaction?.type === 'transfer') {
      if (oldTransaction.fundAccountId) {
        if (state.currentUser) {
          try { await DataService.updateFundAccountBalance(oldTransaction.fundAccountId, oldTransaction.amount); } catch {}
        }
        await StorageService.updateFundAccountBalance(oldTransaction.fundAccountId, oldTransaction.amount);
      }
      if (oldTransaction.toFundAccountId) {
        if (state.currentUser) {
          try { await DataService.updateFundAccountBalance(oldTransaction.toFundAccountId, -oldTransaction.amount); } catch {}
        }
        await StorageService.updateFundAccountBalance(oldTransaction.toFundAccountId, -oldTransaction.amount);
      }
    } else if (oldTransaction?.fundAccountId) {
      const delta = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
      if (state.currentUser) {
        try { await DataService.updateFundAccountBalance(oldTransaction.fundAccountId, delta); } catch {}
      }
      await StorageService.updateFundAccountBalance(oldTransaction.fundAccountId, delta);
    }
    const accounts = await StorageService.getFundAccounts();
    dispatch({ type: 'SET_FUND_ACCOUNTS', payload: accounts });
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
  }, [state.activeFamilyId, state.transactions, state.currentUser]);

  // ============ 分类操作 ============

  const addCategory = useCallback(async (category: Category) => {
    if (state.activeFamilyId) {
      const result = await DataService.addCategory(state.activeFamilyId, category);
      dispatch({ type: 'ADD_CATEGORY', payload: result });
      await StorageService.addCategory(result);
    } else if (state.currentUser) {
      try {
        const result = await DataService.addPersonalCategory(state.currentUser.id, category);
        dispatch({ type: 'ADD_CATEGORY', payload: result });
        await StorageService.addCategory(result);
      } catch {
        await StorageService.addCategory(category);
        dispatch({ type: 'ADD_CATEGORY', payload: category });
      }
    } else {
      await StorageService.addCategory(category);
      dispatch({ type: 'ADD_CATEGORY', payload: category });
    }
  }, [state.activeFamilyId, state.currentUser]);

  const updateCategory = useCallback(async (category: Category) => {
    if (state.activeFamilyId) {
      const result = await DataService.updateCategory(category.id, category);
      dispatch({ type: 'UPDATE_CATEGORY', payload: result });
      await StorageService.updateCategory(result);
    } else if (state.currentUser) {
      try {
        const result = await DataService.updateCategory(category.id, category);
        dispatch({ type: 'UPDATE_CATEGORY', payload: result });
        await StorageService.updateCategory(result);
      } catch {
        await StorageService.updateCategory(category);
        dispatch({ type: 'UPDATE_CATEGORY', payload: category });
      }
    } else {
      await StorageService.updateCategory(category);
      dispatch({ type: 'UPDATE_CATEGORY', payload: category });
    }
  }, [state.activeFamilyId, state.currentUser]);

  const deleteCategory = useCallback(async (id: string) => {
    if (state.activeFamilyId) {
      await DataService.deleteCategory(id);
    } else if (state.currentUser) {
      try { await DataService.deleteCategory(id); } catch {}
    }
    await StorageService.deleteCategory(id);
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
  }, [state.activeFamilyId, state.currentUser]);

  // ============ 预算操作 ============

  const setBudget = useCallback(async (budget: Budget) => {
    if (budget.scope === 'family' && state.activeFamilyId) {
      const result = await DataService.setBudget(state.activeFamilyId, budget.month, budget.amount, budget.categoryId);
      dispatch({ type: 'SET_BUDGET', payload: { ...result, scope: 'family', familyId: state.activeFamilyId } });
    } else {
      if (state.currentUser) {
        try {
          const result = await DataService.setPersonalBudget(state.currentUser.id, budget.month, budget.amount, budget.categoryId);
          dispatch({ type: 'SET_BUDGET', payload: { ...result, scope: 'personal', userId: state.currentUser.id } });
        } catch {
          await StorageService.setBudget({ ...budget, scope: budget.scope || 'personal' });
          dispatch({ type: 'SET_BUDGET', payload: { ...budget, scope: budget.scope || 'personal' } });
        }
      } else {
        await StorageService.setBudget({ ...budget, scope: budget.scope || 'personal' });
        dispatch({ type: 'SET_BUDGET', payload: { ...budget, scope: budget.scope || 'personal' } });
      }
    }
  }, [state.activeFamilyId, state.currentUser]);

  const deleteBudget = useCallback(async (id: string) => {
    const budget = state.budgets.find((b) => b.id === id);
    if (!budget) return;
    if (budget.scope === 'family' && state.activeFamilyId) {
      try { await DataService.deleteBudget(state.activeFamilyId, id); } catch {}
    } else {
      if (state.currentUser) {
        try { await DataService.deleteBudget(id); } catch {}
      }
      await StorageService.deleteBudget(id);
    }
    dispatch({ type: 'DELETE_BUDGET', payload: id });
  }, [state.budgets, state.activeFamilyId, state.currentUser]);

  // ============ 设置操作 ============

  const updateSettings = useCallback(async (settings: Partial<AppSettings>) => {
    const current = state.settings;
    const updated = { ...current, ...settings };
    await StorageService.updateSettings(updated);
    dispatch({ type: 'SET_SETTINGS', payload: updated });
    if (state.currentUser) {
      try { await DataService.saveUserSettings(state.currentUser.id, updated as any); } catch {}
    }
  }, [state.settings, state.currentUser]);

  // ============ 用户操作 ============

  const login = useCallback(async (user: AuthUser) => {
    dispatch({ type: 'SET_USER', payload: user });
    try {
      const profile = await getCurrentProfile();
      dispatch({ type: 'SET_USER_PROFILE', payload: profile });
    } catch {}

    try {
      const fundAccounts = await DataService.fetchFundAccounts(user.id);
      if (fundAccounts.length > 0) {
        dispatch({ type: 'SET_FUND_ACCOUNTS', payload: fundAccounts });
        await StorageService.setFundAccounts(fundAccounts);
      }
    } catch {}

    const families = await getFamiliesForUser();
    dispatch({ type: 'SET_USER_FAMILIES', payload: families });

    if (families.length > 0) {
      const activeFamilyId = families[0].id;
      await StorageService.setActiveFamilyId(activeFamilyId);
      dispatch({ type: 'SET_ACTIVE_FAMILY', payload: activeFamilyId });
      dispatch({ type: 'SET_FAMILY', payload: families[0] });
      await loadOnlineData(activeFamilyId);
    }
  }, []);

  const logout = useCallback(async () => {
    cleanupSubscriptions();
    await StorageService.setActiveFamilyId(null);
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_FAMILY', payload: null });
    dispatch({ type: 'SET_USER_FAMILIES', payload: [] });
    dispatch({ type: 'SET_ACTIVE_FAMILY', payload: null });
    dispatch({ type: 'SET_FAMILY_MEMBERS', payload: [] });
    dispatch({ type: 'SET_ONLINE', payload: false });
    dispatch({ type: 'SET_PRIVATE_UNLOCKED', payload: false });
  }, []);

  const setFamily = useCallback(async (family: Family) => {
    dispatch({ type: 'SET_FAMILY', payload: family });
    dispatch({ type: 'SET_ACTIVE_FAMILY', payload: family.id });
    await StorageService.setActiveFamilyId(family.id);
    await loadOnlineData(family.id);
  }, []);

  const setActiveFamily = useCallback(async (familyId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_FAMILY', payload: familyId });
    await StorageService.setActiveFamilyId(familyId);
    if (familyId) {
      const family = state.userFamilies.find(f => f.id === familyId) || null;
      dispatch({ type: 'SET_FAMILY', payload: family });
      await loadOnlineData(familyId);
    } else {
      dispatch({ type: 'SET_FAMILY', payload: null });
    }
  }, [state.userFamilies]);

  const updateUserProfile = useCallback(async (updates: { displayName?: string; avatar?: string }) => {
    // Profile updates are handled by profileService
    try {
      const { updateProfile } = require('../services/profileService');
      await updateProfile(updates);
      const profile = await getCurrentProfile();
      dispatch({ type: 'SET_USER_PROFILE', payload: profile });
    } catch {}
  }, []);

  // ============ 资金账户操作 ============

  const addFundAccount = useCallback(async (account: FundAccount) => {
    if (state.currentUser) {
      try {
        const result = await DataService.addFundAccount(state.currentUser.id, account);
        dispatch({ type: 'ADD_FUND_ACCOUNT', payload: result });
        await StorageService.addFundAccount(result);
        return;
      } catch {}
    }
    await StorageService.addFundAccount(account);
    dispatch({ type: 'ADD_FUND_ACCOUNT', payload: account });
  }, [state.currentUser]);

  const updateFundAccount = useCallback(async (account: FundAccount) => {
    if (state.currentUser) {
      try {
        const result = await DataService.updateFundAccount(account.id, account);
        dispatch({ type: 'UPDATE_FUND_ACCOUNT', payload: result });
        await StorageService.updateFundAccount(result);
        return;
      } catch {}
    }
    await StorageService.updateFundAccount(account);
    dispatch({ type: 'UPDATE_FUND_ACCOUNT', payload: account });
  }, [state.currentUser]);

  const deleteFundAccount = useCallback(async (id: string) => {
    if (state.currentUser) {
      try { await DataService.deleteFundAccount(id); } catch {}
    }
    await StorageService.deleteFundAccount(id);
    dispatch({ type: 'DELETE_FUND_ACCOUNT', payload: id });
  }, [state.currentUser]);

  const reorderFundAccounts = useCallback(async (reordered: FundAccount[]) => {
    const updated = reordered.map((a, index) => ({ ...a, order: index }));
    dispatch({ type: 'SET_FUND_ACCOUNTS', payload: updated });
    for (const account of updated) {
      if (state.currentUser) {
        try { await DataService.updateFundAccount(account.id, { order: account.order }); } catch {}
      }
      await StorageService.updateFundAccount(account);
    }
  }, [state.currentUser]);

  // ============ 自动记账规则操作 ============

  const addAutoTransaction = useCallback(async (rule: AutoTransaction) => {
    if (state.currentUser) {
      try {
        const result = await DataService.addAutoTransaction(state.currentUser.id, rule);
        dispatch({ type: 'ADD_AUTO_TRANSACTION', payload: result });
        await StorageService.addAutoTransaction(result);
        return;
      } catch {}
    }
    await StorageService.addAutoTransaction(rule);
    dispatch({ type: 'ADD_AUTO_TRANSACTION', payload: rule });
  }, [state.currentUser]);

  const updateAutoTransaction = useCallback(async (rule: AutoTransaction) => {
    if (state.currentUser) {
      try {
        const result = await DataService.updateAutoTransaction(rule.id, rule);
        dispatch({ type: 'UPDATE_AUTO_TRANSACTION', payload: result });
        await StorageService.updateAutoTransaction(result);
        return;
      } catch {}
    }
    await StorageService.updateAutoTransaction(rule);
    dispatch({ type: 'UPDATE_AUTO_TRANSACTION', payload: rule });
  }, [state.currentUser]);

  const deleteAutoTransaction = useCallback(async (id: string) => {
    if (state.currentUser) {
      try { await DataService.deleteAutoTransaction(id); } catch {}
    }
    await StorageService.deleteAutoTransaction(id);
    dispatch({ type: 'DELETE_AUTO_TRANSACTION', payload: id });
  }, [state.currentUser]);

  const toggleAutoTransaction = useCallback(async (id: string) => {
    const rule = state.autoTransactions.find((r) => r.id === id);
    if (!rule) return;
    const updated = { ...rule, enabled: !rule.enabled };
    await updateAutoTransaction(updated);
  }, [state.autoTransactions, updateAutoTransaction]);

  const executeAutoTransactions = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const enabledRules = state.autoTransactions.filter((r) => r.enabled);
    for (const rule of enabledRules) {
      let shouldExecute = false;
      if (rule.lastExecutedDate === today) continue;

      if (rule.frequency === 'daily') {
        shouldExecute = true;
      } else if (rule.frequency === 'weekly') {
        const lastDate = rule.lastExecutedDate ? new Date(rule.lastExecutedDate) : null;
        if (!lastDate) {
          shouldExecute = true;
        } else {
          const diffDays = Math.floor((new Date(today).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          shouldExecute = diffDays >= 7;
        }
      } else if (rule.frequency === 'monthly') {
        const lastDate = rule.lastExecutedDate ? new Date(rule.lastExecutedDate) : null;
        if (!lastDate) {
          shouldExecute = true;
        } else {
          const todayDate = new Date(today);
          const lastDateObj = new Date(rule.lastExecutedDate);
          const monthDiff = (todayDate.getFullYear() - lastDateObj.getFullYear()) * 12 + (todayDate.getMonth() - lastDateObj.getMonth());
          shouldExecute = monthDiff >= 1;
        }
      }

      if (shouldExecute) {
        const isFamily = !!rule.familyId;
        const newTransaction: Transaction = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: rule.type,
          amount: rule.amount,
          categoryId: rule.categoryId,
          date: today,
          note: rule.note || `自动记账`,
          accountType: isFamily ? 'family' : 'personal',
          fundAccountId: rule.fundAccountId,
          familyId: rule.familyId,
          userId: state.currentUser?.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (rule.fundAccountId) {
          const delta = rule.type === 'income' ? rule.amount : -rule.amount;
          if (state.currentUser) {
            try { await DataService.updateFundAccountBalance(rule.fundAccountId, delta); } catch {}
          }
          await StorageService.updateFundAccountBalance(rule.fundAccountId, delta);
        }

        if (isFamily && rule.familyId && state.currentUser) {
          try {
            const result = await DataService.addTransaction(rule.familyId, newTransaction);
            dispatch({ type: 'ADD_TRANSACTION', payload: result });
            await StorageService.addTransaction(result);
          } catch {
            await StorageService.addTransaction(newTransaction);
            dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
          }
        } else {
          await StorageService.addTransaction(newTransaction);
          dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
        }

        const updatedRule = { ...rule, lastExecutedDate: today };
        await updateAutoTransaction(updatedRule);
      }
    }

    const accounts = await StorageService.getFundAccounts();
    dispatch({ type: 'SET_FUND_ACCOUNTS', payload: accounts });
  }, [state.autoTransactions, state.currentUser, updateAutoTransaction]);

  // ============ 资金账户转账 ============

  const transferFundAccount = useCallback(async (fromAccountId: string, toAccountId: string, amount: number, note: string) => {
    const today = new Date().toISOString().split('T')[0];
    const transaction: Transaction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: 'transfer',
      amount,
      categoryId: 'transfer',
      date: today,
      note: note || '账户转账',
      accountType: 'personal',
      fundAccountId: fromAccountId,
      toFundAccountId: toAccountId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (state.currentUser) {
      try { await DataService.updateFundAccountBalance(fromAccountId, -amount); } catch {}
      try { await DataService.updateFundAccountBalance(toAccountId, amount); } catch {}
    }
    await StorageService.updateFundAccountBalance(fromAccountId, -amount);
    await StorageService.updateFundAccountBalance(toAccountId, amount);

    await StorageService.addTransaction(transaction);
    dispatch({ type: 'ADD_TRANSACTION', payload: transaction });

    const accounts = await StorageService.getFundAccounts();
    dispatch({ type: 'SET_FUND_ACCOUNTS', payload: accounts });
  }, [state.currentUser]);

  // ============ 加入家庭并迁移账单 ============

  const joinFamilyWithMigration = useCallback(async (inviteCode: string, migrateAfterDate?: string): Promise<Family> => {
    const { joinFamily } = require('../services/familyService');
    const family = await joinFamily(inviteCode);

    // 迁移个人账单到家庭
    if (migrateAfterDate && family.id) {
      try {
        const count = await migratePersonalTransactionsToFamily(family.id, migrateAfterDate);
        if (count > 0) {
          console.log(`已迁移 ${count} 条个人账单到家庭`);
        }
      } catch (err) {
        console.error('迁移账单失败:', err);
      }
    }

    // 更新状态
    const families = await getFamiliesForUser();
    dispatch({ type: 'SET_USER_FAMILIES', payload: families });
    await setActiveFamily(family.id);
    await loadOnlineData(family.id);

    return family;
  }, [setActiveFamily]);

  // ============ Context Value ============

  const contextValue: AppContextType = {
    state,
    dispatch,
    refreshData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    setBudget,
    deleteBudget,
    updateSettings,
    login,
    logout,
    setFamily,
    setActiveFamily,
    updateUserProfile,
    addFundAccount,
    updateFundAccount,
    deleteFundAccount,
    reorderFundAccounts,
    addAutoTransaction,
    updateAutoTransaction,
    deleteAutoTransaction,
    toggleAutoTransaction,
    executeAutoTransactions,
    transferFundAccount,
    joinFamilyWithMigration,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export type { AppState, AppAction };
