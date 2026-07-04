# 随手记账 (Keep Accounts at Any Time)

一款基于 React Native + Expo 的个人/家庭记账应用，支持离线记账、云端同步、智能识别、多账户管理。

---

## 技术栈

```
┌─────────────────────────────────────────────┐
│                  前端框架                     │
│  React 19  +  React Native 0.79  +  Expo 53  │
├─────────────────────────────────────────────┤
│                 状态管理                      │
│  React Context + useReducer（全局状态）        │
│  AsyncStorage（本地持久化）                    │
├─────────────────────────────────────────────┤
│                 后端服务                      │
│  Supabase（认证/数据库/实时订阅/存储）          │
├─────────────────────────────────────────────┤
│                 导航路由                      │
│  React Navigation 7（Bottom Tabs + Stack）    │
├─────────────────────────────────────────────┤
│                 关键依赖                      │
│  dayjs · react-native-svg · react-native-    │
│  reanimated · react-native-gesture-handler   │
│  xlsx（按需加载）· expo-image-picker          │
└─────────────────────────────────────────────┘
```

---

## 核心功能

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   记账管理    │  │   预算管理    │  │   资金账户    │  │   统计分析    │
│              │  │              │  │              │  │              │
│ · 收入/支出   │  │ · 个人预算    │  │ · 微信/支付宝 │  │ · 月度趋势图  │
│ · 账户转账    │  │ · 家庭预算    │  │ · 现金/银行卡 │  │ · 分类饼图    │
│ · 文字记账    │  │ · 分类预算    │  │ · 余额管理    │  │ · 收支概览    │
│ · 截图识别    │  │ · 进度可视化  │  │ · 账户转账    │  │ · 今日汇总    │
│ · 自动记账    │  │              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   家庭记账    │  │   数据导出    │  │   智能助手    │
│              │  │              │  │              │
│ · 创建/加入   │  │ · Excel 导出  │  │ · 悬浮快捷入口│
│ · 成员管理    │  │ · 自定义字段  │  │ · 快速记账    │
│ · 账单共享    │  │              │  │ · 截图识别    │
│ · 成员筛选    │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

**双模式记账**：离线模式（本地 AsyncStorage）无需任何配置即可使用；云端模式（Supabase）支持多设备同步、家庭共享。

---

## 项目结构

```
Keep_accounts_at_any_time/
├── App.tsx                    # 应用入口，Provider 嵌套
├── index.js                   # Expo 注册入口
├── src/
│   ├── components/            # 可复用组件
│   │   ├── AccountModeSwitch.tsx   # 账户模式切换
│   │   ├── BillGroup.tsx           # 账单分组
│   │   ├── BillItem.tsx            # 账单条目
│   │   ├── CalendarPicker.tsx      # 日历选择器
│   │   ├── CategoryEditModal.tsx   # 分类编辑弹窗
│   │   ├── CategoryGrid.tsx        # 分类网格
│   │   ├── FloatingAssistant.tsx   # 悬浮助手
│   │   ├── MonthPicker.tsx         # 月份选择器
│   │   ├── NumberKeyboard.tsx      # 数字键盘
│   │   ├── SimpleLineChart.tsx     # 折线图
│   │   └── SimplePieChart.tsx      # 饼图
│   ├── constants/             # 常量定义
│   │   ├── categories.ts           # 预设分类/账户
│   │   └── currency.ts             # 货币符号
│   ├── lib/
│   │   └── supabase.ts             # Supabase 客户端
│   ├── navigation/            # 导航配置
│   │   ├── TabNavigator.tsx        # 底部Tab + 模态路由
│   │   └── SettingsStack.tsx       # 设置页 Stack 导航
│   ├── screens/               # 页面组件
│   │   ├── HomeScreen.tsx          # 首页（收支概览）
│   │   ├── BillsScreen.tsx         # 账单列表
│   │   ├── StatisticsScreen.tsx    # 统计分析
│   │   ├── SettingsScreen.tsx      # 设置主页
│   │   ├── AddTransactionScreen.tsx # 记账页面
│   │   ├── AuthScreen.tsx          # 登录/注册
│   │   ├── BudgetScreen.tsx        # 预算管理
│   │   ├── CategoryManageScreen.tsx# 分类管理
│   │   ├── AccountManageScreen.tsx # 资金账户管理
│   │   ├── AutoTransactionManageScreen.tsx # 自动记账
│   │   ├── FamilySetupScreen.tsx   # 家庭设置
│   │   ├── MultiFamilyScreen.tsx   # 家庭管理
│   │   ├── ProfileScreen.tsx       # 个人资料
│   │   ├── SmartRecognizeScreen.tsx# 智能识别
│   │   ├── SmartAssistantSettingsScreen.tsx # 智能助手设置
│   │   ├── TextBookkeepingScreen.tsx # 文字记账
│   │   └── TransferScreen.tsx      # 账户转账
│   ├── services/              # 服务层
│   │   ├── authService.ts          # 认证服务
│   │   ├── dataService.ts          # 数据 CRUD + 实时订阅
│   │   ├── familyService.ts        # 家庭服务
│   │   ├── llmService.ts           # LLM 智能识别
│   │   ├── ocrService.ts           # OCR 识别
│   │   └── profileService.ts       # 用户资料
│   ├── store/                 # 状态管理
│   │   ├── AppContext.tsx           # 全局状态（Reducer + Context）
│   │   └── ThemeContext.tsx         # 主题状态
│   ├── types/
│   │   └── index.ts                # TypeScript 类型定义
│   └── utils/
│       └── StorageService.ts       # AsyncStorage 封装 + Excel 导出
├── supabase-*.sql             # Supabase 数据库迁移脚本
├── scripts/                   # 辅助脚本
├── assets/                    # 图标/图片资源
├── app.json                   # Expo 配置
├── babel.config.js            # Babel 配置
├── tsconfig.json              # TypeScript 配置
└── eas.json                   # EAS Build 配置
```

---

## 快速开始

### 环境要求

- Node.js 18.12+
- npm 或 yarn
- Expo CLI（通过 `npx expo` 使用）
- 物理设备安装 Expo Go 或配置 Android/iOS 开发环境

### 安装与运行

```bash
# 1. 克隆项目
git clone <repository-url>
cd Keep_accounts_at_any_time

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npx expo start

# 4. 在设备上运行
#    扫码 Expo Go 打开，或：
npx expo run:android   # Android
npx expo run:ios       # iOS
```

### 离线模式（无需配置）

不配置 Supabase 即可直接使用，所有数据存储在设备本地 AsyncStorage 中。

### 云端模式（配置 Supabase）

1. 在 [Supabase](https://supabase.com) 创建项目
2. 在项目根目录创建 `.env` 文件：

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. 在 Supabase SQL Editor 中依次执行根目录下的 `supabase-*.sql` 迁移脚本
4. 重启应用，即可使用云端同步、家庭记账等功能

### 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 云端模式必填 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | 云端模式必填 |

---

## 可用脚本

| 脚本 | 说明 |
|------|------|
| `npm start` | 启动 Expo 开发服务器 |
| `npm run android` | 在 Android 设备/模拟器运行 |
| `npm run ios` | 在 iOS 模拟器运行 |
| `npm run web` | 在浏览器中运行 |

---

## 架构设计

### 启动优化

```
优化前：AsyncStorage × 6 → Supabase 认证 → 网络请求 × 4~6 → 首屏渲染
         └────────────── 全量阻塞，等待 2~4 秒 ──────────────┘

优化后：AsyncStorage × 6 → 首屏渲染（缓存数据）
         Supabase 认证 + 网络请求 → 后台静默更新
         └── 200~300ms 即可看到界面 ──┘
```

关键优化措施：
- **分阶段加载**：本地数据立即可用，在线数据后台异步同步
- **代码分割**：非首屏页面使用 `React.lazy` 按需加载
- **Bundle 瘦身**：xlsx 库改为动态导入，生产环境移除 console.log
- **计算优化**：合并多次数组遍历为单次 `for...of` 循环

### 数据流

```
┌──────────┐    ┌──────────────┐    ┌──────────┐
│  Screen  │───▶│  AppContext  │───▶│  Supabase│
│  (UI)    │◀───│  (Reducer)   │◀───│  (云端)   │
└──────────┘    └──────┬───────┘    └──────────┘
                       │
                ┌──────▼───────┐
                │  AsyncStorage│
                │  (本地缓存)   │
                └──────────────┘
```

- 写操作：优先写入 Supabase，失败时回退到本地存储
- 读操作：启动时先展示本地缓存，后台同步云端数据
- 实时更新：Supabase Realtime 订阅 + AppState 前台刷新

### 两种账户模式

```
┌──────────────────────────────────────────────┐
│              个人记账（默认）                   │
│  · 数据仅自己可见                              │
│  · 支持个人预算、个人分类                       │
│  · 可随时将历史账单迁移到家庭                    │
├──────────────────────────────────────────────┤
│              家庭记账                          │
│  · 创建或加入家庭                              │
│  · 账单共享给所有家庭成员                       │
│  · 支持家庭预算、家庭成员筛选                   │
│  · 按成员查看收支情况                           │
└──────────────────────────────────────────────┘
```

---

## 数据库迁移

Supabase 迁移脚本按执行顺序排列：

| 脚本 | 说明 |
|------|------|
| `supabase-schema.sql` | 初始表结构 |
| `supabase-migration-add-account-type.sql` | 添加账户类型字段 |
| `supabase-migration-add-fund-accounts.sql` | 添加资金账户表 |
| `supabase-migration-add-category-budget.sql` | 添加分类预算 |
| `supabase-migration-add-profiles.sql` | 添加用户资料表 |
| `supabase-migration-add-display-name.sql` | 添加显示名称 |
| `supabase-migration-auto-transactions.sql` | 添加自动记账表 |
| `supabase-migration-date-to-timestamp.sql` | 日期字段迁移 |
| `supabase-migration-personal-data-cloud.sql` | 个人数据云端化 |
| `supabase-migration-personal-budgets-cloud.sql` | 个人预算云端化 |
| `supabase-migration-add-private-budget-scope.sql` | 预算作用域 |
| `supabase-migration-fund-account-id-text.sql` | 资金账户ID类型 |
| `supabase-migration-fund-accounts-user-id.sql` | 资金账户用户关联 |
| `supabase-migration-transaction-date-time.sql` | 交易时间字段 |
| `supabase-fix-rls.sql` | RLS 策略修复 |
| `supabase-delete-old-data.sql` | 清理旧数据 |

---

## License

Private