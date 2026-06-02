-- ============================================
-- 家庭记账 App - Supabase 数据库建表 SQL
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 1. 家庭表
CREATE TABLE IF NOT EXISTS families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 家庭成员表
CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, user_id)
);

-- 3. 分类表
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  color TEXT NOT NULL DEFAULT '#4CAF50',
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  is_custom BOOLEAN DEFAULT false,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL,
  note TEXT DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'personal' CHECK (account_type IN ('personal', 'family')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 预算表
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, month)
);

-- ============================================
-- RLS (Row Level Security) 策略
-- ============================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- families: 家庭成员可查看，创建者可增删改
CREATE POLICY "家庭成员可查看家庭" ON families
  FOR SELECT USING (
    id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "任何认证用户可创建家庭" ON families
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "家庭创建者可更新家庭" ON families
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "家庭创建者可删除家庭" ON families
  FOR DELETE USING (created_by = auth.uid());

-- family_members: 家庭成员可查看，owner可邀请
CREATE POLICY "家庭成员可查看成员列表" ON family_members
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "家庭成员可加入" ON family_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "owner可移除成员" ON family_members
  FOR DELETE USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- 允许用户删除自己的家庭成员记录（离开家庭）
CREATE POLICY "用户可离开家庭" ON family_members
  FOR DELETE USING (user_id = auth.uid());

-- categories: 家庭成员可查看，家庭成员可增删改
CREATE POLICY "家庭成员可查看分类" ON categories
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "家庭成员可创建分类" ON categories
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "家庭成员可更新分类" ON categories
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "家庭成员可删除分类" ON categories
  FOR DELETE USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- transactions: 家庭成员可查看，自己可增删改
CREATE POLICY "家庭成员可查看交易" ON transactions
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "家庭成员可创建交易" ON transactions
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "家庭成员可更新交易" ON transactions
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "家庭成员可删除交易" ON transactions
  FOR DELETE USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- budgets: 家庭成员可查看，家庭成员可增删改
CREATE POLICY "家庭成员可查看预算" ON budgets
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "家庭成员可创建预算" ON budgets
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "家庭成员可更新预算" ON budgets
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "家庭成员可删除预算" ON budgets
  FOR DELETE USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- ============================================
-- Realtime 开启（用于实时同步）
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE budgets;

-- ============================================
-- 索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_family_date ON transactions(family_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_family_user ON transactions(family_id, user_id);
CREATE INDEX IF NOT EXISTS idx_categories_family ON categories(family_id);
CREATE INDEX IF NOT EXISTS idx_budgets_family_month ON budgets(family_id, month);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
