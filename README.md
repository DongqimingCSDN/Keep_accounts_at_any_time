# 随手记账

一款基于 React Native + Expo 的跨平台移动端记账应用，支持个人记账和家庭协作记账两种模式。

## 功能特性

### 核心功能
- **收支记账**：快速记录收入和支出，支持自定义分类、资金账户、日期时间、备注
- **预算管理**：设置月度总预算和分类预算，实时追踪预算进度
- **资金账户**：管理多个资金账户（微信、支付宝、现金、银行卡等），自动计算余额
- **统计分析**：月度/年度收支统计，饼图展示支出分布，折线图展示趋势

### 双模式支持
- **个人模式**：数据存储在本地，无需登录，离线可用
- **家庭模式**：通过 Supabase 云端同步，支持多成员协作记账，实时数据推送

### 智能助手
- **截屏识别**：选择支付截图，OCR + LLM 智能解析为结构化交易数据
- **文字记账**：输入自然语言描述（如"微信支付午饭35元"），自动解析并预填记账信息
- **悬浮助手球**：可拖拽悬浮球，一键快速记账、截屏识别、文字记账

### 其他功能
- **数据导出**：导出交易数据为 Excel 文件，支持按日期范围筛选
- **深色模式**：支持亮色/暗色主题切换
- **多货币支持**：CNY、USD、EUR、JPY

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React Native | 0.79.6 | 移动端框架 |
| Expo | 53 | 跨平台开发工具 |
| TypeScript | 5.8 | 类型安全 |
| Supabase | 2.49 | 后端服务（Auth + DB + Realtime） |
| React Navigation | 7 | 导航框架 |

## 项目结构

```
├── App.tsx                    # 应用入口
├── src/
│   ├── components/            # UI 组件
│   ├── screens/               # 页面组件
│   ├── store/                 # 状态管理（AppContext, ThemeContext）
│   ├── services/              # 服务层（auth, data, family, llm, ocr）
│   ├── navigation/            # 导航配置
│   ├── types/                 # 类型定义
│   ├── constants/             # 常量配置
│   ├── lib/                   # Supabase 客户端
│   └── utils/                 # 工具函数（StorageService）
├── assets/                    # 静态资源
└── supabase-*.sql             # 数据库脚本
```

## 快速开始

### 环境要求
- Node.js >= 18
- npm 或 yarn
- Expo Go（开发调试）

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 指定平台
npm run android    # Android
npm run ios        # iOS
npm run web        # Web
```

### Supabase 配置（可选）

家庭模式需要配置 Supabase：

1. 在 [Supabase](https://supabase.com) 创建项目
2. 在 SQL Editor 中执行 `supabase-schema.sql` 和迁移脚本
3. 在 `.env` 文件中配置：

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> 不配置 Supabase 时，应用仍可正常运行于纯离线个人记账模式。

### 构建发布

```bash
# 使用 EAS Build
npx eas build --platform android
npx eas build --platform ios
```

## 页面说明

| 页面 | 功能 |
|------|------|
| HomeScreen | 当月收支概览、预算进度、最近交易 |
| BillsScreen | 按月查看账单、分类筛选、滑动删除 |
| StatisticsScreen | 收支统计、饼图、折线图趋势 |
| AddTransactionScreen | 新增/编辑交易 |
| SmartRecognizeScreen | 截屏智能识别记账 |
| TextBookkeepingScreen | 自然语言文字记账 |
| SettingsScreen | 个人资料、分类/资金/预算/家庭管理 |
| CategoryManageScreen | 分类管理 |
| BudgetScreen | 预算设置 |
| AccountManageScreen | 资金账户管理 |
| FamilySetupScreen | 创建/加入家庭 |
| MultiFamilyScreen | 多家庭管理 |

## 智能助手配置

智能记账功能需要配置 LLM 服务：

- **支持的 LLM 提供商**：DeepSeek、通义千问、OpenAI、自定义 API
- **支持的 OCR 服务**：火山引擎、百度、腾讯 OCR

在 `SettingsScreen → 智能助手设置` 中配置 API Key 和相关参数。

## 数据库设计

主要数据表：
- `families` - 家庭
- `family_members` - 家庭成员
- `transactions` - 交易记录
- `categories` - 分类
- `budgets` - 预算
- `fund_accounts` - 资金账户
- `profiles` - 用户资料

所有表启用 Row Level Security（RLS），支持 Realtime 实时推送。

## 许可证

Private