# 随手记账

一款基于 React Native + Expo 开发的智能记账应用，支持个人记账、家庭共享记账、AI 智能识别等多种功能。

## 功能特性

### 核心记账功能
- **收支记录**：支持收入、支出、转账三种交易类型
- **分类管理**：预设常用分类，支持自定义分类图标和颜色
- **资金账户**：管理多个资金账户（如微信、支付宝、银行卡等），实时追踪余额
- **预算管理**：设置月度预算，可视化预算使用进度，超支预警

### 智能记账功能
- **OCR 截屏识别**：选择支付截图，自动识别金额、分类、时间等信息
- **文字记账**：自然语言描述消费，AI 自动解析为记账条目
  - 示例：`今天午饭35，打车28，买水果18` → 自动解析为 3 笔交易
- **多 LLM 支持**：DeepSeek、通义千问、OpenAI 等

### 家庭记账功能
- **家庭创建**：创建家庭账本，生成邀请码
- **成员管理**：邀请家人加入，共享记账数据
- **权限控制**：区分个人账本和家庭账本

### 数据与统计
- **实时同步**：基于 Supabase 实时订阅，多设备数据同步
- **统计分析**：收支趋势图表、分类占比饼图
- **账单管理**：按日期、分类筛选查看
- **数据导出**：支持导出为 Excel 格式

### 其他特性
- **自动记账规则**：设置周期性自动记账（每日/每周/每月）
- **多货币支持**：CNY、USD、EUR、JPY
- **主题切换**：浅色/深色/跟随系统
- **悬浮助手**：快捷入口，一键记账

## 技术架构

### 前端技术栈
- **框架**：React Native + Expo 53
- **语言**：TypeScript
- **导航**：React Navigation（底部 Tab + 嵌套 Stack）
- **状态管理**：React Context + Hooks
- **UI 组件**：自定义组件 + Expo Linear Gradient
- **图表**：自定义 SVG 图表（折线图、饼图）
- **手势交互**：react-native-gesture-handler + react-native-reanimated

### 后端服务
- **BaaS**：Supabase
  - 用户认证（Email/Password）
  - PostgreSQL 数据库
  - 实时订阅（Realtime）
  - 行级安全策略（RLS）
- **AI 服务**
  - 百度 OCR（图片文字识别）
  - LLM API（智能解析）

### 数据模型

```
├── families          # 家庭
├── family_members    # 家庭成员
├── categories        # 分类
├── transactions      # 交易记录
├── budgets           # 预算
├── fund_accounts     # 资金账户
├── auto_transactions # 自动记账规则
├── user_settings     # 用户设置
└── profiles          # 用户资料
```

## 项目结构

```
keep-accounts-at-any-time/
├── App.tsx                    # 应用入口
├── app.json                   # Expo 配置
├── package.json               # 依赖配置
├── tsconfig.json              # TypeScript 配置
├── assets/                    # 静态资源
│   ├── icon.png
│   ├── adaptive-icon.png
│   ├── splash.png
│   └── favicon.png
├── src/
│   ├── components/            # UI 组件
│   │   ├── AccountModeSwitch.tsx
│   │   ├── BillGroup.tsx
│   │   ├── BillItem.tsx
│   │   ├── CalendarPicker.tsx
│   │   ├── CategoryEditModal.tsx
│   │   ├── CategoryGrid.tsx
│   │   ├── FloatingAssistant.tsx
│   │   ├── MonthPicker.tsx
│   │   ├── NumberKeyboard.tsx
│   │   ├── SimpleLineChart.tsx
│   │   └── SimplePieChart.tsx
│   ├── constants/             # 常量定义
│   │   ├── categories.ts      # 预设分类
│   │   └── currency.ts        # 货币符号
│   ├── lib/
│   │   └── supabase.ts        # Supabase 客户端
│   ├── navigation/            # 导航配置
│   │   ├── SettingsStack.tsx
│   │   └── TabNavigator.tsx
│   ├── screens/               # 页面
│   │   ├── HomeScreen.tsx             # 首页（收支概览）
│   │   ├── AddTransactionScreen.tsx   # 记账页面
│   │   ├── BillsScreen.tsx            # 账单列表
│   │   ├── StatisticsScreen.tsx       # 统计分析
│   │   ├── BudgetScreen.tsx           # 预算管理
│   │   ├── CategoryManageScreen.tsx   # 分类管理
│   │   ├── AccountManageScreen.tsx    # 资金账户管理
│   │   ├── TransferScreen.tsx         # 转账页面
│   │   ├── SmartRecognizeScreen.tsx   # OCR 智能识别
│   │   ├── TextBookkeepingScreen.tsx  # 文字记账
│   │   ├── FamilySetupScreen.tsx      # 家庭创建
│   │   ├── MultiFamilyScreen.tsx      # 家庭切换
│   │   ├── SettingsScreen.tsx         # 设置
│   │   ├── AuthScreen.tsx             # 登录注册
│   │   └── AboutScreen.tsx            # 关于页面
│   ├── services/              # 服务层
│   │   ├── authService.ts     # 认证服务
│   │   ├── dataService.ts     # 数据 CRUD
│   │   ├── familyService.ts   # 家庭服务
│   │   ├── llmService.ts      # LLM 解析服务
│   │   ├── ocrService.ts      # OCR 服务
│   │   └── profileService.ts  # 用户资料服务
│   ├── store/                 # 状态管理
│   │   ├── AppContext.tsx     # 应用全局状态
│   │   └── ThemeContext.tsx   # 主题状态
│   ├── types/                 # 类型定义
│   │   └── index.ts
│   └── utils/                 # 工具函数
│       └── StorageService.ts  # 本地存储
├── scripts/                   # 脚本工具
│   ├── crop_icon.py
│   └── replace_icons.py
├── supabase-*.sql             # 数据库迁移脚本
```

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- Expo CLI
- iOS Simulator / Android Emulator（或真机）

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env` 文件：

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 启动开发服务器

```bash
npm start
```

### 运行平台

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Supabase 配置

### 1. 创建 Supabase 项目

前往 [Supabase Dashboard](https://supabase.com) 创建新项目。

### 2. 执行数据库脚本

在 SQL Editor 中依次执行以下脚本：

1. `supabase-schema.sql` - 创建基础表结构
2. `supabase-migration-*.sql` - 各功能模块迁移脚本
3. `supabase-fix-rls.sql` - RLS 权限修复（如需要）

### 3. 获取 API 密钥

在 Project Settings → API 中获取：
- Project URL
- anon public key

### 4. 配置 Realtime

在 Database → Replication 中启用以下表的实时订阅：
- transactions
- categories
- budgets
- fund_accounts

## AI 功能配置

### 百度 OCR

1. 前往 [百度智能云](https://cloud.baidu.com/) 创建 OCR 应用
2. 获取 API Key 和 Secret Key
3. 在应用设置中配置

### LLM 服务

支持以下 LLM 提供商：

| 提供商 | Base URL | 模型示例 |
|--------|----------|----------|
| DeepSeek | https://api.deepseek.com | deepseek-chat |
| 通义千问 | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen-turbo |
| OpenAI | https://api.openai.com | gpt-4o-mini |

在设置页面配置：
- LLM Provider
- API Key
- Base URL（可选，默认使用官方地址）
- Model（可选）

## 构建与发布

### EAS Build

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 构建
eas build --platform ios
eas build --platform android
```

### 本地构建

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

## 离线模式

应用支持无 Supabase 配置的离线模式：
- 数据存储在本地 AsyncStorage
- 仅支持个人记账（无家庭功能）
- 无云端同步

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

## 开发指南

### 添加新分类

编辑 `src/constants/categories.ts`：

```typescript
export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: 'new-category', name: '新分类', icon: '🆕', color: '#FF5722', type: 'expense', isCustom: false, order: 99 },
];
```

### 添加新页面

1. 在 `src/screens/` 创建新页面组件
2. 在对应 Stack Navigator 中注册路由
3. 添加导航入口

### 自定义主题

编辑 `src/store/ThemeContext.tsx` 修改颜色配置。

## 许可证

本项目仅供学习和个人使用。

## 贡献

欢迎提交 Issue 和 Pull Request。