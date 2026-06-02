# 随手记账 - Code Wiki 文档

## 目录

1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [目录结构](#目录结构)
4. [核心模块详解](#核心模块详解)
5. [数据模型](#数据模型)
6. [关键类与函数说明](#关键类与函数说明)
7. [依赖关系图](#依赖关系图)
8. [项目运行方式](#项目运行方式)
9. [配置说明](#配置说明)
10. [开发指南](#开发指南)

---

## 项目概述

**随手记账** 是一款基于 React Native + Expo 开发的智能记账应用，支持个人记账、家庭共享记账、AI 智能识别等多种功能。

### 核心功能

| 功能模块 | 描述 |
|---------|------|
| **收支记录** | 支持收入、支出、转账三种交易类型 |
| **分类管理** | 预设常用分类，支持自定义分类图标和颜色 |
| **资金账户** | 管理多个资金账户（微信、支付宝、银行卡等），实时追踪余额 |
| **预算管理** | 设置月度预算，可视化预算使用进度，超支预警 |
| **OCR 截屏识别** | 选择支付截图，自动识别金额、分类、时间等信息 |
| **文字记账** | 自然语言描述消费，AI 自动解析为记账条目 |
| **家庭记账** | 创建家庭账本，生成邀请码，邀请家人加入共享记账数据 |
| **实时同步** | 基于 Supabase 实时订阅，多设备数据同步 |
| **统计分析** | 收支趋势图表、分类占比饼图 |
| **自动记账规则** | 设置周期性自动记账（每日/每周/每月） |

### 应用截图

应用主要包含以下页面：
- **首页**：收支概览、本月统计、快捷入口
- **账单**：按日期/分类筛选查看交易列表
- **统计**：收支趋势折线图、分类占比饼图
- **设置**：账户管理、家庭管理、主题切换、AI 配置等

---

## 技术架构

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **React Native** | 0.79.6 | 跨平台移动应用框架 |
| **Expo** | 53.0.0 | React Native 开发工具链 |
| **TypeScript** | 5.8.0 | 类型安全的 JavaScript |
| **React Navigation** | 7.x | 导航管理（底部 Tab + 嵌套 Stack） |
| **React Context** | - | 全局状态管理 |
| **react-native-svg** | 15.11.0 | SVG 图表绘制 |
| **react-native-gesture-handler** | 2.24.0 | 手势交互 |
| **react-native-reanimated** | 3.17.0 | 动画库 |
| **dayjs** | 1.11.20 | 日期处理 |
| **xlsx** | 0.18.5 | Excel 导出 |

### 后端服务

| 服务 | 用途 |
|------|------|
| **Supabase** | BaaS 平台，提供用户认证、PostgreSQL 数据库、实时订阅、RLS 权限控制 |
| **百度 OCR** | 图片文字识别服务 |
| **LLM API** | 智能解析服务（支持 DeepSeek、通义千问、OpenAI） |

### 架构设计图

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Application                        │
│                    (React Native + Expo)                      │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer                                           │
│  ├── Screens (18 pages)                                       │
│  ├── Components (11 reusable components)                     │
│  └── Navigation (TabNavigator + SettingsStack)               │
├─────────────────────────────────────────────────────────────┤
│  State Management Layer                                       │
│  ├── AppContext (Global State + Reducer)                     │
│  └── ThemeContext (Theme State)                              │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                                │
│  ├── authService (User Authentication)                        │
│  ├── dataService (CRUD Operations)                           │
│  ├── familyService (Family Management)                       │
│  ├── llmService (AI Text Parsing)                            │
│  ├── ocrService (Image Recognition)                          │
│  └── profileService (User Profile)                           │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                   │
│  ├── StorageService (Local AsyncStorage)                      │
│  └── Supabase Client (Cloud Database + Realtime)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                           │
├─────────────────────────────────────────────────────────────┤
│  Supabase                                                     │
│  ├── PostgreSQL Database                                      │
│  ├── Auth Service (Email/Password)                           │
│  ├── Realtime Subscriptions                                   │
│  └── Row Level Security (RLS)                                │
├─────────────────────────────────────────────────────────────┤
│  External APIs                                                │
│  ├── Baidu OCR API                                            │
│  ├── DeepSeek / Tongyi / OpenAI LLM API                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 目录结构

```
keep-accounts-at-any-time/
├── App.tsx                          # 应用入口组件
├── app.json                         # Expo 配置文件
├── package.json                     # 项目依赖配置
├── tsconfig.json                    # TypeScript 配置
├── index.js                         # Expo 入口文件
├── babel.config.js                  # Babel 配置
├── eas.json                         # EAS Build 配置
│
├── assets/                          # 静态资源目录
│   ├── icon.png                     # 应用图标
│   ├── adaptive-icon.png            # Android 自适应图标
│   ├── splash.png                   # 启动画面
│   └── favicon.png                  # Web favicon
│
├── src/                             # 源代码目录
│   ├── components/                  # UI 组件
│   │   ├── AccountModeSwitch.tsx    # 账户模式切换组件
│   │   ├── BillGroup.tsx            # 账单分组组件
│   │   ├── BillItem.tsx             # 账单项组件
│   │   ├── CalendarPicker.tsx       # 日历选择器
│   │   ├── CategoryEditModal.tsx    # 分类编辑弹窗
│   │   ├── CategoryGrid.tsx         # 分类网格组件
│   │   ├── FloatingAssistant.tsx    # 悬浮助手组件
│   │   ├── MonthPicker.tsx          # 月份选择器
│   │   ├── NumberKeyboard.tsx       # 数字键盘
│   │   ├── SimpleLineChart.tsx      # 折线图组件
│   │   └── SimplePieChart.tsx       # 饼图组件
│   │
│   ├── constants/                   # 常量定义
│   │   ├── categories.ts            # 预设分类和资金账户
│   │   └── currency.ts              # 货币符号映射
│   │
│   ├── lib/                         # 库配置
│   │   └── supabase.ts              # Supabase 客户端初始化
│   │
│   ├── navigation/                  # 导航配置
│   │   ├── TabNavigator.tsx         # 主底部 Tab 导航
│   │   └── SettingsStack.tsx        # 设置页面嵌套 Stack
│   │
│   ├── screens/                     # 页面组件（18 个）
│   │   ├── HomeScreen.tsx           # 首页（收支概览）
│   │   ├── AddTransactionScreen.tsx # 记账页面
│   │   ├── BillsScreen.tsx          # 账单列表
│   │   ├── StatisticsScreen.tsx     # 统计分析
│   │   ├── BudgetScreen.tsx         # 预算管理
│   │   ├── CategoryManageScreen.tsx # 分类管理
│   │   ├── AccountManageScreen.tsx  # 资金账户管理
│   │   ├── TransferScreen.tsx       # 转账页面
│   │   ├── SmartRecognizeScreen.tsx # OCR 智能识别
│   │   ├── TextBookkeepingScreen.tsx# 文字记账
│   │   ├── FamilySetupScreen.tsx    # 家庭创建
│   │   ├── MultiFamilyScreen.tsx    # 家庭切换
│   │   ├── SettingsScreen.tsx       # 设置页面
│   │   ├── AuthScreen.tsx           # 登录注册
│   │   ├── ProfileScreen.tsx        # 个人资料
│   │   ├── AboutScreen.tsx          # 关于页面
│   │   ├── AutoTransactionManageScreen.tsx # 自动记账规则管理
│   │   └── SmartAssistantSettingsScreen.tsx # AI 助手设置
│   │
│   ├── services/                    # 服务层
│   │   ├── authService.ts           # 认证服务
│   │   ├── dataService.ts           # 数据 CRUD 服务
│   │   ├── familyService.ts         # 家庭服务
│   │   ├── llmService.ts            # LLM 解析服务
│   │   ├── ocrService.ts            # OCR 服务
│   │   └── profileService.ts        # 用户资料服务
│   │
│   ├── store/                       # 状态管理
│   │   ├── AppContext.tsx           # 应用全局状态
│   │   └── ThemeContext.tsx         # 主题状态
│   │
│   ├── types/                       # 类型定义
│   │   └── index.ts                 # 全局类型定义
│   │
│   └── utils/                       # 工具函数
│       └── StorageService.ts        # 本地存储服务
│
├── scripts/                         # 脚本工具
│   ├── crop_icon.py                 # 图标裁剪脚本
│   └── replace_icons.py             # 图标替换脚本
│
├── supabase-schema.sql              # 数据库基础表结构
├── supabase-migration-*.sql         # 数据库迁移脚本（13 个）
├── .env                             # 环境变量配置
├── .gitignore                       # Git 忽略配置
└── .easignore                       # EAS Build 忽略配置
```

---

## 核心模块详解

### 1. 应用入口 (App.tsx)

应用入口组件负责：
- 初始化全局 Provider（SafeAreaProvider、ThemeProvider、AppProvider）
- 处理认证状态判断
- 根据配置决定离线/在线模式
- 渲染主导航或登录页面

```typescript
// 应用启动流程
App() 
  → SafeAreaProvider 
  → ThemeProvider 
  → AppProvider 
  → AppContent()
    → 检查 isLoading 状态
    → 检查 Supabase 配置
    → 检查 currentUser 状态
    → 渲染 AuthScreen 或 TabNavigator
```

### 2. 状态管理 (AppContext.tsx)

**核心职责**：
- 管理全局应用状态（交易、分类、预算、资金账户、设置等）
- 提供 Reducer 模式的状态更新
- 实现数据同步逻辑（本地 ↔ 云端）
- 处理 Supabase Realtime 实时订阅
- 提供业务操作方法（addTransaction、setBudget 等）

**状态结构**：
```typescript
interface AppState {
  transactions: Transaction[];      // 交易记录列表
  categories: Category[];           // 分类列表
  budgets: Budget[];                // 预算列表
  fundAccounts: FundAccount[];      // 资金账户列表
  autoTransactions: AutoTransaction[]; // 自动记账规则
  settings: AppSettings;            // 应用设置
  isLoading: boolean;               // 加载状态
  isOnline: boolean;                // 在线状态
  currentUser: AuthUser | null;     // 当前用户
  currentFamily: Family | null;     // 当前家庭
  userFamilies: Family[];           // 用户所属家庭列表
  activeFamilyId: string | null;    // 当前活跃家庭 ID
  familyMembers: FamilyMember[];    // 家庭成员列表
  userProfile: UserProfile | null;  // 用户资料
}
```

**数据同步策略**：
```
启动时:
  loadInitialData() 
    → 加载本地 AsyncStorage 数据
    → 检查 Supabase 登录状态
    → 加载云端数据（家庭/个人）
    → 合并本地和云端数据

运行时:
  Realtime Subscription 监听数据变更
    → 自动更新本地状态
  30秒轮询作为 Realtime 后备方案

操作时:
  add/update/delete 操作
    → 先尝试云端操作
    → 失败则本地操作
    → 同时更新本地 AsyncStorage
```

### 3. 导航系统 (TabNavigator.tsx)

**导航结构**：
```
NavigationContainer
  └── Stack.Navigator (RootStack)
      ├── MainTabs (底部 Tab 导航)
      │   ├── Home (首页)
      │   ├── Bills (账单)
      │   ├── Statistics (统计)
      │   └── Settings (设置 Stack)
      ├── AddTransaction (记账页面 - modal)
      ├── SmartRecognize (智能识别)
      └── TextBookkeeping (文字记账)
```

**设置页面嵌套导航** (SettingsStack.tsx)：
```
SettingsStack
  ├── SettingsScreen (设置主页)
  ├── CategoryManageScreen
  ├── AccountManageScreen
  ├── BudgetScreen
  ├── FamilySetupScreen
  ├── MultiFamilyScreen
  ├── ProfileScreen
  ├── SmartAssistantSettingsScreen
  ├── AutoTransactionManageScreen
  ├── AboutScreen
```

### 4. 服务层

#### authService.ts - 认证服务

| 函数 | 描述 |
|------|------|
| `signUp(email, password, displayName)` | 用户注册 |
| `signIn(email, password)` | 用户登录 |
| `signOut()` | 用户登出 |
| `getCurrentUser()` | 获取当前用户信息 |
| `getSession()` | 获取当前 session |
| `onAuthStateChange(callback)` | 监听认证状态变化 |

#### dataService.ts - 数据 CRUD 服务

| 函数 | 描述 |
|------|------|
| `fetchTransactions(familyId)` | 获取家庭交易记录 |
| `addTransaction(familyId, transaction)` | 添加家庭交易 |
| `updateTransaction(id, updates)` | 更新交易 |
| `deleteTransaction(id)` | 删除交易 |
| `fetchPersonalTransactions(userId)` | 获取个人交易 |
| `addPersonalTransaction(userId, transaction)` | 添加个人交易 |
| `fetchCategories(familyId)` | 获取家庭分类 |
| `addCategory/updateCategory/deleteCategory` | 分类 CRUD |
| `fetchBudgets/setBudget/deleteBudget` | 预算 CRUD |
| `fetchFundAccounts/addFundAccount/updateFundAccount` | 资金账户 CRUD |
| `subscribeTransactions/Categories/Budgets` | Realtime 订阅 |

#### familyService.ts - 家庭服务

| 函数 | 描述 |
|------|------|
| `createFamily(name)` | 创建家庭（自动生成邀请码） |
| `joinFamily(inviteCode)` | 通过邀请码加入家庭 |
| `getUserFamily()` | 获取用户当前家庭 |
| `getFamiliesForUser()` | 获取用户所有家庭 |
| `getFamilyMembers(familyId)` | 获取家庭成员列表 |
| `updateMemberDisplayName(memberId, name)` | 更新成员备注名 |
| `removeFamilyMember(memberId)` | 移除家庭成员 |
| `leaveFamily(familyId)` | 离开家庭 |
| `migratePersonalTransactionsToFamily()` | 迁移个人账单到家庭 |

#### llmService.ts - LLM 解析服务

| 函数 | 描述 |
|------|------|
| `parseTransactionFromText(ocrText, provider, apiKey)` | 从 OCR 文本解析交易信息 |
| `parseTextBookkeeping(text, provider, apiKey)` | 解析自然语言记账文本 |

**支持的 LLM 提供商**：
- DeepSeek (default: deepseek-chat)
- 通义千问 (default: qwen-turbo)
- OpenAI (default: gpt-4o-mini)
- 自定义 API

#### ocrService.ts - OCR 服务

| 函数 | 描述 |
|------|------|
| `testBaiduConnection(apiKey, secretKey)` | 测试百度 OCR 连接 |
| `recognizeImage(imageUri, apiKey, secretKey)` | 识别图片文字 |

### 5. 数据存储 (StorageService.ts)

**本地存储键**：
```typescript
STORAGE_KEYS = {
  TRANSACTIONS: '@keep_accounts_transactions',
  CATEGORIES: '@keep_accounts_categories',
  BUDGETS: '@keep_accounts_budgets',
  FUND_ACCOUNTS: '@keep_accounts_fund_accounts',
  SETTINGS: '@keep_accounts_settings',
  ACCOUNT_MODE: '@keep_accounts_account_mode',
  ACTIVE_FAMILY_ID: '@keep_accounts_active_family_id',
  AUTO_TRANSACTIONS: '@keep_accounts_auto_transactions',
}
```

**主要方法**：
- `get/add/update/delete/setTransactions` - 交易操作
- `get/add/update/delete/setCategories` - 分类操作
- `get/setBudget/deleteBudget` - 预算操作
- `get/add/update/delete/updateBalanceFundAccount` - 资金账户操作
- `get/updateSettings` - 设置操作
- `exportToExcel(entries)` - 导出 Excel

---

## 数据模型

### TypeScript 类型定义 (src/types/index.ts)

```typescript
// 交易类型
type TransactionType = 'expense' | 'income' | 'transfer';

// 账户类型
type AccountType = 'personal' | 'family';

// 预算作用域
type BudgetScope = 'personal' | 'family';

// 资金账户
interface FundAccount {
  id: string;
  name: string;
  icon: string;          // emoji
  color: string;         // 十六进制颜色
  balance: number;       // 当前余额
  order: number;         // 排序
  isDefault: boolean;    // 是否预设账户
}

// 交易记录
interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string;          // YYYY-MM-DD or YYYY-MM-DD HH:mm
  note: string;
  accountType: AccountType;
  fundAccountId?: string;      // 关联的资金账户ID（转出账户）
  toFundAccountId?: string;    // 转入资金账户ID（仅转账类型）
  familyId?: string;           // 所属家庭ID
  userId?: string;             // 记账人ID
  createdAt: string;
  updatedAt: string;
}

// 分类
interface Category {
  id: string;
  name: string;
  icon: string;          // emoji 字符
  color: string;         // 十六进制颜色
  type: TransactionType;
  isCustom: boolean;     // 是否用户自定义
  order: number;         // 排序
}

// 预算
interface Budget {
  id: string;
  month: string;         // YYYY-MM
  amount: number;
  categoryId?: string;   // 分类ID，空表示总预算
  scope: BudgetScope;    // personal 或 family
  familyId?: string;
  userId?: string;
}

// 自动记账频率
type AutoFrequency = 'daily' | 'weekly' | 'monthly';

// 自动记账规则
interface AutoTransaction {
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

// 应用设置
interface AppSettings {
  currency: 'CNY' | 'USD' | 'EUR' | 'JPY';
  theme: 'light' | 'dark' | 'system';
  showAssistant?: boolean;
}
```

### Supabase 数据库表结构

#### 核心表

| 表名 | 描述 | 主要字段 |
|------|------|----------|
| **families** | 家庭表 | id, name, invite_code, created_by, created_at |
| **family_members** | 家庭成员表 | id, family_id, user_id, role, joined_at, display_name |
| **categories** | 分类表 | id, family_id, user_id, name, icon, color, type, is_custom, order |
| **transactions** | 交易记录表 | id, family_id, user_id, category_id, type, amount, date, note, fund_account_id |
| **budgets** | 预算表 | id, family_id, user_id, month, amount, category_id, scope |
| **fund_accounts** | 资金账户表 | id, user_id, name, icon, color, balance, order, is_default |
| **auto_transactions** | 自动记账规则表 | id, user_id, type, amount, category_id, frequency, enabled |
| **user_settings** | 用户设置表 | user_id, currency, theme, show_assistant, llm_* |
| **profiles** | 用户资料表 | id, display_name, email, avatar |

#### 数据库关系图

```
auth.users (Supabase 内置)
    │
    ├── 1:N → profiles
    │
    ├── 1:N → family_members
    │           │
    │           └── N:1 → families
    │                      │
    │                      ├── 1:N → categories
    │                      │
    │                      ├── 1:N → transactions
    │                      │           │
    │                      │           └── N:1 → categories
    │                      │           └── N:1 → fund_accounts
    │                      │
    │                      └── 1:N → budgets
    │
    ├── 1:N → fund_accounts
    │
    ├── 1:N → auto_transactions
    │
    └── 1:1 → user_settings
```

#### RLS 权限策略

所有表都启用了 Row Level Security，主要策略：
- 家庭成员只能查看/操作自己所属家庭的数据
- 用户只能操作自己的个人数据
- 家庭创建者（owner）有额外管理权限

---

## 关键类与函数说明

### AppContext - 全局状态管理类

**位置**: [src/store/AppContext.tsx](file:///workspace/src/store/AppContext.tsx)

**核心方法**：

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `refreshData()` | - | Promise<void> | 刷新所有数据（云端 + 本地） |
| `addTransaction(transaction)` | Transaction | Promise<void> | 添加交易记录 |
| `updateTransaction(transaction)` | Transaction | Promise<void> | 更新交易记录 |
| `deleteTransaction(id)` | string | Promise<void> | 删除交易记录 |
| `addCategory(category)` | Category | Promise<void> | 添加分类 |
| `setBudget(budget)` | Budget | Promise<void> | 设置预算 |
| `updateSettings(settings)` | Partial<AppSettings> | Promise<void> | 更新设置 |
| `login(user)` | AuthUser | Promise<void> | 用户登录后初始化 |
| `logout()` | - | Promise<void> | 用户登出清理 |
| `setActiveFamily(familyId)` | string \| null | Promise<void> | 切换活跃家庭 |
| `addFundAccount(account)` | FundAccount | Promise<void> | 添加资金账户 |
| `transferFundAccount(from, to, amount, note)` | string, string, number, string | Promise<void> | 资金账户转账 |
| `executeAutoTransactions()` | - | Promise<void> | 执行自动记账规则 |

**内部核心函数**：

```typescript
// 加载初始数据
loadInitialData(): Promise<void>

// 加载家庭在线数据
loadOnlineData(familyId: string): Promise<void>

// 加载个人在线数据
loadPersonalOnlineData(userId: string): Promise<void>

// 设置实时订阅
setupRealtimeSubscriptions(familyId: string): void

// 清理订阅
cleanupSubscriptions(): void
```

### ThemeContext - 主题管理

**位置**: [src/store/ThemeContext.tsx](file:///workspace/src/store/ThemeContext.tsx)

**主题颜色配置**：

```typescript
interface ThemeColors {
  background: string;      // 背景色
  surface: string;         // 表面色
  text: string;            // 主文本色
  textSecondary: string;   // 次级文本色
  primary: string;         // 主色调
  primaryLight: string;    // 主色调浅色
  border: string;          // 边框色
  card: string;            // 卡片色
  error: string;           // 错误色
  success: string;         // 成功色
  tabBarBackground: string; // TabBar 背景色
  inputBackground: string; // 输入框背景色
  // ... 更多颜色定义
}
```

**方法**：
- `toggleTheme()` - 切换主题
- `setTheme(theme)` - 设置指定主题

### Supabase 客户端初始化

**位置**: [src/lib/supabase.ts](file:///workspace/src/lib/supabase.ts)

```typescript
// 判断是否配置了 Supabase
isSupabaseConfigured(): boolean

// 获取 Supabase 客户端（懒初始化）
getSupabase(): SupabaseClient

// 兼容旧代码的 Proxy 导出
supabase: SupabaseClient
```

### 关键 UI 组件

#### FloatingAssistant - 悬浮助手

**位置**: [src/components/FloatingAssistant.tsx](file:///workspace/src/components/FloatingAssistant.tsx)

**功能**：提供快捷入口按钮，支持：
- 截屏识别
- 快速记账
- 文字记账

#### SimpleLineChart - 折线图

**位置**: [src/components/SimpleLineChart.tsx](file:///workspace/src/components/SimpleLineChart.tsx)

**功能**：使用 SVG 绘制收支趋势折线图

#### SimplePieChart - 饼图

**位置**: [src/components/SimplePieChart.tsx](file:///workspace/src/components/SimplePieChart.tsx)

**功能**：使用 SVG 绘制分类占比饼图

#### NumberKeyboard - 数字键盘

**位置**: [src/components/NumberKeyboard.tsx](file:///workspace/src/components/NumberKeyboard.tsx)

**功能**：自定义数字键盘，支持金额输入

---

## 依赖关系图

### 模块依赖关系

```
App.tsx
  ├── ThemeContext
  ├── AppContext
  │     ├── StorageService
  │     ├── DataService ←── Supabase Client
  │     ├── AuthService ←── Supabase Client
  │     ├── FamilyService ←── Supabase Client
  │     ├── ProfileService ←── Supabase Client
  │     └── categories constants
  ├── TabNavigator
  │     ├── HomeScreen
  │     ├── BillsScreen
  │     ├── StatisticsScreen
  │     └── SettingsStack
  ├── FloatingAssistant
  └── AuthScreen
```

### 服务层依赖

```
┌─────────────────────────────────────────────────────────────┐
│                        AppContext                            │
│  (Coordinates all services and manages global state)         │
└─────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ AuthService  │ │ DataService  │ │ FamilyService│ │ ProfileService│
│              │ │              │ │              │ │              │
│ signUp       │ │ CRUD ops     │ │ createFamily │ │ getProfile   │
│ signIn       │ │ Realtime     │ │ joinFamily   │ │ updateProfile│
│ signOut      │ │ subscriptions│ │ leaveFamily  │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Supabase Client  │
                    │ (lib/supabase.ts)│
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Supabase Cloud │
                    │ PostgreSQL + Auth│
                    └──────────────────┘
```

### 外部 API 依赖

```
┌─────────────────────────────────────────────────────────────┐
│                     Smart Features                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SmartRecognizeScreen                                        │
│  ├── ocrService.recognizeImage()                             │
│  │     └── Baidu OCR API                                     │
│  │                                                           │
│  └── llmService.parseTransactionFromText()                   │
│  │     └── DeepSeek / Tongyi / OpenAI API                    │
│  │                                                           │
│  TextBookkeepingScreen                                        │
│  └── llmService.parseTextBookkeeping()                       │
│  │     └── DeepSeek / Tongyi / OpenAI API                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### npm 依赖关系

```json
{
  "核心框架": {
    "expo": "~53.0.0",
    "react": "19.0.0",
    "react-native": "0.79.6"
  },
  "导航": {
    "@react-navigation/native": "^7.1.0",
    "@react-navigation/bottom-tabs": "^7.3.0",
    "@react-navigation/native-stack": "^7.3.0"
  },
  "状态管理": {
    "@react-native-async-storage/async-storage": "~2.1.0"
  },
  "后端服务": {
    "@supabase/supabase-js": "^2.49.0"
  },
  "UI组件": {
    "expo-linear-gradient": "~14.1.5",
    "@expo/vector-icons": "^14.1.0",
    "react-native-svg": "~15.11.0"
  },
  "手势动画": {
    "react-native-gesture-handler": "~2.24.0",
    "react-native-reanimated": "~3.17.0"
  },
  "工具库": {
    "dayjs": "^1.11.20",
    "xlsx": "^0.18.5"
  },
  "开发工具": {
    "typescript": "~5.8.0",
    "@types/react": "~19.0.10"
  }
}
```

---

## 项目运行方式

### 环境要求

| 要求 | 版本 |
|------|------|
| Node.js | 18+ |
| npm / yarn | 最新稳定版 |
| Expo CLI | 自动安装 |
| iOS Simulator | Xcode 15+ (iOS 开发) |
| Android Emulator | Android Studio (Android 开发) |

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env` 文件：

```env
# Supabase 配置（可选，不配置则使用离线模式）
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 启动开发服务器

```bash
npm start
```

### 运行平台命令

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

### 离线模式

应用支持无 Supabase 配置的离线模式：
- 数据存储在本地 AsyncStorage
- 仅支持个人记账（无家庭功能）
- 无云端同步

### 构建发布

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 构建 iOS
eas build --platform ios

# 构建 Android
eas build --platform android

# 本地构建
npx expo run:ios
npx expo run:android
```

---

## 配置说明

### Supabase 配置

#### 1. 创建 Supabase 项目

前往 [Supabase Dashboard](https://supabase.com) 创建新项目。

#### 2. 执行数据库脚本

在 SQL Editor 中依次执行：

| 脚本 | 描述 |
|------|------|
| `supabase-schema.sql` | 创建基础表结构 |
| `supabase-migration-add-profiles.sql` | 添加用户资料表 |
| `supabase-migration-add-fund-accounts.sql` | 添加资金账户表 |
| `supabase-migration-auto-transactions.sql` | 添加自动记账规则表 |
| `supabase-migration-add-category-budget.sql` | 添加分类预算支持 |
| `supabase-migration-add-account-type.sql` | 添加账户类型字段 |
| `supabase-migration-add-display-name.sql` | 添加成员备注名 |
| `supabase-migration-personal-data-cloud.sql` | 个人数据云端支持 |
| `supabase-migration-personal-budgets-cloud.sql` | 个人预算云端支持 |
| `supabase-migration-add-private-budget-scope.sql` | 预算作用域支持 |
| 其他迁移脚本... | 功能扩展 |

#### 3. 获取 API 密钥

在 Project Settings → API 中获取：
- Project URL → `EXPO_PUBLIC_SUPABASE_URL`
- anon public key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

#### 4. 配置 Realtime

在 Database → Replication 中启用以下表的实时订阅：
- transactions
- categories
- budgets
- fund_accounts

### AI 功能配置

#### 百度 OCR 配置

1. 前往 [百度智能云](https://cloud.baidu.com/) 创建 OCR 应用
2. 获取 API Key 和 Secret Key
3. 在应用设置 → AI 助手设置中配置

#### LLM 服务配置

支持以下提供商：

| 提供商 | Base URL | 默认模型 |
|--------|----------|----------|
| DeepSeek | https://api.deepseek.com/v1 | deepseek-chat |
| 通义千问 | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen-turbo |
| OpenAI | https://api.openai.com/v1 | gpt-4o-mini |
| 自定义 | 用户自定义 | 用户自定义 |

在设置页面配置：
- LLM Provider
- API Key
- Base URL（可选）
- Model（可选）

---

## 开发指南

### 添加新分类

编辑 [src/constants/categories.ts](file:///workspace/src/constants/categories.ts)：

```typescript
export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  // 添加新分类
  { id: 'new-category', name: '新分类', icon: '🆕', color: '#FF5722', type: 'expense', isCustom: false, order: 99 },
];
```

### 添加新页面

1. 在 `src/screens/` 创建新页面组件
2. 在对应 Stack Navigator 中注册路由
3. 添加导航入口

示例：

```typescript
// src/screens/NewScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../store/ThemeContext';

export default function NewScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Text>New Screen</Text>
    </View>
  );
}

// 在 SettingsStack.tsx 中添加
<Stack.Screen name="NewScreen" component={NewScreen} />
```

### 自定义主题颜色

编辑 [src/store/ThemeContext.tsx](file:///workspace/src/store/ThemeContext.tsx)：

```typescript
const lightColors: ThemeColors = {
  primary: '#YOUR_COLOR',
  // ... 其他颜色
};

const darkColors: ThemeColors = {
  primary: '#YOUR_COLOR',
  // ... 其他颜色
};
```

### 添加新的数据类型

1. 在 [src/types/index.ts](file:///workspace/src/types/index.ts) 定义类型
2. 在 AppContext 中添加状态字段和 Action
3. 在 StorageService 中添加存储方法
4. 在 DataService 中添加 CRUD 方法
5. 创建 Supabase 迁移脚本

### 测试家庭创建功能

参考 [test_family_creation.ts](file:///workspace/test_family_creation.ts)：

```typescript
// 测试脚本示例
import { createFamily, joinFamily, getFamilyMembers } from './src/services/familyService';

async function testFamily() {
  const family = await createFamily('测试家庭');
  console.log('创建成功，邀请码:', family.inviteCode);
  
  const members = await getFamilyMembers(family.id);
  console.log('成员列表:', members);
}
```

---

## 常见问题

### Q: 如何添加家庭成员？

1. 创建家庭后，系统自动生成 6 位邀请码
2. 在设置 → 家庭管理中查看邀请码
3. 家人在"加入家庭"页面输入邀请码即可加入

### Q: OCR 识别不准确怎么办？

- 确保截图清晰，文字可读
- 尝试选择更精准的截图区域
- OCR 结果可在记账页面手动修正

### Q: 数据同步延迟？

- 检查网络连接
- Supabase Realtime 正常情况下实时同步
- 如有延迟，可手动刷新页面

### Q: 如何切换个人/家庭记账模式？

- 在设置页面切换活跃家庭
- 选择"个人账本"则使用个人模式
- 选择某个家庭则使用家庭模式

---

## 版本历史

| 版本 | 日期 | 主要更新 |
|------|------|----------|
| 1.0.0 | 2024 | 初始版本，支持基础记账功能 |

---

## 许可证

本项目仅供学习和个人使用。

---

## 贡献指南

欢迎提交 Issue 和 Pull Request。

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用函数式组件 + Hooks
- 状态管理使用 Context + Reducer 模式

### 提交规范

使用 Conventional Commits：
- `feat: 新功能`
- `fix: 修复 bug`
- `docs: 文档更新`
- `refactor: 代码重构`
- `test: 测试相关`