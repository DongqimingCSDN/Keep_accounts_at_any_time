# 随手记账 - Code Wiki

## 1. 项目概述

**随手记账**（Keep Accounts At Any Time）是一款基于 React Native + Expo 的跨平台移动端记账应用，支持 **个人记账** 和 **家庭协作记账** 两种模式。个人模式下数据存储在本地（AsyncStorage），家庭模式下数据通过 Supabase 云端同步，支持实时数据推送和多成员协作。内置 **LLM 智能记账助手**，支持截屏 OCR 识别和自然语言文字记账。

- **应用名称**：随手记账
- **包名**：`com.keepaccounts.anytime`
- **版本**：1.0.0
- **框架**：React Native 0.79.0 + Expo 53
- **语言**：TypeScript 5.8
- **后端**：Supabase（PostgreSQL + Auth + Realtime）

---

## 2. 项目架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx (入口)                       │
│  SafeAreaProvider → ThemeProvider → AppProvider           │
│         ↓                                                │
│  ┌── 未配置 Supabase ──→ TabNavigator (离线个人模式)      │
│  ├── 未登录 ──────────→ AuthScreen (登录/注册)            │
│  └── 已登录 ──────────→ TabNavigator (完整功能)           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    TabNavigator                           │
│  ┌──────┬──────┬──────┬──────────┐                       │
│  │ 首页 │ 账单 │ 统计 │ 设置     │                       │
│  │ Home │ Bills│ Stats│ Settings │                       │
│  └──────┴──────┴──────┴──────────┘                       │
│  + AddTransaction (Modal)                                │
│  + SmartRecognize (截屏识别)                              │
│  + TextBookkeeping (文字记账)                             │
│  + FloatingAssistant (悬浮记账助手)                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  SettingsStack                            │
│  SettingsMain → About / CategoryManage / Budget /        │
│  FamilySetup / MultiFamily / Profile / AccountManage /   │
│  SmartAssistantSettings                                  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 分层架构

```
┌────────────────────────────────────────┐
│            Screens (页面层)             │  15个页面组件
├────────────────────────────────────────┤
│          Components (组件层)            │  10个可复用UI组件
├────────────────────────────────────────┤
│           Store (状态管理层)            │  AppContext + ThemeContext
├────────────────────────────────────────┤
│          Services (服务层)              │  authService / dataService /
│                                        │  familyService / profileService
├────────────────────────────────────────┤
│         Storage / API (数据层)          │  StorageService (本地) /
│                                        │  Supabase Client (云端)
├────────────────────────────────────────┤
│         Types / Constants (基础层)      │  类型定义 + 常量配置
└────────────────────────────────────────┘
```

### 2.3 双模式数据流

```
个人模式 (accountMode = 'personal'):
  Screen → AppContext → StorageService → AsyncStorage

家庭模式 (accountMode = 'family'):
  Screen → AppContext → DataService → Supabase API → PostgreSQL
                                        ↕ Realtime 订阅
```

---

## 3. 目录结构

```
Keep_accounts_at_any_time/
├── App.tsx                          # 应用入口，路由守卫
├── app.json                         # Expo 配置
├── package.json                     # 依赖管理
├── tsconfig.json                    # TypeScript 配置
├── babel.config.js                  # Babel 配置
├── .env                             # 环境变量（Supabase 凭据）
├── assets/                          # 静态资源（图标、启动图）
├── src/
│   ├── types/
│   │   └── index.ts                 # 全局类型定义
│   ├── constants/
│   │   ├── categories.ts            # 默认分类与资金账户常量
│   │   └── currency.ts              # 货币符号与选项
│   ├── lib/
│   │   └── supabase.ts              # Supabase 客户端初始化
│   ├── store/
│   │   ├── AppContext.tsx            # 全局应用状态（核心）
│   │   └── ThemeContext.tsx          # 主题状态管理
│   ├── services/
│   │   ├── authService.ts           # 认证服务
│   │   ├── dataService.ts           # 云端数据 CRUD + 实时订阅
│   │   ├── familyService.ts         # 家庭管理服务
│   │   ├── llmService.ts            # LLM 大模型服务（智能识别 + 文字记账）
│   │   ├── ocrService.ts            # OCR 图像文字识别服务
│   │   └── profileService.ts        # 用户资料服务
│   ├── utils/
│   │   └── StorageService.ts        # 本地存储服务 + Excel 导出
│   ├── navigation/
│   │   ├── TabNavigator.tsx          # 底部 Tab 导航 + 主 Stack
│   │   └── SettingsStack.tsx         # 设置页面 Stack 导航
│   ├── components/
│   │   ├── AccountModeSwitch.tsx     # 个人/家庭模式切换
│   │   ├── BillGroup.tsx            # 账单日期分组
│   │   ├── BillItem.tsx             # 单条账单（支持滑动删除）
│   │   ├── CategoryEditModal.tsx    # 分类编辑弹窗
│   │   ├── CategoryGrid.tsx         # 分类网格选择器
│   │   ├── FloatingAssistant.tsx    # 悬浮记账助手球
│   │   ├── MonthPicker.tsx          # 月份选择器
│   │   ├── NumberKeyboard.tsx       # 自定义数字键盘
│   │   ├── SimpleLineChart.tsx      # 折线图（SVG）
│   │   └── SimplePieChart.tsx       # 饼图（SVG）
│   └── screens/
│       ├── HomeScreen.tsx           # 首页（收支概览）
│       ├── BillsScreen.tsx          # 账单列表
│       ├── StatisticsScreen.tsx     # 统计分析
│       ├── AddTransactionScreen.tsx # 记账/编辑交易
│       ├── AuthScreen.tsx           # 登录/注册
│       ├── SettingsScreen.tsx       # 设置主页
│       ├── SmartAssistantSettingsScreen.tsx # 智能助手设置（LLM/OCR 配置）
│       ├── SmartRecognizeScreen.tsx # 截屏智能识别记账
│       ├── TextBookkeepingScreen.tsx # 文字记账（自然语言解析）
│       ├── AboutScreen.tsx          # 关于页面
│       ├── CategoryManageScreen.tsx # 分类管理
│       ├── BudgetScreen.tsx         # 预算管理
│       ├── FamilySetupScreen.tsx    # 家庭设置
│       ├── MultiFamilyScreen.tsx    # 多家庭管理
│       ├── ProfileScreen.tsx        # 个人资料
│       └── AccountManageScreen.tsx  # 资金账户管理
├── supabase-schema.sql              # 数据库建表 SQL
├── supabase-migration-*.sql         # 数据库迁移脚本
└── supabase-fix-rls.sql             # RLS 策略修复
```

---

## 4. 核心类型定义

### 4.1 业务类型（[types/index.ts](src/types/index.ts)）

| 类型 | 说明 | 关键字段 |
|------|------|---------|
| `TransactionType` | 交易类型 | `'expense' \| 'income'` |
| `AccountType` | 记账模式 | `'personal' \| 'family'` |
| `Transaction` | 交易记录 | id, type, amount, categoryId, date, note, accountType, fundAccountId, familyId, userId |
| `Category` | 分类 | id, name, icon, color, type, isCustom, order |
| `FundAccount` | 资金账户 | id, name, icon, color, balance, order, isDefault, familyId |
| `Budget` | 预算 | id, month(YYYY-MM), amount, categoryId? |
| `AppSettings` | 应用设置 | currency, theme |

### 4.2 服务层类型

| 类型 | 所在文件 | 说明 |
|------|---------|------|
| `AuthUser` | authService.ts | 认证用户（id, email, displayName） |
| `Family` | familyService.ts | 家庭（id, name, inviteCode, createdBy） |
| `FamilyMember` | familyService.ts | 家庭成员（id, familyId, userId, role, displayName） |
| `UserProfile` | profileService.ts | 用户资料（id, displayName, avatar, email） |
| `ExportEntry` | StorageService.ts | Excel 导出条目 |

---

## 5. 核心模块详解

### 5.1 AppContext — 全局状态管理

**文件**：[src/store/AppContext.tsx](src/store/AppContext.tsx)

应用的核心状态管理模块，采用 `useReducer` + `Context` 模式。

#### State 结构

```typescript
interface AppState {
  transactions: Transaction[];     // 交易记录列表
  categories: Category[];          // 分类列表
  budgets: Budget[];               // 预算列表
  fundAccounts: FundAccount[];     // 资金账户列表
  settings: AppSettings;           // 应用设置
  isLoading: boolean;              // 加载状态
  isOnline: boolean;               // 是否在线（家庭模式）
  currentUser: AuthUser | null;    // 当前用户
  currentFamily: Family | null;    // 当前家庭
  userFamilies: Family[];          // 用户所属家庭列表
  activeFamilyId: string | null;   // 当前激活的家庭ID
  accountMode: AccountType;        // 记账模式
  familyMembers: FamilyMember[];   // 当前家庭成员
  userProfile: UserProfile | null; // 用户资料
}
```

#### Action 类型（24种）

| 分类 | Actions |
|------|---------|
| 交易 | `SET_TRANSACTIONS`, `ADD_TRANSACTION`, `UPDATE_TRANSACTION`, `DELETE_TRANSACTION` |
| 分类 | `SET_CATEGORIES`, `ADD_CATEGORY`, `UPDATE_CATEGORY`, `DELETE_CATEGORY` |
| 预算 | `SET_BUDGETS`, `SET_BUDGET` |
| 资金账户 | `SET_FUND_ACCOUNTS`, `ADD_FUND_ACCOUNT`, `UPDATE_FUND_ACCOUNT`, `DELETE_FUND_ACCOUNT` |
| 设置 | `SET_SETTINGS` |
| 状态 | `SET_LOADING`, `SET_ONLINE` |
| 认证 | `SET_USER` |
| 家庭 | `SET_FAMILY`, `SET_USER_FAMILIES`, `SET_ACTIVE_FAMILY`, `SET_ACCOUNT_MODE`, `SET_FAMILY_MEMBERS` |
| 资料 | `SET_USER_PROFILE` |

#### 关键方法

| 方法 | 说明 |
|------|------|
| `refreshData()` | 刷新当前模式下的所有数据 |
| `addTransaction(t)` | 新增交易（自动区分个人/家庭模式，更新资金账户余额） |
| `updateTransaction(t)` | 更新交易（回退旧余额 + 应用新余额） |
| `deleteTransaction(id)` | 删除交易（回退资金账户余额） |
| `addCategory / updateCategory / deleteCategory` | 分类 CRUD |
| `setBudget(b)` | 设置预算（支持总预算和分类预算） |
| `updateSettings(s)` | 更新应用设置 |
| `login(user)` | 登录（加载家庭数据、用户资料） |
| `logout()` | 登出（清理订阅、重置状态、切回个人模式） |
| `switchAccountMode(mode, familyId?)` | 切换记账模式（清空旧数据、加载新模式数据） |
| `setActiveFamily(familyId)` | 切换激活家庭 |
| `addFundAccount / updateFundAccount / deleteFundAccount` | 资金账户 CRUD |
| `updateUserProfile(updates)` | 更新用户资料 |

#### 数据加载流程

```
AppProvider 初始化
  └→ loadInitialData()
       ├→ 从 AsyncStorage 加载本地数据（transactions, categories, budgets, fundAccounts, settings, accountMode）
       ├→ 若 Supabase 已配置 → getCurrentUser()
       │   ├→ 有用户 → 加载 profile、获取家庭列表、设置激活家庭
       │   └→ 若上次为家庭模式 → loadOnlineData(familyId)
       └→ 完成，isLoading = false

loadOnlineData(familyId)
  ├→ 并行获取：transactions, categories, budgets, fundAccounts, members
  ├→ 若分类为空 → 回退到 DEFAULT_CATEGORIES
  ├→ 若资金账户为空 → 回退到 DEFAULT_FUND_ACCOUNTS
  └→ setupRealtimeSubscriptions(familyId)
       ├→ subscribeTransactions
       ├→ subscribeCategories
       ├→ subscribeBudgets
       └→ subscribeFundAccounts
```

---

### 5.2 ThemeContext — 主题管理

**文件**：[src/store/ThemeContext.tsx](src/store/ThemeContext.tsx)

支持亮色/暗色主题切换，主题偏好持久化到 AsyncStorage。

#### 主题色定义

| 色彩角色 | 亮色 | 暗色 |
|---------|------|------|
| background | #F5F5F5 | #121212 |
| surface | #FFFFFF | #1E1E1E |
| primary | #4F6EF7 | #6B8AFF |
| error | #FF4D4F | #FF6B6B |
| success | #52C41A | #6BCB77 |

#### 导出

- `ThemeProvider` — 主题 Provider 组件
- `useTheme()` — 获取主题 Hook，返回 `{ theme, colors, isDark, toggleTheme, setTheme }`
- `lightColors / darkColors` — 色彩常量对象

---

### 5.3 Supabase 客户端

**文件**：[src/lib/supabase.ts](src/lib/supabase.ts)

#### 关键设计

- **懒初始化**：只有当环境变量配置了有效的 Supabase URL 和 Anon Key 时才创建客户端
- **兼容代理**：导出的 `supabase` 对象通过 `Proxy` 实现懒加载，兼容旧代码直接引用
- **未配置时安全降级**：`isSupabaseConfigured()` 返回 false 时，应用进入纯离线个人模式

#### 环境变量

```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
```

---

### 5.4 认证服务

**文件**：[src/services/authService.ts](src/services/authService.ts)

| 函数 | 说明 |
|------|------|
| `signUp(email, password, displayName?)` | 注册（Supabase Auth，支持 displayName 元数据） |
| `signIn(email, password)` | 登录 |
| `signOut()` | 登出（清理本地 session + Supabase signOut） |
| `getCurrentUser()` | 获取当前用户（返回 AuthUser 或 null） |
| `getSession()` | 获取当前 session |
| `onAuthStateChange(callback)` | 监听认证状态变化 |

---

### 5.5 数据服务（云端）

**文件**：[src/services/dataService.ts](src/services/dataService.ts)

家庭模式下的所有云端数据操作，包含 CRUD 和 Realtime 订阅。

#### CRUD 操作

| 实体 | 函数 |
|------|------|
| 交易 | `fetchTransactions`, `addTransaction`, `updateTransaction`, `deleteTransaction` |
| 分类 | `fetchCategories`, `addCategory`, `updateCategory`, `deleteCategory` |
| 预算 | `fetchBudgets`, `setBudget`(upsert), `deleteBudget` |
| 资金账户 | `fetchFundAccounts`, `addFundAccount`, `updateFundAccount`, `deleteFundAccount`, `updateFundAccountBalance` |

#### Realtime 订阅

| 函数 | 监听表 |
|------|--------|
| `subscribeTransactions(familyId, onChange)` | transactions |
| `subscribeCategories(familyId, onChange)` | categories |
| `subscribeBudgets(familyId, onChange)` | budgets |
| `subscribeFundAccounts(familyId, onChange)` | fund_accounts |
| `unsubscribeAll()` | 清除所有频道 |

#### 数据映射

所有从数据库返回的数据通过 `mapXxxFromDb()` 函数将 snake_case 字段映射为 camelCase 应用类型：

- `mapTransactionFromDb` — family_id → familyId, category_id → categoryId 等
- `mapCategoryFromDb` — is_custom → isCustom
- `mapBudgetFromDb` — category_id → categoryId
- `mapFundAccountFromDb` — is_default → isDefault

---

### 5.6 家庭服务

**文件**：[src/services/familyService.ts](src/services/familyService.ts)

| 函数 | 说明 |
|------|------|
| `createFamily(name)` | 创建家庭（自动加入为 owner，同步默认分类） |
| `joinFamily(inviteCode)` | 通过邀请码加入家庭（role = member） |
| `getUserFamily()` | 获取用户所在家庭（兼容旧代码，返回单个） |
| `getFamiliesForUser()` | 获取用户所有家庭 |
| `getFamilyMembers(familyId)` | 获取家庭成员列表（含 displayName 补充） |
| `updateMemberDisplayName(memberId, displayName)` | 修改成员备注名（仅 owner） |
| `removeFamilyMember(memberId)` | 移除成员（仅 owner） |
| `leaveFamily(familyId)` | 离开家庭（owner 需先转移权限或为最后成员） |

#### 创建家庭流程

```
createFamily(name)
  ├→ 插入 families 表
  ├→ 插入 family_members 表（role = owner）
  ├→ seedDefaultCategories(familyId) — 同步默认分类
  │   └→ 为每个默认分类生成 `${familyId}_${cat.id}` 的唯一 ID
  └→ 失败时回滚（删除已创建的家庭）
```

---

### 5.7 用户资料服务

**文件**：[src/services/profileService.ts](src/services/profileService.ts)

| 函数 | 说明 |
|------|------|
| `getCurrentProfile()` | 获取当前用户资料（不存在则自动创建） |
| `getProfile(userId)` | 获取指定用户资料 |
| `getProfiles(userIds)` | 批量获取用户资料 |
| `createProfile(displayName, avatar, email)` | 创建用户资料 |
| `updateProfile(updates)` | 更新资料（同步更新 auth user_metadata） |

---

### 5.8 本地存储服务

**文件**：[src/utils/StorageService.ts](src/utils/StorageService.ts)

个人模式下的所有本地数据操作，基于 `@react-native-async-storage/async-storage`。

#### Storage Keys

| Key | 用途 |
|-----|------|
| `@keep_accounts_transactions` | 交易记录 |
| `@keep_accounts_categories` | 分类 |
| `@keep_accounts_budgets` | 预算 |
| `@keep_accounts_fund_accounts` | 资金账户 |
| `@keep_accounts_settings` | 应用设置 |
| `@keep_accounts_account_mode` | 记账模式 |
| `@keep_accounts_active_family_id` | 激活家庭 ID |

#### 主要函数

| 函数 | 说明 |
|------|------|
| `getTransactions / addTransaction / updateTransaction / deleteTransaction` | 交易 CRUD |
| `getCategories / addCategory / updateCategory / deleteCategory` | 分类 CRUD（首次返回默认分类） |
| `getBudgets / getBudgetByMonth / setBudget` | 预算读写 |
| `getFundAccounts / addFundAccount / updateFundAccount / deleteFundAccount / updateFundAccountBalance` | 资金账户 CRUD |
| `getSettings / updateSettings` | 设置读写 |
| `getAccountMode / setAccountMode` | 记账模式持久化 |
| `getActiveFamilyId / setActiveFamilyId` | 激活家庭持久化 |
| `clearAllData()` | 清空所有本地数据 |
| `exportToExcel(entries)` | 导出交易数据为 Excel（base64） |

---

### 5.9 常量配置

#### 分类常量（[src/constants/categories.ts](src/constants/categories.ts)）

| 常量 | 说明 |
|------|------|
| `DEFAULT_EXPENSE_CATEGORIES` | 9个默认支出分类（餐饮、交通、购物等） |
| `DEFAULT_INCOME_CATEGORIES` | 5个默认收入分类（工资、兼职、投资等） |
| `DEFAULT_CATEGORIES` | 全部默认分类 |
| `DEFAULT_FUND_ACCOUNTS` | 4个默认资金账户（微信、支付宝、现金、银行卡） |

#### 货币常量（[src/constants/currency.ts](src/constants/currency.ts)）

支持 CNY(¥)、USD($)、EUR(€)、JPY(¥) 四种货币。

---

### 5.10 LLM 智能解析服务

**文件**：[src/services/llmService.ts](src/services/llmService.ts)

调用大语言模型 API，将 OCR 文本或自然语言描述解析为结构化交易数据。支持 DeepSeek、通义千问、OpenAI 及任何 OpenAI 兼容 API。

#### 类型定义

| 类型 | 说明 |
|------|------|
| `ParsedTransaction` | 解析后的交易数据（type, amount, categoryName, fundAccountName, date, time, note, confidence） |
| `LLMProvider` | 支持的 LLM 提供商：`'deepseek'`、`'tongyi'`、`'openai'`、`'custom'` |
| `LLMProviderConfig` | 提供商配置（name, apiKeyLabel, defaultBaseUrl, defaultModel） |

#### 提供商默认配置

| 提供商 | 默认 API 地址 | 默认模型 |
|--------|-------------|---------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| 自定义 | 用户自定义 | 用户自定义 |

#### 主要函数

| 函数 | 说明 | 使用场景 |
|------|------|---------|
| `parseTransactionFromText(ocrText, provider, apiKey, baseUrl?, model?)` | 解析 OCR 识别的支付截图文本 | 截屏智能识别（SmartRecognizeScreen） |
| `parseTextBookkeeping(text, provider, apiKey, baseUrl?, model?)` | 解析自然语言记账描述 | 文字记账（TextBookkeepingScreen） |

#### 提示词策略

- **OCR 解析**（`SYSTEM_PROMPT`）：适用于从截图 OCR 结果提取结构化信息，包含置信度评估，分类列表更精细
- **文字记账**（`TEXT_BOOKKEEPING_PROMPT`）：适用于自然语言输入，支持更灵活的表达方式，分类与 APP 内置分类对齐，引导用户说明资金账户来源

#### 数据流

```
用户输入（文字/OCR文本）
  └→ parseTextBookkeeping / parseTransactionFromText
       ├→ 构建 System Prompt + User Message
       ├→ 调用 LLM API（OpenAI 兼容格式）
       ├→ 解析响应 JSON（自动处理 markdown 代码块包裹）
       ├→ 验证和标准化字段
       └→ 返回 ParsedTransaction
```

> **关联服务**：[ocrService.ts](src/services/ocrService.ts) 提供 OCR 图像文字识别能力，支持火山引擎、百度、腾讯等 OCR 供应商。截屏识别流程为：`ocrService.recognizeImage()` → `llmService.parseTransactionFromText()`。

---

## 6. 页面与导航

### 6.1 导航结构

```
NavigationContainer
└── Stack.Navigator (RootStack)
    ├── MainTabs (BottomTabNavigator)
    │   ├── Home (首页) — headerRight: AccountModeSwitch
    │   ├── Bills (账单) — headerRight: AccountModeSwitch
    │   ├── Statistics (统计) — headerRight: AccountModeSwitch
    │   └── Settings (设置 Stack)
    │       └── SettingsStack (NativeStackNavigator)
    │           ├── SettingsMain
    │           ├── About
    │           ├── CategoryManage
    │           ├── Budget
    │           ├── FamilySetup
    │           ├── MultiFamily
    │           ├── Profile
    │           ├── AccountManage
    │           └── SmartAssistantSettings
    ├── AddTransaction (Modal)
    ├── SmartRecognize (截屏智能识别)
    └── TextBookkeeping (文字记账)
```

### 6.2 页面说明

| 页面 | 文件 | 功能 |
|------|------|------|
| **HomeScreen** | HomeScreen.tsx | 当月收支概览、今日快报、预算进度、最近5笔交易、FAB记账按钮 |
| **BillsScreen** | BillsScreen.tsx | 按月查看账单、按日期分组、分类筛选、滑动删除 |
| **StatisticsScreen** | StatisticsScreen.tsx | 月/年切换、收支总览、支出饼图、资金账户统计、6月趋势折线图 |
| **AddTransactionScreen** | AddTransactionScreen.tsx | 新增/编辑交易、收入/支出切换、自定义数字键盘、分类选择、资金账户选择、日期时间选择 |
| **SmartRecognizeScreen** | SmartRecognizeScreen.tsx | 从相册选择截图，OCR 识别 + LLM 智能解析为结构化交易，支持手动修正后记账 |
| **TextBookkeepingScreen** | TextBookkeepingScreen.tsx | 输入自然语言描述（如"微信支付午饭35元"），LLM 解析后预填记账信息，一键跳转确认 |
| **AuthScreen** | AuthScreen.tsx | 登录/注册表单 |
| **SettingsScreen** | SettingsScreen.tsx | 个人资料卡片、货币/深色模式设置、分类/资金/预算/家庭管理入口、数据导出、清空数据 |
| **SmartAssistantSettingsScreen** | SmartAssistantSettingsScreen.tsx | LLM 提供商/API Key/自定义地址配置、OCR 服务配置 |
| **CategoryManageScreen** | CategoryManageScreen.tsx | 支出/收入分类管理、添加/编辑/删除自定义分类 |
| **BudgetScreen** | BudgetScreen.tsx | 总预算/分类预算设置、进度展示、超支提醒 |
| **AccountManageScreen** | AccountManageScreen.tsx | 资金账户管理、总资产展示、添加/编辑/删除账户 |
| **FamilySetupScreen** | FamilySetupScreen.tsx | 创建/加入家庭引导页 |
| **MultiFamilyScreen** | MultiFamilyScreen.tsx | 多家庭列表、切换/创建/加入/离开家庭、成员管理 |
| **ProfileScreen** | ProfileScreen.tsx | 编辑昵称和头像 |
| **AboutScreen** | AboutScreen.tsx | 关于信息 |

---

## 7. 组件说明

| 组件 | 文件 | 说明 |
|------|------|------|
| **AccountModeSwitch** | AccountModeSwitch.tsx | 顶部个人/家庭模式切换按钮，多家庭时弹出选择弹窗 |
| **BillGroup** | BillGroup.tsx | 按日期分组的账单卡片，显示日期和当日收支汇总 |
| **BillItem** | BillItem.tsx | 单条账单项，支持 Swipeable 左滑删除，显示分类图标/名称/金额/时间/成员/资金账户 |
| **CategoryEditModal** | CategoryEditModal.tsx | 分类编辑弹窗，支持名称输入、Emoji 图标选择、颜色选择 |
| **CategoryGrid** | CategoryGrid.tsx | 分类网格选择器（4列），用于记账页面选择分类 |
| **FloatingAssistant** | FloatingAssistant.tsx | 可拖拽悬浮记账助手球，点击展开菜单：截屏识别、快速记账、文字记账 |
| **MonthPicker** | MonthPicker.tsx | 月份切换器（← 2024年01月 →），点击中间回到当月 |
| **NumberKeyboard** | NumberKeyboard.tsx | 自定义数字键盘（0-9、小数点、退格），限制小数2位 |
| **SimplePieChart** | SimplePieChart.tsx | SVG 饼图组件，自动计算扇形角度和百分比标签 |
| **SimpleLineChart** | SimpleLineChart.tsx | SVG 折线图组件，支持多数据集、网格线、贝塞尔曲线 |

---

## 8. 数据库设计

### 8.1 表结构

**Supabase Schema**：[supabase-schema.sql](supabase-schema.sql)

```
┌──────────────┐     ┌──────────────────┐
│   families   │────→│  family_members  │
│  id (UUID)   │     │  family_id (FK)  │
│  name        │     │  user_id (FK)    │
│  invite_code │     │  role            │
│  created_by  │     │  display_name    │
└──────┬───────┘     └──────────────────┘
       │
       ├────→ ┌──────────────┐
       │      │ categories   │
       │      │  family_id   │
       │      │  name/icon   │
       │      │  color/type  │
       │      │  is_custom   │
       │      └──────────────┘
       │
       ├────→ ┌──────────────┐     ┌──────────────┐
       │      │ transactions │     │  budgets     │
       │      │  family_id   │     │  family_id   │
       │      │  user_id     │     │  month       │
       │      │  category_id │     │  amount      │
       │      │  type/amount │     │  category_id │
       │      │  date/note   │     └──────────────┘
       │      │  fund_account│
       │      └──────────────┘
       │
       └────→ ┌──────────────┐
              │ fund_accounts │
              │  family_id   │
              │  name/icon   │
              │  color       │
              │  balance     │
              └──────────────┘

┌──────────────┐
│  profiles    │  (独立于 family)
│  id (FK→auth)│
│  display_name│
│  avatar      │
│  email       │
└──────────────┘
```

### 8.2 RLS 策略

所有表均启用 Row Level Security，核心规则：

- **families**：成员可查看，创建者可增删改
- **family_members**：成员可查看/加入，owner 可移除，用户可离开
- **categories / budgets / fund_accounts**：家庭成员可完整 CRUD
- **transactions**：家庭成员可查看/创建/更新/删除

### 8.3 Realtime

以下表启用了 Realtime 推送：

- `transactions`
- `categories`
- `budgets`
- `fund_accounts`

### 8.4 数据库迁移

| 文件 | 说明 |
|------|------|
| `supabase-schema.sql` | 初始建表 + RLS + 索引 |
| `supabase-migration-add-account-type.sql` | 添加 account_type 字段 |
| `supabase-migration-add-category-budget.sql` | 预算表添加 category_id + 联合唯一约束 |
| `supabase-migration-add-display-name.sql` | 家庭成员表添加 display_name |
| `supabase-migration-add-fund-accounts.sql` | 新增 fund_accounts 表 |
| `supabase-migration-add-profiles.sql` | 新增 profiles 表 |
| `supabase-migration-transaction-date-time.sql` | 交易日期支持时间精度 |
| `supabase-fix-rls.sql` | RLS 策略修复 |

---

## 9. 依赖关系

### 9.1 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `expo` | ~53.0.0 | 跨平台开发框架 |
| `react` | 19.0.0 | UI 库 |
| `react-native` | 0.79.0 | 移动端渲染 |
| `@supabase/supabase-js` | ^2.49.0 | Supabase 客户端（Auth + DB + Realtime） |
| `@react-navigation/native` | ^7.1.0 | 导航框架 |
| `@react-navigation/bottom-tabs` | ^7.3.0 | 底部 Tab 导航 |
| `@react-navigation/native-stack` | ^7.3.0 | 原生 Stack 导航 |
| `@react-native-async-storage/async-storage` | ~2.1.0 | 本地键值存储 |
| `react-native-gesture-handler` | ~2.24.0 | 手势处理（滑动删除等） |
| `react-native-reanimated` | ~3.17.0 | 动画库 |
| `react-native-svg` | ~15.11.0 | SVG 渲染（图表） |
| `dayjs` | ^1.11.20 | 日期处理 |
| `xlsx` | ^0.18.5 | Excel 导出 |
| `expo-file-system` | ~18.0.0 | 文件系统操作 |
| `expo-sharing` | ~13.0.0 | 系统分享 |

### 9.2 模块间依赖关系

```
App.tsx
  ├── ThemeContext (主题)
  ├── AppContext (状态) ← 核心，被所有页面依赖
  │   ├── StorageService (本地存储)
  │   ├── DataService (云端数据)
  │   │   └── supabase (Supabase 客户端)
  │   ├── authService (认证)
  │   │   └── supabase
  │   ├── familyService (家庭)
  │   │   └── supabase
  │   ├── profileService (资料)
  │   │   └── supabase
  │   ├── llmService (LLM 智能解析)  ← 文字记账 / 截图识别
│   └── categories (默认常量)
  ├── FloatingAssistant (悬浮助手)
  ├── TabNavigator (导航)
  │   ├── HomeScreen
  │   ├── BillsScreen
  │   │   └── MonthPicker, BillGroup → BillItem
  │   ├── StatisticsScreen
  │   │   └── SimplePieChart, SimpleLineChart
  │   └── SettingsStack
  │       ├── SettingsScreen
  │       ├── CategoryManageScreen → CategoryEditModal
  │       ├── BudgetScreen
  │       ├── AccountManageScreen
  │       ├── FamilySetupScreen
  │       ├── MultiFamilyScreen
  │       ├── ProfileScreen
  │       ├── AboutScreen
  │       └── SmartAssistantSettingsScreen
  ├── AddTransactionScreen
  │   ├── NumberKeyboard
  │   └── CategoryGrid
  ├── SmartRecognizeScreen
  │   └── llmService (OCR + LLM 解析)
  ├── TextBookkeepingScreen
  │   └── llmService (文字记账解析)
  └── AuthScreen
```

---

## 10. 项目运行方式

### 10.1 环境要求

- Node.js >= 18
- npm 或 yarn
- iOS: Xcode + CocoaPods (macOS only)
- Android: Android Studio + JDK 17
- Expo Go（开发调试用）

### 10.2 安装与启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 指定平台启动
npm run android    # Android
npm run ios        # iOS
npm run web        # Web
```

### 10.3 Supabase 配置

1. 在 [Supabase](https://supabase.com) 创建项目
2. 在 SQL Editor 中依次执行 `supabase-schema.sql` 和所有 migration 脚本
3. 在项目根目录 `.env` 文件中配置：

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **注意**：不配置 Supabase 时，应用仍可正常运行于纯离线个人记账模式。

### 10.4 构建发布

```bash
# 使用 EAS Build
npx eas build --platform android
npx eas build --platform ios
```

---

## 11. 关键业务流程

### 11.1 记账流程

```
用户点击 FAB → AddTransactionScreen (Modal)
  ├→ 选择 收入/支出
  ├→ 输入金额（自定义数字键盘）
  ├→ 选择分类（CategoryGrid）
  ├→ 选择资金账户（可选）
  ├→ 选择日期和时间
  ├→ 输入备注
  └→ 确认 → AppContext.addTransaction()
       ├→ 家庭模式 → DataService.addTransaction() → Supabase
       │           → DataService.updateFundAccountBalance()
       └→ 个人模式 → StorageService.addTransaction() → AsyncStorage
                   → StorageService.updateFundAccountBalance()
```

### 11.2 模式切换流程

```
AccountModeSwitch 点击"家庭"
  ├→ 无家庭 → 提示创建
  ├→ 1个家庭 → switchAccountMode('family')
  └→ 多个家庭 → 弹出选择 → switchAccountMode('family', familyId)

switchAccountMode(mode, targetFamilyId?)
  ├→ 保存模式到 AsyncStorage
  ├→ dispatch SET_ACCOUNT_MODE
  ├→ 家庭模式:
  │   ├→ 清空旧数据（transactions, budgets）
  │   └→ loadOnlineData(familyId)
  │       ├→ 并行获取云端数据
  │       └→ setupRealtimeSubscriptions
  └→ 个人模式:
      ├→ cleanupSubscriptions
      ├→ 清空旧数据
      └→ 从 AsyncStorage 重新加载本地数据
```

### 11.3 数据导出流程

```
SettingsScreen → 导出数据
  ├→ 选择数据来源（个人 / 多个家庭）
  ├→ 选择日期范围（支持快捷：本月/上月/近3月/今年）
  └→ 执行导出:
      ├→ 收集个人交易（StorageService）
      ├→ 收集家庭交易（DataService + 分类映射 + 成员资料）
      ├→ 合并排序
      ├→ StorageService.exportToExcel() → base64
      ├→ FileSystem.writeAsStringAsync() → 临时文件
      └→ Sharing.shareAsync() → 系统分享
```

### 11.4 文字记账流程

```
FloatingAssistant → 文字记账 → TextBookkeepingScreen
  ├→ 用户输入自然语言描述（如"微信支付今天午饭35元"）
  ├→ 点击「智能解析」
  │   ├→ parseTextBookkeeping(text, provider, apiKey)
  │   │   ├→ 构建 TEXT_BOOKKEEPING_PROMPT + user message
  │   │   ├→ 调用 LLM API → 解析分类/金额/类型/资金账户/日期
  │   │   └→ 返回 ParsedTransaction
  │   ├→ 展示解析结果（类型、金额、分类、资金账户、日期、备注）
  │   └→ 用户确认 → 跳转 AddTransactionScreen（预填数据）
  └→ 用户在 AddTransactionScreen 可修改任何字段后保存
```

### 11.5 截屏智能识别流程

```
FloatingAssistant → 截屏识别 → 选择相册图片 → SmartRecognizeScreen
  ├→ 展示选中截图
  ├→ 点击「开始识别」
  │   ├→ 调用 OCR API 提取支付截图文字
  │   ├→ parseTransactionFromText(ocrText, provider, apiKey)
  │   │   ├→ 构建 SYSTEM_PROMPT（含置信度评估）
  │   │   ├→ 调用 LLM API → 解析结构化数据 + 置信度
  │   │   └→ 返回 ParsedTransaction（含 confidence）
  │   └→ 展示识别结果（含置信度指示）
  ├→ 用户确认 → 跳转 AddTransactionScreen（预填数据）
  └→ 用户在 AddTransactionScreen 可修改任何字段后保存
```

### 11.6 悬浮助手交互流程

```
FloatingAssistant（可拖拽悬浮球）
  ├→ 点击悬浮球 → 展开菜单面板（遮罩层）
  │   ├── 📸 截屏识别 → 打开图片选择器 → SmartRecognizeScreen
  │   ├── ✏️ 快速记账 → 直接打开 AddTransactionScreen
  │   ├── 💬 文字记账 → TextBookkeepingScreen
  │   └── ✕ 收起 → 关闭菜单
  ├→ 拖拽悬浮球 → 移动位置 → 松手吸附到屏幕边缘
  └→ 位置自动记忆，下次启动恢复
```
